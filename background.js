const STEPS = [
  { id:1, name:"Reconnaissance",     start:0,  tip:"Read the problem twice. Do NOT touch the keyboard." },
  { id:2, name:"Observation",        start:5,  tip:"Pen & paper only. Draw cases. Find the invariant." },
  { id:3, name:"Attack It",          start:25, tip:"Break your logic: N=1, all zeros, sorted array." },
  { id:4, name:"Code It",            start:35, tip:"Logic survived? Only NOW touch the keyboard." },
  { id:5, name:"The Struggle",       start:45, tip:"Debug or rethink. Write what you know. Isolate the gap." },
  { id:6, name:"Editorial Protocol", start:60, tip:"Read ONLY the first hint. Close tab. Wait 30 min." }
];

const PHASE_COLORS = ["#58a6ff","#d2a8ff","#ff7b72","#39d353","#ffa657","#e3b341"];

function getStepIndex(elapsedMin) {
  const starts = [0, 5, 25, 35, 45, 60];
  for (let i = starts.length - 1; i >= 0; i--) {
    if (elapsedMin >= starts[i]) return i;
  }
  return 0;
}

// ── Offscreen document: create if not exists ──
async function ensureOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument();
    if (!existing) {
      await chrome.offscreen.createDocument({
        url:           'offscreen.html',
        reasons:       ['AUDIO_PLAYBACK'],
        justification: 'Play phase alarm beep sound for 10 seconds'
      });
    }
  } catch(e) {
    console.warn('Offscreen document error:', e);
  }
}

// ── Play alarm sound via offscreen ──
async function playPhaseAlarm(phaseIndex) {
  await ensureOffscreen();
  try {
    await chrome.runtime.sendMessage({
      type:       'PLAY_PHASE_ALARM',
      phaseIndex: phaseIndex
    });
  } catch(e) {}
}

// ── Toolbar icon: draw MM:SS on 32x32 canvas ──
function drawTimerIcon(elapsedSec, colorIndex) {
  const size   = 32;
  const canvas = new OffscreenCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const accent = PHASE_COLORS[colorIndex] || '#39d353';
  const min    = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
  const sec    = (elapsedSec % 60).toString().padStart(2, '0');

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = accent;
  ctx.lineWidth   = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.fillStyle    = accent;
  ctx.font         = 'bold 13px monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(min, size / 2, 10);
  ctx.strokeStyle = accent + '55';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(5, 16); ctx.lineTo(27, 16);
  ctx.stroke();
  ctx.fillStyle = accent + 'cc';
  ctx.font      = 'bold 11px monospace';
  ctx.fillText(sec, size / 2, 24);

  return ctx.getImageData(0, 0, size, size);
}

function setTimerIcon(elapsedSec, colorIndex) {
  try {
    chrome.action.setIcon({ imageData: { 32: drawTimerIcon(elapsedSec, colorIndex) } });
  } catch(e) {}
}

function resetIcon()  { chrome.action.setIcon({ path: { 48: 'icons/icon48.png' } }); }

function setSolvedIcon() {
  try {
    const canvas = new OffscreenCanvas(32, 32);
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#39d353';
    ctx.lineWidth   = 2;
    ctx.strokeRect(1, 1, 30, 30);
    ctx.fillStyle    = '#39d353';
    ctx.font         = 'bold 10px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DONE', 16, 16);
    chrome.action.setIcon({ imageData: { 32: ctx.getImageData(0, 0, 32, 32) } });
  } catch(e) {}
}

// ── Alarm fires here (wakes service worker) ──
chrome.alarms.onAlarm.addListener(async (alarm) => {

  // Phase transition alarm
  if (alarm.name.startsWith("phase-")) {
    const idx  = parseInt(alarm.name.split("-")[1]);
    const step = STEPS[idx];
    if (!step) return;

    // 1. System notification (visible even if popup closed)
    chrome.notifications.create(`notif-${Date.now()}`, {
      type:               'basic',
      iconUrl:            'icons/icon48.png',
      title:              `⏰ Phase ${step.id}: ${step.name}`,
      message:            step.tip,
      priority:           2,
      requireInteraction: false
    });

    // 2. Audio alarm via offscreen document (10-second beep)
    await playPhaseAlarm(idx);

    // 3. Update icon to new phase color
    chrome.storage.local.get(['startTime'], (data) => {
      if (data.startTime) {
        const elapsedSec = Math.floor((Date.now() - data.startTime) / 1000);
        setTimerIcon(elapsedSec, idx);
      }
    });
  }

  // Minute tick for icon update when popup is closed
  if (alarm.name === 'icon-tick') {
    chrome.storage.local.get(['startTime', 'isRunning'], (data) => {
      if (!data.isRunning || !data.startTime) return;
      const elapsedSec = Math.floor((Date.now() - data.startTime) / 1000);
      setTimerIcon(elapsedSec, getStepIndex(elapsedSec / 60));
      chrome.alarms.create('icon-tick', { delayInMinutes: 1 });
    });
  }
});

// ── Messages from popup ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'START_TIMER') {
    const startTime = Date.now();
    chrome.storage.local.set({ startTime, isRunning: true, solved: false, solvedAt: null });
    chrome.alarms.clearAll();
    STEPS.forEach((step, index) => {
      if (index > 0) {
        chrome.alarms.create(`phase-${index}`, {
          when: startTime + step.start * 60 * 1000
        });
      }
    });
    chrome.alarms.create('icon-tick', { delayInMinutes: 1 });
    setTimerIcon(0, 0);
    sendResponse({ ok: true, startTime });
  }

  if (msg.type === 'RESET_TIMER') {
    chrome.storage.local.set({ startTime: null, isRunning: false, solved: false, solvedAt: null });
    chrome.alarms.clearAll();
    resetIcon();
    sendResponse({ ok: true });
  }

  if (msg.type === 'MARK_SOLVED') {
    const solvedAt = Date.now();
    chrome.storage.local.set({ isRunning: false, solved: true, solvedAt });
    chrome.alarms.clearAll();
    setSolvedIcon();
    sendResponse({ ok: true, solvedAt });
  }

  return true;
});
