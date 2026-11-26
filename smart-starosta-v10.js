/* Smart Starosta v10 additive module
 * KZ / RU / EN UI translation; late arrival time entry; department view + Excel export.
 * This module does NOT replace v9 login, diary, reports, or attendance markers.
 * Private notes are not accessed. Firebase Security Rules must allow the new subcollection.
 */
import {getApps, getApp} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import {getAuth, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const LANG_KEY='smart-starosta-v10-language';
const DICT={
  'Старосталардың есептері':['Отчёты старост','Class leader reports'],
  'SMART STAROSTA · БӨЛІМ МЕҢГЕРУШІСІ':['SMART STAROSTA · ЗАВЕДУЮЩИЙ ОТДЕЛЕНИЕМ','SMART STAROSTA · HEAD OF DEPARTMENT'],
  'Есептер тек қарау режимінде.':['Отчёты доступны только для просмотра.','Reports are read-only.'],
  'Топтардың жалпы есебі':['Общий отчёт по группам','Group overview'],
  'Топ саны':['Количество групп','Groups'],
  'Студент саны':['Количество студентов','Students'],
  'Қатысу пайызы':['Процент посещаемости','Attendance rate'],
  'Келмеген белгісі':['Отметок отсутствия','Absence marks'],
  'Топты іздеу':['Поиск группы','Search groups'],
  'Жаңарту':['Обновить','Refresh'],
  'Толық қарау':['Подробнее','Details'],
  'Қатысу':['Посещаемость','Attendance'],
  'Қатысты':['Присутствовал','Present'],
  'Кешікті':['Опоздал','Late'],
  'Келмеді':['Отсутствовал','Absent'],
  'Себепті':['Уважительная причина','Excused'],
  'Сабақ кестесі':['Расписание занятий','Schedule'],
  'Студенттер':['Студенты','Students'],
  'Қатысу журналы':['Журнал посещаемости','Attendance journal'],
  'Басты бет':['Главная','Home'],
  'Топ студенттері':['Студенты группы','Group students'],
  'Ескертпелер':['Заметки','Notes'],
  'Жеке жазбалар':['Личные записи','Private notes'],
  'Есеп':['Отчёт','Report'],
  'Есептер':['Отчёты','Reports'],
  'Есептер жүктелді':['Отчёты загружены','Reports loaded'],
  'Топ / староста':['Группа / староста','Group / class leader'],
  'Қатысқан':['Посетили','Attended'],
  'Келмеген':['Не пришли','Absent'],
  'Әрекеттер':['Действия','Actions'],
  'Жалпы есеп':['Общий отчёт','Summary'],
  'Қатысу үлесі':['Доля посещаемости','Attendance ratio'],
  'Кешіккен белгілер':['Отметки опозданий','Late marks'],
  'Себепті келмеді':['Отсутствовал по уважительной причине','Excused absence'],
  'Қатысу тарихы':['История посещаемости','Attendance history'],
  'Толық есеп':['Подробный отчёт','Detailed report'],
  'Деректер сақталды':['Данные сохранены','Data saved'],
  'Жаңа студент':['Новый студент','New student'],
  'Студент қосу':['Добавить студента','Add student'],
  'Сабақ қосу':['Добавить занятие','Add lesson'],
  'Уақыты':['Время','Time'],
  'Пән':['Предмет','Subject'],
  'Кабинет':['Кабинет','Classroom'],
  'Оқытушы':['Преподаватель','Teacher'],
  'Статистика':['Статистика','Statistics'],
  'Тек қарау режимі':['Только просмотр','View only'],
  'Сақтау':['Сохранить','Save'],
  'Жою':['Удалить','Delete'],
  'Қосу':['Добавить','Add'],
  'Өңдеу':['Изменить','Edit'],
  'Жабу':['Закрыть','Close'],
  'Кері':['Назад','Back'],
  'Шығу':['Выйти','Sign out'],
  'Кіру':['Войти','Sign in'],
  'Тіркелу':['Регистрация','Register'],
  'Құпиясөз':['Пароль','Password'],
  'Топ':['Группа','Group'],
  'Студент':['Студент','Student'],
  'Күні':['Дата','Date'],
  'Күн':['День','Day'],
  'Басталу күні':['Дата начала','Start date'],
  'Аяқталу күні':['Дата окончания','End date'],
  'Аты-жөні':['ФИО','Full name'],
  'Барлығы':['Всего','Total'],
  'КЕЛДІ':['ПРИШЁЛ','PRESENT'],
  'КЕЛМЕДІ':['НЕ ПРИШЁЛ','ABSENT'],
  'БЕЛГІ ЖОҚ':['НЕТ ОТМЕТКИ','NOT MARKED'],
  'ҚАТЫСУ %':['ПОСЕЩАЕМОСТЬ %','ATTENDANCE %'],
  'Толық журнал':['Подробный журнал','Detailed journal'],
  'Қатысу кестесі':['Таблица посещаемости','Attendance grid'],
  'Кешігу уақыты':['Время опоздания','Late arrival time'],
  'Кешіккендер':['Опоздавшие','Late arrivals'],
  'Топ атауы':['Название группы','Group name'],
  'Келген уақыты':['Время прихода','Arrival time'],
  'Есепті жүктеу':['Скачать отчёт','Download report'],
  'Excel жүктеу':['Скачать Excel','Download Excel'],
  'Excel':['Excel','Excel'],
  'Белгі қойылғаны':['Отмечено','Marked'],
  'Белгіленбеді':['Не отмечено','Unmarked'],
  'Мәлімет жоқ':['Нет данных','No data'],
  'Тапсырмалар':['Задания','Tasks'],
  'Күнделік':['Дневник','Diary'],
  'Бөлім':['Отделение','Department'],
  'Староста':['Староста','Class leader'],
  'Пайдаланушы':['Пользователь','User'],
  'Күйі':['Статус','Status'],
  'Кешіккен студенттер':['Опоздавшие студенты','Late students'],
  'Тіл':['Язык','Language'],
  'Қайта жүктеу':['Перезагрузить','Reload']
};
let currentLang = ['kk','ru','en'].includes(localStorage.getItem(LANG_KEY)) ? localStorage.getItem(LANG_KEY) : 'kk';
let db=null, auth=null, account=null, role=null, fetchVersion=0, managerEntries=[];
const originalNodes=new WeakMap();
const originalPlaceholders=new WeakMap();
let translationScheduled=false;
const html = x => String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const tr = key => currentLang==='kk' ? key : (DICT[key]?.[currentLang==='ru'?0:1] || key);
const phrases={
  kk:{button:'Кешігу уақыты',title:'Студенттің кешігу уақытын белгілеу',hint:'Алдымен күнделікте студентке «Кешікті» белгісін қойып, сақтаңыз. Содан кейін нақты келген уақытын енгізіңіз.',date:'Күні',student:'Кешіккен студент',time:'Келген уақыты',save:'Уақытты сақтау',remove:'Өшіру',reload:'Тізімді жаңарту',none:'Бұл күні «Кешікті» деп белгіленген студент жоқ.',saved:'Кешігу уақыты Firebase-ке сақталды.',deleted:'Кешігу уақыты өшірілді.',failed:'Сақтау қатесі: ',invalid:'Уақытты HH:MM түрінде көрсетіңіз.',login:'Алдымен өз аккаунтыңызға кіріңіз.',busy:'Деректер жүктелуде...',manager:'Кешіккен студенттер — бөлім есебі',filter:'Топты іздеу',download:'Кешігулер Excel',noManager:'Кешігу уақыты әлі енгізілмеген.',dateCol:'Күні',groupCol:'Топ',studentCol:'Студент',timeCol:'Келген уақыты',add:'Белгі қосу',done:'Дайын',notes:'Тек өз бөлімінің есептері. Меңгеруші бұл деректерді өзгерте алмайды.',refresh:'Жаңарту',notConfigured:'Firebase қосылмады. Бастапқы сайттағы Firebase конфигурациясын тексеріңіз.',wrongFormat:'Қатысу журналы табылмады. Староста ретінде бір рет күнделікті сақтаңыз.',notLate:'Таңдалған студенттің «Кешікті» белгісі жоқ.'},
  ru:{button:'Время опоздания',title:'Указать время опоздания',hint:'Сначала отметьте студента как «Опоздал» в журнале и сохраните. Затем укажите точное время прихода.',date:'Дата',student:'Опоздавший студент',time:'Время прихода',save:'Сохранить время',remove:'Удалить',reload:'Обновить список',none:'В этот день нет студентов с отметкой «Опоздал».',saved:'Время опоздания сохранено в Firebase.',deleted:'Время опоздания удалено.',failed:'Ошибка сохранения: ',invalid:'Укажите время в формате ЧЧ:ММ.',login:'Сначала войдите в аккаунт.',busy:'Загрузка данных...',manager:'Опоздавшие студенты — отчёт отделения',filter:'Поиск группы',download:'Опоздания Excel',noManager:'Время опозданий пока не указано.',dateCol:'Дата',groupCol:'Группа',studentCol:'Студент',timeCol:'Время прихода',add:'Добавить отметку',done:'Готово',notes:'Только данные своего отделения. Заведующий не может их изменять.',refresh:'Обновить',notConfigured:'Firebase не подключён. Проверьте настройки Firebase основного сайта.',wrongFormat:'Журнал посещаемости не найден. Сначала сохраните дневник от лица старосты.',notLate:'У выбранного студента нет отметки «Опоздал».'},
  en:{button:'Late arrival times',title:'Record an arrival time',hint:'First mark the student as Late in the attendance journal and save. Then enter the exact arrival time.',date:'Date',student:'Late student',time:'Arrival time',save:'Save time',remove:'Delete',reload:'Refresh list',none:'No students marked Late on this date.',saved:'Arrival time saved to Firebase.',deleted:'Arrival time deleted.',failed:'Save error: ',invalid:'Enter a time in HH:MM format.',login:'Sign in to your account first.',busy:'Loading data...',manager:'Late arrivals — department report',filter:'Search groups',download:'Late arrivals Excel',noManager:'No late arrival times have been recorded yet.',dateCol:'Date',groupCol:'Group',studentCol:'Student',timeCol:'Arrival time',add:'Add record',done:'Done',notes:'Department reports only. The department head cannot edit these records.',refresh:'Refresh',notConfigured:'Firebase is not connected. Check the original site Firebase configuration.',wrongFormat:'Attendance journal not found. First save your diary while signed in as class leader.',notLate:'The selected student is not marked Late.'}
};
const T = key => phrases[currentLang][key]||key;
const pad = n=>String(n).padStart(2,'0');
const localDate=()=>{const n=new Date();return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`;};
const safeId=s=>encodeURIComponent(String(s)).replaceAll('%','_').slice(0,180);
const entryId=(date,studentId)=>`${date}_${safeId(studentId)}`;
const validTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const displayDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)?`${date.slice(8)}.${date.slice(5,7)}.${date.slice(0,4)}`:date;

function translatePage(){
  document.documentElement.lang = currentLang;
  if(currentLang === 'kk') {
    document.querySelectorAll('[data-ss-i18n-original]').forEach(el=>{el.textContent=el.dataset.ssI18nOriginal;});
  }
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);
  for(const node of nodes){
    const parent=node.parentElement;
    if(!parent || parent.closest('#ss-v10-controls,#ss-v10-panel,script,style,textarea,code,pre,[contenteditable="true"]'))continue;
    const val=node.nodeValue;
    if(!val || !val.trim())continue;
    const first=originalNodes.get(node)||val;
    if(!originalNodes.has(node))originalNodes.set(node,first);
    const trimmed=first.trim();
    let value=tr(trimmed);
    if(value===trimmed && currentLang!=='kk')continue;
    if(value!==val.trim())node.nodeValue=first.replace(trimmed,value);
  }
  for(const el of document.querySelectorAll('input[placeholder],textarea[placeholder]')){
    if(el.closest('#ss-v10-panel'))continue;
    const base=originalPlaceholders.get(el)||el.getAttribute('placeholder');
    if(!originalPlaceholders.has(el))originalPlaceholders.set(el,base);
    const translation=tr(base);
    if(translation!==el.getAttribute('placeholder'))el.setAttribute('placeholder',translation);
  }
  const select=document.getElementById('ss-v10-language');if(select)select.value=currentLang;
}
function scheduleTranslation(){if(translationScheduled)return;translationScheduled=true;setTimeout(()=>{translationScheduled=false;translatePage();if(account)ensurePanel();},70);}
function changeLang(lang){if(!['kk','ru','en'].includes(lang))return;currentLang=lang;localStorage.setItem(LANG_KEY,lang);translatePage();renderPanel();}
function installStyle(){let s=document.createElement('style');s.id='ss-v10-style';s.textContent=`
#ss-v10-controls{position:fixed;right:14px;bottom:16px;z-index:2147482000;display:flex;align-items:center;flex-wrap:wrap;gap:6px;max-width:calc(100vw - 24px);font:500 13px/1.4 'Noto Sans','Segoe UI',Arial,sans-serif}
#ss-v10-controls button,#ss-v10-controls select{background:#fff;border:1px solid #c8d9ce;border-radius:12px;padding:10px 13px;box-shadow:0 8px 28px #0d543126;color:#15553d;font:inherit;cursor:pointer;min-height:40px}
#ss-v10-controls .ss-main{background:#286d52;color:white;border-color:#286d52;font-weight:700}
#ss-v10-panel{position:fixed;z-index:2147481900;right:16px;top:11%;width:min(580px,calc(100vw - 32px));max-height:78vh;overflow:auto;background:#fff;color:#163c2d;border:1px solid #d7e6d9;border-radius:18px;box-shadow:0 16px 60px #173d3433;padding:22px;font:400 14px/1.5 'Noto Sans','Segoe UI',Arial,sans-serif}
#ss-v10-panel[hidden]{display:none!important} #ss-v10-panel *{box-sizing:border-box}
#ss-v10-panel h2{font-size:20px;line-height:1.3;margin:0 0 6px;font-weight:800} #ss-v10-panel p{font-size:13px;margin:6px 0 16px;color:#637970}
#ss-v10-panel .ss-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
#ss-v10-panel label{display:block;font-size:12px;font-weight:700;margin:11px 0 5px}
#ss-v10-panel input,#ss-v10-panel select{min-height:38px;border:1px solid #c5d8cb;padding:9px 10px;border-radius:9px;width:100%;max-width:100%;color:#143d31;background:#fff;font-size:14px}
#ss-v10-panel button{font:600 13px 'Noto Sans','Segoe UI',Arial,sans-serif;border:1px solid #bcd4c6;padding:9px 12px;border-radius:10px;background:#fff;color:#205e46;cursor:pointer}
#ss-v10-panel .ss-primary{background:#25674f;color:white;border-color:#25674f}
#ss-v10-panel .ss-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end} #ss-v10-panel .ss-field{flex:1;min-width:145px}
#ss-v10-panel .ss-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:15px}
#ss-v10-panel .ss-status{min-height:20px;font-size:12px;color:#4d6a5d} #ss-v10-panel .ss-status.ss-error{color:#bd3434}
#ss-v10-panel .ss-list{margin-top:15px;overflow-x:auto;max-height:37vh;overflow-y:auto;border-radius:10px;border:1px solid #e1eae4}
#ss-v10-panel table{width:100%;border-collapse:collapse;font-size:12px;min-width:435px}#ss-v10-panel th{background:#e9f4ec;text-align:left;font-size:12px}#ss-v10-panel td,#ss-v10-panel th{padding:10px 11px;border-bottom:1px solid #e6eee8}#ss-v10-panel tbody tr:hover{background:#f7faf7}
#ss-v10-panel .ss-pill{background:#e5f4e9;border-radius:16px;padding:2px 7px;color:#165b40;font-weight:700}#ss-v10-panel .ss-empty{padding:16px;font-size:13px;color:#70887b}
@media(max-width:600px){#ss-v10-controls{right:9px;bottom:9px}#ss-v10-controls button,#ss-v10-controls select{padding:8px 9px}#ss-v10-panel{right:8px;top:8%;width:calc(100vw - 16px);max-height:83vh;padding:14px}}`;
 document.head.appendChild(s);
}
function installControls(){if(document.getElementById('ss-v10-controls'))return;
 const div=document.createElement('div');div.id='ss-v10-controls';
 div.innerHTML=`<select id="ss-v10-language" aria-label="Language"><option value="kk">🇰🇿 ҚАЗ</option><option value="ru">🇷🇺 РУС</option><option value="en">🇬🇧 ENG</option></select><button type="button" class="ss-main" id="ss-v10-open">${T('button')}</button>`;
 document.body.appendChild(div);
 div.querySelector('select').addEventListener('change',ev=>changeLang(ev.target.value));
 div.querySelector('button').addEventListener('click',()=>openPanel());
 div.querySelector('select').value=currentLang;
 const panel=document.createElement('aside');panel.id='ss-v10-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',T('title'));document.body.appendChild(panel);
}
function ensurePanel(){let root=document.getElementById('ss-v10-controls');if(!root)installControls();let btn=document.getElementById('ss-v10-open');if(btn)btn.textContent=T('button');}
function setStatus(message,error=false){const e=document.getElementById('ss-v10-status');if(e){e.textContent=message;e.classList.toggle('ss-error',error);}}
function isManager(){return role?.role==='department_head'&&!!role.departmentId;}
function closePanel(){const el=document.getElementById('ss-v10-panel');if(el)el.hidden=true;}
function renderPanel(){ensurePanel();const el=document.getElementById('ss-v10-panel');if(!el || el.hidden)return; isManager()?renderManager():renderStudentEditor();}
function openPanel(){ensurePanel();const el=document.getElementById('ss-v10-panel');if(!el)return;el.hidden=false;renderPanel();}
async function activeDiary(){
 if(!account)throw new Error(T('login'));
 const uid=account.uid;
 const personal=await getDoc(doc(db,'users',uid,'private','diary'));
 const data=personal.exists()?personal.data():{};
 if(data && (data.attendance||data.data?.attendance||data.diary?.attendance))return data.data||data.diary||data;
 // Own report is a safe, non-private fall-back.
 const report=await getDoc(doc(db,'reports',uid));
 const raw=report.exists()?report.data():{};
 const value=raw?.data||raw;
 return value;
}
function normalizeStudents(data){return (Array.isArray(data?.students)?data.students:[]).map((st,i)=>({id:String(st?.id??i),name:String(st?.name||st?.fullName||st?.fio||'Student '+(i+1))}));}
function lateStudents(data,date){return normalizeStudents(data).filter(student=>{
 const record=data?.attendance?.[date]?.[student.id];
 return record==='late'||record?.status==='late';
});}
let editorDate=localDate(), editorStudentId='',editorTime='';
async function renderStudentEditor(){const el=document.getElementById('ss-v10-panel');if(!el)return;
 el.innerHTML=`<div class="ss-top"><h2>${html(T('title'))}</h2><button type="button" data-action="close" aria-label="×">✕</button></div><p>${html(T('hint'))}</p><div class="ss-row"><div class="ss-field"><label>${html(T('date'))}</label><input id="ss-v10-date" type="date" value="${html(editorDate)}"></div><div class="ss-field"><label>${html(T('student'))}</label><select id="ss-v10-student"><option>${html(T('busy'))}</option></select></div><div class="ss-field"><label>${html(T('time'))}</label><input id="ss-v10-time" type="time" step="60" value="${html(editorTime)}"></div></div><div class="ss-actions"><button type="button" data-action="refresh">${html(T('reload'))}</button><button type="button" data-action="delete">${html(T('remove'))}</button><button type="button" class="ss-primary" data-action="save">${html(T('save'))}</button></div><p class="ss-status" id="ss-v10-status"></p><div class="ss-list" id="ss-v10-list"></div>`;
 el.querySelector('[data-action="close"]').onclick=closePanel;
 el.querySelector('[data-action="refresh"]').onclick=()=>populateStudentEditor();
 el.querySelector('#ss-v10-date').onchange=e=>{editorDate=e.target.value;editorStudentId='';editorTime='';populateStudentEditor();};
 el.querySelector('#ss-v10-student').onchange=e=>{editorStudentId=e.target.value;refreshEditorTime();};
 el.querySelector('#ss-v10-time').onchange=e=>{editorTime=e.target.value;};
 el.querySelector('[data-action="save"]').onclick=saveArrival;
 el.querySelector('[data-action="delete"]').onclick=removeArrival;
 await populateStudentEditor();
}
let lateOptions=[];
async function populateStudentEditor(){if(!db||!account)return setStatus(T('login'),true);
 try{
  const data=await activeDiary();lateOptions=lateStudents(data,editorDate);
  const selector=document.getElementById('ss-v10-student');if(!selector)return;
  if(!lateOptions.length){selector.innerHTML=`<option value="">${html(T('none'))}</option>`;editorStudentId='';editorTime='';}
  else{if(!lateOptions.some(st=>st.id===editorStudentId))editorStudentId=lateOptions[0].id;
   selector.innerHTML=lateOptions.map(st=>`<option value="${html(st.id)}">${html(st.name)}</option>`).join('');selector.value=editorStudentId;
  }
  const snap=await getDocs(collection(db,'reports',account.uid,'lateArrivals'));
  window.__ssV10LateEntries=snap.docs.map(d=>({id:d.id,...d.data()}));
  refreshEditorTime();renderEditorList();
  setStatus(!lateOptions.length?T('none'):'');
 }catch(err){setStatus(`${T('failed')}${String(err.message||err)}`,true);}
}
function refreshEditorTime(){const previous=(window.__ssV10LateEntries||[]).find(x=>x.date===editorDate&&x.studentId===editorStudentId);editorTime=previous?.time||'';const input=document.getElementById('ss-v10-time');if(input)input.value=editorTime;}
function renderEditorList(){const target=document.getElementById('ss-v10-list');if(!target)return;
 const entries=(window.__ssV10LateEntries||[]).filter(e=>e.date===editorDate);
 target.innerHTML=entries.length?`<table><thead><tr><th>${T('studentCol')}</th><th>${T('dateCol')}</th><th>${T('timeCol')}</th></tr></thead><tbody>${entries.map(e=>`<tr><td>${html(e.name)}</td><td>${displayDate(html(e.date))}</td><td><span class="ss-pill">${html(e.time)}</span></td></tr>`).join('')}</tbody></table>`:`<div class="ss-empty">${html(T('noManager'))}</div>`;
}
async function saveArrival(){
 if(!db||!account)return setStatus(T('login'),true);
 const student=lateOptions.find(st=>st.id===editorStudentId);
 const value=document.getElementById('ss-v10-time')?.value||'';
 if(!student)return setStatus(T('notLate'),true);
 if(!validTime(value))return setStatus(T('invalid'),true);
 try{
  // Double-check the status immediately before saving, to prevent stale UI writes.
  const data=await activeDiary();if(!lateStudents(data,editorDate).some(st=>st.id===student.id))return setStatus(T('notLate'),true);
  await setDoc(doc(db,'reports',account.uid,'lateArrivals',entryId(editorDate,student.id)),{date:editorDate,studentId:student.id,name:student.name,time:value});
  editorTime=value;await populateStudentEditor();setStatus(T('saved'));
 }catch(err){setStatus(T('failed')+String(err.message||err),true);}
}
async function removeArrival(){if(!db||!account||!editorStudentId)return;
 try{await deleteDoc(doc(db,'reports',account.uid,'lateArrivals',entryId(editorDate,editorStudentId)));editorTime='';await populateStudentEditor();setStatus(T('deleted'));}
 catch(err){setStatus(T('failed')+String(err.message||err),true);}
}
async function renderManager(){const el=document.getElementById('ss-v10-panel');if(!el)return;
 el.innerHTML=`<div class="ss-top"><h2>${html(T('manager'))}</h2><button type="button" data-action="close">✕</button></div><p>${html(T('notes'))}</p><div class="ss-row"><div class="ss-field"><label>${html(T('filter'))}</label><input id="ss-v10-filter" placeholder="${html(T('filter'))}"></div><div class="ss-actions"><button data-action="refresh">${html(T('refresh'))}</button><button class="ss-primary" data-action="excel">${html(T('download'))}</button></div></div><div class="ss-status" id="ss-v10-status">${html(T('busy'))}</div><div class="ss-list" id="ss-v10-list"></div>`;
 el.querySelector('[data-action="close"]').onclick=closePanel;
 el.querySelector('[data-action="refresh"]').onclick=loadManager;
 el.querySelector('[data-action="excel"]').onclick=exportManager;
 el.querySelector('#ss-v10-filter').oninput=displayManager;
 await loadManager();
}
async function loadManager(){
 if(!account || !isManager())return;
 const token=++fetchVersion;setStatus(T('busy'));
 try{
  const snap=await getDocs(collection(db,'departments',role.departmentId,'members'));
  const uids=snap.docs.map(d=>({uid:d.id,label:String(d.data()?.label||'')}));
  const chunks=[];
  // Read only the configured department members, avoiding unauthorized global scans.
  for(const m of uids){
    try{
      const [r,late]=await Promise.all([getDoc(doc(db,'reports',m.uid)),getDocs(collection(db,'reports',m.uid,'lateArrivals'))]);
      const report=r.exists()?r.data():{}, group=report.data?.group||report.group||m.label||'—';
      const recorded=report.data?.attendance || report.attendance;
      late.docs.forEach(d=>{
        const x=d.data(), status=recorded?.[x.date]?.[x.studentId];
        // Omit stale arrival-time records after an attendance status is changed.
        if(recorded && status !== 'late' && status?.status !== 'late')return;
        chunks.push({group:String(group),date:String(x.date||''),name:String(x.name||''),time:String(x.time||''),studentId:x.studentId||''});
      });
    } catch(error){console.warn('Could not load late arrivals for one group:',m.uid,error);}
  }
  if(token!==fetchVersion)return;
  managerEntries=chunks.sort((a,b)=>b.date.localeCompare(a.date)||a.group.localeCompare(b.group)||a.name.localeCompare(b.name));
  displayManager();setStatus('');
 }catch(err){setStatus(T('failed')+String(err.message||err),true);}
}
function filteredManager(){const query=(document.getElementById('ss-v10-filter')?.value||'').toLowerCase().trim();return managerEntries.filter(e=>!query||[e.group,e.date,e.name,e.time].some(x=>x.toLowerCase().includes(query)));}
function displayManager(){const el=document.getElementById('ss-v10-list');if(!el)return;const list=filteredManager();
 el.innerHTML=list.length?`<table><thead><tr><th>${html(T('groupCol'))}</th><th>${html(T('studentCol'))}</th><th>${html(T('dateCol'))}</th><th>${html(T('timeCol'))}</th></tr></thead><tbody>${list.map(e=>`<tr><td>${html(e.group)}</td><td>${html(e.name)}</td><td>${html(displayDate(e.date))}</td><td><span class="ss-pill">${html(e.time)}</span></td></tr>`).join('')}</tbody></table>`:`<div class="ss-empty">${html(T('noManager'))}</div>`;
}
function excelXML(rows){const esc=x=>html(x);const cols=n=>{let s='';for(let i=n;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="2" width="35" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="20" customWidth="1"/></cols><sheetData>${rows.map((row,i)=>`<row r="${i+1}">${row.map((val,j)=>`<c r="${cols(j+1)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${esc(val)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;}
const C=(table=>data=>{let crc=0xffffffff;for(const b of data){crc=table[(crc^b)&255]^(crc>>>8);}return (crc^0xffffffff)>>>0;})(Array.from({length:256},(_,i)=>{let crc=i;for(let j=0;j<8;j++)crc=(crc&1)?0xedb88320^(crc>>>1):crc>>>1;return crc>>>0;}));
function makeZip(files){const textEnc=new TextEncoder();let pos=0,size=0,locals=[],centers=[];
 for(const [name,contents] of files){const filename=textEnc.encode(name),data=textEnc.encode(contents),checksum=C(data),local=new Uint8Array(30+filename.length),h=new DataView(local.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,2048,true);h.setUint32(14,checksum,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,filename.length,true);local.set(filename,30);locals.push(local,data);
 const dir=new Uint8Array(46+filename.length),d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,2048,true);d.setUint32(16,checksum,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,filename.length,true);d.setUint32(42,pos,true);dir.set(filename,46);centers.push(dir);size+=dir.length;pos+=local.length+data.length;}
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,pos,true);return new Blob([...locals,...centers,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function exportManager(){const list=filteredManager();const rows=[[T('groupCol'),T('studentCol'),T('dateCol'),T('timeCol')],...list.map(x=>[x.group,x.name,displayDate(x.date),x.time])];
 const workbook=makeZip([
 ['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
 ['_rels/.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
 ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Late arrivals" sheetId="1" r:id="rId1"/></sheets></workbook>`],
 ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
 ['xl/worksheets/sheet1.xml',excelXML(rows)]]);
 const url=URL.createObjectURL(workbook),a=document.createElement('a');a.href=url;a.download='Smart_Starosta_Late_Arrivals.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function connect(){if(!getApps().length)return false;try{const app=getApp();auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,async user=>{account=user;role=null;closePanel();managerEntries=[];if(!user)return;try{const s=await getDoc(doc(db,'staffRoles',user.uid));role=s.exists()?s.data():null;}catch(err){console.warn('Cannot read role',err)}ensurePanel();});return true;}catch(e){console.warn('Smart Starosta addon connection:',e);return false;}}
function init(){installStyle();installControls();translatePage();const observer=new MutationObserver(()=>scheduleTranslation());observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 let tries=0;const timer=setInterval(async()=>{if(await connect()){clearInterval(timer);}else if(++tries>120){clearInterval(timer);console.warn('Smart Starosta: Firebase app not initialized');}},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
