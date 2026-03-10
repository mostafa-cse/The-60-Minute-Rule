/* ===== RULE10.JS — Rule of 10 Streak/Mastery Logic ===== */

/* 
  Rule of 10:
  - Solve ≤ 45 min → streak +1
  - Solve > 45 min → no change
  - Editorial used → streak = 0 (unless freeze token used)
  - Change target rating → streak = 0
  - 10 consecutive ≤ 45 min → mastery!
  - 1 freeze token earned per 5 consecutive solves, max 2
*/

/* ===== RENDER STREAK DOTS ===== */
function renderStreakDots(streak) {
  const dots = document.querySelectorAll('#streakDots .sdot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < streak);
  });
  const countEl = document.getElementById('streakCount');
  if (countEl) countEl.textContent = streak;
}

/* ===== RENDER FREEZE TOKENS ===== */
function renderFreezeTokens(count) {
  const el = document.getElementById('freezeCount');
  if (el) el.textContent = count;
  const btn = document.getElementById('useFreezeBtn');
  if (btn) btn.disabled = count <= 0;
}

/* ===== RENDER MASTERED RATINGS ===== */
function renderMasteredRatings(ratings) {
  const container = document.getElementById('masteredList');
  if (!container) return;
  if (!ratings || ratings.length === 0) {
    container.innerHTML = '<div class="empty-state">No ratings mastered yet</div>';
    return;
  }
  container.innerHTML = ratings
    .sort((a, b) => a - b)
    .map(r => `<span class="mastered-badge">⭐ ${r}</span>`)
    .join('');
}

/* ===== CHECK & SHOW MASTERY BANNER ===== */
function showMasteryBanner(rating) {
  const banner = document.getElementById('masteryBanner');
  const ratingEl = document.getElementById('masteryRating');
  if (banner && ratingEl) {
    ratingEl.textContent = rating;
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 8000);
  }
}

/* ===== R10 UI STATE ===== */
async function loadR10State() {
  return new Promise(resolve => {
    chrome.storage.local.get([
      'r10Streak', 'r10TargetRating', 'r10FreezeTokens',
      'r10MasteredRatings', 'r10Mastered', 'r10TotalStreakSolves'
    ], (s) => {
      const streak = s.r10Streak || 0;
      const target = s.r10TargetRating || 1200;
      const freeze = s.r10FreezeTokens || 0;
      const mastered = s.r10MasteredRatings || [];
      const justMastered = s.r10Mastered || false;

      renderStreakDots(streak);
      renderFreezeTokens(freeze);
      renderMasteredRatings(mastered);

      // Set target rating dropdown
      const sel = document.getElementById('r10RatingSelect');
      if (sel) sel.value = target;

      // Update badge
      const badge = document.getElementById('r10Badge');
      if (badge && streak > 0) {
        badge.textContent = streak;
        badge.classList.remove('hidden');
      }

      // Check if mastery banner should fire
      if (justMastered) {
        showMasteryBanner(target);
        chrome.storage.local.set({ r10Mastered: false });
      }

      resolve({ streak, target, freeze, mastered });
    });
  });
}

/* ===== R10 EDITORIAL HANDLER (for popup) ===== */
function r10HandleEditorial(useFreeze) {
  return new Promise(async (resolve) => {
    if (useFreeze) {
      chrome.runtime.sendMessage({ type: 'USE_FREEZE' }, (res) => {
        if (res && res.ok) {
          renderFreezeTokens(res.freezeTokens);
          resolve({ froze: true });
        } else {
          // No freeze available, reset streak
          chrome.runtime.sendMessage({ type: 'R10_EDITORIAL' }, () => {
            renderStreakDots(0);
            resolve({ froze: false });
          });
        }
      });
    } else {
      chrome.runtime.sendMessage({ type: 'R10_EDITORIAL' }, () => {
        renderStreakDots(0);
        resolve({ froze: false });
      });
    }
  });
}
