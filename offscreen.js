/* ===== OFFSCREEN.JS — Audio Playback via Web Audio API ===== */

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playBeep(freq, duration, count, gap) {
  const ctx = getAudioCtx();
  let t = ctx.currentTime;
  for (let i = 0; i < count; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
    t += duration + gap;
  }
}

function playPhaseAlarm() {
  // Three ascending beeps
  const ctx = getAudioCtx();
  const t = ctx.currentTime;
  const notes = [440, 554, 659]; // A4, C#5, E5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, t + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.2 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.2);
    osc.stop(t + i * 0.2 + 0.2);
  });
}

function playCelebration() {
  // Victory fanfare: ascending arpeggio
  const ctx = getAudioCtx();
  const t = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, t + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.15);
    osc.stop(t + i * 0.15 + 0.35);
  });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PLAY_ALARM') {
    if (msg.alarmType === 'celebration') {
      playCelebration();
    } else {
      playPhaseAlarm();
    }
  }
});
