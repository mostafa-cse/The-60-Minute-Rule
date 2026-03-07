const STEPS = [
  { id:1, name:"Reconnaissance",     start:0,  tip:"Read the problem twice. Do NOT touch the keyboard." },
  { id:2, name:"Observation",        start:5,  tip:"Pen & paper only. Draw cases. Find the invariant." },
  { id:3, name:"Attack It",          start:25, tip:"Break your logic: N=1, all zeros, sorted array." },
  { id:4, name:"Code It",            start:35, tip:"Logic survived? Only NOW touch the keyboard." },
  { id:5, name:"The Struggle",       start:45, tip:"Debug or rethink. Write what you know. Isolate the gap." },
  { id:6, name:"Editorial Protocol", start:60, tip:"Read ONLY the first hint. Close tab. Wait 30 min." }
];
const PHASE_COLORS = ["#58a6ff","#d2a8ff","#ff7b72","#39d353","#ffa657","#e3b341"];

function getStepIndex(m) {
  const s = [0,5,25,35,45,60];
  for (let i = s.length-1; i >= 0; i--) { if (m >= s[i]) return i; }
  return 0;
}

/* ── Offscreen ── */
async function ensureOffscreen() {
  try {
    // Use getContexts (reliable) instead of deprecated hasDocument
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    if (contexts.length === 0) {
      await chrome.offscreen.createDocument({
        url:           chrome.runtime.getURL('offscreen.html'),
        reasons:       ['AUDIO_PLAYBACK'],
        justification: 'Play phase alarm beep for 10 seconds'
      });
      // Wait for offscreen document to fully initialize before messaging
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  } catch(e) {
    console.warn('ensureOffscreen error:', e);
  }
}

async function playPhaseAlarm(idx) {
  await ensureOffscreen();
  // Retry up to 3 times in case offscreen is still loading
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await chrome.runtime.sendMessage({ type: 'PLAY_PHASE_ALARM', phaseIndex: idx });
      return; // success
    } catch(e) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }
}

/* ── Icon drawing ── */
function drawTimerIcon(elapsedSec, ci) {
  const sz = 32, canvas = new OffscreenCanvas(sz, sz), ctx = canvas.getContext('2d');
  const accent = PHASE_COLORS[ci] || '#39d353';
  const min = Math.floor(elapsedSec / 60).toString();

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, sz, sz);

  // Colored border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, sz - 2, sz - 2);

  // Big minute number centered
  ctx.fillStyle = accent;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(min, sz / 2, sz / 2 - 4);

  // Small "min" label below
  ctx.fillStyle = accent + 'aa';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('min', sz / 2, sz / 2 + 9);

  return ctx.getImageData(0, 0, sz, sz);
}
function setTimerIcon(s,ci) {
  try { chrome.action.setIcon({ imageData:{32: drawTimerIcon(s,ci)} }); } catch(e) {}
}
function resetIcon() { chrome.action.setIcon({ path:{'48':'icons/icon48.png'} }); }
function setSolvedIcon() {
  try {
    const canvas = new OffscreenCanvas(32,32), ctx = canvas.getContext('2d');
    ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,32,32);
    ctx.strokeStyle='#39d353'; ctx.lineWidth=2; ctx.strokeRect(1,1,30,30);
    ctx.fillStyle='#39d353'; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('DONE',16,16);
    chrome.action.setIcon({ imageData:{32: ctx.getImageData(0,0,32,32)} });
  } catch(e) {}
}

/* ══════════════════════════════════════
   CF AUTO-DETECT: poll every 1 minute
══════════════════════════════════════ */
async function pollCFSubmissions() {
  const data = await chrome.storage.local.get([
    'cfHandle','startTime','isRunning','cfAutoMode','cfLastAcId'
  ]);
  if (!data.isRunning || !data.startTime || !data.cfHandle) return;

  try {
    const resp = await fetch(
      'https://codeforces.com/api/user.status?handle=' +
      encodeURIComponent(data.cfHandle) + '&from=1&count=10'
    );
    const json = await resp.json();
    if (json.status !== 'OK') return;

    const subs = json.result;
    // Find first AC after timer started that we haven't notified about
    const acSub = subs.find(sub =>
      sub.verdict === 'OK' &&
      sub.creationTimeSeconds * 1000 > data.startTime &&
      String(sub.id) !== String(data.cfLastAcId)
    );

    if (!acSub) return;

    const problemName = acSub.problem.name || 'Unknown';
    const solvedAt    = Date.now();
    const elapsedSec  = Math.floor((solvedAt - data.startTime) / 1000);
    const min = Math.floor(elapsedSec/60), sec = elapsedSec%60;
    const timeStr = min + 'm ' + sec + 's';

    // Save so we don't notify twice
    await chrome.storage.local.set({ cfLastAcId: String(acSub.id) });

    if (data.cfAutoMode) {
      /* ── AUTO MODE: stop timer silently, show notification ── */
      await chrome.storage.local.set({
        isRunning: false, solved: true, solvedAt,
        cfLastAcId: String(acSub.id)
      });
      chrome.alarms.clearAll();
      setSolvedIcon();

      chrome.notifications.create('cf-auto-' + acSub.id, {
        type: 'basic', iconUrl: 'icons/icon48.png',
        title: '🎉 Accepted! Timer Auto-Stopped',
        message: '"' + problemName + '" accepted in ' + timeStr + '! Open extension for next problem.',
        priority: 2, requireInteraction: true
      });

    } else {
      /* ── MANUAL MODE: ask user with buttons ── */
      chrome.notifications.create('cf-ac-' + acSub.id, {
        type: 'basic', iconUrl: 'icons/icon48.png',
        title: '🎉 Accepted on Codeforces!',
        message: '"' + problemName + '" accepted in ' + timeStr + '. Mark as solved?',
        buttons: [
          { title: '✅ Mark Solved + Reset' },
          { title: '⏩ Keep Timer Going' }
        ],
        priority: 2, requireInteraction: true
      });
    }

  } catch(e) {
    console.warn('CF poll error:', e);
  }
}

/* ── Notification button clicks ── */
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (!notifId.startsWith('cf-ac-')) return;
  chrome.notifications.clear(notifId);

  if (btnIdx === 0) {
    // Mark Solved + Reset
    const solvedAt = Date.now();
    chrome.storage.local.get(['startTime'], (d) => {
      chrome.storage.local.set({ isRunning:false, solved:true, solvedAt });
      chrome.alarms.clearAll();
      setSolvedIcon();
    });
  }
  // btnIdx === 1 → Keep Going, do nothing
});

/* ── Alarms ── */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  // Phase transition
  if (alarm.name.startsWith('phase-')) {
    const idx  = parseInt(alarm.name.split('-')[1]);
    const step = STEPS[idx];
    if (!step) return;
    chrome.notifications.create('notif-' + Date.now(), {
      type:'basic', iconUrl:'icons/icon48.png',
      title:'⏰ Phase ' + step.id + ': ' + step.name,
      message: step.tip, priority:2, requireInteraction:false
    });
    await playPhaseAlarm(idx);
    chrome.storage.local.get(['startTime'], (d) => {
      if (d.startTime) setTimerIcon(Math.floor((Date.now()-d.startTime)/1000), idx);
    });
  }

  // Minute icon tick
  if (alarm.name === 'icon-tick') {
    chrome.storage.local.get(['startTime','isRunning'], (d) => {
      if (!d.isRunning || !d.startTime) return;
      const s = Math.floor((Date.now()-d.startTime)/1000);
      setTimerIcon(s, getStepIndex(s/60));
      chrome.alarms.create('icon-tick', { delayInMinutes:1 });
    });
  }

  // CF submission poll
  if (alarm.name === 'cf-poll') {
    await pollCFSubmissions();
    // Reschedule if still running
    chrome.storage.local.get(['isRunning'], (d) => {
      if (d.isRunning) chrome.alarms.create('cf-poll', { delayInMinutes:1 });
    });
  }
});

/* ── Messages from popup ── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'START_TIMER') {
    const startTime = Date.now();
    chrome.storage.local.set({ startTime, isRunning:true, solved:false, solvedAt:null, cfLastAcId:null });
    chrome.alarms.clearAll();
    STEPS.forEach((step, i) => {
      if (i > 0) chrome.alarms.create('phase-' + i, { when: startTime + step.start*60*1000 });
    });
    chrome.alarms.create('icon-tick', { delayInMinutes:1 });
    // Start CF polling if handle is saved
    chrome.storage.local.get(['cfHandle'], (d) => {
      if (d.cfHandle) chrome.alarms.create('cf-poll', { delayInMinutes:1 });
    });
    setTimerIcon(0, 0);
    sendResponse({ ok:true, startTime });
  }

  if (msg.type === 'RESET_TIMER') {
    chrome.storage.local.set({ startTime:null, isRunning:false, solved:false, solvedAt:null, cfLastAcId:null });
    chrome.alarms.clearAll();
    resetIcon();
    sendResponse({ ok:true });
  }

  if (msg.type === 'MARK_SOLVED') {
    const solvedAt = Date.now();
    chrome.storage.local.set({ isRunning:false, solved:true, solvedAt });
    chrome.alarms.clearAll();
    setSolvedIcon();
    sendResponse({ ok:true, solvedAt });
  }

  return true;
});
