/* ══════════════════════════════════════════
   CODEFORCES INTEGRATION — cf.js
   Uses public CF API (no auth needed)
══════════════════════════════════════════ */

const CF_API = 'https://codeforces.com/api/';
const CF_PROBLEM_URL = 'https://codeforces.com/problemset/problem/';

// ── API helpers ──
async function cfGet(endpoint) {
  const resp = await fetch(CF_API + endpoint);
  if (!resp.ok) throw new Error('Network error: ' + resp.status);
  const json = await resp.json();
  if (json.status !== 'OK') throw new Error(json.comment || 'CF API error');
  return json.result;
}

async function fetchUserInfo(handle) {
  const result = await cfGet('user.info?handles=' + encodeURIComponent(handle));
  return result[0];
}

async function fetchSolvedSet(handle) {
  const subs = await cfGet('user.status?handle=' + encodeURIComponent(handle) + '&from=1&count=10000');
  const solved = new Set();
  subs.forEach(function(sub) {
    if (sub.verdict === 'OK' && sub.problem) {
      solved.add(sub.problem.contestId + '-' + sub.problem.index);
    }
  });
  return solved;
}



// ── UI helpers ──
function setStatus(msg, type) {
  var el = document.getElementById('cfStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'cf-status ' + (type || '');
}

function showLoading(show) {
  var el = document.getElementById('cfLoading');
  if (el) el.classList.toggle('hidden', !show);
}

function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function renderProblems(problems) {
  var list  = document.getElementById('cfProblemList');
  var empty = document.getElementById('cfEmpty');
  if (!list) return;

  list.innerHTML = '';

  if (!problems || problems.length === 0) {
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  // Show 10 random unsolved problems
  var shown = shuffleArray(problems).slice(0, 10);

  shown.forEach(function(p) {
    var tags    = (p.tags || []).slice(0, 3).join(', ') || 'no tags';
    var pid     = p.contestId + p.index;
    var cfUrl   = CF_PROBLEM_URL + p.contestId + '/' + p.index;
    var card    = document.createElement('div');
    card.className = 'cf-problem-card';
    card.innerHTML =
      '<div class="cf-problem-top">' +
        '<span class="cf-problem-name">' + escHtml(p.name) + '</span>' +
        '<span class="cf-problem-id">'   + escHtml(pid)    + '</span>' +
      '</div>' +
      '<div class="cf-problem-tags">🏷 ' + escHtml(tags) + '</div>' +
      '<div class="cf-problem-actions">' +
        '<button class="btn-cf-open"         data-url="' + cfUrl + '">Open CF →</button>' +
        '<button class="btn-cf-start-timer"  data-name="' + escHtml(p.name) + '" data-url="' + cfUrl + '">⏱ Start Timer</button>' +
      '</div>';
    list.appendChild(card);
  });

  // Open in CF
  list.querySelectorAll('.btn-cf-open').forEach(function(btn) {
    btn.addEventListener('click', function() {
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });

  // Start timer for problem
  list.querySelectorAll('.btn-cf-start-timer').forEach(function(btn) {
    btn.addEventListener('click', function() {
      // Fill problem name in timer tab
      var nameInput = document.getElementById('problemName');
      if (nameInput) nameInput.value = btn.dataset.name;
      // Open CF in tab
      chrome.tabs.create({ url: btn.dataset.url });
      // Switch to Timer tab and start (retry loop — no fragile timeout)
      document.getElementById('tabTimer').click();
      var _att = 0, _try = setInterval(function() {
        _att++;
        var startBtn = document.getElementById('startBtn');
        if (startBtn && !startBtn.classList.contains('hidden')) {
          clearInterval(_try); startBtn.click();
        } else if (_att >= 5) { clearInterval(_try); }
      }, 100);
    });
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Main load function ──
async function cfLoadProblems(forceRefetch) {
  var handle       = (document.getElementById('cfUsername').value || '').trim();
  var ratingEl     = document.getElementById('cfTargetRating');
  var targetRating = ratingEl ? parseInt(ratingEl.value) || 0 : 0;

  showLoading(true);
  setStatus('', '');

  try {
    var solvedSet = new Set();

    if (handle) {
      setStatus('Fetching user info…', 'info');
      var user = await fetchUserInfo(handle);

      var card = document.getElementById('cfUserCard');
      document.getElementById('cfAvatar').src         = user.titlePhoto || '';
      document.getElementById('cfHandle').textContent = user.handle;
      document.getElementById('cfRank').textContent   = (user.rank || 'unrated');
      document.getElementById('cfRating').textContent = user.rating || '—';

      var RANK_COLORS = {
        'newbie':'#808080','pupil':'#008000','specialist':'#03a89e',
        'expert':'#0000ff','candidate master':'#aa00aa','master':'#ff8c00',
        'international master':'#ff8c00','grandmaster':'#ff0000',
        'international grandmaster':'#ff0000','legendary grandmaster':'#ff0000'
      };
      document.getElementById('cfRank').style.color =
        RANK_COLORS[(user.rank || '').toLowerCase()] || '#8b949e';
      card.classList.remove('hidden');

      setStatus('Fetching solved problems…', 'info');
      solvedSet = await fetchSolvedSet(handle);
      chrome.storage.local.set({ cfHandle: handle, cfSolvedCount: solvedSet.size });
    } else {
      document.getElementById('cfUserCard').classList.add('hidden');
    }

    // ── Fetch problem list ──
    setStatus('Fetching problems…', 'info');
    var endpoint = 'problemset.problems';
    if (targetRating) {
      endpoint += '?maxDifficultyRating=' + targetRating +
                  '&minDifficultyRating=' + (targetRating - 200);
    }
    var result      = await cfGet(endpoint);
    var allProblems = (result && result.problems) ? result.problems : [];

    // Filter out solved problems
    var unsolved = allProblems.filter(function(p) {
      return !solvedSet.has(p.contestId + '-' + p.index);
    });

    // Narrow to exact target rating if set
    if (targetRating) {
      unsolved = unsolved.filter(function(p) { return p.rating === targetRating; });
    }

    renderProblems(unsolved);

    var statusMsg = handle
      ? 'Loaded ' + unsolved.length + ' unsolved · ' + solvedSet.size + ' solved ✓'
      : 'Loaded ' + unsolved.length + ' problems ✓';
    setStatus(statusMsg, 'ok');

  } catch(err) {
    setStatus('❌ ' + (err.message || 'Unknown error'), 'err');
    document.getElementById('cfUserCard').classList.add('hidden');
    renderProblems([]);
  } finally {
    showLoading(false);
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', function() {


  // ── Auto-detect toggle ──
  var autoToggle = document.getElementById('cfAutoToggle');
  var modeBadge  = document.getElementById('cfModeBadge');
  var autoSub    = document.getElementById('cfAutoSub');

  function updateToggleUI(isAuto) {
    if (!autoToggle) return;
    autoToggle.checked = isAuto;
    if (modeBadge) {
      modeBadge.textContent = isAuto ? '🔵 Auto Mode — timer stops on AC' : '🟡 Manual Mode — you get notified';
      modeBadge.className   = 'cf-mode-badge' + (isAuto ? ' auto' : '');
    }
    if (autoSub) {
      autoSub.textContent = isAuto
        ? 'AC detected → timer auto-stops + notification sent.'
        : 'AC detected → notification with Mark Solved / Keep Going.';
    }
  }

  // Restore saved toggle state
  chrome.storage.local.get(['cfAutoMode'], function(d) {
    updateToggleUI(!!d.cfAutoMode);
  });

  if (autoToggle) {
    autoToggle.addEventListener('change', function() {
      var isAuto = autoToggle.checked;
      chrome.storage.local.set({ cfAutoMode: isAuto });
      updateToggleUI(isAuto);
    });
  }

  // Restore saved handle
  chrome.storage.local.get(['cfHandle', 'r10'], function(data) {
    if (data.cfHandle) {
      var inp = document.getElementById('cfUsername');
      if (inp) inp.value = data.cfHandle;
    }
    // Sync Rule of 10 rating to CF filter
    if (data.r10 && data.r10.rating) {
      var sel = document.getElementById('cfTargetRating');
      if (sel) sel.value = data.r10.rating;
    }
  });

  // CF tab click
  var tabCF = document.getElementById('tabCF');
  if (tabCF) {
    tabCF.addEventListener('click', function() {
      document.querySelectorAll('.tab-pill').forEach(function(t) { t.classList.remove('active'); });
      tabCF.classList.add('active');
      document.getElementById('panelTimer').classList.add('hidden');
      document.getElementById('panelHistory').classList.add('hidden');
      document.getElementById('panelRule10').classList.add('hidden');
      document.getElementById('panelCF').classList.remove('hidden');
    });
  }

  // Load button
  var loadBtn = document.getElementById('cfLoadBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', function() { cfLoadProblems(true); });
  }

  // Enter key on input
  var inp = document.getElementById('cfUsername');
  if (inp) {
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') cfLoadProblems(true);
    });
  }

  // Refresh button (different problems at same rating)
  var refreshBtn = document.getElementById('cfRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() { cfLoadProblems(false); });
  }

  // Rating change
  var ratingSel = document.getElementById('cfTargetRating');
  if (ratingSel) {
    ratingSel.addEventListener('change', function() { cfLoadProblems(false); });
  }

});
