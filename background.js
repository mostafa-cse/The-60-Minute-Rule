/* ===== THE 60-MINUTE RULE — BACKGROUND SERVICE WORKER ===== */

const PHASES = [
  { name: 'Reconnaissance', start: 0,  end: 5,  color: '#4FC3F7', tip: 'Read the problem twice. Do NOT touch the keyboard.' },
  { name: 'Observation',    start: 5,  end: 25, color: '#81C784', tip: 'Pen & paper only. Draw cases. Find the invariant.' },
  { name: 'Attack It',      start: 25, end: 35, color: '#FFD54F', tip: 'Break your logic: N=1, all zeros, sorted array.' },
  { name: 'Code It',        start: 35, end: 45, color: '#FF8A65', tip: 'Logic survived? Only NOW touch the keyboard.' },
  { name: 'The Struggle',   start: 45, end: 60, color: '#E57373', tip: 'Debug or rethink. Write what you know. Isolate the gap.' },
  { name: 'Editorial Protocol', start: 60, end: 999, color: '#B0BEC5', tip: 'Read ONLY the first hint. Close tab. Wait 30 min.' }
];

function getPhase(elapsedMin) {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (elapsedMin >= PHASES[i].start) return i;
  }
  return 0;
}

/* ===== ICON DRAWING ===== */
function drawIcon(text, bgColor) {
  const sizes = [16, 32];
  const imageData = {};
  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    // Background
    ctx.fillStyle = bgColor || '#333';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fill();
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = text.length <= 2 ? size * 0.55 : size * 0.38;
    ctx.font = `bold ${fontSize}px system-ui`;
    ctx.fillText(text, size / 2, size / 2 + 1);
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  chrome.action.setIcon({ imageData: { 16: imageData[16], 32: imageData[32] } });
}

function resetIcon() {
  chrome.action.setIcon({ path: { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' } });
}

/* ===== OFFSCREEN DOCUMENT ===== */
let offscreenCreating = null;
async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument().catch(() => false);
  if (existing) return;
  if (offscreenCreating) { await offscreenCreating; return; }
  offscreenCreating = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play phase transition alarm sounds'
  });
  await offscreenCreating;
  offscreenCreating = null;
}

async function playAlarm(type) {
  try {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ type: 'PLAY_ALARM', alarmType: type || 'phase' });
  } catch (e) { /* ignore */ }
}

/* ===== TIMER STATE ===== */
async function getState() {
  return new Promise(r => chrome.storage.local.get(null, d => r(d)));
}

async function setState(obj) {
  return new Promise(r => chrome.storage.local.set(obj, r));
}

/* ===== CF POLLING ===== */
async function pollCF() {
  const s = await getState();
  if (!s.isRunning || s.isPaused || s.solved || !s.cfHandle || !s.cfAutoMode) return;

  try {
    const res = await fetch(`https://codeforces.com/api/user.status?handle=${s.cfHandle}&from=1&count=5`);
    const data = await res.json();
    if (data.status !== 'OK' || !data.result) return;

    const startTime = s.startTime;
    for (const sub of data.result) {
      if (sub.verdict !== 'OK') continue;
      if (sub.creationTimeSeconds * 1000 < startTime) continue;
      if (s.cfLastAcId && sub.id <= s.cfLastAcId) continue;

      // AC found!
      const now = Date.now();
      const pauseAcc = s.pauseAccumulated || 0;
      const elapsedMs = now - startTime - pauseAcc;
      const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
      const elapsedMin = Math.floor(elapsedSec / 60);
      const phaseIdx = getPhase(elapsedMin);
      const problemName = `${sub.problem.contestId}${sub.problem.index} - ${sub.problem.name}`;
      const timeStr = `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;
      const tags = sub.problem.tags || [];
      const rating = sub.problem.rating || 0;

      // Stop timer
      await setState({
        isRunning: false,
        isPaused: false,
        solved: true,
        cfLastAcId: sub.id,
        lastSolve: {
          problem: problemName,
          time: elapsedSec,
          timeStr,
          phase: phaseIdx + 1,
          source: 'auto',
          tags,
          rating,
          date: new Date().toISOString()
        }
      });

      // Clear alarms
      chrome.alarms.clear('icon-tick');
      chrome.alarms.clear('cf-poll');
      chrome.alarms.clear('quote-rotate');
      for (let i = 1; i <= 6; i++) chrome.alarms.clear(`phase-${i}`);

      // Update icon
      drawIcon('DONE', '#66BB6A');

      // Play celebration
      await playAlarm('celebration');

      // Save to history
      await saveToHistory({
        problem: problemName,
        time: elapsedSec,
        timeStr,
        phase: phaseIdx + 1,
        source: 'auto',
        tags,
        rating,
        date: new Date().toISOString()
      });

      // Auto-check Rule of 10
      await r10AutoCheck(elapsedSec);

      // Track weakness tags
      await trackWeakness(tags, elapsedSec, true);

      // Update daily goal
      await incrementDailyGoal();

      // Notification
      chrome.notifications.create('cf-ac-' + sub.id, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🎉 Accepted! Timer Stopped',
        message: `${problemName} solved in ${timeStr} · Click to start next`,
        requireInteraction: true
      });

      // Notify popup
      chrome.runtime.sendMessage({
        type: 'CF_AC_FOUND',
        problem: problemName,
        timeStr,
        elapsedSec,
        phase: phaseIdx + 1
      }).catch(() => {});

      return;
    }
  } catch (e) { /* network error, ignore */ }
}

/* ===== SAVE TO HISTORY ===== */
async function saveToHistory(entry) {
  const s = await getState();
  let history = s.history || [];
  history.unshift(entry);
  if (history.length > 10) history = history.slice(0, 10);

  // Update total solved
  const totalSolvedAllTime = (s.totalSolvedAllTime || 0) + 1;

  // Update heatmap
  const heatmap = s.heatmapData || {};
  const today = new Date().toISOString().slice(0, 10);
  if (!heatmap[today]) heatmap[today] = { count: 0, totalTime: 0 };
  heatmap[today].count++;
  heatmap[today].totalTime += entry.time;

  await setState({ history, totalSolvedAllTime, heatmapData: heatmap });
}

/* ===== RULE OF 10 AUTO CHECK ===== */
async function r10AutoCheck(elapsedSec) {
  const s = await getState();
  if (s.r10JustChecked) return; // prevent double-count
  await setState({ r10JustChecked: true });

  const elapsedMin = elapsedSec / 60;
  if (elapsedMin <= 45) {
    let streak = (s.r10Streak || 0) + 1;
    let totalStreakSolves = (s.r10TotalStreakSolves || 0) + 1;
    let freezeTokens = s.r10FreezeTokens || 0;
    let masteredRatings = s.r10MasteredRatings || [];
    let longestStreak = s.longestStreak || 0;
    let mastered = false;

    // Earn freeze token every 5 consecutive
    if (totalStreakSolves % 5 === 0 && freezeTokens < 2) {
      freezeTokens++;
    }

    if (streak > longestStreak) longestStreak = streak;

    if (streak >= 10) {
      mastered = true;
      const rating = s.r10TargetRating || 1200;
      if (!masteredRatings.includes(rating)) {
        masteredRatings.push(rating);
      }
      streak = 0;
      totalStreakSolves = 0;
    }

    await setState({
      r10Streak: streak,
      r10TotalStreakSolves: totalStreakSolves,
      r10FreezeTokens: freezeTokens,
      r10MasteredRatings: masteredRatings,
      longestStreak,
      r10Mastered: mastered
    });
  }
  // >45 min: no change to streak
}

/* ===== WEAKNESS TRACKING ===== */
async function trackWeakness(tags, elapsedSec, solved) {
  const s = await getState();
  const wt = s.weaknessTags || {};
  for (const tag of tags) {
    if (!wt[tag]) wt[tag] = { count: 0, totalTime: 0, slowCount: 0 };
    wt[tag].count++;
    wt[tag].totalTime += elapsedSec;
    if (elapsedSec > 30 * 60) wt[tag].slowCount++;
  }
  await setState({ weaknessTags: wt });
}

/* ===== DAILY GOAL ===== */
async function incrementDailyGoal() {
  const s = await getState();
  const today = new Date().toISOString().slice(0, 10);
  let dgProgress = s.dailyGoalProgress || {};
  if (!dgProgress.date || dgProgress.date !== today) {
    dgProgress = { date: today, count: 0 };
  }
  dgProgress.count++;
  const goal = s.dailyGoal || 3;

  if (dgProgress.count >= goal) {
    // Update day streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let dayStreak = s.dailyGoalDayStreak || 0;
    const lastGoalDate = s.lastGoalMetDate || '';
    if (lastGoalDate === yesterday || lastGoalDate === today) {
      if (lastGoalDate !== today) dayStreak++;
    } else {
      dayStreak = 1;
    }
    await setState({
      dailyGoalProgress: dgProgress,
      dailyGoalDayStreak: dayStreak,
      lastGoalMetDate: today
    });

    chrome.notifications.create('daily-goal', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🎯 Daily Goal Complete!',
      message: `You solved ${dgProgress.count} problems today!`
    });
  } else {
    await setState({ dailyGoalProgress: dgProgress });
  }
}

/* ===== ALARM HANDLERS ===== */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cf-poll') {
    await pollCF();
    return;
  }

  if (alarm.name === 'icon-tick') {
    const s = await getState();
    if (!s.isRunning || s.isPaused || s.solved) return;
    const pauseAcc = s.pauseAccumulated || 0;
    const elapsed = Date.now() - s.startTime - pauseAcc;
    const min = Math.floor(elapsed / 60000);
    const phaseIdx = getPhase(min);
    drawIcon(String(min).padStart(2, '0'), PHASES[phaseIdx].color);
    return;
  }

  if (alarm.name.startsWith('phase-')) {
    const s = await getState();
    if (!s.isRunning || s.solved) return;
    const phaseNum = parseInt(alarm.name.split('-')[1]);
    const phase = PHASES[phaseNum - 1];
    if (!phase) return;

    await playAlarm('phase');

    chrome.notifications.create('phase-' + phaseNum, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `⏰ Phase ${phaseNum}: ${phase.name}`,
      message: phase.tip
    });

    chrome.runtime.sendMessage({
      type: 'PHASE_CHANGE',
      phase: phaseNum,
      name: phase.name,
      tip: phase.tip,
      color: phase.color
    }).catch(() => {});
    return;
  }

  if (alarm.name === 'idle-reminder') {
    const s = await getState();
    if (!s.isRunning) {
      chrome.notifications.create('idle', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '💡 Ready for a problem?',
        message: 'You haven\'t started a problem in a while. Let\'s go!'
      });
    }
    return;
  }

  if (alarm.name === 'daily-streak-reminder') {
    const s = await getState();
    const today = new Date().toISOString().slice(0, 10);
    const dgProgress = s.dailyGoalProgress || {};
    const goal = s.dailyGoal || 3;
    if (!dgProgress.date || dgProgress.date !== today || dgProgress.count < goal) {
      chrome.notifications.create('streak-remind', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🔥 Keep your streak alive today!',
        message: `You've solved ${dgProgress.count || 0}/${goal} problems today.`
      });
    }
    return;
  }
});

/* ===== MESSAGE HANDLERS ===== */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_TIMER') {
    handleStartTimer(msg).then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'STOP_TIMER') {
    handleStopTimer(msg).then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'PAUSE_TIMER') {
    handlePauseTimer().then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'RESUME_TIMER') {
    handleResumeTimer().then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'RESET_TIMER') {
    handleResetTimer().then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'MANUAL_SOLVE') {
    handleManualSolve(msg).then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'GET_STATE') {
    getState().then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'R10_EDITORIAL') {
    handleEditorial().then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'R10_MANUAL_SOLVE') {
    r10AutoCheck(msg.elapsedSec || 0).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'R10_CHANGE_RATING') {
    setState({ r10Streak: 0, r10TotalStreakSolves: 0, r10TargetRating: msg.rating, r10JustChecked: false })
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'USE_FREEZE') {
    handleUseFreeze().then(r => sendResponse(r));
    return true;
  }
  if (msg.type === 'SAVE_HISTORY_ENTRY') {
    saveToHistory(msg.entry).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'PLAY_ALARM') {
    // Forward to offscreen
    return false;
  }
  return false;
});

async function handleStartTimer() {
  const now = Date.now();
  await setState({
    startTime: now,
    isRunning: true,
    isPaused: false,
    solved: false,
    pauseAccumulated: 0,
    pauseCount: 0,
    pauseStartTime: null,
    cfLastAcId: null,
    r10JustChecked: false,
    lastSolve: null
  });

  // Schedule phase alarms
  const phaseMinutes = [5, 25, 35, 45, 60];
  for (let i = 0; i < phaseMinutes.length; i++) {
    chrome.alarms.create(`phase-${i + 2}`, { delayInMinutes: phaseMinutes[i] });
  }

  // Icon tick every minute
  chrome.alarms.create('icon-tick', { periodInMinutes: 1 });

  // CF polling every ~3 seconds (minimum Chrome alarm is 0.5 min, so we use setInterval via keep-alive)
  const s = await getState();
  if (s.cfHandle && s.cfAutoMode) {
    // Use alarm with 0.5 min for CF polling (Chrome minimum)
    // For more frequent polling, popup will handle it
    chrome.alarms.create('cf-poll', { periodInMinutes: 0.5 });
  }

  // Set idle reminder
  chrome.alarms.create('idle-reminder', { delayInMinutes: 120 });

  // Initial icon
  drawIcon('00', PHASES[0].color);

  return { ok: true, startTime: now };
}

async function handleStopTimer() {
  await setState({ isRunning: false, isPaused: false });
  chrome.alarms.clear('icon-tick');
  chrome.alarms.clear('cf-poll');
  chrome.alarms.clear('quote-rotate');
  for (let i = 1; i <= 6; i++) chrome.alarms.clear(`phase-${i}`);
  return { ok: true };
}

async function handlePauseTimer() {
  const s = await getState();
  if (!s.isRunning || s.isPaused) return { ok: false };
  if ((s.pauseCount || 0) >= 2) return { ok: false, reason: 'max_pauses' };

  await setState({
    isPaused: true,
    pauseStartTime: Date.now()
  });

  drawIcon('⏸', '#666');
  return { ok: true };
}

async function handleResumeTimer() {
  const s = await getState();
  if (!s.isRunning || !s.isPaused) return { ok: false };

  const pausedDuration = Date.now() - (s.pauseStartTime || Date.now());
  const newAccumulated = (s.pauseAccumulated || 0) + pausedDuration;
  const newPauseCount = (s.pauseCount || 0) + 1;

  await setState({
    isPaused: false,
    pauseStartTime: null,
    pauseAccumulated: newAccumulated,
    pauseCount: newPauseCount
  });

  // Restore icon
  const elapsed = Date.now() - s.startTime - newAccumulated;
  const min = Math.floor(elapsed / 60000);
  const phaseIdx = getPhase(min);
  drawIcon(String(min).padStart(2, '0'), PHASES[phaseIdx].color);

  return { ok: true, pauseCount: newPauseCount };
}

async function handleResetTimer() {
  await setState({
    startTime: null,
    isRunning: false,
    isPaused: false,
    solved: false,
    pauseAccumulated: 0,
    pauseCount: 0,
    pauseStartTime: null,
    lastSolve: null,
    r10JustChecked: false
  });

  chrome.alarms.clear('icon-tick');
  chrome.alarms.clear('cf-poll');
  chrome.alarms.clear('quote-rotate');
  for (let i = 1; i <= 6; i++) chrome.alarms.clear(`phase-${i}`);

  resetIcon();
  return { ok: true };
}

async function handleManualSolve(msg) {
  const s = await getState();
  if (!s.isRunning || s.solved) return { ok: false };

  const now = Date.now();
  const pauseAcc = s.pauseAccumulated || 0;
  const elapsedMs = now - s.startTime - pauseAcc;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const elapsedMin = Math.floor(elapsedSec / 60);
  const phaseIdx = getPhase(elapsedMin);
  const timeStr = `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;

  await setState({
    isRunning: false,
    isPaused: false,
    solved: true,
    lastSolve: {
      problem: msg.problem || 'Manual Solve',
      time: elapsedSec,
      timeStr,
      phase: phaseIdx + 1,
      source: 'manual',
      tags: [],
      rating: 0,
      date: new Date().toISOString()
    }
  });

  chrome.alarms.clear('icon-tick');
  chrome.alarms.clear('cf-poll');
  chrome.alarms.clear('quote-rotate');
  for (let i = 1; i <= 6; i++) chrome.alarms.clear(`phase-${i}`);

  drawIcon('DONE', '#66BB6A');
  await playAlarm('celebration');

  // Save to history
  const entry = {
    problem: msg.problem || 'Manual Solve',
    time: elapsedSec,
    timeStr,
    phase: phaseIdx + 1,
    source: 'manual',
    tags: [],
    rating: 0,
    date: new Date().toISOString()
  };

  // Don't save yet — wait for reflection
  // The popup will call SAVE_HISTORY_ENTRY after reflection

  // Auto-check Rule of 10
  await r10AutoCheck(elapsedSec);
  await incrementDailyGoal();

  return { ok: true, entry };
}

async function handleEditorial() {
  const s = await getState();
  let streak = 0;
  let freezeTokens = s.r10FreezeTokens || 0;
  let usedFreeze = false;

  // Check if freeze token available and user wants to use it
  // Freeze is handled separately via USE_FREEZE message

  await setState({
    r10Streak: 0,
    r10TotalStreakSolves: 0
  });

  return { ok: true, streak: 0 };
}

async function handleUseFreeze() {
  const s = await getState();
  let freezeTokens = s.r10FreezeTokens || 0;
  if (freezeTokens <= 0) return { ok: false, reason: 'no_tokens' };

  freezeTokens--;
  await setState({ r10FreezeTokens: freezeTokens });
  return { ok: true, freezeTokens };
}

/* ===== NOTIFICATION CLICK ===== */
chrome.notifications.onClicked.addListener((notifId) => {
  chrome.action.openPopup().catch(() => {
    // openPopup may not be available in all contexts
  });
  chrome.notifications.clear(notifId);
});

/* ===== INSTALL / STARTUP ===== */
chrome.runtime.onInstalled.addListener(() => {
  // Set daily streak reminder at 9 PM local (approximate)
  chrome.alarms.create('daily-streak-reminder', { periodInMinutes: 1440 });
  // Set idle reminder
  chrome.alarms.create('idle-reminder', { delayInMinutes: 120, periodInMinutes: 120 });

  // Initialize defaults
  chrome.storage.local.get(null, (s) => {
    const defaults = {
      cfAutoMode: true,
      r10TargetRating: 1200,
      r10Streak: 0,
      r10FreezeTokens: 0,
      r10MasteredRatings: [],
      r10TotalStreakSolves: 0,
      history: [],
      totalSolvedAllTime: 0,
      longestStreak: 0,
      dailyGoal: 3,
      dailyGoalProgress: {},
      dailyGoalDayStreak: 0,
      heatmapData: {},
      weaknessTags: {},
      ratingLog: [],
      spacedRepetitionQueue: [],
      theme: 'dark',
      focusModeEnabled: false,
      warmUpMode: false
    };
    const toSet = {};
    for (const [k, v] of Object.entries(defaults)) {
      if (s[k] === undefined) toSet[k] = v;
    }
    if (Object.keys(toSet).length) chrome.storage.local.set(toSet);
  });
});

chrome.runtime.onStartup.addListener(async () => {
  const s = await getState();
  // Restore timer state if was running
  if (s.isRunning && !s.solved) {
    chrome.alarms.create('icon-tick', { periodInMinutes: 1 });
    if (s.cfHandle && s.cfAutoMode) {
      chrome.alarms.create('cf-poll', { periodInMinutes: 0.5 });
    }
    // Restore icon
    const pauseAcc = s.pauseAccumulated || 0;
    const elapsed = Date.now() - s.startTime - pauseAcc;
    const min = Math.floor(elapsed / 60000);
    if (s.isPaused) {
      drawIcon('⏸', '#666');
    } else {
      const phaseIdx = getPhase(min);
      drawIcon(String(min).padStart(2, '0'), PHASES[phaseIdx].color);
    }
  }
});
