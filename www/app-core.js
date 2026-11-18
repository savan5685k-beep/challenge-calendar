const ICONS = {
  sun: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  check: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  bolt: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  miniCheck: '<svg style="width:9px;height:9px;stroke:currentColor;stroke-width:3;fill:none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  miniFlag: '<svg style="width:9px;height:9px;stroke:currentColor;stroke-width:2.5;fill:none" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg>'
};
function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseYMD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return new Date(NaN);
  const [y, m, d] = s.split('-').map(Number);
  const out = new Date(y, m - 1, d);
  return out.getFullYear() === y && out.getMonth() === m - 1 && out.getDate() === d ? out : new Date(NaN);
}
function addDays(s, n) {
  const d = parseYMD(s);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + Number(n || 0));
  return toYMD(d);
}
function diffDays(s1, s2) {
  const a = parseYMD(s1), b = parseYMD(s2);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}
function fmtDate(s) {
  const d = parseYMD(s);
  return Number.isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function playTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.055);
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.055 + 0.18);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.055); o.stop(ctx.currentTime + i * 0.055 + 0.19);
    });
    if (navigator.vibrate) navigator.vibrate(35);
  } catch (e) {}
}
const STORAGE_KEY = 'CHALLENGE_CAL_PRO_V2';
const todayYMD = toYMD(new Date());
let state = { theme: 'dark', activeId: null, challenges: [] };
let viewYear = new Date().getFullYear(), viewMonth = new Date().getMonth();
function normalizeChallenge(c) {
  if (!c || typeof c !== 'object') return null;
  const startDate = c.startDate;
  if (!startDate || Number.isNaN(parseYMD(startDate).getTime())) return null;
  const totalDays = Math.max(1, Math.min(1000, Math.floor(Number(c.totalDays) || 100)));
  const endDate = addDays(startDate, totalDays - 1);
  const completedDates = [...new Set(Array.isArray(c.completedDates) ? c.completedDates : [])]
    .filter(d => typeof d === 'string' && !Number.isNaN(parseYMD(d).getTime()) && d >= startDate && d <= endDate && d <= todayYMD)
    .sort();
  return { id: String(c.id || ('ch_' + Date.now())), name: String(c.name || 'Challenge').trim().slice(0, 32) || 'Challenge',
    totalDays, startDate, mode: c.mode === 'strict' ? 'strict' : 'flexible', completedDates };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.theme = parsed.theme === 'light' ? 'light' : 'dark';
        state.challenges = (Array.isArray(parsed.challenges) ? parsed.challenges : []).map(normalizeChallenge).filter(Boolean);
        state.activeId = parsed.activeId || null;
      }
    }
  } catch (e) { console.warn('Could not read saved challenge data', e); }
  if (!state.challenges.length) {
    const id = 'ch_' + Date.now();
    state.challenges = [{ id, name: '100 Days Challenge', totalDays: 100, startDate: todayYMD, mode: 'flexible', completedDates: [] }];
    state.activeId = id;
  }
  if (!state.challenges.some(c => c.id === state.activeId)) state.activeId = state.challenges[0].id;
  saveState();
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch (e) { console.error('Challenge save failed', e); toast('Save failed — export a backup and free storage'); return false; }
}
function getActive() { return state.challenges.find(c => c.id === state.activeId) || state.challenges[0]; }
function inChallengeRange(ch, ymd) { return ymd >= ch.startDate && ymd <= addDays(ch.startDate, ch.totalDays - 1); }
function calcStreak(ch) {
  const set = new Set(ch.completedDates);
  if (ch.mode === 'strict' && !set.has(todayYMD)) return 0;
  let cur = set.has(todayYMD) ? todayYMD : addDays(todayYMD, -1), s = 0;
  while (set.has(cur)) { s++; cur = addDays(cur, -1); }
  return s;
}
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}
