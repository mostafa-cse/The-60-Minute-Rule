/* ══════════════════════════════════════════
   OFFSCREEN DOCUMENT — Audio alarm player
   Runs hidden in background, has full DOM
══════════════════════════════════════════ */

let audioCtx = null;
let alarmTimer = null;

function getAudioCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function singleBeep(ctx, freq, startTime, duration) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.45, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playAlarmFor10Seconds(phaseIndex) {
  if (alarmTimer) clearInterval(alarmTimer);

  // Phase accent frequencies — match phase colors
  const FREQS = [660, 528, 880, 440, 660, 550];
  const freq  = FREQS[phaseIndex] || 880;
  let ticks   = 0;

  function tick() {
    try {
      const ctx = getAudioCtx();
      // Double-beep: two short pulses per second
      singleBeep(ctx, freq,       ctx.currentTime,       0.15);
      singleBeep(ctx, freq * 1.2, ctx.currentTime + 0.2, 0.15);
    } catch(e) {}
    ticks++;
    if (ticks >= 10) {
      clearInterval(alarmTimer);
      alarmTimer = null;
    }
  }

  tick(); // play immediately
  alarmTimer = setInterval(tick, 1000);
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PLAY_PHASE_ALARM') {
    playAlarmFor10Seconds(msg.phaseIndex || 0);
  }
  if (msg.type === 'STOP_ALARM') {
    if (alarmTimer) clearInterval(alarmTimer);
    alarmTimer = null;
  }
});
