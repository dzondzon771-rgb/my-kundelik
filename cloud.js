/**
 * Smart Starosta — Firebase sync and account gate.
 * 1 account = 1 private diary. Change firestore.rules if you later build shared groups.
 * Firebase web configuration is public; user privacy is enforced by Firestore Rules.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import {
  getAuth, setPersistence, inMemoryPersistence, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, signOut
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAvGlVGjBkeP46X_3i5YmlXJScKQYxfrVU',
  authDomain: 'mykundelik.firebaseapp.com',
  projectId: 'mykundelik',
  storageBucket: 'mykundelik.firebasestorage.app',
  messagingSenderId: '557644602792',
  appId: '1:557644602792:web:601ad7e61c13bbe5bcd19d',
  measurementId: 'G-DXMZ5B34J2'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const gate = document.getElementById('cloud-gate');
const setupGate = document.getElementById('cloud-setup');
const setupForm = document.getElementById('cloud-setup-form');
const setupError = document.getElementById('cloud-setup-error');
const form = document.getElementById('cloud-auth-form');
const authError = document.getElementById('cloud-auth-error');
const title = document.getElementById('cloud-auth-title');
const subtitle = document.getElementById('cloud-auth-subtitle');
const submitButton = document.getElementById('cloud-auth-submit');
const toggleButton = document.getElementById('cloud-auth-toggle');
const forgotButton = document.getElementById('cloud-auth-forgot');
const confirmField = document.getElementById('cloud-confirm-field');
const statusEl = document.getElementById('cloud-status');
const bar = document.getElementById('cloud-bar');
const root = document.getElementById('root');
const emailEl = document.getElementById('cloud-user-email');

submitButton.disabled = true;
let mode = 'login';
let currentUid = null;
let userKey = null;
let pendingKey = null;
let activeRef = null;
let isBooted = false;
let currentAuthTask = false;
let loginReady = false;
let pendingValue = null;
let pendingTimer = null;
let saving = false;
let lastSyncedSignature = null;
let unsubscribe = null;

const LEGACY_KEY = 'smart-starosta-offline-v1';

function signature(value) {
  // Sorted keys ensure Firestore's object key order doesn't provoke needless writes.
  function sort(value) {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
    }
    return value;
  }
  return JSON.stringify(sort(value));
}

function setStatus(message, kind = '') {
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
}

function friendlyError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-email': 'Email дұрыс жазылмаған.',
    'auth/invalid-credential': 'Email немесе құпиясөз қате.',
    'auth/email-already-in-use': 'Бұл email бұрын тіркелген.',
    'auth/weak-password': 'Құпиясөз кемінде 6 таңбадан тұруы керек.',
    'auth/missing-password': 'Құпиясөзді енгіз.',
    'auth/too-many-requests': 'Өте көп әрекет жасалды. Кейін қайтала.',
    'auth/network-request-failed': 'Интернет байланысын тексер.',
    'auth/operation-not-allowed': 'Firebase Authentication ішінен Email/Password әдісін қос.',
    'permission-denied': 'Firestore Rules жарияланбаған немесе рұқсат бермейді.',
    'unavailable': 'Дерекқорға қосылу мүмкін болмады. Интернетті тексер.'
  };
  return messages[code] || `Қате: ${error?.message || 'Белгісіз қате'}`;
}

function setMode(next) {
  mode = next;
  const register = mode === 'register';
  title.textContent = register ? 'Аккаунт ашу' : 'Күнделікке кіру';
  subtitle.textContent = register ? 'Өз күнделігіңе жеке аккаунт құр.' : 'Өз мәліметтеріңді телефоннан да, компьютерден де аш.';
  submitButton.textContent = register ? 'Тіркелу' : 'Кіру';
  toggleButton.textContent = register ? 'Аккаунтың бар ма? Кіру' : 'Аккаунтың жоқ па? Тіркелу';
  confirmField.hidden = !register;
  forgotButton.hidden = register;
  authError.textContent = '';
}

toggleButton.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (currentAuthTask) return;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  if (mode === 'register' && password !== form.elements.confirm.value) {
    authError.textContent = 'Құпиясөздер сәйкес емес.';
    return;
  }
  if (!loginReady) return;
  currentAuthTask = true;
  submitButton.disabled = true;
  authError.textContent = '';
  try {
    const credential = mode === 'register'
      ? await createUserWithEmailAndPassword(auth, email, password)
      : await signInWithEmailAndPassword(auth, email, password);
    form.elements.password.value = '';
    form.elements.confirm.value = '';
    // Only a successful, explicitly submitted login is allowed to open the diary.
    await bootstrap(credential.user);
  } catch (error) {
    authError.textContent = friendlyError(error);
  } finally {
    currentAuthTask = false;
    submitButton.disabled = !loginReady;
  }
});

forgotButton.addEventListener('click', async () => {
  const email = form.elements.email.value.trim();
  if (!email) { authError.textContent = 'Алдымен email енгіз.'; return; }
  authError.textContent = '';
  try {
    await sendPasswordResetEmail(auth, email);
    authError.textContent = 'Құпиясөзді ауыстыру сілтемесі email-ға жіберілді.';
  } catch (error) { authError.textContent = friendlyError(error); }
});

async function logout() {
  if (pendingValue || saving) {
    const proceed = window.confirm('Өзгерістер әлі онлайн сақталмаған болуы мүмкін. Сонда да шығасың ба?');
    if (!proceed) return;
  }
  if (unsubscribe) unsubscribe();
  await signOut(auth);
  window.location.reload(); // Unmount the previous user's React state.
}
document.getElementById('cloud-logout').addEventListener('click', logout);
document.getElementById('cloud-setup-logout').addEventListener('click', logout);

function showLogin() {
  root.hidden = true;
  bar.hidden = true;
  setupGate.hidden = true;
  gate.hidden = false;
  authError.textContent = '';
}

function queueSave(value) {
  if (!currentUid || !isBooted || !value) return;
  const nextSignature = signature(value);
  if (nextSignature === lastSyncedSignature && !pendingValue) {
    setStatus('Онлайн сақталған', 'ok');
    return;
  }
  pendingValue = value;
  // Keep a durable local copy if connection drops before Firestore accepts changes.
  localStorage.setItem(pendingKey, '1');
  setStatus(navigator.onLine ? 'Сақталуда…' : 'Интернет жоқ · құрылғыда сақталды', 'pending');
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(flush, 850);
}

async function flush() {
  if (saving || !pendingValue || !activeRef || !currentUid) return;
  if (!navigator.onLine) {
    setStatus('Интернет жоқ · құрылғыда сақталды', 'pending');
    return;
  }
  saving = true;
  const savingValue = pendingValue;
  const savingSignature = signature(savingValue);
  try {
    await setDoc(activeRef, { data: savingValue, updatedAt: serverTimestamp() });
    lastSyncedSignature = savingSignature;
    if (pendingValue && signature(pendingValue) === savingSignature) {
      pendingValue = null;
      localStorage.removeItem(pendingKey);
      setStatus('Онлайн сақталған', 'ok');
    }
  } catch (error) {
    setStatus('Сақтау қатесі: ' + friendlyError(error), 'error');
  } finally {
    saving = false;
    if (pendingValue && signature(pendingValue) !== savingSignature && navigator.onLine) {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(flush, 850);
    }
  }
}

window.addEventListener('online', () => {
  if (pendingValue) flush();
  else if (isBooted) setStatus('Интернет қосылды', 'ok');
});
window.addEventListener('offline', () => {
  if (isBooted) setStatus('Интернет жоқ · жергілікті сақтау', 'pending');
});

async function bootstrap(user) {
  if (currentUid === user.uid && isBooted) return;
  currentUid = user.uid;
  pendingValue = null;
  lastSyncedSignature = null;
  isBooted = false;
  userKey = `smart-starosta-cloud-user-${user.uid}`;
  pendingKey = `smart-starosta-pending-${user.uid}`;
  activeRef = doc(db, 'users', user.uid, 'private', 'diary');
  window.SmartStarostaCloud = { storageKey: userKey, queueSave };
  emailEl.textContent = user.email || 'Пайдаланушы';
  root.hidden = true;
  setupGate.hidden = true;
  gate.hidden = false;
  authError.textContent = 'Деректер Firebase-тен жүктелуде…';

  let remote = null;
  let readError = null;
  try {
    const found = await getDoc(activeRef);
    remote = found.exists() ? found.data().data : null;
  } catch (error) {
    readError = error;
  }

  if (readError) {
    const cached = localStorage.getItem(userKey);
    if (navigator.onLine || !cached) {
      authError.textContent = navigator.onLine
        ? friendlyError(readError) + ' Firestore Database және Rules баптауын тексер, сосын бетті жаңарт.'
        : 'Интернет жоқ. Бұл құрылғыда бұрын сақталған күнделік табылмады. Интернетке қосылып, бетті жаңарт.';
      return;
    }
    // Offline cached data is not necessarily newer than Firestore: opening it
    // must NOT automatically trigger an overwrite when the network returns.
    try { lastSyncedSignature = signature(JSON.parse(cached)); }
    catch { authError.textContent = 'Сақталған деректерді оқу қатесі. Интернетке қосылып, жаңарт.'; return; }
    window.addEventListener('online', () => window.location.reload(), { once: true });
  }

  try {
    if (remote && typeof remote === 'object') {
      lastSyncedSignature = signature(remote);
      if (localStorage.getItem(pendingKey) === '1' && localStorage.getItem(userKey)) {
        // An unsent local edit is more useful than silently overwriting it.
        // Once the app mounts, its first state effect will retry the cloud write.
        setStatus('Жергілікті өзгерістерді синхрондау…', 'pending');
      } else {
        localStorage.setItem(userKey, JSON.stringify(remote));
      }
    } else if (!readError && !localStorage.getItem(userKey)) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        let valid = false;
        try { const parsed = JSON.parse(legacy); valid = parsed && typeof parsed === 'object'; }
        catch { /* invalid local backup: don't import */ }
        if (valid && window.confirm('Осы құрылғыда ескі күнделік деректері бар. Оларды жаңа аккаунтыңа көшіреміз бе?')) {
          localStorage.setItem(userKey, legacy);
          localStorage.setItem(pendingKey, '1');
        }
      }
    }
  } catch (error) {
    authError.textContent = 'Жергілікті сақтау қатесі: ' + friendlyError(error);
    return;
  }

  // Existing custom student names are preserved. Only untouched, fully generic
  // initial data from the older version is considered a sample, not a real group.
  let initial = null;
  try { initial = JSON.parse(localStorage.getItem(userKey) || 'null'); }
  catch { initial = null; }
  if (initial && looksLikeOldSample(initial)) {
    initial.group = '';
    initial.leader = '';
    initial.lessons = [];
    initial.attendance = {};
    initial.students = initial.students.map((student, i) => ({
      ...student, name: `${i + 1} студент`, role: ''
    }));
    localStorage.setItem(userKey, JSON.stringify(initial));
    // Keep pending status: the new group should be saved after the wizard.
  }
  if (!initial || !String(initial.group || '').trim()) {
    gate.hidden = true;
    bar.hidden = true;
    setupGate.hidden = false;
    root.hidden = true;
    setupError.textContent = '';
    // Keep per-account name fields empty unless user provides them.
    return;
  }
  mountDiary(readError);
}

function looksLikeOldSample(data) {
  if (data.group !== 'БҚ-301' || data.leader !== 'Староста') return false;
  if (!Array.isArray(data.students) || data.students.length === 0) return false;
  return data.students.every((student, i) =>
    student.name === `Студент ${i + 1}` ||
    student.name === `${i + 1} студент`
  );
}

function mountDiary(readError) {
  gate.hidden = true;
  bar.hidden = false;
  root.hidden = false;
  isBooted = true;
  setStatus(readError ? 'Офлайн · құрылғыдағы деректер' : 'Онлайн сақтау қосулы', readError ? 'pending' : 'ok');
  window.dispatchEvent(new Event('smartstarosta:start'));

  // Cloud edits from a second device are reflected in this tab.
  if (!readError) {
    unsubscribe = onSnapshot(activeRef, snapshot => {
      const remoteData = snapshot.exists() ? snapshot.data().data : null;
      if (!remoteData || typeof remoteData !== 'object') return;
      const remoteSignature = signature(remoteData);
      if (pendingValue || saving || localStorage.getItem(pendingKey) === '1') return;
      if (remoteSignature === lastSyncedSignature) return;
      lastSyncedSignature = remoteSignature;
      localStorage.setItem(userKey, JSON.stringify(remoteData));
      window.dispatchEvent(new CustomEvent('smartstarosta:remote', { detail: remoteData }));
      setStatus('Жаңа деректер келді', 'ok');
    }, error => setStatus('Синхрондау қатесі: ' + friendlyError(error), 'error'));
  }
}

setupForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!currentUid || !loginReady || !activeRef || isBooted) return;
  const group = setupForm.elements.group.value.trim();
  const leader = setupForm.elements.leader.value.trim();
  const count = Number(setupForm.elements.count.value);
  if (!group || group.length > 30 || !Number.isInteger(count) || count < 1 || count > 60) {
    setupError.textContent = 'Топ атауын және 1–60 аралығындағы студент санын дұрыс енгіз.';
    return;
  }
  const data = {
    schemaVersion: 2,
    group,
    leader,
    students: Array.from({ length: count }, (_, i) => ({ id: `s${i}`, name: `${i + 1} студент`, role: '' })),
    lessons: [], attendance: {}, notes: {}
  };
  try { localStorage.setItem(userKey, JSON.stringify(data)); }
  catch (error) { setupError.textContent = 'Құрылғыға сақтау мүмкін болмады: ' + friendlyError(error); return; }
  setupGate.hidden = true;
  mountDiary(false);
});

// Important: NEVER automatically open a saved Firebase session. The previous
// build persisted auth; first wait for Firebase to restore it, then sign out,
// switch to memory-only auth, and wait for an explicit validated login.
async function initializeLogin() {
  root.hidden = true;
  bar.hidden = true;
  gate.hidden = false;
  setupGate.hidden = true;
  authError.textContent = 'Аккаунт тексерілуде…';
  submitButton.disabled = true;
  try {
    await auth.authStateReady();
    await signOut(auth);
    await setPersistence(auth, inMemoryPersistence);
    showLogin();
    loginReady = true;
    submitButton.disabled = false;
  } catch (error) {
    authError.textContent = 'Firebase қосылу қатесі: ' + friendlyError(error);
  }
}
initializeLogin();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
