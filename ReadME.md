# Codeforces Focus Timer

A productivity-first browser extension built for competitive programmers who want to stay focused, track solving habits, and build consistency on Codeforces.

It combines a timed problem-solving workflow, automatic accepted-submission detection, a Rule of 10 streak system, solve history, reminders, statistics, and several focus-oriented tools to help you improve with structure and momentum.

---

## What it does

Codeforces Focus Timer turns every problem session into a guided workflow:

- start a new problem with one click
- track your solving time automatically
- detect accepted submissions from Codeforces
- record solved problems into history
- manage a Rule of 10 streak based on fast solves
- review progress through stats, notes, and export tools
- stay focused with reminders, theme control, and keyboard shortcuts

The extension is designed for daily practice, contest preparation, and long-term skill building.

---

## Core features

### Timer
- New Problem button appears on load and after every reset
- Timer starts from `00:00` when a new problem begins
- If a Codeforces handle is saved, accepted-submission polling starts automatically
- If no handle is saved, the user is prompted to save it in the CF tab
- Timer counts upward continuously from `00:00`
- Toolbar icon shows the current minute count
- Phase color updates as time progresses
- Phase dots fill from left to right
- Phase name, range, and tip update on each transition
- Motivational quotes rotate every 30 seconds within the current phase
- Alarm overlay appears briefly on phase change
- Alarm overlay can be dismissed immediately with a click

### Auto-stop via Codeforces
- Codeforces API is polled every 3 seconds while the timer is running
- When an accepted submission is detected after the timer starts, the timer stops automatically
- Problem name is fetched directly from the Codeforces API
- A solved banner appears with the problem name and elapsed time
- The solve is auto-saved to history with source `⚡ CF Auto`
- Rule of 10 streak is checked using the actual elapsed time
- Duplicate accepted submissions are prevented with `cfLastAcId`
- Notification appears in the format: `🎉 Accepted! — [Problem] solved in Xm Ys`

### Manual solve flow
- `✅ Solved!` stops the timer immediately
- Solved banner shows elapsed time
- Entry is saved to history with source `✋ Manual`
- Rule of 10 streak is checked using elapsed time
- Prevents double counting if an accepted submission was already detected

### Reset flow
- `↺ Reset` returns the timer to `00:00`
- Clears solved banner, phase card, and alarm overlay
- Stops Codeforces polling
- Resets the toolbar icon to default
- Prepares the extension for the next New Problem session

---

## History tab

Every solve is stored in a compact and readable history log.

### History features
- Saves problem name, phase reached, solve time, and date
- Shows source badge:
  - `⚡ CF Auto`
  - `✋ Manual`
- Most recent entry appears first
- Stores up to 10 entries and automatically removes the oldest when full
- Clear All includes a confirmation prompt
- Empty state message appears when no solves are saved
- Each entry includes a colored phase badge
- Personal best per rating is shown at the top of the list
- Inline note icon lets you add or edit annotations
- Notes are included in CSV export

---

## Rule of 10 tab

The Rule of 10 system is the heart of the extension.

### Streak logic
- Solve within 45 minutes → streak increases by 1
- Solve above 45 minutes → streak does not change
- Using the editorial resets the streak to 0
- Changing the target rating resets the streak to 0

### Mastery flow
- 10 consecutive solves within 45 minutes triggers a mastery banner
- The mastered rating is added to the Mastered Ratings list
- Streak resets to 0 and is immediately ready for the next rating
- If the tab is closed at the moment of mastery, the banner is queued for the next visit

### Manual controls
- `✅ Solved!` within 45 minutes increases the streak
- `📖 Used Editorial` resets the streak to 0
- Changing the target rating resets the streak to 0

### Auto-integration
- Every history save triggers `r10AutoCheck(elapsedTime)`
- Each solve counts only once
- Works for both auto-detected solves and manual solves

---

## Codeforces tab

The CF tab stores profile and auto-detection settings.

### Profile
- Enter a Codeforces handle and click Load
- Shows avatar, handle, rank, and rating
- Falls back to `icon48.png` if the avatar image cannot be loaded
- Saved handle persists across popup open and close

### Auto-detect mode
- Toggle between Auto Mode and Manual Mode
- Auto Mode polls Codeforces every 3 seconds while the timer is active
- Accepted submission stops the timer, fires the banner, and saves the result
- Manual Mode disables Codeforces polling and lets the timer run freely
- Mode badge shows `⚡ Auto` or `🟡 Manual`
- Mode setting is persisted across sessions

---

## Notifications and toolbar icon

### Notifications
- Phase transition notification: `⏰ Phase N: [Name]` plus tip
- Accepted solve notification: `🎉 Accepted! Timer Stopped`
- Notification body includes the problem name, elapsed time, and next action hint
- Clicking the notification opens the extension popup
- Daily streak reminder encourages consistency
- Idle reminder appears when no problem has been started for 2 hours
- All notifications use the extension icon

### Toolbar icon states
- Idle: default icon
- Running: minute counter in phase color
- Paused: `⏸` in gray
- Solved: `DONE` in green
- Reset: returns to default

---

## Productivity features

### Streak freeze
- Earn 1 freeze token for every 5 consecutive solves
- Use a freeze to protect the streak when editorial is used once
- Freeze badge shown in the Rule of 10 tab
- Maximum of 2 freeze tokens can be held at once

### Pause and resume
- Pause timer mid-problem
- Toolbar icon changes to `⏸`
- Resume continues from the exact paused time
- Pause time is excluded from solve time
- Maximum of 2 pauses per problem

### Stats panel
- Total problems solved
- Average solve time for last 10 and all time
- Current solve rate for solves within 45 minutes
- Personal best solve time
- Phase breakdown by time spent
- Problems solved per rating shown as a mini bar chart
- Longest streak ever achieved

### Rating progression tracker
- Manually log your Codeforces rating after each session
- Mini sparkline chart shows rating over time
- Displays gained rating since using the extension
- Milestone badges for 1000 / 1200 / 1400 / 1600 / 1800+

### Daily goal
- Set a daily solve target: 1 / 2 / 3 / 5 problems
- Progress bar shown at the top of the Timer tab
- Goal completion triggers a banner
- End-of-day reminder appears if the goal is not met
- Tracks consecutive days when the goal is met

### Export and backup
- Export history as CSV
- Export Rule of 10 data as JSON
- Import JSON backup to restore data

### Theme
- Dark mode as default
- Light mode toggle
- Theme persists across sessions

### Keyboard shortcuts
- `Ctrl + Shift + T` opens the popup
- `Space` starts a problem or marks it solved when the popup is focused
- Shortcut hint shown in the Timer tab footer

---

## Advanced learning tools

### Weakness detector
- Tracks tags that appear most often in unsolved or slow solves
- Highlights patterns such as `dp`, `graphs`, or `math`
- Can automatically filter Codeforces problems by weak tag
- Updates after every 5 solves

### Solve heatmap
- GitHub-style calendar heatmap in the Stats panel
- Each day is colored by the number of problems solved
- Hovering shows problems solved and average solve time
- Helps visualize long-term habit consistency

### Spaced repetition queue
- Mark history entries as `Review Later`
- Reminds you to re-solve them after 3, 7, or 14 days
- Re-solving must be done without notes to count
- `Review due` badge appears on the History tab icon

### Contest countdown
- Displays the next upcoming Codeforces contest
- Shows remaining time such as `Next CF Round in 2d 4h 15m`
- Includes contest name and type
- Clicking opens the contest page
- Fetches contest data from the Codeforces API

### Focus mode
- Can be enabled when a timer starts
- Blocks navigation to editorial or solution pages
- Shows a warning overlay if an editorial URL is detected
- Allows override with a 10-second countdown

### Warm-up mode
- Lets the user do a 10-minute warm-up before the main session
- Suggests an easier problem around rating -200
- Uses a separate warm-up timer
- After warm-up, a button appears to start the real problem

### Accountability partner
- Save a friend’s Codeforces handle
- Compare solve streaks side by side
- See today’s progress versus your partner
- Leaderboard view supports you, your partner, and personal best

### Post-solve reflection
- After every solve, a short 3-question micro-journal appears
- Captures:
  - hardest phase
  - key insight
  - confidence level
- Reflection is saved with the history entry
- Aggregated insights appear in Stats, such as which phase is most difficult

---

## Data stored locally

The extension stores data such as:
- Codeforces handle
- auto/manual mode
- timer state
- history entries
- notes
- Rule of 10 streak data
- mastered ratings
- freeze tokens
- rating log
- daily goals
- partner handle
- reflection answers
- theme settings

---

## Suggested folder structure

```txt
extension/
├─ manifest.json
├─ popup.html
├─ popup.js
├─ styles.css
├─ background.js
├─ content.js
├─ icons/
├─ assets/
└─ README.md
````

---

## Installation

### From source

1. Clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder.

### First-time setup

1. Open the extension popup.
2. Go to the **CF** tab.
3. Enter your Codeforces handle.
4. Load your profile.
5. Start a new problem from the **Timer** tab.

---

## How the workflow feels

1. Click **New Problem**
2. Solve the problem while the timer runs
3. Let the extension detect the accepted submission, or press **Solved!**
4. Review the solved banner and phase timing
5. Save notes, inspect history, and watch your streak grow

---

## Ideal use cases

* daily Codeforces practice
* contest preparation
* post-contest upsolving
* rating-based problem training
* focus and consistency tracking
* structured self-improvement

---

## Planned spirit of the project

This extension is meant to make competitive programming feel less random and more measurable.

It encourages:

* faster starts
* fewer distractions
* clear problem-solving habits
* repeated review
* discipline over time
* visible progress

---

## Contributing

Contributions are welcome.

Good areas for improvement:

* UI polish
* performance optimization
* better charts and analytics
* more Codeforces integrations
* accessibility improvements
* bug fixes and edge-case handling

---

## License

Add your preferred license here, such as MIT, Apache 2.0, or Proprietary.

---

## Acknowledgements

* Codeforces for the public API and ecosystem
* Competitive programming communities for the productivity inspiration
* Open-source browser extension tooling and libraries
