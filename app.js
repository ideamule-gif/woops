// Импорт модулей Firebase из CDN (не нужен npm-сборщик)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, where, getDocs, doc, setDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔥 Твой конфиг
const firebaseConfig = {
  apiKey: "AIzaSyAIN2kwSLT6zyFOY7WyonpvdtNM9xpmV4g",
  authDomain: "woops-4ded6.firebaseapp.com",
  projectId: "woops-4ded6",
  storageBucket: "woops-4ded6.firebasestorage.app",
  messagingSenderId: "371589558003",
  appId: "1:371589558003:web:9e50637114a1526b9c5186",
  measurementId: "G-7G6T986RVG"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const chatScreen = document.getElementById('chat-screen');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authError = document.getElementById('auth-error');
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab');
const tabTitle = document.getElementById('tab-title');
const chatList = document.getElementById('chat-list');
const backBtn = document.getElementById('back-btn');
const msgArea = document.getElementById('msg-area');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const voiceBtn = document.getElementById('voice-btn');
const editProfileBtn = document.getElementById('edit-profile');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let currentChat = null;
let mediaRecorder = null;
let audioChunks = [];
let unsubscribeChat = null;

// 🔐 Авторизация
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    await loadProfile();
    loadChatsList();
  } else {
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
    currentUser = null;
  }
});

loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  if (!email || pass.length < 6) return showError('Введите email и пароль (мин. 6 символов)');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) { showError(e.message); }
});

registerBtn.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const name = document.getElementById('auth-phone').value.trim() || email.split('@')[0];
  if (!email || pass.length < 6) return showError('Введите email и пароль (мин. 6 символов)');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, avatar: null, status: 'В сети', createdAt: serverTimestamp()
    });
  } catch (e) { showError(e.message); }
});

function showError(msg) { authError.textContent = msg; setTimeout(() => authError.textContent = '', 5000); }

logoutBtn.addEventListener('click', () => signOut(auth));

// 👤 Профиль
async function loadProfile() {
  if (!currentUser) return;
  const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
  let userData = { name: currentUser.displayName || 'Пользователь', avatar: null, status: 'В сети' };
  if (!userDoc.empty) userData = { ...userData, ...userDoc.docs[0].data() };
  
  document.getElementById('my-name').textContent = userData.name;
  document.getElementById('my-status').textContent = userData.status;
  if (userData.avatar) {
    const av = document.getElementById('my-avatar');
    av.style.backgroundImage = `url(${userData.avatar})`;
    av.textContent = '';
  }
}

editProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const newName = prompt('Ваше имя:', currentUser.displayName || '');
  if (newName) {
    await updateProfile(currentUser, { displayName: newName });
    await updateDoc(doc(db, 'users', currentUser.uid), { name: newName });
  }
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateDoc(doc(db, 'users', currentUser.uid), { avatar: url });
    loadProfile();
  };
  input.click();
});

// 💬 Список чатов (упрощённо: все пользователи как чаты)
async function loadChatsList() {
  chatList.innerHTML = '<li style="padding:16px;color:#888">Загрузка...</li>';
  const usersSnap = await getDocs(collection(db, 'users'));
  chatList.innerHTML = '';
  usersSnap.forEach(docSnap => {
    if (docSnap.id === currentUser.uid) return;
    const u = docSnap.data();
    const li = document.createElement('li');
    li.innerHTML = `<div class="avatar">${(u.name||'?')[0].toUpperCase()}</div><div><h4>${u.name||'Аноним'}</h4><p>Нажмите, чтобы начать чат</p></div>`;
    li.onclick = () => openChat(docSnap.id, u.name, u.avatar);
    chatList.appendChild(li);
  });
  if (chatList.children.length === 0) chatList.innerHTML = '<li style="padding:16px;color:#888">Нет других пользователей</li>';
}

// 💬 Открытие чата + подписка на сообщения в реальном времени
function openChat(userId, userName, userAvatar) {
  currentChat = { id: userId, name: userName, avatar: userAvatar };
  mainScreen.classList.remove('active');
  chatScreen.classList.add('active');
  document.getElementById('chat-name').textContent = userName;
  document.getElementById('chat-avatar').textContent = (userName||'?')[0].toUpperCase();
  if (userAvatar) {
    const av = document.getElementById('chat-avatar');
    av.style.backgroundImage = `url(${userAvatar})`;
    av.textContent = '';
  }
  msgArea.innerHTML = '';

  // Подписка на сообщения (чат = комната из двух ID, отсортированных)
  const room = [currentUser.uid, userId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  
  if (unsubscribeChat) unsubscribeChat();
  unsubscribeChat = onSnapshot(q, (snap) => {
    msgArea.innerHTML = '';
    snap.forEach(doc => {
      const m = doc.data();
      appendMessage(m.text, m.type, m.senderId === currentUser.uid);
    });
    msgArea.scrollTop = msgArea.scrollHeight;
  });
}

backBtn.addEventListener('click', () => {
  chatScreen.classList.remove('active');
  mainScreen.classList.add('active');
  if (unsubscribeChat) unsubscribeChat();
  currentChat = null;
});

// ➤ Отправка сообщений
async function sendMessage(text, type = 'text') {
  if (!currentChat || !text) return;
  const room = [currentUser.uid, currentChat.id].sort().join('_');
  await addDoc(collection(db, 'messages'), {
    room, senderId: currentUser.uid, text, type,
    createdAt: serverTimestamp()
  });
}

function appendMessage(text, type = 'text', isMine) {
  const div = document.createElement('div');
  div.className = `msg ${isMine ? 'out' : 'in'}`;
  if (type === 'image') div.innerHTML = `<img src="${text}" style="max-width:100%;border-radius:8px;">`;
  else if (type === 'audio') div.innerHTML = `<audio controls src="${text}"></audio>`;
  else if (type === 'file') div.innerHTML = `📎 <a href="${text}" target="_blank" style="color:#fff;text-decoration:underline;">Файл</a>`;
  else div.textContent = text;
  msgArea.appendChild(div);
  msgArea.scrollTop = msgArea.scrollHeight;
}

sendBtn.addEventListener('click', () => {
  const val = textInput.value.trim();
  if (val) { sendMessage(val, 'text'); textInput.value = ''; }
});
textInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendBtn.click(); });

// 📎 Вложения
attachBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !currentChat) return;
  const storageRef = ref(storage, `media/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const type = file.type.startsWith('image/') ? 'image' : 'file';
  sendMessage(url, type);
  fileInput.value = '';
});

// 🎤 Голосовые
voiceBtn.addEventListener('mousedown', startRecord);
voiceBtn.addEventListener('mouseup', stopRecord);
voiceBtn.addEventListener('touchstart', e => { e.preventDefault(); startRecord(); });
voiceBtn.addEventListener('touchend', e => { e.preventDefault(); stopRecord(); });

async function startRecord() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const storageRef = ref(storage, `voice/${currentUser.uid}/${Date.now()}.webm`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      sendMessage(url, 'audio');
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
    voiceBtn.style.color = '#ef4444';
  } catch (err) { alert('Разрешите доступ к микрофону'); }
}
function stopRecord() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    voiceBtn.style.color = '';
  }
}

// 🔄 Переключение вкладок
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    tabTitle.textContent = btn.textContent.replace(/[^\wа-яА-ЯёЁ\s]/g, '').trim();
  });
});
