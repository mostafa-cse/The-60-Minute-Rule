/* ══════════════════════════════════════════
   OFFSCREEN DOCUMENT — Audio alarm player
   Fixed: AudioContext suspend + race condition
══════════════════════════════════════════ */

let audioCtx   = null;
let alarmTimer = null;

async function getAudioCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
}

function singleBeep(ctx, freq, startTime, dur) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.5, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
  osc.start(startTime);
  osc.stop(startTime + dur);
}

async function playAlarmFor10Seconds(phaseIndex) {
  if (alarmTimer) clearInterval(alarmTimer);

  // Each phase has a distinct frequency pair
  const FREQ_PAIRS = [
    [660, 780],   // Phase 1 Reconnaissance  — calm
    [528, 660],   // Phase 2 Observation     — soft
    [880, 1050],  // Phase 3 Attack It       — sharp
    [440, 550],   // Phase 4 Code It         — firm
    [660, 800],   // Phase 5 The Struggle    — urgent
    [550, 660]    // Phase 6 Editorial       — mellow
  ];

  const pair = FREQ_PAIRS[phaseIndex] || [880, 1050];
  let ticks  = 0;

  async function tick() {
    try {
      const ctx = await getAudioCtx();
      singleBeep(ctx, pair[0], ctx.currentTime,       0.18);
      singleBeep(ctx, pair[1], ctx.currentTime + 0.22, 0.18);
    } catch(e) {
      console.warn('Beep error:', e);
    }
    ticks++;
    if (ticks >= 10) {
      clearInterval(alarmTimer);
      alarmTimer = null;
    }
  }

  await tick(); // play immediately on alarm
  alarmTimer = setInterval(tick, 1000);
}

// Ready — listen for messages from background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PLAY_PHASE_ALARM') {
    playAlarmFor10Seconds(msg.phaseIndex || 0);
    sendResponse({ ok: true });
  }
  if (msg.type === 'STOP_ALARM') {
    if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
    sendResponse({ ok: true });
  }
  return true;
});
