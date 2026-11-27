/**
 * Smart Starosta v9 — clear arrival/absence reports and corrected XLSX percentages.
 * UI checks are not authorization. Firebase Firestore Rules must be deployed.
 * Only an owner of the Firebase project can assign staffRoles & members.
 */
import { collection, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { downloadGroupWorkbook } from './report-excel.js?v=9.4';

const statuses = [
  ['present', 'Қатысты'],
  ['late', 'Кешікті'],
  ['excused', 'Себепті'],
  ['absent', 'Келмеді']
];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, symbol => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[symbol]));
const num = count => new Intl.NumberFormat('kk-KZ').format(count);
const fmtDate = date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
};

function summarize(source, start, end) {
  const diary = source && typeof source === 'object' ? source : {};
  const students = Array.isArray(diary.students) ? diary.students : [];
  const attendance = diary.attendance && typeof diary.attendance === 'object' ? diary.attendance : {};
  const dates = Object.keys(attendance).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)
      && (!start || date >= start) && (!end || date <= end)).sort();
  const studentsStats = students.map(student => ({
    id: String(student.id ?? ''), name: String(student.name ?? 'Студент'),
    present: 0, late: 0, excused: 0, absent: 0, unmarked: 0
  }));
  const totals = { present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 };
  const days = dates.map(date => {
    const entries = attendance[date] && typeof attendance[date] === 'object' ? attendance[date] : {};
    const counts = { date, present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 };
    for (const student of studentsStats) {
      const status = entries[student.id];
      if (statuses.some(([key]) => key === status)) { student[status]++; counts[status]++; totals[status]++; }
      else { student.unmarked++; counts.unmarked++; totals.unmarked++; }
    }
    return counts;
  });
  const marked = totals.present + totals.late + totals.excused + totals.absent;
  const percent = marked ? Math.round((totals.present + totals.late) / marked * 1000) / 10 : null;
  return { students, studentsStats, dates, days, totals, marked, percent,
    group: String(diary.group || 'Топ атауы енгізілмеген'),
    leader: String(diary.leader || 'Староста көрсетілмеген'),
    lessons: Array.isArray(diary.lessons) ? diary.lessons.length : 0
  };
}

export async function mountHeadDashboard({ db, user, role, element, setStatus, onAiSummary }) {
  let removed = false;
  let reports = [];
  let selectedUid = '';
  let selectedStudentId = '';
  let selectedDate = '';
  const deptId = role.departmentId;
  const deptLabel = String(role.departmentName || role.departmentId);
  element.innerHTML = `
    <div class="hd-wrap">
      <header class="hd-heading">
        <div class="hd-eyebrow"><span class="hd-dot"></span> SMART STAROSTA · БӨЛІМ МЕҢГЕРУШІСІ</div>
        <h1>Старосталардың есептері</h1>
        <p>Бөлім: <strong>${escapeHTML(deptLabel)}</strong> · Тек қарау режимі</p>
      </header>
      <div class="hd-controls">
        <label>Басталу күні <input id="hd-from" type="date" aria-label="Басталу күні"/></label>
        <label>Аяқталу күні <input id="hd-to" type="date" aria-label="Аяқталу күні"/></label>
        <label class="hd-query">Топты іздеу <input id="hd-search" type="search" placeholder="Топ атауы немесе староста" autocomplete="off"/></label>
        <button type="button" id="hd-refresh" class="hd-button"><span aria-hidden="true">↻</span> Жаңарту</button>
      </div>
      <p id="hd-message" class="hd-message" role="status" aria-live="polite">Есептер жүктелуде…</p>
      <div class="hd-metrics" id="hd-metrics"></div>
      <section class="hd-panel" aria-labelledby="hd-list-title">
        <div class="hd-panel-title"><h2 id="hd-list-title">Топтардың жалпы есебі</h2><span id="hd-count"></span></div>
        <div class="hd-table-scroll"><table class="hd-table" id="hd-table">
          <thead><tr><th>Топ / староста</th><th>Студент</th><th>Күн</th><th>Қатысқан</th><th>Келмеген</th><th>Қатысу</th><th>Әрекеттер</th></tr></thead>
          <tbody id="hd-groups"></tbody>
        </table></div>
      </section>
      <section class="hd-panel" id="hd-details" hidden aria-label="Таңдалған топтың есебі"></section>
      <p class="hd-footnote">Қатысу пайызы = келген белгілер / барлық белгі қойылған жағдайлар × 100. Кешіккен — келген, себепті келмеген — келмеген деп есептеледі. Белгі жоқ күндер бөлек көрсетіледі. Бұл панельде деректерді өзгерту мүмкіндігі жоқ. Көрсетілетін топтарды тек Firebase жобасының иесі бөлімге тіркейді.</p>
    </div>`;

  const $ = selector => element.querySelector(selector);
  const message = $('#hd-message');
  const fromEl = $('#hd-from');
  const toEl = $('#hd-to');
  const searchEl = $('#hd-search');
  const refreshButton = $('#hd-refresh');
  const detailsEl = $('#hd-details');
  function setMessage(value, kind = '') { message.textContent = value; message.dataset.kind = kind; }
  function range() { return [fromEl.value, toEl.value]; }
  function calculated() {
    const [start, end] = range();
    const q = searchEl.value.trim().toLocaleLowerCase('kk-KZ');
    return reports.map(report => ({ ...report, summary: summarize(report.data, start, end) }))
      .filter(report => !q || `${report.summary.group} ${report.summary.leader} ${report.memberLabel}`
        .toLocaleLowerCase('kk-KZ').includes(q));
  }

  function render() {
    const items = calculated();
    const total = items.reduce((acc, item) => {
      acc.students += item.summary.students.length;
      acc.present += item.summary.totals.present + item.summary.totals.late;
      acc.marked += item.summary.marked;
      acc.absent += item.summary.totals.absent + item.summary.totals.excused;
      acc.unmarked += item.summary.totals.unmarked;
      return acc;
    }, { students: 0, present: 0, marked: 0, absent: 0, unmarked: 0 });
    const percent = total.marked ? (total.present / total.marked * 100).toFixed(1) + '%' : '—';
    $('#hd-metrics').innerHTML = [
      ['Топ саны', num(items.length)],
      ['Студент саны', num(total.students)],
      ['Қатысу пайызы', percent],
      ['Келмеген белгісі', num(total.absent)]
    ].map(([label, value]) => `<div class="hd-metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
    $('#hd-count').textContent = `${items.length} топ`;
    $('#hd-groups').innerHTML = items.length ? items.map(({ uid, summary }) => `
      <tr>
        <td><strong>${escapeHTML(summary.group)}</strong><small>${escapeHTML(summary.leader)}</small></td>
        <td>${num(summary.students.length)}</td><td>${num(summary.dates.length)}</td>
        <td>${num(summary.totals.present + summary.totals.late)}</td>
        <td>${num(summary.totals.absent)}</td>
        <td><span class="hd-rate">${summary.percent === null ? '—' : summary.percent + '%'}</span></td>
        <td><div class="hd-actions"><button type="button" class="hd-link" data-report="${escapeHTML(uid)}">Толық қарау</button><button type="button" class="hd-download" data-download="${escapeHTML(uid)}" title="Осы топтың Excel есебін жүктеу">↓ Excel</button></div></td>
      </tr>`).join('') : '<tr><td colspan="7" class="hd-empty">Әзірше көрсетілетін есеп жоқ. Firebase-те осы бөлімге старосталарды тіркеңіз.</td></tr>';
    // AI receives only aggregate totals; names, UID, notes never reach the model.
    if (typeof onAiSummary === 'function') {
      // If a group is open, AI focuses on that group; otherwise the filtered department.
      const aiItems = selectedUid && items.some(i => i.uid === selectedUid)
        ? items.filter(i => i.uid === selectedUid) : items;
      onAiSummary(aiItems.map(({summary}) => summary));
    }
    if (selectedUid && items.some(item => item.uid === selectedUid)) {
      renderDetails(items.find(item => item.uid === selectedUid));
    } else {
      selectedUid = '';
      selectedStudentId = '';
      selectedDate = '';
      detailsEl.hidden = true;
      detailsEl.innerHTML = '';
    }
  }

  function renderDetails(item) {
    const s = item.summary;
    detailsEl.hidden = false;
    detailsEl.innerHTML = `
      <div class="hd-panel-title hd-detail-heading">
        <div><span class="hd-eyebrow">ТОПТЫҢ ТОЛЫҚ ЕСЕБІ</span><h2>${escapeHTML(s.group)}</h2>
          <p>Староста: ${escapeHTML(s.leader)} · ${s.students.length} студент · ${s.dates.length} күн</p></div>
        <div class="hd-actions"><button class="hd-download" type="button" data-download="${escapeHTML(item.uid)}">↓ Осы топты Excel-ге жүктеу</button>
          <button class="hd-secondary" type="button" id="hd-close">Жабу</button></div>
      </div>
      <div class="hd-detail-metrics">
        <span>КЕЛДІ: <b>${s.totals.present+s.totals.late}</b></span>
        <span>КЕЛМЕДІ: <b>${s.totals.absent+s.totals.excused}</b></span>
        <span>БЕЛГІ ЖОҚ: <b>${s.totals.unmarked}</b></span>
        <span>Қатысу: <b>${s.percent === null ? '—' : s.percent + '%'}</b></span>
      </div>
      <div class="hd-section-title">Студенттер бойынша қатысу <small>Студенттің күнделікті тарихын көру үшін «Қарау» бас</small></div>
      <div class="hd-table-scroll"><table class="hd-table"><thead><tr><th>Студент</th><th>КЕЛДІ</th><th>КЕЛМЕДІ</th><th>БЕЛГІ ЖОҚ</th><th>Белгі қойылғаны</th><th>Қатысу %</th><th>Тарихы</th></tr></thead><tbody>
      ${s.studentsStats.length ? s.studentsStats.map(student => {
        const marked = student.present + student.late + student.excused + student.absent;
        const percent = marked ? ((student.present + student.late) / marked * 100).toFixed(1) + '%' : '—';
        return `<tr><td><strong>${escapeHTML(student.name)}</strong></td><td>${student.present + student.late}</td><td>${student.absent + student.excused}</td><td>${student.unmarked}</td><td>${marked}</td><td>${percent}</td><td><button type="button" class="hd-link" data-student="${escapeHTML(student.id)}">Қарау</button></td></tr>`;
      }).join('') : '<tr><td colspan="7" class="hd-empty">Студент қосылмаған</td></tr>'}
      </tbody></table></div>
      <section id="hd-student-history" class="hd-subpanel" aria-live="polite"></section>
      <div class="hd-section-title">Күндер бойынша қатысу <small>Күнді ашып, сол күнгі барлық студенттің белгісін көр</small></div>
      <div class="hd-table-scroll"><table class="hd-table"><thead><tr><th>Күні</th><th>КЕЛДІ</th><th>КЕЛМЕДІ</th><th>БЕЛГІ ЖОҚ</th><th>Қатысу %</th><th>Толығырақ</th></tr></thead><tbody>
      ${s.days.length ? s.days.slice().reverse().map(day => `<tr><td>${fmtDate(day.date)}</td><td>${day.present + day.late}</td><td>${day.absent + day.excused}</td><td>${day.unmarked}</td><td>${day.present+day.late+day.absent+day.excused ? ((day.present+day.late)/(day.present+day.late+day.absent+day.excused)*100).toFixed(1)+'%' : '—'}</td><td><button class="hd-link" data-day="${day.date}" type="button">Қарау</button></td></tr>`).join('') : '<tr><td colspan="6" class="hd-empty">Таңдалған мерзімде қатысу белгісі жоқ</td></tr>'}
      </tbody></table></div>
      <section id="hd-day-history" class="hd-subpanel" aria-live="polite"></section>`;
    renderStudentHistory(item);
    renderDayHistory(item);
  }
  function statusLabel(code, date, studentId, data) {
    if(code === 'late') {
      const time = data?.lateTimes?.[date]?.[studentId];
      return 'КЕЛДІ (кешікті' + (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || '')) ? ', ' + time : '') + ')';
    }
    return ({present:'КЕЛДІ', excused:'КЕЛМЕДІ (себепті)', absent:'КЕЛМЕДІ'})[code] || 'БЕЛГІ ЖОҚ';
  }
  function renderStudentHistory(item) {
    const panel=detailsEl.querySelector('#hd-student-history');
    if (!panel) return;
    const student=item.summary.studentsStats.find(s=>s.id===selectedStudentId);
    if (!student) { panel.innerHTML=''; return; }
    panel.innerHTML=`<div class="hd-subpanel-header"><h3>${escapeHTML(student.name)} — қатысу тарихы</h3><button class="hd-secondary" data-close-student type="button">Жабу</button></div>
      <div class="hd-table-scroll"><table class="hd-table"><thead><tr><th>Күні</th><th>Белгісі</th></tr></thead><tbody>${item.summary.dates.length
        ? item.summary.dates.slice().reverse().map(date=>`<tr><td>${fmtDate(date)}</td><td>${escapeHTML(statusLabel(item.data.attendance?.[date]?.[student.id],date,student.id,item.data))}</td></tr>`).join('')
        : '<tr><td colspan="2" class="hd-empty">Бұл кезеңде қатысу жазбасы жоқ</td></tr>'}</tbody></table></div>`;
  }
  function renderDayHistory(item) {
    const panel=detailsEl.querySelector('#hd-day-history');
    if (!panel) return;
    if (!selectedDate || !item.summary.dates.includes(selectedDate)) { panel.innerHTML=''; return; }
    const entries=item.data.attendance?.[selectedDate] || {};
    panel.innerHTML=`<div class="hd-subpanel-header"><h3>${fmtDate(selectedDate)} — барлық студенттің белгісі</h3><button class="hd-secondary" data-close-day type="button">Жабу</button></div>
      <div class="hd-table-scroll"><table class="hd-table"><thead><tr><th>Студент</th><th>Белгісі</th></tr></thead><tbody>${item.summary.studentsStats.length
        ? item.summary.studentsStats.map(student=>`<tr><td>${escapeHTML(student.name)}</td><td>${escapeHTML(statusLabel(entries[student.id],selectedDate,student.id,item.data))}</td></tr>`).join('')
        : '<tr><td colspan="2" class="hd-empty">Студент қосылмаған</td></tr>'}</tbody></table></div>`;
  }
  function startExport(uid) {
    if (fromEl.value && toEl.value && fromEl.value > toEl.value) {
      setMessage('Күн аралығын түзетіңіз: басталу күні аяқталу күнінен кейін.', 'error');
      return;
    }
    // The document is already authorized by Firestore; never fetch private diary here.
    const item=calculated().find(report=>report.uid===uid);
    if (!item) {setMessage('Таңдалған топ табылмады. Тізімді жаңартыңыз.', 'error');return;}
    try {const filename=downloadGroupWorkbook(item,...range());setMessage(`${item.summary.group} тобының Excel есебі дайын: ${filename}`, 'ok');}
    catch(e){setMessage('Excel есебін жасау мүмкін болмады: '+String(e?.message||e), 'error');}
  }
  const onTableClick = event => {
    const button = event.target.closest('button');
    if (!button || !element.contains(button)) return;
    if (button.hasAttribute('data-download')) {startExport(button.dataset.download);return;}
    if (!button.hasAttribute('data-report')) return;
    selectedUid = button.dataset.report;
    selectedStudentId = '';
    selectedDate = '';
    render();
    detailsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const onDetailsClick = event => {
    const button=event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-download')) {startExport(button.dataset.download);return;}
    if (button.id==='hd-close') {selectedUid='';selectedStudentId='';selectedDate='';render();return;}
    const item=calculated().find(report=>report.uid===selectedUid);
    if (!item) return;
    if (button.hasAttribute('data-student')) {
      selectedStudentId=button.dataset.student;
      renderStudentHistory(item);
      detailsEl.querySelector('#hd-student-history')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    } else if (button.hasAttribute('data-day')) {
      selectedDate=button.dataset.day;
      renderDayHistory(item);
      detailsEl.querySelector('#hd-day-history')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    } else if (button.hasAttribute('data-close-student')) {selectedStudentId='';renderStudentHistory(item);}
    else if (button.hasAttribute('data-close-day')) {selectedDate='';renderDayHistory(item);}
  };
  const onFilter = () => {
    if (fromEl.value && toEl.value && fromEl.value > toEl.value) {
      setMessage('Басталу күні аяқталу күнінен кейін болмауы керек.', 'error');
      return;
    }
    if (reports.length) setMessage('Есептер тек қарау режимінде.', 'ok');
    render();
  };

  async function load() {
    refreshButton.disabled = true;
    setMessage('Бөлімдегі старосталардың есептері жүктелуде…');
    setStatus('Есептер жүктелуде…');
    try {
      const membersSnap = await getDocs(collection(db, 'departments', deptId, 'members'));
      if (removed) return;
      const results = await Promise.allSettled(membersSnap.docs.map(async member => {
        const data = await getDoc(doc(db, 'reports', member.id));
        if (!data.exists()) return null;
        return { uid: member.id, data: data.data().data,
          memberLabel: String(member.data()?.label || '') };
      }));
      if (removed) return;
      reports = results.flatMap(item => item.status === 'fulfilled' && item.value ? [item.value] : []);
      reports.sort((a, b) => String(a.data?.group || '').localeCompare(String(b.data?.group || ''), 'kk'));
      const failures = results.filter(item => item.status === 'rejected').length;
      const absent = results.filter(item => item.status === 'fulfilled' && item.value === null).length;
      const outcome = failures
        ? `${reports.length} есеп жүктелді. ${failures} аккаунтты оқуға рұқсат жоқ немесе желі қатесі бар.`
        : !membersSnap.size ? 'Бұл бөлімге әлі староста тіркелмеген.'
        : `${reports.length} топтың есебі жүктелді${absent ? `, ${absent} аккаунтта әлі күнделік жоқ` : ''}.`;
      setMessage(outcome, failures ? 'error' : 'ok');
      setStatus(failures ? 'Кейбір есеп қолжетімсіз' : 'Есептер жүктелді', failures ? 'error' : 'ok');
      render();
    } catch (error) {
      if (removed) return;
      reports = [];
      setMessage(error?.code === 'permission-denied'
        ? 'Рұқсат берілмеді. Firebase Firestore Rules, reports және staffRoles құжатын тексеріңіз.'
        : 'Есептерді жүктеу қатесі: ' + (error?.message || String(error)), 'error');
      setStatus('Есептерді ашу мүмкін болмады', 'error');
      render();
    } finally { refreshButton.disabled = false; }
  }
  $('#hd-groups').addEventListener('click', onTableClick);
  detailsEl.addEventListener('click', onDetailsClick);
  [fromEl, toEl].forEach(input => input.addEventListener('change', onFilter));
  searchEl.addEventListener('input', onFilter);
  refreshButton.addEventListener('click', load);
  await load();
  return () => { removed = true; reports = []; element.innerHTML = ''; };
}
