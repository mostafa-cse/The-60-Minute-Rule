/* ===== CF.JS — Codeforces API Integration ===== */

const CF_API = 'https://codeforces.com/api';

const RANK_COLORS = {
  'newbie':                '#808080',
  'pupil':                 '#008000',
  'specialist':            '#03A89E',
  'expert':                '#0000FF',
  'candidate master':      '#AA00AA',
  'master':                '#FF8C00',
  'international master':  '#FF8C00',
  'grandmaster':           '#FF0000',
  'international grandmaster': '#FF0000',
  'legendary grandmaster': '#FF0000'
};

/* ===== LOAD PROFILE ===== */
async function loadCFProfile(handle) {
  try {
    const res = await fetch(`${CF_API}/user.info?handles=${encodeURIComponent(handle)}`);
    const data = await res.json();
    if (data.status !== 'OK' || !data.result || !data.result[0]) {
      return { error: 'User not found' };
    }
    const user = data.result[0];
    return {
      handle: user.handle,
      rank: user.rank || 'unrated',
      rating: user.rating || 0,
      maxRating: user.maxRating || 0,
      avatar: user.titlePhoto || user.avatar || '',
      rankColor: RANK_COLORS[(user.rank || '').toLowerCase()] || '#808080'
    };
  } catch (e) {
    return { error: 'Network error' };
  }
}

/* ===== FETCH UPCOMING CONTESTS ===== */
async function fetchUpcomingContest() {
  try {
    const res = await fetch(`${CF_API}/contest.list?gym=false`);
    const data = await res.json();
    if (data.status !== 'OK' || !data.result) return null;

    // Find the next upcoming contest (phase = BEFORE)
    const upcoming = data.result
      .filter(c => c.phase === 'BEFORE')
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

    if (upcoming.length === 0) return null;

    const contest = upcoming[0];
    const startMs = contest.startTimeSeconds * 1000;
    const name = contest.name;
    let type = '';
    if (name.includes('Div. 1')) type = 'Div 1';
    else if (name.includes('Div. 2')) type = 'Div 2';
    else if (name.includes('Div. 3')) type = 'Div 3';
    else if (name.includes('Div. 4')) type = 'Div 4';
    else if (name.includes('Educational')) type = 'Educational';
    else if (name.includes('Global')) type = 'Global';
    else type = 'Round';

    return {
      id: contest.id,
      name: contest.name,
      type,
      startMs,
      url: `https://codeforces.com/contest/${contest.id}`
    };
  } catch (e) {
    return null;
  }
}

/* ===== FORMAT COUNTDOWN ===== */
function formatCountdown(targetMs) {
  const diff = targetMs - Date.now();
  if (diff <= 0) return 'Starting now!';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

/* ===== FETCH PARTNER STATS ===== */
async function fetchPartnerStats(handle) {
  try {
    const res = await fetch(`${CF_API}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=50`);
    const data = await res.json();
    if (data.status !== 'OK' || !data.result) return null;

    const today = new Date().toISOString().slice(0, 10);
    let todayCount = 0;
    const seen = new Set();

    for (const sub of data.result) {
      if (sub.verdict !== 'OK') continue;
      const subDate = new Date(sub.creationTimeSeconds * 1000).toISOString().slice(0, 10);
      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      if (subDate === today && !seen.has(key)) {
        todayCount++;
        seen.add(key);
      }
    }

    // Also get profile
    const profile = await loadCFProfile(handle);
    return {
      handle,
      todayCount,
      rating: profile.rating || 0,
      rank: profile.rank || 'unrated'
    };
  } catch (e) {
    return null;
  }
}

/* ===== FETCH WEAK TAG PROBLEMS ===== */
async function fetchProblemsByTag(tag, rating) {
  try {
    const res = await fetch(`${CF_API}/problemset.problems?tags=${encodeURIComponent(tag)}`);
    const data = await res.json();
    if (data.status !== 'OK') return [];

    return data.result.problems
      .filter(p => p.rating && Math.abs(p.rating - rating) <= 100)
      .slice(0, 5)
      .map(p => ({
        id: `${p.contestId}${p.index}`,
        name: p.name,
        rating: p.rating,
        url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
      }));
  } catch (e) {
    return [];
  }
}
