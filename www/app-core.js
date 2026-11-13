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
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s, n) {
  const d = parseYMD(s);
  d.setDate(d.getDate() + n);
  return toYMD(d);
}
function diffDays(s1, s2) {
  return Math.round((parseYMD(s2) - parseYMD(s1)) / 86400000);
}
function fmtDate(s) {
  return parseYMD(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function playTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.055);
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.055 + 0.18);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.055);
      o.stop(ctx.currentTime + i * 0.055 + 0.19);
    });
    if (navigator.vibrate) navigator.vibrate(35);
  } catch (e) {}
}

const STORAGE_KEY = 'CHALLENGE_CAL_PRO_V2';
const todayYMD = toYMD(new Date());
let state = { theme: 'dark', activeId: null, challenges: [] };
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {}
  if (!state.challenges || !state.challenges.length) {
    const id = 'ch_' + Date.now();
    state.challenges = [{ id, name: '100 Days Challenge', totalDays: 100, startDate: todayYMD, mode: 'flexible', completedDates: [] }];
    state.activeId = id;
    saveState();
  }
  if (!state.challenges.find(c => c.id === state.activeId)) {
    state.activeId = state.challenges[0].id;
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getActive() { return state.challenges.find(c => c.id === state.activeId) || state.challenges[0]; }
function calcStreak(ch) {
  const set = new Set(ch.completedDates);
  let s = 0, cur = set.has(todayYMD) ? todayYMD : addDays(todayYMD, -1);
  while (set.has(cur)) { s++; cur = addDays(cur, -1); }
  return s;
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}
