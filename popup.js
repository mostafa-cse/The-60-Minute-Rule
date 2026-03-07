const STEPS = [
  { id: 1, name: "Reconnaissance",     start: 0,  end: 5,  tip: "Read the problem twice. Check constraints. Guess the intended time complexity. Do NOT touch the keyboard." },
  { id: 2, name: "Observation",        start: 5,  end: 25, tip: "No keyboard. Pen and paper only. Draw sample cases. Find the math/logic invariant." },
  { id: 3, name: "Attack It",          start: 25, end: 35, tip: "Try to break your logic with extreme edge cases (e.g., N=1, all zeros, sorted array)." },
  { id: 4, name: "Code It",            start: 35, end: 45, tip: "Only touch the keyboard if your logic survived your own attacks. Code clean." },
  { id: 5, name: "The Struggle",       start: 45, end: 60, tip: "Debug or rethink. If completely stuck, write down what you know and isolate the gap." },
  { id: 6, name: "Editorial Protocol", start: 60, end: 90, tip: "Read only the first hint. Close the tab. Wait 30 minutes. Code the solution entirely from memory." }
];

let tickInterval   = null;
let alarmInterval  = null;
let lastStepIndex  = -1;
let alarmCountdown = 0;

// ── Audio beep using Web Audio API ──
let audioCtx = null;
function playBeep() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) { /* audio not available */ }
}

// ── Helpers ──
function getStepIndex(elapsedMin) {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (elapsedMin >= STEPS[i].start) return i;
  }
  return 0;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Alarm overlay: show for 10 seconds, beep every second ──
function triggerAlarm(stepIndex) {
  const step = STEPS[stepIndex];
  document.getElementById("alarmPhase").textContent = `Phase ${step.id}: ${step.name}`;
  document.getElementById("alarmTip").textContent   = step.tip;
  alarmCountdown = 10;
  document.getElementById("alarmCountdown").textContent = alarmCountdown;
  document.getElementById("alarmOverlay").classList.add("show");
  playBeep();

  if (alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(() => {
    alarmCountdown--;
    document.getElementById("alarmCountdown").textContent = alarmCountdown;
    playBeep();
    if (alarmCountdown <= 0) {
      clearInterval(alarmInterval);
      alarmInterval = null;
      document.getElementById("alarmOverlay").classList.remove("show");
    }
  }, 1000);
}

// ── Render all 6 steps in sidebar list ──
function renderSteps(currentIndex) {
  const list = document.getElementById("stepsList");
  list.innerHTML = "";
  STEPS.forEach((step, i) => {
    const cls = i < currentIndex ? "done" : i === currentIndex ? "active" : "future";
    const numLabel = i < currentIndex ? "✓" : step.id;
    const rangeText = step.end === 90 ? "60+ min" : `${step.start}–${step.end} min`;
    const row = document.createElement("div");
    row.className = `step-row ${cls}`;
    row.innerHTML = `
      <div class="step-num">${numLabel}</div>
      <div class="step-label">
        <span class="step-label-name">${step.name}</span>
        <span class="step-label-range">${rangeText}</span>
      </div>`;
    list.appendChild(row);
  });
}

// ── Update entire popup UI ──
function updateUI(elapsedSec, stepIndex) {
  const step = STEPS[stepIndex];
  const elapsedMin = elapsedSec / 60;

  // Timer display
  document.getElementById("timerDisplay").textContent = formatTime(elapsedSec);

  // Progress bar (0–60 min maps to 0–100%)
  const pct = Math.min((elapsedMin / 60) * 100, 100);
  document.getElementById("barFill").style.width = pct + "%";

  // Current phase card
  document.getElementById("phaseBadge").textContent = `Phase ${step.id}`;
  document.getElementById("phaseName").textContent  = step.name;
  document.getElementById("phaseRange").textContent = step.end === 90 ? "60+ min" : `${step.start}–${step.end} min`;
  document.getElementById("phaseTip").textContent   = step.tip;

  // Detect phase change → trigger alarm
  if (lastStepIndex !== -1 && stepIndex !== lastStepIndex) {
    triggerAlarm(stepIndex);
  }
  lastStepIndex = stepIndex;

  renderSteps(stepIndex);
}

// ── Tick every second ──
function startTick() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    chrome.storage.local.get(["startTime", "isRunning"], (data) => {
      if (!data.isRunning || !data.startTime) return;
      const elapsedSec = Math.floor((Date.now() - data.startTime) / 1000);
      updateUI(elapsedSec, getStepIndex(elapsedSec / 60));
    });
  }, 1000);
}

// ── Button state helpers ──
function showRunning() {
  document.getElementById("startBtn").classList.add("hidden");
  document.getElementById("solvedBtn").classList.remove("hidden");
  document.getElementById("resetBtn").classList.remove("hidden");
  document.getElementById("solvedBanner").classList.add("hidden");
}

function showIdle() {
  if (tickInterval)  clearInterval(tickInterval);
  if (alarmInterval) clearInterval(alarmInterval);
  document.getElementById("alarmOverlay").classList.remove("show");
  document.getElementById("startBtn").classList.remove("hidden");
  document.getElementById("startBtn").textContent = "▶ Start";
  document.getElementById("solvedBtn").classList.add("hidden");
  document.getElementById("resetBtn").classList.add("hidden");
  document.getElementById("solvedBanner").classList.add("hidden");
  document.getElementById("timerDisplay").textContent = "00:00";
  document.getElementById("barFill").style.width = "0%";
  lastStepIndex = -1;
  updateUI(0, 0);
}

function showSolved(elapsedSec) {
  if (tickInterval) clearInterval(tickInterval);
  document.getElementById("startBtn").classList.remove("hidden");
  document.getElementById("startBtn").textContent = "▶ New Problem";
  document.getElementById("solvedBtn").classList.add("hidden");
  document.getElementById("resetBtn").classList.remove("hidden");
  document.getElementById("solvedTime").textContent = formatTime(elapsedSec);
  document.getElementById("solvedBanner").classList.remove("hidden");
}

// ── Init on popup open ──
document.addEventListener("DOMContentLoaded", () => {
  renderSteps(0);
  updateUI(0, 0);

  // Restore state from storage
  chrome.storage.local.get(["startTime", "isRunning", "solved", "solvedAt"], (data) => {
    if (data.solved && data.startTime && data.solvedAt) {
      const elapsedSec = Math.floor((data.solvedAt - data.startTime) / 1000);
      showSolved(elapsedSec);
      updateUI(elapsedSec, getStepIndex(elapsedSec / 60));
    } else if (data.isRunning && data.startTime) {
      const elapsedSec = Math.floor((Date.now() - data.startTime) / 1000);
      lastStepIndex = getStepIndex(elapsedSec / 60);
      showRunning();
      updateUI(elapsedSec, lastStepIndex);
      startTick();
    } else {
      showIdle();
    }
  });

  // ▶ Start / New Problem
  document.getElementById("startBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "START_TIMER" }, () => {
      lastStepIndex = 0;
      showRunning();
      updateUI(0, 0);
      startTick();
    });
  });

  // ✅ Solved
  document.getElementById("solvedBtn").addEventListener("click", () => {
    chrome.storage.local.get(["startTime"], (data) => {
      const elapsedSec = data.startTime
        ? Math.floor((Date.now() - data.startTime) / 1000)
        : 0;
      chrome.runtime.sendMessage({ type: "MARK_SOLVED" }, () => {
        showSolved(elapsedSec);
      });
    });
  });

  // ↺ Reset
  document.getElementById("resetBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_TIMER" }, () => {
      showIdle();
    });
  });
});
