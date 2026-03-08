let audioCtx   = null;
let alarmTimer = null;

// Pre-warm on load: unlock AudioContext before any alarm fires
(function preWarm() {
  try {
    audioCtx = new AudioContext();
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const s   = audioCtx.createBufferSource();
    s.buffer  = buf;
    s.connect(audioCtx.destination);
    s.start(0);
  } catch(e) {}
})();

async function getAudioCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch(e) {}
  }
  return audioCtx;
}

function singleBeep(ctx, freq, startTime, dur) {
  try {
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
  } catch(e) { console.warn('singleBeep error:', e); }
}

async function playAlarmFor10Seconds(phaseIndex) {
  if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }

  const FREQ_PAIRS = [
    [660, 780], [528, 660], [880, 1050],
    [440, 550], [660, 800], [550, 660]
  ];

  const pair = FREQ_PAIRS[phaseIndex] || [880, 1050];
  let ticks = 0;

  async function tick() {
    try {
      const ctx = await getAudioCtx();
      // Re-resume on every tick — context can re-suspend anytime
      if (ctx.state !== 'running') await ctx.resume();
      singleBeep(ctx, pair[0], ctx.currentTime,        0.18);
      singleBeep(ctx, pair[1], ctx.currentTime + 0.22, 0.18);
    } catch(e) { console.warn('Beep error:', e); }
    ticks++;
    if (ticks >= 10) { clearInterval(alarmTimer); alarmTimer = null; }
  }

  await tick();
  alarmTimer = setInterval(tick, 1000);
}


/* ─── 10-second CF Submission Polling ─── */
let cfPollInterval = null;

async function pollCFOnce() {
  try {
    const data = await chrome.storage.local.get(
      ['cfHandle','startTime','isRunning','cfLastAcId','cfAutoMode']
    );
    if (!data.isRunning || !data.startTime || !data.cfHandle) return;

    const resp = await fetch(
      'https://codeforces.com/api/user.status?handle=' +
      encodeURIComponent(data.cfHandle) + '&from=1&count=10'
    );
    const json = await resp.json();
    if (json.status !== 'OK') return;

    const acSub = json.result.find(sub =>
      sub.verdict === 'OK' &&
      sub.creationTimeSeconds * 1000 > data.startTime &&
      String(sub.id) !== String(data.cfLastAcId)
    );
    if (!acSub) return;

    // New AC found — save to prevent double-fire
    await chrome.storage.local.set({ cfLastAcId: String(acSub.id) });

    // Notify background to handle stop + notification
    chrome.runtime.sendMessage({
      type:          'CF_AC_FOUND',
      problemName:   acSub.problem.name || 'Unknown',
      submissionId:  String(acSub.id),
      autoMode:      !!data.cfAutoMode,
      startTime:     data.startTime
    }).catch(() => {});

  } catch(e) { /* network error — silent */ }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'START_CF_POLL') {
    if (cfPollInterval) clearInterval(cfPollInterval);
    cfPollInterval = setInterval(pollCFOnce, 10000);
    pollCFOnce(); // immediate first check
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'STOP_CF_POLL') {
    if (cfPollInterval) { clearInterval(cfPollInterval); cfPollInterval = null; }
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'PLAY_PHASE_ALARM') {
    playAlarmFor10Seconds(msg.phaseIndex || 0);
    sendResponse({ ok: true });
  }
  if (msg.type === 'STOP_ALARM') {
    if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
    if (audioCtx)  { audioCtx.close(); audioCtx = null; }
    sendResponse({ ok: true });
  }
  return true;
});
