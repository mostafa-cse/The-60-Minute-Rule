Features List : 
🕐 TIMER TAB
New Problem Flow
☐ "New Problem" button shown on load and after every reset
☐ Click New Problem → timer starts from 00:00
☐ If CF handle saved → AC polling starts immediately
☐ If no CF handle → prompt: "Save your CF handle in CF tab"

Timer Running
☐ Counts up from 00:00
☐ Toolbar icon shows MM only (phase color changes per phase)
☐ Phase dots fill left to right as time progresses
☐ Phase name, range, tip update on each phase transition
☐ Motivational quote rotates every 30 sec within phase
☐ Alarm overlay appears for 3 sec on phase change
☐ Alarm overlay dismisses immediately on click

Auto-Stop via CF
☐ CF API polled every 3 sec while timer is running
☐ AC submission detected after timer start → timer stops
☐ Problem name fetched directly from Codeforces API
☐ Solved banner shows: problem name + elapsed time
☐ Auto-saves to History with source "⚡ CF Auto"
☐ Auto-checks Rule of 10 streak with actual elapsed time
☐ Duplicate AC prevention via cfLastAcId
☐ Notification: "🎉 Accepted! — [Problem] solved in Xm Ys"

Manual Solve
☐ ✅ Solved! button → stops timer immediately
☐ Solved banner shows elapsed time
☐ Saves entry to History with source "✋ Manual"
☐ Auto-checks Rule of 10 streak with elapsed time
☐ No double-count if CF AC already fired

Reset
☐ ↺ Reset → timer back to 00:00
☐ Clears solved banner, phase card, alarm overlay
☐ Stops CF polling
☐ Resets toolbar icon to default
☐ Ready for next New Problem



📋 HISTORY TAB
☐ Every solve saved: problem name · phase reached · time · date
☐ Source badge: "⚡ CF Auto" or "✋ Manual" (colored)
☐ Most recent entry shown first
☐ Max 10 entries stored (oldest auto-dropped)
☐ Clear All → confirmation prompt → empties list
☐ "No solves yet — start your first problem! 🚀" empty state
☐ Each entry shows colored phase badge matching phase color
☐ Personal best per rating shown at top of list
☐ Inline 📝 note icon per entry → click → add/edit annotation
☐ Notes included in CSV export



🏆 RULE OF 10 TAB
Streak Logic
☐ Solve ≤ 45 min → streak +1, dot fills green
☐ Solve > 45 min → streak unchanged (no penalty, no reset)
☐ 📖 Editorial used → streak resets to 0
☐ Change target rating → streak resets to 0

Mastery
☐ 10 consecutive ≤ 45 min solves → 🎉 mastery banner fires
☐ Mastered rating badge added to 🏅 Mastered Ratings list
☐ Streak resets to 0 → immediately ready for next rating
☐ If tab closed at mastery → banner queued for next visit

Manual Buttons
☐ ✅ Solved! (≤ 45 min) → streak +1
☐ 📖 Used Editorial → streak = 0
☐ Target Rating dropdown → change → streak = 0

Auto-Integration
☐ Every History save triggers r10AutoCheck(elapsedTime)
☐ One streak increment per solve — no double-counting
☐ Works for both CF Auto-stop and Manual Solved!



⚡ CF TAB
Profile
☐ Enter CF handle → click Load
☐ Shows: avatar · handle · rank (rank color) · rating
☐ Avatar fallback → icon48.png if image blocked
☐ Handle saved → persists across popup open/close

Auto-Detect
☐ Checkbox toggle: Auto Mode ON / Manual Mode
☐ Auto ON → polls CF every 3 sec during active timer
☐ AC found → timer stops, banner fires, history saved
☐ Auto OFF → timer runs freely, no CF polling
☐ Mode badge: "⚡ Auto" / "🟡 Manual"
☐ Mode persisted to storage across sessions



🔔 NOTIFICATIONS & ICON
Notifications
☐ Phase transition → "⏰ Phase N: [Name]" + tip (auto-dismiss)
☐ CF AC found → "🎉 Accepted! Timer Stopped" (persistent)
       Body: "[Problem] solved in Xm Ys · Click to start next"
☐ Click notification → opens extension popup
☐ Daily streak reminder → "🔥 Keep your streak alive today!"
☐ Idle reminder → no problem started in 2 hrs → gentle nudge
☐ All notifications use extension icon

Toolbar Icon
☐ Idle → default icon (icon48.png)
☐ Timer running → MM in phase color (updates every minute)
☐ Paused → "⏸" in grey
☐ Solved → "DONE" in green
☐ Reset → back to default icon



💡 Feature Additions
🧊 Streak Freeze
☐ 1 freeze token earned per 5 consecutive solves
☐ Use freeze → protects streak when Editorial used once
☐ Freeze badge shown in Rule of 10 tab
☐ Max 2 freeze tokens held at once

⏸ Pause & Resume
☐ Pause button freezes timer mid-problem
☐ Toolbar icon shows "⏸" while paused
☐ Resume continues from exact paused time
☐ Pause time NOT counted in solve time
☐ Max 2 pauses per problem (prevents abuse)

📊 Stats Panel
☐ Total problems solved (all time)
☐ Average solve time (last 10 / all time)
☐ Current solve rate: X% solved ≤ 45 min
☐ Personal best solve time
☐ Phase breakdown: most time spent in which phase
☐ Problems solved per rating (mini bar chart)
☐ Longest streak ever achieved

📈 Rating Progression Tracker
☐ Manually log CF rating after each session
☐ Mini sparkline chart shows rating over time
☐ "You've gained +X rating since using this extension"
☐ Milestone badges: 1000 / 1200 / 1400 / 1600 / 1800+

🎯 Daily Goal
☐ Set daily solve goal: 1 / 2 / 3 / 5 problems
☐ Progress bar shown at top of Timer tab
☐ Goal met → "🎯 Daily goal complete!" banner
☐ Notification at day end if goal not met
☐ Streak tracks consecutive days goal was met

📤 Export & Backup
☐ Export History → .csv (problem, time, phase, date, note)
☐ Export Rule of 10 data → .json
☐ Import backup → restore from .json file

🌙 Theme
☐ Dark mode (default)
☐ Light mode toggle
☐ Theme persisted to storage

⌨️ Keyboard Shortcuts
☐ Ctrl+Shift+T → open popup (already in manifest)
☐ Space → Start / Solved! when popup focused
☐ Shortcut hint shown in Timer tab footer



🆕 New Productivity Features
🧠 Weakness Detector
☐ Tracks which CF problem tags appear in unsolved / slow solves
☐ Shows: "You struggle most with: dp · graphs · math"
☐ CF tab filters problems by weak tag automatically
☐ Updates after every 5 solves

🗓️ Solve Heatmap
☐ GitHub-style calendar grid in Stats Panel
☐ Each day colored by number of problems solved
☐ Hover → shows "X problems · avg Ym Zs"
☐ Builds habit visibility over weeks/months

🔁 Spaced Repetition Queue
☐ Tag any history entry as "Review Later"
☐ Extension reminds you to re-solve it after 3 / 7 / 14 days
☐ Re-solve must be done without notes for it to count
☐ "Review due" badge shown on History tab icon

🏁 Contest Countdown
☐ Shows next upcoming Codeforces contest in CF tab
☐ Countdown timer: "Next CF Round in 2d 4h 15m"
☐ Contest name + type (Div 1 / Div 2 / Educational)
☐ Click → opens CF contest page
☐ Fetches from CF API: contest.list

🧩 Focus Mode
☐ Toggle "Focus Mode" when timer starts
☐ Blocks navigation to CF editorial/solution pages
☐ Shows warning overlay if editorial URL detected
☐ Override allowed with 10-sec countdown (prevents impulse)

💪 Warm-Up Mode
☐ Before starting a real problem, do a 10-min warm-up
☐ Shows one easy problem (rating - 200) to get in flow state
☐ Warm-up timer separate from main 60-min timer
☐ "Warm-up done → Start real problem" button appears

🤝 Accountability Partner
☐ Enter a friend's CF handle
☐ Compare solve streaks side by side
☐ "Your friend solved 3 problems today — you've solved 1"
☐ Leaderboard view: you vs partner vs personal best

🎓 Post-Solve Reflection
☐ After every solve (before saving to history) →
    quick 3-question micro-journal appears:
    1. "Which phase was hardest?" (tap to select)
    2. "What was the key insight?" (1 line text)
    3. "Confidence: 😰 😐 😎" (tap rating)
☐ Reflection saved with history entry
☐ Aggregate shown in Stats: "You struggle most in Phase 2"
