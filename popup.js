/* ===== POPUP.JS — Main UI Controller ===== */

const PHASES = [
  { name: 'Reconnaissance', start: 0,  end: 5,  color: '#4FC3F7', range: '0 – 5 min', tip: 'Read the problem twice. Do NOT touch the keyboard.' },
  { name: 'Observation',    start: 5,  end: 25, color: '#81C784', range: '5 – 25 min', tip: 'Pen & paper only. Draw cases. Find the invariant.' },
  { name: 'Attack It',      start: 25, end: 35, color: '#FFD54F', range: '25 – 35 min', tip: 'Break your logic: N=1, all zeros, sorted array.' },
  { name: 'Code It',        start: 35, end: 45, color: '#FF8A65', range: '35 – 45 min', tip: 'Logic survived? Only NOW touch the keyboard.' },
  { name: 'The Struggle',   start: 45, end: 60, color: '#E57373', range: '45 – 60 min', tip: 'Debug or rethink. Write what you know. Isolate the gap.' },
  { name: 'Editorial Protocol', start: 60, end: 999, color: '#B0BEC5', range: '60+ min', tip: 'Read ONLY the first hint. Close tab. Wait 30 min.' }
];

const QUOTES = {
  0: ['"Understand before you solve."', '"Read twice, code once."', '"The problem tells you everything — listen."'],
  1: ['"Pen is mightier than the keyboard."', '"Draw it. See the pattern emerge."', '"Great solutions start on paper."'],
  2: ['"Break it before it breaks you."', '"Edge cases are where bugs hide."', '"Think like a destroyer, not a builder."'],
  3: ['"You\'ve earned the keyboard. Execute."', '"Clean code, clear mind."', '"Type with confidence — your logic is solid."'],
  4: ['"Stuck? Write what you know."', '"Isolate the gap. The answer is close."', '"Champions are made in the struggle."'],
  5: ['"Learn, don\'t just copy."', '"One hint at a time. Let it simmer."', '"The editorial is a teacher, not a crutch."']
};

let timerInterval = null;
let cfPollInterval = null;
let quoteInterval = null;
let contestCountdownInterval = null;
let currentPhase = -1;
let reflectionData = { phase: null, insight: '', confidence: null };
let pendingSolveEntry = null;

/* ===== HELPERS ===== */
function $(id) { return document.getElementById(id); }
function getPhaseIdx(elapsedMin) {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (elapsedMin >= PHASES[i].start) return i;
  }
  return 0;
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function fmtTimeStr(sec) {
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function sendMsg(msg) {
  return new Promise(r => chrome.runtime.sendMessage(msg, r));
}

/* ===== TAB SWITCHING ===== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.add('active');

    // Load tab-specific data
    if (btn.dataset.tab === 'history') loadHistory();
    if (btn.dataset.tab === 'rule10') loadR10State();
    if (btn.dataset.tab === 'cf') loadCFTab();
    if (btn.dataset.tab === 'stats') loadStats();
  });
});

/* ===== THEME ===== */
$('themeToggle').addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light-theme');
  $('themeToggle').textContent = isLight ? '☀️' : '🌙';
  chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
});

/* ===== TIMER ===== */
function startTimerTick() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(async () => {
    const s = await sendMsg({ type: 'GET_STATE' });
    if (!s || !s.isRunning || s.solved) {
      clearInterval(timerInterval);
      timerInterval = null;
      return;
    }
    if (s.isPaused) return;

    const pauseAcc = s.pauseAccumulated || 0;
    const elapsed = Date.now() - s.startTime - pauseAcc;
    const elapsedSec = Math.max(0, Math.floor(elapsed / 1000));
    const elapsedMin = elapsedSec / 60;
    const phaseIdx = getPhaseIdx(elapsedMin);

    $('timerDisplay').textContent = fmtTime(elapsedSec);
    $('timerDisplay').style.color = PHASES[phaseIdx].color;

    // Update phase card
    if (phaseIdx !== currentPhase) {
      updatePhaseUI(phaseIdx);
      if (currentPhase >= 0 && currentPhase !== phaseIdx) {
        showAlarmOverlay(phaseIdx);
      }
      currentPhase = phaseIdx;
    }

    // Update phase dots
    updatePhaseDots(phaseIdx);
  }, 1000);
}

function startQuoteRotation() {
  if (quoteInterval) clearInterval(quoteInterval);
  rotateQuote();
  quoteInterval = setInterval(rotateQuote, 30000);
}

function rotateQuote() {
  const idx = currentPhase >= 0 ? currentPhase : 0;
  const quotes = QUOTES[idx] || QUOTES[0];
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  const el = $('quoteText');
  if (el) {
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = q;
      el.style.opacity = '1';
    }, 200);
  }
}

function updatePhaseUI(phaseIdx) {
  const phase = PHASES[phaseIdx];
  $('phaseName').textContent = `Phase ${phaseIdx + 1}: ${phase.name}`;
  $('phaseRange').textContent = phase.range;
  $('phaseTip').textContent = phase.tip;
  $('phaseCard').style.borderLeftColor = phase.color;
}

function updatePhaseDots(currentIdx) {
  document.querySelectorAll('.phase-dots .dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i <= currentIdx);
    dot.classList.toggle('current', i === currentIdx);
    if (i === currentIdx) dot.style.color = PHASES[i].color;
  });
}

function showAlarmOverlay(phaseIdx) {
  const phase = PHASES[phaseIdx];
  $('alarmPhase').textContent = `⏰ Phase ${phaseIdx + 1}: ${phase.name}`;
  $('alarmPhase').style.color = phase.color;
  $('alarmTip').textContent = phase.tip;
  $('alarmOverlay').classList.remove('hidden');
  setTimeout(() => $('alarmOverlay').classList.add('hidden'), 3000);
}

$('alarmOverlay').addEventListener('click', () => {
  $('alarmOverlay').classList.add('hidden');
});

/* ===== CF POLLING FROM POPUP (every 3 sec) ===== */
function startCFPolling() {
  if (cfPollInterval) clearInterval(cfPollInterval);
  chrome.storage.local.get(['cfHandle', 'cfAutoMode'], (s) => {
    if (!s.cfHandle || !s.cfAutoMode) return;
    cfPollInterval = setInterval(async () => {
      const state = await sendMsg({ type: 'GET_STATE' });
      if (!state || !state.isRunning || state.solved || state.isPaused) {
        clearInterval(cfPollInterval);
        cfPollInterval = null;
        return;
      }
      // Trigger background to poll
      try {
        const res = await fetch(`https://codeforces.com/api/user.status?handle=${state.cfHandle}&from=1&count=5`);
        const data = await res.json();
        if (data.status !== 'OK' || !data.result) return;

        for (const sub of data.result) {
          if (sub.verdict !== 'OK') continue;
          if (sub.creationTimeSeconds * 1000 < state.startTime) continue;
          if (state.cfLastAcId && sub.id <= state.cfLastAcId) continue;

          // AC found — let background handle it
          // Background's alarm-based polling should catch it, but this is faster
          const pauseAcc = state.pauseAccumulated || 0;
          const elapsedMs = Date.now() - state.startTime - pauseAcc;
          const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
          const phaseIdx = getPhaseIdx(elapsedSec / 60);
          const problemName = `${sub.problem.contestId}${sub.problem.index} - ${sub.problem.name}`;
          const timeStr = fmtTimeStr(elapsedSec);
          const tags = sub.problem.tags || [];
          const rating = sub.problem.rating || 0;

          // Stop locally
          clearInterval(timerInterval);
          clearInterval(cfPollInterval);
          clearInterval(quoteInterval);
          timerInterval = null;
          cfPollInterval = null;
          quoteInterval = null;

          // Update storage
          const entry = {
            problem: problemName,
            time: elapsedSec,
            timeStr,
            phase: phaseIdx + 1,
            source: 'auto',
            tags,
            rating,
            date: new Date().toISOString()
          };

          chrome.storage.local.set({
            isRunning: false,
            isPaused: false,
            solved: true,
            cfLastAcId: sub.id,
            lastSolve: entry
          });

          // Show reflection then save
          pendingSolveEntry = entry;
          showReflectionModal(() => {
            entry.reflection = { ...reflectionData };
            sendMsg({ type: 'SAVE_HISTORY_ENTRY', entry });
            showSolvedBanner(problemName, timeStr);
          });

          sendMsg({ type: 'STOP_TIMER' });
          return;
        }
      } catch (e) { /* ignore */ }
    }, 3000);
  });
}

/* ===== NEW PROBLEM ===== */
$('newProblemBtn').addEventListener('click', startNewProblem);
$('nextProblemBtn').addEventListener('click', () => {
  resetUI();
  startNewProblem();
});

async function startNewProblem() {
  const warmUp = $('warmUpToggle').checked;

  // Check CF handle
  const s = await sendMsg({ type: 'GET_STATE' });
  if (!s.cfHandle && s.cfAutoMode) {
    // Prompt to save handle
    switchToTab('cf');
    return;
  }

  if (warmUp) {
    startWarmUp(s);
    return;
  }

  // Start real timer
  const res = await sendMsg({ type: 'START_TIMER' });
  if (res && res.ok) {
    showTimerRunning();
    startTimerTick();
    startQuoteRotation();
    startCFPolling();
    currentPhase = 0;
    updatePhaseUI(0);
    updatePhaseDots(0);
  }
}

/* ===== WARM-UP MODE ===== */
let warmUpInterval = null;
let warmUpSeconds = 600; // 10 minutes

async function startWarmUp(state) {
  warmUpSeconds = 600;
  $('warmUpPanel').classList.remove('hidden');
  $('timerIdle').classList.add('hidden');
  $('warmUpTimer').textContent = '10:00';

  // Suggest easy problem
  const targetRating = (state.r10TargetRating || 1200) - 200;
  $('warmUpProblem').textContent = `Suggested: solve a ~${targetRating} rated problem`;
}

$('warmUpStartBtn').addEventListener('click', () => {
  if (warmUpInterval) clearInterval(warmUpInterval);
  warmUpInterval = setInterval(() => {
    warmUpSeconds--;
    if (warmUpSeconds <= 0) {
      clearInterval(warmUpInterval);
      warmUpInterval = null;
      $('warmUpTimer').textContent = '00:00';
      $('warmUpStartBtn').textContent = '🚀 Start Real Problem';
      $('warmUpStartBtn').onclick = () => {
        $('warmUpPanel').classList.add('hidden');
        $('warmUpToggle').checked = false;
        startRealTimer();
      };
      return;
    }
    const m = Math.floor(warmUpSeconds / 60);
    const s = warmUpSeconds % 60;
    $('warmUpTimer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 1000);
});

$('warmUpSkipBtn').addEventListener('click', () => {
  if (warmUpInterval) clearInterval(warmUpInterval);
  $('warmUpPanel').classList.add('hidden');
  $('warmUpToggle').checked = false;
  startRealTimer();
});

async function startRealTimer() {
  const res = await sendMsg({ type: 'START_TIMER' });
  if (res && res.ok) {
    showTimerRunning();
    startTimerTick();
    startQuoteRotation();
    startCFPolling();
    currentPhase = 0;
    updatePhaseUI(0);
    updatePhaseDots(0);
  }
}

/* ===== SOLVED ===== */
$('solvedBtn').addEventListener('click', async () => {
  const res = await sendMsg({ type: 'MANUAL_SOLVE', problem: 'Manual Solve' });
  if (res && res.ok) {
    clearInterval(timerInterval);
    clearInterval(cfPollInterval);
    clearInterval(quoteInterval);
    timerInterval = null;
    cfPollInterval = null;
    quoteInterval = null;

    pendingSolveEntry = res.entry;
    showReflectionModal(() => {
      res.entry.reflection = { ...reflectionData };
      sendMsg({ type: 'SAVE_HISTORY_ENTRY', entry: res.entry });
      showSolvedBanner(res.entry.problem, res.entry.timeStr);
    });
  }
});

/* ===== PAUSE / RESUME ===== */
$('pauseBtn').addEventListener('click', async () => {
  const res = await sendMsg({ type: 'PAUSE_TIMER' });
  if (res && res.ok) {
    $('pauseBtn').classList.add('hidden');
    $('resumeBtn').classList.remove('hidden');
    $('timerDisplay').style.opacity = '0.5';
  } else if (res && res.reason === 'max_pauses') {
    $('pauseBtn').disabled = true;
    $('pauseBtn').textContent = '⏸ Max pauses used';
  }
});

$('resumeBtn').addEventListener('click', async () => {
  const res = await sendMsg({ type: 'RESUME_TIMER' });
  if (res && res.ok) {
    $('resumeBtn').classList.add('hidden');
    $('pauseBtn').classList.remove('hidden');
    $('timerDisplay').style.opacity = '1';
    $('pauseCount').textContent = res.pauseCount;
    $('pauseInfo').classList.remove('hidden');
    if (res.pauseCount >= 2) {
      $('pauseBtn').disabled = true;
      $('pauseBtn').textContent = '⏸ Max pauses used';
    }
  }
});

/* ===== RESET ===== */
$('resetBtn').addEventListener('click', async () => {
  await sendMsg({ type: 'RESET_TIMER' });
  clearInterval(timerInterval);
  clearInterval(cfPollInterval);
  clearInterval(quoteInterval);
  timerInterval = null;
  cfPollInterval = null;
  quoteInterval = null;
  currentPhase = -1;
  resetUI();
});

/* ===== UI HELPERS ===== */
function showTimerRunning() {
  $('timerIdle').classList.add('hidden');
  $('solvedBanner').classList.add('hidden');
  $('timerRunning').classList.remove('hidden');
  $('pauseBtn').classList.remove('hidden');
  $('pauseBtn').disabled = false;
  $('pauseBtn').textContent = '⏸ Pause';
  $('resumeBtn').classList.add('hidden');
  $('pauseInfo').classList.add('hidden');
  $('pauseCount').textContent = '0';
  $('timerDisplay').style.opacity = '1';

  // Show focus mode indicator if enabled
  chrome.storage.local.get(['focusModeEnabled'], (s) => {
    $('focusModeIndicator').classList.toggle('hidden', !s.focusModeEnabled);
    $('focusModeToggle').checked = s.focusModeEnabled || false;
  });

  // Show daily goal
  loadDailyGoalBar();
}

function showSolvedBanner(problem, timeStr) {
  $('timerRunning').classList.add('hidden');
  $('timerIdle').classList.add('hidden');
  $('solvedBanner').classList.remove('hidden');
  $('solvedProblem').textContent = problem;
  $('solvedTime').textContent = `Solved in ${timeStr}`;
}

function resetUI() {
  $('timerRunning').classList.add('hidden');
  $('solvedBanner').classList.add('hidden');
  $('warmUpPanel').classList.add('hidden');
  $('alarmOverlay').classList.add('hidden');
  $('timerIdle').classList.remove('hidden');
  $('timerDisplay').textContent = '00:00';
  $('timerDisplay').style.opacity = '1';
  currentPhase = -1;
}

function switchToTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${tabName}`);
  });
}

/* ===== DAILY GOAL BAR ===== */
function loadDailyGoalBar() {
  chrome.storage.local.get(['dailyGoal', 'dailyGoalProgress'], (s) => {
    const goal = s.dailyGoal || 3;
    const today = new Date().toISOString().slice(0, 10);
    const progress = s.dailyGoalProgress || {};
    const count = (progress.date === today) ? progress.count : 0;

    $('dailyGoalBar').classList.remove('hidden');
    $('goalText').textContent = `${count} / ${goal} problems`;
    $('goalFill').style.width = `${Math.min(100, (count / goal) * 100)}%`;

    if (count >= goal) {
      $('dailyGoalBanner').classList.remove('hidden');
    } else {
      $('dailyGoalBanner').classList.add('hidden');
    }
  });
}

/* ===== FOCUS MODE ===== */
$('focusModeToggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.local.set({ focusModeEnabled: enabled });
  $('focusModeIndicator').classList.toggle('hidden', !enabled);
});

/* ===== REFLECTION MODAL ===== */
function showReflectionModal(callback) {
  reflectionData = { phase: null, insight: '', confidence: null };
  $('reflectInsight').value = '';
  document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.conf-btn').forEach(b => b.classList.remove('selected'));
  $('reflectionModal').classList.remove('hidden');

  $('reflectSaveBtn').onclick = () => {
    reflectionData.insight = $('reflectInsight').value;
    $('reflectionModal').classList.add('hidden');
    callback();
  };
  $('reflectSkipBtn').onclick = () => {
    $('reflectionModal').classList.add('hidden');
    callback();
  };
}

document.querySelectorAll('.phase-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    reflectionData.phase = parseInt(btn.dataset.rphase);
  });
});

document.querySelectorAll('.conf-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.conf-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    reflectionData.confidence = btn.dataset.conf;
  });
});

/* ===== HISTORY TAB ===== */
function loadHistory() {
  chrome.storage.local.get(['history', 'spacedRepetitionQueue'], (s) => {
    const history = s.history || [];
    const srQueue = s.spacedRepetitionQueue || [];
    const container = $('historyList');

    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state">No solves yet — start your first problem! 🚀</div>';
      $('personalBests').classList.add('hidden');
      return;
    }

    // Personal bests per rating
    renderPersonalBests(history);

    // Render entries
    container.innerHTML = history.map((entry, i) => {
      const phaseColor = PHASES[Math.min(entry.phase - 1, 5)].color;
      const phaseName = `P${entry.phase}`;
      const sourceClass = entry.source === 'auto' ? 'auto' : 'manual';
      const sourceLabel = entry.source === 'auto' ? '⚡ CF Auto' : '✋ Manual';
      const date = new Date(entry.date).toLocaleDateString();
      const isReviewTagged = srQueue.some(q => q.entryDate === entry.date);
      const noteText = entry.note || '';
      const reflectionText = entry.reflection ?
        `Phase ${entry.reflection.phase || '?'} hardest · ${entry.reflection.confidence || '?'} confidence` : '';

      return `
        <div class="history-entry">
          <span class="h-phase-badge" style="background:${phaseColor}">${phaseName}</span>
          <div class="h-details">
            <div class="h-problem" title="${entry.problem}">${entry.problem}</div>
            <div class="h-meta">
              <span>${entry.timeStr}</span>
              <span>${date}</span>
              <span class="h-source ${sourceClass}">${sourceLabel}</span>
              ${entry.rating ? `<span>${entry.rating}</span>` : ''}
            </div>
            ${noteText ? `<div class="h-note-text">📝 ${noteText}</div>` : ''}
            ${reflectionText ? `<div class="h-note-text">🎓 ${reflectionText}</div>` : ''}
          </div>
          <div class="h-actions">
            <button class="h-note-btn" data-idx="${i}" title="Add note">📝</button>
            <button class="h-review-btn ${isReviewTagged ? 'tagged' : ''}" data-idx="${i}" title="Review later">🔁</button>
          </div>
        </div>
      `;
    }).join('');

    // Note button handlers
    container.querySelectorAll('.h-note-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const note = prompt('Add/edit note:', history[idx].note || '');
        if (note !== null) {
          history[idx].note = note;
          chrome.storage.local.set({ history }, () => loadHistory());
        }
      });
    });

    // Review Later handlers
    container.querySelectorAll('.h-review-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        toggleReviewLater(history[idx]);
      });
    });

    // Update badge for reviews due
    updateHistoryBadge(srQueue);
  });
}

function renderPersonalBests(history) {
  const bests = {};
  for (const entry of history) {
    if (!entry.rating) continue;
    if (!bests[entry.rating] || entry.time < bests[entry.rating].time) {
      bests[entry.rating] = entry;
    }
  }
  const ratings = Object.keys(bests).sort((a, b) => a - b);
  if (ratings.length === 0) {
    $('personalBests').classList.add('hidden');
    return;
  }
  $('personalBests').classList.remove('hidden');
  $('personalBests').innerHTML = `
    <div class="pb-title">🏆 Personal Bests</div>
    ${ratings.map(r => `
      <div class="pb-item">
        <span>Rating ${r}</span>
        <span>${bests[r].timeStr}</span>
      </div>
    `).join('')}
  `;
}

function toggleReviewLater(entry) {
  chrome.storage.local.get(['spacedRepetitionQueue'], (s) => {
    let queue = s.spacedRepetitionQueue || [];
    const exists = queue.findIndex(q => q.entryDate === entry.date);
    if (exists >= 0) {
      queue.splice(exists, 1);
    } else {
      const now = Date.now();
      queue.push({
        entryDate: entry.date,
        problem: entry.problem,
        reviewDates: [
          now + 3 * 86400000,  // 3 days
          now + 7 * 86400000,  // 7 days
          now + 14 * 86400000  // 14 days
        ],
        nextReviewIdx: 0
      });
    }
    chrome.storage.local.set({ spacedRepetitionQueue: queue }, () => loadHistory());
  });
}

function updateHistoryBadge(srQueue) {
  const now = Date.now();
  const dueCount = srQueue.filter(q => {
    const nextIdx = q.nextReviewIdx || 0;
    return nextIdx < q.reviewDates.length && q.reviewDates[nextIdx] <= now;
  }).length;
  const badge = $('historyBadge');
  if (dueCount > 0) {
    badge.textContent = dueCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/* ===== CLEAR HISTORY ===== */
$('clearHistoryBtn').addEventListener('click', () => {
  if (confirm('Clear all solve history? This cannot be undone.')) {
    chrome.storage.local.set({ history: [] }, () => loadHistory());
  }
});

/* ===== EXPORT CSV ===== */
$('exportCsvBtn').addEventListener('click', exportHistoryCSV);
$('exportHistoryCsv').addEventListener('click', exportHistoryCSV);

function exportHistoryCSV() {
  chrome.storage.local.get(['history'], (s) => {
    const history = s.history || [];
    if (history.length === 0) return alert('No history to export.');
    const header = 'Problem,Time,Phase,Date,Source,Rating,Note\n';
    const rows = history.map(e =>
      `"${e.problem}","${e.timeStr}","Phase ${e.phase}","${new Date(e.date).toLocaleDateString()}","${e.source}","${e.rating || ''}","${(e.note || '').replace(/"/g, '""')}"`
    ).join('\n');
    downloadFile(header + rows, 'solve-history.csv', 'text/csv');
  });
}

/* ===== EXPORT R10 JSON ===== */
$('exportR10Json').addEventListener('click', () => {
  chrome.storage.local.get([
    'r10Streak', 'r10TargetRating', 'r10FreezeTokens',
    'r10MasteredRatings', 'r10TotalStreakSolves', 'longestStreak',
    'history', 'heatmapData', 'ratingLog', 'weaknessTags',
    'dailyGoal', 'dailyGoalProgress', 'dailyGoalDayStreak'
  ], (s) => {
    downloadFile(JSON.stringify(s, null, 2), 'rule10-backup.json', 'application/json');
  });
});

/* ===== IMPORT BACKUP ===== */
$('importBackupBtn').addEventListener('click', () => $('importFileInput').click());
$('importFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      chrome.storage.local.set(data, () => {
        alert('Backup restored successfully!');
        location.reload();
      });
    } catch (err) {
      alert('Invalid backup file.');
    }
  };
  reader.readAsText(file);
});

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===== RULE OF 10 TAB ===== */
$('r10RatingSelect').addEventListener('change', (e) => {
  const rating = parseInt(e.target.value);
  if (confirm('Changing target rating will reset your streak to 0. Continue?')) {
    sendMsg({ type: 'R10_CHANGE_RATING', rating });
    renderStreakDots(0);
  } else {
    chrome.storage.local.get(['r10TargetRating'], (s) => {
      e.target.value = s.r10TargetRating || 1200;
    });
  }
});

$('r10SolvedBtn').addEventListener('click', () => {
  sendMsg({ type: 'R10_MANUAL_SOLVE', elapsedSec: 44 * 60 }); // ≤ 45 min
  chrome.storage.local.get(['r10Streak'], (s) => {
    renderStreakDots((s.r10Streak || 0) + 1);
  });
  setTimeout(loadR10State, 500);
});

$('r10EditorialBtn').addEventListener('click', async () => {
  const s = await sendMsg({ type: 'GET_STATE' });
  const freeze = s.r10FreezeTokens || 0;
  if (freeze > 0) {
    const useFr = confirm(`You have ${freeze} freeze token(s). Use one to protect your streak?`);
    await r10HandleEditorial(useFr);
  } else {
    await r10HandleEditorial(false);
  }
  setTimeout(loadR10State, 500);
});

$('useFreezeBtn').addEventListener('click', async () => {
  const res = await sendMsg({ type: 'USE_FREEZE' });
  if (res && res.ok) {
    renderFreezeTokens(res.freezeTokens);
  }
});

/* ===== CF TAB ===== */
async function loadCFTab() {
  chrome.storage.local.get(['cfHandle', 'cfAutoMode', 'partnerHandle'], (s) => {
    if (s.cfHandle) {
      $('cfHandleInput').value = s.cfHandle;
      renderCFProfile(s.cfHandle);
    }
    $('cfAutoToggle').checked = s.cfAutoMode !== false;
    $('cfModeLabel').textContent = s.cfAutoMode !== false ? '⚡ Auto Mode' : '🟡 Manual Mode';
    if (s.partnerHandle) {
      $('partnerHandleInput').value = s.partnerHandle;
    }
  });

  // Load contest
  loadContest();

  // Load weakness
  loadWeakness();
}

$('cfLoadBtn').addEventListener('click', async () => {
  const handle = $('cfHandleInput').value.trim();
  if (!handle) return;
  chrome.storage.local.set({ cfHandle: handle });
  await renderCFProfile(handle);
});

async function renderCFProfile(handle) {
  const profile = await loadCFProfile(handle);
  if (profile.error) {
    $('cfProfile').classList.add('hidden');
    return;
  }
  $('cfProfile').classList.remove('hidden');
  $('cfHandleDisplay').textContent = profile.handle;
  $('cfHandleDisplay').style.color = profile.rankColor;
  $('cfRankDisplay').textContent = profile.rank;
  $('cfRankDisplay').style.color = profile.rankColor;
  $('cfRatingDisplay').textContent = `Rating: ${profile.rating} (Max: ${profile.maxRating})`;

  const avatar = $('cfAvatar');
  if (profile.avatar) {
    const imgUrl = profile.avatar.startsWith('//') ? 'https:' + profile.avatar : profile.avatar;
    avatar.src = imgUrl;
    avatar.onerror = () => { avatar.src = 'icons/icon48.png'; };
  } else {
    avatar.src = 'icons/icon48.png';
  }
}

$('cfAutoToggle').addEventListener('change', (e) => {
  const auto = e.target.checked;
  chrome.storage.local.set({ cfAutoMode: auto });
  $('cfModeLabel').textContent = auto ? '⚡ Auto Mode' : '🟡 Manual Mode';
});

/* ===== CONTEST COUNTDOWN ===== */
async function loadContest() {
  const contest = await fetchUpcomingContest();
  if (!contest) {
    $('contestName').textContent = 'No upcoming contests';
    $('contestCountdown').textContent = '';
    return;
  }
  $('contestName').textContent = `${contest.name} (${contest.type})`;
  $('contestLink').href = contest.url;
  updateContestCountdown(contest.startMs);
  if (contestCountdownInterval) clearInterval(contestCountdownInterval);
  contestCountdownInterval = setInterval(() => updateContestCountdown(contest.startMs), 60000);
}

function updateContestCountdown(startMs) {
  $('contestCountdown').textContent = formatCountdown(startMs);
}

/* ===== ACCOUNTABILITY PARTNER ===== */
$('partnerLoadBtn').addEventListener('click', async () => {
  const handle = $('partnerHandleInput').value.trim();
  if (!handle) return;
  chrome.storage.local.set({ partnerHandle: handle });
  const stats = await fetchPartnerStats(handle);
  if (!stats) {
    $('partnerStats').classList.add('hidden');
    return;
  }
  $('partnerStats').classList.remove('hidden');

  // Get your today count
  chrome.storage.local.get(['heatmapData'], (s) => {
    const heatmap = s.heatmapData || {};
    const today = new Date().toISOString().slice(0, 10);
    const myCount = heatmap[today] ? heatmap[today].count : 0;

    $('partnerCompare').innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <div><strong>You:</strong> ${myCount} today</div>
        <div><strong>${stats.handle}:</strong> ${stats.todayCount} today</div>
      </div>
      <div style="font-size:10px;color:var(--text-muted)">
        ${stats.todayCount > myCount ? `Your friend solved ${stats.todayCount - myCount} more! Keep going! 💪` :
          myCount > stats.todayCount ? `You're ahead by ${myCount - stats.todayCount}! Great work! 🔥` :
          'Tied! Race to solve the next one! 🏁'}
      </div>
    `;
  });
});

/* ===== WEAKNESS DETECTOR ===== */
function loadWeakness() {
  chrome.storage.local.get(['weaknessTags', 'totalSolvedAllTime'], (s) => {
    const wt = s.weaknessTags || {};
    const total = s.totalSolvedAllTime || 0;
    if (total < 5) {
      $('weaknessTags').textContent = `Solve ${5 - total} more problems to detect weaknesses`;
      return;
    }

    // Find tags with highest avg time
    const tagStats = Object.entries(wt).map(([tag, data]) => ({
      tag,
      avg: data.totalTime / data.count,
      count: data.count,
      slowPct: data.slowCount / data.count
    }));

    tagStats.sort((a, b) => b.avg - a.avg);
    const weakest = tagStats.slice(0, 5);

    if (weakest.length === 0) {
      $('weaknessTags').textContent = 'Not enough data yet';
      return;
    }

    $('weaknessTags').innerHTML = 'You struggle most with: ' +
      weakest.map(t => `<span class="weak-tag">${t.tag}</span>`).join(' ');
  });
}

/* ===== STATS TAB ===== */
function loadStats() {
  chrome.storage.local.get(null, (s) => {
    const history = s.history || [];
    const allTimeTotal = s.totalSolvedAllTime || 0;

    // Total solved
    $('statTotalSolved').textContent = allTimeTotal;

    // Average time
    if (history.length > 0) {
      const avg = history.reduce((sum, e) => sum + e.time, 0) / history.length;
      $('statAvgTime').textContent = fmtTimeStr(Math.floor(avg));
    }

    // Solve rate ≤ 45 min
    if (history.length > 0) {
      const under45 = history.filter(e => e.time <= 45 * 60).length;
      $('statSolveRate').textContent = `${Math.round(under45 / history.length * 100)}%`;
    }

    // Best time
    if (history.length > 0) {
      const best = Math.min(...history.map(e => e.time));
      $('statBestTime').textContent = fmtTimeStr(best);
    }

    // Longest streak
    $('statLongestStreak').textContent = s.longestStreak || 0;

    // Day streak
    $('statDayStreak').textContent = s.dailyGoalDayStreak || 0;

    // Phase breakdown
    renderPhaseBreakdown(history);

    // Heatmap
    renderHeatmap(s.heatmapData || {});

    // Rating progression
    renderRatingProgression(s.ratingLog || []);

    // Problems per rating
    renderRatingBarChart(history);

    // Rating milestones
    renderRatingMilestones(s.ratingLog || []);
  });
}

function renderPhaseBreakdown(history) {
  const container = $('phaseBreakdown');
  const phaseCounts = [0, 0, 0, 0, 0, 0];
  for (const e of history) {
    if (e.phase >= 1 && e.phase <= 6) phaseCounts[e.phase - 1]++;
  }
  const maxCount = Math.max(1, ...phaseCounts);

  container.innerHTML = PHASES.map((p, i) => `
    <div class="pb-row">
      <span class="pb-label" style="color:${p.color}">P${i + 1}</span>
      <div class="pb-bar-track">
        <div class="pb-bar-fill" style="width:${(phaseCounts[i] / maxCount) * 100}%;background:${p.color}"></div>
      </div>
      <span class="pb-value">${phaseCounts[i]}</span>
    </div>
  `).join('');
}

function renderHeatmap(data) {
  const container = $('heatmapContainer');
  container.innerHTML = '';

  // Last 12 weeks (84 days)
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayData = data[key];
    const count = dayData ? Math.min(dayData.count, 5) : 0;
    const avgTime = dayData && dayData.count > 0 ? fmtTimeStr(Math.floor(dayData.totalTime / dayData.count)) : '0m 0s';

    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.dataset.count = count;
    cell.innerHTML = `<span class="heatmap-tooltip">${key}: ${dayData ? dayData.count : 0} problems · avg ${avgTime}</span>`;
    container.appendChild(cell);
  }
}

function renderRatingProgression(ratingLog) {
  const container = $('ratingChart');
  if (ratingLog.length < 2) {
    container.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:10px">Log at least 2 ratings to see the chart</div>';
    $('ratingGain').classList.add('hidden');
    return;
  }

  // Simple sparkline using SVG
  const values = ratingLog.map(r => r.rating);
  const minR = Math.min(...values) - 50;
  const maxR = Math.max(...values) + 50;
  const range = maxR - minR || 1;
  const w = 360;
  const h = 50;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - minR) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  container.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - minR) / range) * h;
        return `<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)"/>`;
      }).join('')}
    </svg>
  `;

  // Rating gain
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  if (diff !== 0) {
    $('ratingGain').classList.remove('hidden');
    $('ratingGain').textContent = diff > 0
      ? `📈 You've gained +${diff} rating since using this extension!`
      : `📉 Rating changed by ${diff} since using this extension`;
    $('ratingGain').style.color = diff > 0 ? 'var(--success)' : 'var(--danger)';
  }
}

function renderRatingMilestones(ratingLog) {
  const milestones = [1000, 1200, 1400, 1600, 1800, 2000, 2200];
  const maxRating = ratingLog.length > 0 ? Math.max(...ratingLog.map(r => r.rating)) : 0;

  $('ratingMilestones').innerHTML = milestones.map(m =>
    `<span class="milestone ${maxRating >= m ? 'achieved' : ''}">${maxRating >= m ? '🏅' : '🔒'} ${m}</span>`
  ).join('');
}

$('logRatingBtn').addEventListener('click', () => {
  const val = parseInt($('ratingInput').value);
  if (!val || val < 0 || val > 4000) return;
  chrome.storage.local.get(['ratingLog'], (s) => {
    const log = s.ratingLog || [];
    log.push({ rating: val, date: new Date().toISOString() });
    chrome.storage.local.set({ ratingLog: log }, () => {
      $('ratingInput').value = '';
      loadStats();
    });
  });
});

function renderRatingBarChart(history) {
  const container = $('ratingBarChart');
  const ratingCounts = {};
  for (const e of history) {
    if (e.rating) {
      const bucket = Math.floor(e.rating / 100) * 100;
      ratingCounts[bucket] = (ratingCounts[bucket] || 0) + 1;
    }
  }

  const buckets = Object.keys(ratingCounts).sort((a, b) => a - b);
  if (buckets.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center">No rated problems yet</div>';
    return;
  }

  const maxCount = Math.max(...Object.values(ratingCounts));
  container.innerHTML = buckets.map(b => `
    <div class="rbc-col">
      <div class="rbc-bar" style="height:${(ratingCounts[b] / maxCount) * 60}px"></div>
      <span class="rbc-label">${b}</span>
    </div>
  `).join('');
}

/* ===== KEYBOARD SHORTCUTS ===== */
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
    e.preventDefault();
    chrome.storage.local.get(['isRunning', 'solved'], (s) => {
      if (!s.isRunning && !s.solved) {
        $('newProblemBtn').click();
      } else if (s.isRunning && !s.solved) {
        $('solvedBtn').click();
      }
    });
  }
});

/* ===== LISTEN FOR BACKGROUND MESSAGES ===== */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CF_AC_FOUND') {
    clearInterval(timerInterval);
    clearInterval(cfPollInterval);
    clearInterval(quoteInterval);
    timerInterval = null;
    cfPollInterval = null;
    quoteInterval = null;

    // Show solved
    showSolvedBanner(msg.problem, msg.timeStr);
  }
  if (msg.type === 'PHASE_CHANGE') {
    showAlarmOverlay(msg.phase - 1);
  }
});

/* ===== INIT ON LOAD ===== */
async function init() {
  // Load theme
  chrome.storage.local.get(['theme'], (s) => {
    if (s.theme === 'light') {
      document.body.classList.add('light-theme');
      $('themeToggle').textContent = '☀️';
    }
  });

  // Check if timer is running
  const state = await sendMsg({ type: 'GET_STATE' });
  if (state && state.isRunning && !state.solved) {
    showTimerRunning();
    startTimerTick();
    startQuoteRotation();
    startCFPolling();

    // Restore phase
    const pauseAcc = state.pauseAccumulated || 0;
    const elapsed = Date.now() - state.startTime - pauseAcc;
    const elapsedSec = Math.floor(elapsed / 1000);
    currentPhase = getPhaseIdx(elapsedSec / 60);
    updatePhaseUI(currentPhase);
    updatePhaseDots(currentPhase);

    if (state.isPaused) {
      $('pauseBtn').classList.add('hidden');
      $('resumeBtn').classList.remove('hidden');
      $('timerDisplay').style.opacity = '0.5';
    }
    if (state.pauseCount > 0) {
      $('pauseCount').textContent = state.pauseCount;
      $('pauseInfo').classList.remove('hidden');
    }
  } else if (state && state.solved && state.lastSolve) {
    showSolvedBanner(state.lastSolve.problem, state.lastSolve.timeStr);
  }

  // Load daily goal bar if exists
  loadDailyGoalBar();

  // Load spaced repetition badge
  chrome.storage.local.get(['spacedRepetitionQueue'], (s) => {
    updateHistoryBadge(s.spacedRepetitionQueue || []);
  });

  // Load R10 badge
  chrome.storage.local.get(['r10Streak'], (s) => {
    const badge = $('r10Badge');
    if (s.r10Streak > 0) {
      badge.textContent = s.r10Streak;
      badge.classList.remove('hidden');
    }
  });
}

init();
