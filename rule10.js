/* ════════════════════════════════
   THE RULE OF 10  —  rule10.js
════════════════════════════════ */

function r10RenderDots(streak) {
  var dots = document.getElementById("r10Dots");
  if (!dots) return;
  dots.innerHTML = "";
  for (var i = 0; i < 10; i++) {
    var dot = document.createElement("div");
    dot.className = "r10-dot" + (i < streak ? " filled" : "");
    if (i >= streak) dot.textContent = i + 1;
    dots.appendChild(dot);
  }
}

function r10RenderMastered(masteredRatings) {
  var list = document.getElementById("r10MasteredList");
  if (!list) return;
  if (!masteredRatings || masteredRatings.length === 0) {
    list.innerHTML = '<span class="r10-mastered-empty">None yet — start solving!</span>';
    return;
  }
  list.innerHTML = "";
  masteredRatings.slice().sort(function(a,b){ return parseInt(a)-parseInt(b); })
    .forEach(function(r) {
      var badge = document.createElement("span");
      badge.className = "r10-badge";
      badge.textContent = "🏆 " + r;
      list.appendChild(badge);
    });
}

function r10ShowMasteryBanner(rating) {
  var slot = document.getElementById("r10MasteryBannerSlot");
  if (!slot) return;
  var nextRating = isNaN(parseInt(rating)) ? "higher" : parseInt(rating) + 100;
  slot.innerHTML =
    '<div class="r10-mastery-banner">' +
      '<div class="r10-mastery-icon">🎉</div>' +
      '<div class="r10-mastery-title">You have mastered ' + rating + '!</div>' +
      '<div class="r10-mastery-desc">Move up to <strong class="highlight">' + nextRating + '</strong> immediately. You are ready.</div>' +
    '</div>';
  setTimeout(function() { slot.innerHTML = ""; }, 10000);
}

function r10SaveAndRender(r10) {
  chrome.storage.local.set({ r10: r10 });
  document.getElementById("r10StreakNum").textContent = r10.streak;
  r10RenderDots(r10.streak);
  r10RenderMastered(r10.masteredRatings);
}

function r10Load() {
  chrome.storage.local.get(["r10"], function(data) {
    var r10 = data.r10 || { rating: "1200", streak: 0, masteredRatings: [] };
    var sel = document.getElementById("r10Rating");
    if (sel) sel.value = r10.rating;
    document.getElementById("r10StreakNum").textContent = r10.streak;
    r10RenderDots(r10.streak);
    r10RenderMastered(r10.masteredRatings);
  });
}

document.addEventListener("DOMContentLoaded", function() {

  r10RenderDots(0);

  // Tab: Rule of 10
  var tabRule10 = document.getElementById("tabRule10");
  if (tabRule10) {
    tabRule10.addEventListener("click", function() {
      document.querySelectorAll(".tab-pill").forEach(function(t) {
        t.classList.remove("active");
      });
      tabRule10.classList.add("active");
      document.getElementById("panelTimer").classList.add("hidden");
      document.getElementById("panelHistory").classList.add("hidden");
      document.getElementById("panelRule10").classList.remove("hidden");
      r10Load();
    });
  }

  // Rating change → reset streak for new rating
  var r10RatingEl = document.getElementById("r10Rating");
  if (r10RatingEl) {
    r10RatingEl.addEventListener("change", function() {
      chrome.storage.local.get(["r10"], function(data) {
        var r10 = data.r10 || { rating: "1200", streak: 0, masteredRatings: [] };
        r10.rating = r10RatingEl.value;
        r10.streak = 0;
        r10SaveAndRender(r10);
      });
    });
  }

  // ✅ Solved button
  var r10SolvedBtn = document.getElementById("r10SolvedBtn");
  if (r10SolvedBtn) {
    r10SolvedBtn.addEventListener("click", function() {
      chrome.storage.local.get(["r10"], function(data) {
        var r10 = data.r10 || { rating: "1200", streak: 0, masteredRatings: [] };
        r10.streak = (r10.streak || 0) + 1;
        if (r10.streak >= 10) {
          if (!r10.masteredRatings) r10.masteredRatings = [];
          if (r10.masteredRatings.indexOf(r10.rating) === -1) {
            r10.masteredRatings.push(r10.rating);
          }
          r10ShowMasteryBanner(r10.rating);
          r10.streak = 0; // reset after mastery to start next rating
        }
        r10SaveAndRender(r10);
      });
    });
  }

  // 📖 Editorial button → reset streak
  var r10EditorialBtn = document.getElementById("r10EditorialBtn");
  if (r10EditorialBtn) {
    r10EditorialBtn.addEventListener("click", function() {
      chrome.storage.local.get(["r10"], function(data) {
        var r10 = data.r10 || { rating: "1200", streak: 0, masteredRatings: [] };
        r10.streak = 0;
        r10SaveAndRender(r10);
      });
    });
  }

});
