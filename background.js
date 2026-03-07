
const STEPS = [
  { id: 1, name: "Reconnaissance",      start: 0,  tip: "Read the problem twice. Do NOT touch the keyboard." },
  { id: 2, name: "Observation",         start: 5,  tip: "Pen & paper only. Draw cases. Find the invariant." },
  { id: 3, name: "Attack It",           start: 25, tip: "Break your logic: N=1, all zeros, sorted array." },
  { id: 4, name: "Code It",             start: 35, tip: "Logic survived? Only NOW touch the keyboard." },
  { id: 5, name: "The Struggle",        start: 45, tip: "Debug or rethink. Write what you know. Isolate the gap." },
  { id: 6, name: "Editorial Protocol",  start: 60, tip: "Read ONLY the first hint. Close tab. Wait 30 min. Code from memory." }
];

// Show a system notification when a phase alarm fires
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith("phase-")) return;
  const idx = parseInt(alarm.name.split("-")[1]);
  const step = STEPS[idx];
  if (!step) return;

  chrome.notifications.create(`notif-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: `⏰ Phase ${step.id}: ${step.name}`,
    message: step.tip,
    priority: 2,
    requireInteraction: false
  });
});

// Message handler from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "START_TIMER") {
    const startTime = Date.now();
    chrome.storage.local.set({ startTime, isRunning: true, solved: false, solvedAt: null });
    chrome.alarms.clearAll();

    // Set one alarm per phase transition (skip phase 1 — starts immediately)
    STEPS.forEach((step, index) => {
      if (index > 0) {
        chrome.alarms.create(`phase-${index}`, {
          when: startTime + step.start * 60 * 1000
        });
      }
    });

    sendResponse({ ok: true, startTime });
  }

  if (msg.type === "RESET_TIMER") {
    chrome.storage.local.set({ startTime: null, isRunning: false, solved: false, solvedAt: null });
    chrome.alarms.clearAll();
    sendResponse({ ok: true });
  }

  if (msg.type === "MARK_SOLVED") {
    const solvedAt = Date.now();
    chrome.storage.local.set({ isRunning: false, solved: true, solvedAt });
    chrome.alarms.clearAll();
    sendResponse({ ok: true, solvedAt });
  }

  return true; // keep message channel open for async
});
