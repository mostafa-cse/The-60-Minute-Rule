const STEPS = [
  { id:1, name:"Reconnaissance",     start:0,  end:5,  tip:"Read the problem twice. Check constraints. Guess the intended time complexity. Do NOT touch the keyboard." },
  { id:2, name:"Observation",        start:5,  end:25, tip:"No keyboard. Pen and paper only. Draw sample cases. Find the math/logic invariant." },
  { id:3, name:"Attack It",          start:25, end:35, tip:"Try to break your logic with extreme edge cases (e.g., N=1, all zeros, sorted array)." },
  { id:4, name:"Code It",            start:35, end:45, tip:"Only touch the keyboard if your logic survived your own attacks. Code clean." },
  { id:5, name:"The Struggle",       start:45, end:60, tip:"Debug or rethink. If completely stuck, write down what you know and isolate the gap." },
  { id:6, name:"Editorial Protocol", start:60, end:90, tip:"Read only the first hint. Close the tab. Wait 30 minutes. Code the solution entirely from memory." }
];

const PHASE_COLORS = ["#58a6ff","#d2a8ff","#ff7b72","#39d353","#ffa657","#e3b341"];

const PHASE_QUOTES = [
  ["Understand before you act.","Constraints are clues.","Read. Then read again."],
  ["Think on paper.","The diagram reveals the invariant.","Math first, code later."],
  ["If it breaks, it was wrong.","N=1 is your best friend.","Attack your own logic."],
  ["Clean code is fast code.","Think before you type.","One function, one job."],
  ["Bugs fear a systematic mind.","Isolate, then eliminate.","Stuck? Explain it out loud."],
  ["The hint is a key, not a door.","Close the tab. Think.","Memory builds mastery."]
];

const CIRCUMFERENCE = 339.29;

// ── Draw MM:SS on toolbar icon every second ──
function drawAndSetIcon(elapsedSec, stepIndex) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = 32;
    canvas.height = 32;
    const ctx    = canvas.getContext('2d');
    const accent = PHASE_COLORS[stepIndex] || '#39d353';
    const min    = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const sec    = (elapsedSec % 60).toString().padStart(2, '0');

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, 32, 32);

    ctx.strokeStyle = accent;
    ctx.lineWidth   = 2;
    ctx.strokeRect(1, 1, 30, 30);

    ctx.fillStyle    = accent;
    ctx.font         = 'bold 13px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(min, 16, 10);

    ctx.strokeStyle = accent + '55';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(5, 16); ctx.lineTo(27, 16);
    ctx.stroke();

    ctx.fillStyle = accent + 'cc';
    ctx.font      = 'bold 11px monospace';
    ctx.fillText(sec, 16, 23);

    const imageData = ctx.getImageData(0, 0, 32, 32);
    chrome.action.setIcon({ imageData: { 32: imageData } });
  } catch(e) {}
}



let tickInterval  = null;
let alarmInterval = null;
let lastStepIndex = -1;
let alarmCountdown = 0;
let audioCtx = null;

function playBeep() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch(e) {}
}

function getStepIndex(elapsedMin) {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (elapsedMin >= STEPS[i].start) return i;
  }
  return 0;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2,"0");
  const s = (totalSeconds % 60).toString().padStart(2,"0");
  return m + ":" + s;
}

function setAccentColor(stepIndex) {
  const color = PHASE_COLORS[stepIndex];
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-dim", color + "1a");
}

function triggerAlarm(stepIndex) {
  const step = STEPS[stepIndex];
  document.getElementById("alarmPhase").textContent = "Phase " + step.id + ": " + step.name;
  document.getElementById("alarmTip").textContent = step.tip;
  alarmCountdown = 10;
  document.getElementById("alarmCountdown").textContent = alarmCountdown;
  document.getElementById("alarmOverlay").classList.add("show");
  playBeep();
  if (alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(function() {
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

function renderPhaseDots(currentIndex) {
  var dots = document.getElementById("phaseDots");
  if (dots) {
    dots.innerHTML = "";
    STEPS.forEach(function(step, i) {
      var d = document.createElement("div");
      d.className = "phase-dot " + (i < currentIndex ? "done" : i === currentIndex ? "active" : "future");
      d.setAttribute("data-name", step.name);
      dots.appendChild(d);
    });
  }
  var numEl = document.getElementById("phaseNumCurrent");
  if (numEl) numEl.textContent = currentIndex + 1;
  var hint = document.getElementById("phaseNextHint");
  if (hint) {
    if (currentIndex < STEPS.length - 1) {
      var n = STEPS[currentIndex + 1];
      hint.textContent = "Next: " + n.name + " at " + n.start + " min";
    } else {
      hint.textContent = "Final phase — read only the first hint";
    }
  }
}

function updateUI(elapsedSec, stepIndex) {
  var step = STEPS[stepIndex];
  var elapsedMin = elapsedSec / 60;

  setAccentColor(stepIndex);

  var progress = Math.min(elapsedMin / 60, 1);
  var offset = CIRCUMFERENCE * (1 - progress);
  var ring = document.getElementById("progressRing");
  ring.style.strokeDashoffset = offset;
  ring.setAttribute("stroke", PHASE_COLORS[stepIndex]);

  document.getElementById("timerDisplay").textContent = formatTime(elapsedSec);
  document.getElementById("ringLabel").textContent = "Phase " + step.id;

  document.getElementById("phaseBadge").textContent = "Phase " + step.id;
  document.getElementById("phaseName").textContent  = step.name;
  document.getElementById("phaseRange").textContent = step.end === 90 ? "60+ min" : step.start + "–" + step.end + " min";
  document.getElementById("phaseTip").textContent   = step.tip;

  var quotes = PHASE_QUOTES[stepIndex];
  var quote  = quotes[Math.floor(elapsedSec / 30) % quotes.length];
  document.getElementById("phaseQuote").textContent = '"' + quote + '"';

  if (lastStepIndex !== -1 && stepIndex !== lastStepIndex) {
    triggerAlarm(stepIndex);
    var card = document.getElementById("phaseCard");
    card.classList.remove("flash","slide-in"); void card.offsetWidth; card.classList.add("flash","slide-in");
    setTimeout(function() { card.classList.remove("flash","slide-in"); }, 600);
  }
  lastStepIndex = stepIndex;
  renderPhaseDots(stepIndex);
}

function saveToHistory(problemName, elapsedSec, stepIndex) {
  chrome.storage.local.get(["history"], function(data) {
    var history = data.history || [];
    history.unshift({
      problem: problemName || "Unnamed Problem",
      time: formatTime(elapsedSec),
      phase: "Phase " + (stepIndex + 1),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    });
    chrome.storage.local.set({ history: history.slice(0, 50) });
  });
}

function renderHistory() {
  chrome.storage.local.get(["history"], function(data) {
    var history = data.history || [];
    var list  = document.getElementById("historyList");
    var empty = document.getElementById("historyEmpty");
    list.innerHTML = "";
    if (history.length === 0) { empty.classList.remove("hidden"); return; }
    empty.classList.add("hidden");
    history.forEach(function(item) {
      var div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML =
        '<div>' +
          '<div class="history-problem">' + item.problem + '</div>' +
          '<div class="history-meta">'    + item.date + ' &middot; ' + item.phase + '</div>' +
        '</div>' +
        '<div class="history-time">' + item.time + '</div>';
      list.appendChild(div);
    });
  });
}

function showRunning() {
  document.getElementById("startBtn").classList.add("hidden");
  document.getElementById("solvedBtn").classList.remove("hidden");
  document.getElementById("resetBtn").classList.remove("hidden");
  document.getElementById("solvedBanner").classList.add("hidden");
  document.getElementById("problemInputWrap").style.display = "none";
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
  document.getElementById("problemInputWrap").style.display = "block";
  document.getElementById("progressRing").style.strokeDashoffset = CIRCUMFERENCE;
  lastStepIndex = -1;
  setAccentColor(0);
  updateUI(0, 0);
}

function showSolved(elapsedSec) {
  if (tickInterval) clearInterval(tickInterval);
  document.getElementById("startBtn").classList.remove("hidden");
  document.getElementById("startBtn").textContent = "▶ New Problem";
  document.getElementById("solvedBtn").classList.add("hidden");
  document.getElementById("resetBtn").classList.remove("hidden");
  document.getElementById("problemInputWrap").style.display = "block";
  document.getElementById("solvedTime").textContent = formatTime(elapsedSec);
  document.getElementById("solvedBanner").classList.remove("hidden");
}

function startTick() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(function() {
    chrome.storage.local.get(["startTime","isRunning"], function(data) {
      if (!data.isRunning || !data.startTime) return;
      var elapsedSec = Math.floor((Date.now() - data.startTime) / 1000);
      updateUI(elapsedSec, getStepIndex(elapsedSec / 60));
      drawAndSetIcon(elapsedSec, getStepIndex(elapsedSec / 60));
    });
  }, 1000);
}

document.addEventListener("DOMContentLoaded", function() {
  renderPhaseDots(0);
  updateUI(0, 0);

  // Tab switching
  document.getElementById("tabTimer").addEventListener("click", function() {
    document.getElementById("tabTimer").classList.add("active");
    document.getElementById("tabHistory").classList.remove("active");
    document.getElementById("panelTimer").classList.remove("hidden");
    document.getElementById("panelHistory").classList.add("hidden");
    document.getElementById("panelRule10").classList.add("hidden");
    document.getElementById("panelCF").classList.add("hidden");
  });
  document.getElementById("tabHistory").addEventListener("click", function() {
    document.getElementById("tabHistory").classList.add("active");
    document.getElementById("tabTimer").classList.remove("active");
    document.getElementById("panelHistory").classList.remove("hidden");
    document.getElementById("panelTimer").classList.add("hidden");
    document.getElementById("panelRule10").classList.add("hidden");
    document.getElementById("panelCF").classList.add("hidden");
    renderHistory();
  });

  // Clear history
  document.getElementById("clearHistory").addEventListener("click", function() {
    chrome.storage.local.set({ history: [] }, function() { renderHistory(); });
  });

  // Restore state
  chrome.storage.local.get(["startTime","isRunning","solved","solvedAt"], function(data) {
    if (data.solved && data.startTime && data.solvedAt) {
      var elapsedSec = Math.floor((data.solvedAt - data.startTime) / 1000);
      showSolved(elapsedSec);
      updateUI(elapsedSec, getStepIndex(elapsedSec / 60));
      drawAndSetIcon(elapsedSec, getStepIndex(elapsedSec / 60));
    } else if (data.isRunning && data.startTime) {
      var elapsedSec = Math.floor((Date.now() - data.startTime) / 1000);
      lastStepIndex = getStepIndex(elapsedSec / 60);
      showRunning();
      updateUI(elapsedSec, lastStepIndex);
      startTick();
    } else {
      showIdle();
    }
  });

  // Start button
  document.getElementById("startBtn").addEventListener("click", function() {
    // Clear problem name if starting a new problem after marking solved
    chrome.storage.local.get(['solved'], function(d) {
      if (d.solved) {
        var inp = document.getElementById("problemName");
        if (inp) inp.value = "";
      }
    });
    chrome.runtime.sendMessage({ type: "START_TIMER" }, function() {
      lastStepIndex = 0;
      showRunning();
      updateUI(0, 0);
      startTick();
    });
  });

  // Solved button
  document.getElementById("solvedBtn").addEventListener("click", function() {
    chrome.storage.local.get(["startTime"], function(data) {
      var elapsedSec  = data.startTime ? Math.floor((Date.now() - data.startTime) / 1000) : 0;
      var stepIndex   = getStepIndex(elapsedSec / 60);
      var problemName = document.getElementById("problemName").value;
      saveToHistory(problemName, elapsedSec, stepIndex);
      chrome.runtime.sendMessage({ type: "MARK_SOLVED" }, function() {
        showSolved(elapsedSec);
        document.getElementById("problemName").value = "";
      });
    });
  });

  // Reset button
  document.getElementById("resetBtn").addEventListener("click", function() {
    chrome.runtime.sendMessage({ type: "RESET_TIMER" }, function() {
      showIdle();
    });
  });
});
