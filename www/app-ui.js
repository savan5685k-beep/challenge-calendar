function applyTheme() {
  document.body.classList.toggle('light-mode', state.theme === 'light');
  document.getElementById('themeBtn').innerHTML = state.theme === 'light' ? ICONS.moon : ICONS.sun;
}

function renderAll() {
  applyTheme();
  const bar = document.getElementById('tabsBar');
  bar.innerHTML = '';
  state.challenges.forEach(c => {
    const b = document.createElement('button');
    b.className = 'tab-pill' + (c.id === state.activeId ? ' active' : '');
    b.innerHTML = `<span>${c.name}</span><span class="tab-count">${c.completedDates.length}/${c.totalDays}</span>`;
    b.onclick = () => { state.activeId = c.id; saveState(); renderAll(); };
    bar.appendChild(b);
  });

  const ch = getActive();
  const endYMD = addDays(ch.startDate, ch.totalDays - 1);
  const done = ch.completedDates.length;
  const left = Math.max(0, ch.totalDays - done);
  const pct = Math.min(1, done / ch.totalDays);

  document.getElementById('heroTitle').textContent = ch.name;
  const mb = document.getElementById('modeBadge');
  mb.textContent = ch.mode === 'strict' ? 'Strict' : 'Flexible';
  mb.className = 'mode-tag' + (ch.mode === 'strict' ? ' strict' : '');

  const dayIdx = diffDays(ch.startDate, todayYMD) + 1;
  document.getElementById('dayStatusText').textContent =
    dayIdx < 1 ? `Starts in ${1 - dayIdx}d` : (dayIdx > ch.totalDays ? 'Completed Period' : `Day ${dayIdx} of ${ch.totalDays}`);
  document.getElementById('dateRangeText').textContent = `${fmtDate(ch.startDate)} → ${fmtDate(endYMD)}`;

  document.getElementById('ringCounter').textContent = `${done}/${ch.totalDays}`;
  document.getElementById('ringCircle').style.strokeDashoffset = String(226.2 * (1 - pct));

  document.getElementById('statDone').textContent = `${done}d`;
  document.getElementById('statLeft').textContent = `${left}d`;
  document.getElementById('statStreak').textContent = `${calcStreak(ch)}d`;

  const isDone = ch.completedDates.includes(todayYMD);
  const cBtn = document.getElementById('completeTodayBtn');
  cBtn.className = 'btn-complete' + (isDone ? ' done' : '');
  cBtn.innerHTML = isDone
    ? `${ICONS.check}<span>Today Completed (Day ${done}) — Tap to Undo</span>`
    : `${ICONS.bolt}<span>Mark Today Complete (Day ${Math.min(ch.totalDays, done + 1)})</span>`;

  renderCal(ch, endYMD);
}

function renderCal(ch, endYMD) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('monthLabel').textContent = `${months[viewMonth]} ${viewYear}`;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const set = new Set(ch.completedDates);
  const first = new Date(viewYear, viewMonth, 1).getDay();
  const total = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < first; i++) {
    const e = document.createElement('div');
    e.className = 'cell empty';
    grid.appendChild(e);
  }
  for (let d = 1; d <= total; d++) {
    const ymd = toYMD(new Date(viewYear, viewMonth, d));
    const off = diffDays(ch.startDate, ymd);
    const inRange = off >= 0 && off < ch.totalDays;
    const done = set.has(ymd);
    const isEnd = ymd === endYMD;

    const cell = document.createElement('div');
    let cls = 'cell';
    if (inRange) cls += ' in-range';
    if (done) cls += ' done';
    else if (inRange && ymd < todayYMD) cls += ' missed';
    if (ymd === todayYMD) cls += ' today';
    if (isEnd) cls += ' end-day';
    cell.className = cls;

    let tag = `<span class="cell-tag" style="opacity:0.35">•</span>`;
    if (inRange) {
      const dNum = `D${off + 1}`;
      if (isEnd) tag = `<span class="cell-tag">${ICONS.miniFlag}${dNum}</span>`;
      else if (done) tag = `<span class="cell-tag">${ICONS.miniCheck}${dNum}</span>`;
      else tag = `<span class="cell-tag">${dNum}</span>`;
    } else if (done) {
      tag = `<span class="cell-tag">${ICONS.miniCheck}</span>`;
    }
    cell.innerHTML = `<span class="cell-num">${d}</span>${tag}`;
    cell.onclick = () => toggleDay(ymd);
    grid.appendChild(cell);
  }
}

function toggleDay(ymd) {
  if (ymd > todayYMD) return toast('Future dates cannot be marked yet');
  const ch = getActive();
  const i = ch.completedDates.indexOf(ymd);
  if (i > -1) {
    ch.completedDates.splice(i, 1);
    toast(`Unmarked ${fmtDate(ymd)}`);
  } else {
    ch.completedDates.push(ymd);
    ch.completedDates.sort();
    playTone();
    toast(`Day ${ch.completedDates.length} / ${ch.totalDays} Complete!`);
  }
  saveState();
  renderAll();
}

document.getElementById('completeTodayBtn').onclick = () => toggleDay(todayYMD);
document.getElementById('themeBtn').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveState(); applyTheme(); };
document.getElementById('prevBtn').onclick = () => { if (--viewMonth < 0) { viewMonth = 11; viewYear--; } renderAll(); };
document.getElementById('nextBtn').onclick = () => { if (++viewMonth > 11) { viewMonth = 0; viewYear++; } renderAll(); };
document.getElementById('todayBtn').onclick = () => { const n = new Date(); viewYear = n.getFullYear(); viewMonth = n.getMonth(); renderAll(); };
document.getElementById('jumpStartBtn').onclick = () => { const d = parseYMD(getActive().startDate); viewYear = d.getFullYear(); viewMonth = d.getMonth(); renderAll(); };
document.getElementById('jumpEndBtn').onclick = () => { const ch = getActive(); const d = parseYMD(addDays(ch.startDate, ch.totalDays - 1)); viewYear = d.getFullYear(); viewMonth = d.getMonth(); renderAll(); };
document.getElementById('deleteBtn').onclick = () => {
  const ch = getActive();
  if (state.challenges.length <= 1) {
    if (confirm('Reset all completed days for this challenge?')) { ch.completedDates = []; saveState(); renderAll(); }
  } else if (confirm(`Delete "${ch.name}"?`)) {
    state.challenges = state.challenges.filter(c => c.id !== ch.id);
    state.activeId = state.challenges[0].id;
    saveState(); renderAll();
  }
};

const modal = document.getElementById('modalOverlay');
const inName = document.getElementById('inName');
const inDays = document.getElementById('inDays');
const inStart = document.getElementById('inStart');
const inMode = document.getElementById('inMode');

function syncPreview() {
  const d = Math.max(1, parseInt(inDays.value, 10) || 100);
  const s = inStart.value || todayYMD;
  document.getElementById('previewBox').innerHTML = `Start: <b>${fmtDate(s)}</b><br/>Target Completion (${d} Days): <b>${fmtDate(addDays(s, d - 1))}</b>`;
}
document.getElementById('openModalBtn').onclick = () => { inName.value = ''; inDays.value = '100'; inStart.value = todayYMD; syncPreview(); modal.classList.add('open'); };
document.getElementById('closeModalBtn').onclick = () => modal.classList.remove('open');
document.querySelectorAll('.preset').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.preset').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    inDays.value = b.dataset.d;
    if (!inName.value.trim()) inName.value = `${b.dataset.d} Days Challenge`;
    syncPreview();
  };
});
inDays.oninput = syncPreview;
inStart.onchange = syncPreview;
document.getElementById('createBtn').onclick = () => {
  const d = Math.max(1, Math.min(1000, parseInt(inDays.value, 10) || 100));
  const ch = { id: 'ch_' + Date.now(), name: inName.value.trim() || `${d} Days Challenge`, totalDays: d, startDate: inStart.value || todayYMD, mode: inMode.value, completedDates: [] };
  state.challenges.push(ch); state.activeId = ch.id; saveState();
  modal.classList.remove('open'); playTone(); renderAll();
};

loadState();
renderAll();
