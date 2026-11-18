function applyTheme() {
  document.body.classList.toggle('light-mode', state.theme === 'light');
  document.getElementById('themeBtn').innerHTML = state.theme === 'light' ? ICONS.moon : ICONS.sun;
  document.getElementById('themeBtn').setAttribute('aria-label', state.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
}
function safeName(name) { return String(name || 'Challenge').replace(/[<>]/g, '').trim().slice(0, 32) || 'Challenge'; }
function renderAll() {
  applyTheme();
  const bar = document.getElementById('tabsBar'); bar.replaceChildren();
  state.challenges.forEach(c => {
    const b = document.createElement('button');
    b.className = 'tab-pill' + (c.id === state.activeId ? ' active' : '');
    b.type = 'button'; b.setAttribute('aria-pressed', String(c.id === state.activeId));
    const name = document.createElement('span'); name.textContent = c.name;
    const count = document.createElement('span'); count.className = 'tab-count'; count.textContent = `${c.completedDates.length}/${c.totalDays}`;
    b.append(name, count); b.onclick = () => { state.activeId = c.id; saveState(); renderAll(); };
    bar.appendChild(b);
  });
  const ch = getActive(), endYMD = addDays(ch.startDate, ch.totalDays - 1);
  const done = ch.completedDates.length, left = Math.max(0, ch.totalDays - done), pct = Math.min(1, done / ch.totalDays);
  const dayIdx = diffDays(ch.startDate, todayYMD) + 1;
  document.getElementById('heroTitle').textContent = ch.name;
  const mb = document.getElementById('modeBadge'); mb.textContent = ch.mode === 'strict' ? 'Strict' : 'Flexible'; mb.className = 'mode-tag' + (ch.mode === 'strict' ? ' strict' : '');
  document.getElementById('dayStatusText').textContent = dayIdx < 1 ? `Starts in ${1 - dayIdx}d` : (dayIdx > ch.totalDays ? 'Completed Period' : `Day ${dayIdx} of ${ch.totalDays}`);
  document.getElementById('dateRangeText').textContent = `${fmtDate(ch.startDate)} → ${fmtDate(endYMD)}`;
  document.getElementById('ringCounter').textContent = `${done}/${ch.totalDays}`;
  document.getElementById('ringCircle').style.strokeDashoffset = String(226.2 * (1 - pct));
  document.getElementById('statDone').textContent = `${done}d`; document.getElementById('statLeft').textContent = `${left}d`; document.getElementById('statStreak').textContent = `${calcStreak(ch)}d`;
  const isDone = ch.completedDates.includes(todayYMD), cBtn = document.getElementById('completeTodayBtn');
  cBtn.className = 'btn-complete' + (isDone ? ' done' : '');
  const dayNumber = Math.max(1, Math.min(ch.totalDays, dayIdx));
  cBtn.innerHTML = isDone ? `${ICONS.check}<span>Today Completed — Tap to Undo</span>` : `${ICONS.bolt}<span>Mark Today Complete (Day ${dayNumber})</span>`;
  renderCal(ch, endYMD);
}
function renderCal(ch, endYMD) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('monthLabel').textContent = `${months[viewMonth]} ${viewYear}`;
  const grid = document.getElementById('calGrid'); grid.replaceChildren();
  const set = new Set(ch.completedDates), first = new Date(viewYear, viewMonth, 1).getDay(), total = new Date(viewYear, viewMonth + 1, 0).getDate();
  for (let i = 0; i < first; i++) { const e = document.createElement('div'); e.className = 'cell empty'; e.setAttribute('aria-hidden','true'); grid.appendChild(e); }
  for (let d = 1; d <= total; d++) {
    const ymd = toYMD(new Date(viewYear, viewMonth, d)), off = diffDays(ch.startDate, ymd), inRange = off >= 0 && off < ch.totalDays, done = set.has(ymd), isEnd = ymd === endYMD;
    const cell = document.createElement('button'); cell.type = 'button'; cell.setAttribute('aria-label', `${fmtDate(ymd)}${inRange ? `, challenge day ${off + 1}` : ''}${done ? ', completed' : ''}${ymd === todayYMD ? ', today' : ''}`);
    let cls = 'cell'; if (inRange) cls += ' in-range'; if (done) cls += ' done'; else if (inRange && ymd < todayYMD) cls += ' missed'; if (ymd === todayYMD) cls += ' today'; if (isEnd) cls += ' end-day'; cell.className = cls;
    let tag = '<span class="cell-tag" style="opacity:0.35">•</span>';
    if (inRange) { const dn = `D${off + 1}`; if (isEnd) tag = `<span class="cell-tag">${ICONS.miniFlag}${dn}</span>`; else if (done) tag = `<span class="cell-tag">${ICONS.miniCheck}${dn}</span>`; else tag = `<span class="cell-tag">${dn}</span>`; }
    else if (done) tag = '<span class="cell-tag">' + ICONS.miniCheck + '</span>';
    cell.innerHTML = `<span class="cell-num">${d}</span>${tag}`;
    cell.disabled = ymd > todayYMD || !inRange || (ch.mode === 'strict' && ymd !== todayYMD);
    cell.onclick = () => toggleDay(ymd); grid.appendChild(cell);
  }
}
function toggleDay(ymd) {
  const ch = getActive();
  if (ymd > todayYMD) return toast('Future dates cannot be marked yet');
  if (!inChallengeRange(ch, ymd)) return toast('Date is outside this challenge');
  if (ch.mode === 'strict' && ymd !== todayYMD) return toast('Strict mode only allows marking today');
  const i = ch.completedDates.indexOf(ymd);
  if (i > -1) { ch.completedDates.splice(i, 1); toast(`Unmarked ${fmtDate(ymd)}`); }
  else { ch.completedDates.push(ymd); ch.completedDates.sort(); playTone(); toast(`Challenge day ${diffDays(ch.startDate, ymd) + 1} completed!`); }
  saveState(); renderAll();
}
document.getElementById('completeTodayBtn').onclick = () => toggleDay(todayYMD);
document.getElementById('themeBtn').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveState(); applyTheme(); };
document.getElementById('prevBtn').onclick = () => { if (--viewMonth < 0) { viewMonth = 11; viewYear--; } renderAll(); };
document.getElementById('nextBtn').onclick = () => { if (++viewMonth > 11) { viewMonth = 0; viewYear++; } renderAll(); };
document.getElementById('todayBtn').onclick = () => { const n = new Date(); viewYear = n.getFullYear(); viewMonth = n.getMonth(); renderAll(); };
document.getElementById('jumpStartBtn').onclick = () => { const d = parseYMD(getActive().startDate); viewYear = d.getFullYear(); viewMonth = d.getMonth(); renderAll(); };
document.getElementById('jumpEndBtn').onclick = () => { const d = parseYMD(addDays(getActive().startDate, getActive().totalDays - 1)); viewYear = d.getFullYear(); viewMonth = d.getMonth(); renderAll(); };
document.getElementById('deleteBtn').onclick = () => {
  const ch = getActive();
  if (state.challenges.length <= 1) { if (confirm('Reset all completed days for this challenge?')) { ch.completedDates = []; saveState(); renderAll(); } }
  else if (confirm(`Delete "${ch.name}"?`)) { state.challenges = state.challenges.filter(c => c.id !== ch.id); state.activeId = state.challenges[0].id; saveState(); renderAll(); }
};
const modal = document.getElementById('modalOverlay'), inName = document.getElementById('inName'), inDays = document.getElementById('inDays'), inStart = document.getElementById('inStart'), inMode = document.getElementById('inMode');
function syncPreview() {
  const d = Math.max(1, Math.min(1000, parseInt(inDays.value, 10) || 100)), s = inStart.value || todayYMD;
  document.getElementById('previewBox').textContent = `Start: ${fmtDate(s)} | Target completion (${d} days): ${fmtDate(addDays(s, d - 1))}`;
}
document.getElementById('openModalBtn').onclick = () => { inName.value = ''; inDays.value = '100'; inStart.value = todayYMD; inMode.value = 'flexible'; syncPreview(); modal.classList.add('open'); };
document.getElementById('closeModalBtn').onclick = () => modal.classList.remove('open');
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });
document.querySelectorAll('.preset').forEach(b => { b.onclick = () => { document.querySelectorAll('.preset').forEach(x => x.classList.remove('active')); b.classList.add('active'); inDays.value = b.dataset.d; if (!inName.value.trim()) inName.value = `${b.dataset.d} Days Challenge`; syncPreview(); }; });
inDays.oninput = syncPreview; inStart.onchange = syncPreview;
document.getElementById('createBtn').onclick = () => {
  const d = Math.max(1, Math.min(1000, parseInt(inDays.value, 10) || 100)), s = inStart.value || todayYMD;
  if (Number.isNaN(parseYMD(s).getTime())) return toast('Please choose a valid start date');
  const ch = { id: 'ch_' + Date.now(), name: safeName(inName.value || `${d} Days Challenge`), totalDays: d, startDate: s, mode: inMode.value === 'strict' ? 'strict' : 'flexible', completedDates: [] };
  state.challenges.push(ch); state.activeId = ch.id; saveState(); modal.classList.remove('open'); playTone(); renderAll();
};
// Backup: export/import the complete local challenge data.
document.getElementById('exportBtn').onclick = () => {
  const payload = { app: 'Challenge Calendar', version: 2, exportedAt: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'challenge-calendar-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Backup exported');
};
document.getElementById('importInput').onchange = async e => {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()), incoming = parsed.data || parsed;
    if (!incoming || !Array.isArray(incoming.challenges) || !incoming.challenges.length) throw new Error('Backup has no challenges');
    const normalized = incoming.challenges.map(normalizeChallenge).filter(Boolean);
    if (!normalized.length) throw new Error('No valid challenge records');
    if (!confirm('Import will replace the challenges currently stored on this device. Continue?')) return;
    state = { theme: incoming.theme === 'light' ? 'light' : 'dark', activeId: incoming.activeId, challenges: normalized };
    if (!state.challenges.some(c => c.id === state.activeId)) state.activeId = state.challenges[0].id;
    saveState(); renderAll(); toast('Backup imported');
  } catch (err) { toast('Import failed: invalid backup'); console.error(err); }
  e.target.value = '';
};
loadState(); renderAll();

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && toYMD(new Date()) !== todayYMD) location.reload(); });
