import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔧 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAIN2kwSLT6zyFOY7WyonpvdtNM9xpmV4g",
  authDomain: "woops-4ded6.firebaseapp.com",
  projectId: "woops-4ded6",
  storageBucket: "woops-4ded6.firebasestorage.app",
  messagingSenderId: "371589558003",
  appId: "1:371589558003:web:9e50637114a1526b9c5186"
};

// 🚀 Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 📦 DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const chatScreen = document.getElementById('chat-screen');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authError = document.getElementById('auth-error');
const chatList = document.getElementById('chat-list');
const backBtn = document.getElementById('back-btn');
const msgArea = document.getElementById('msg-area');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab');

// 👤 Элементы профиля (<dialog>)
const editProfileBtns = document.querySelectorAll('#edit-profile, #edit-profile-mobile');
const profileModal = document.getElementById('profileModal');
const closeProfileBtn = document.getElementById('closeProfile');
const cancelProfileBtn = document.getElementById('cancelProfile');
const saveProfileBtn = document.getElementById('saveProfile');
const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
const displayNameInput = document.getElementById('displayName');
const userStatusSelect = document.getElementById('userStatus');
const statusTextInput = document.getElementById('statusText');

// 😊 Эмодзи
const emojiToggle = document.getElementById('emojiToggle');
const emojiPicker = document.getElementById('emojiPicker');

// 🔔 Toast
const toast = document.getElementById('toast');

// 🌐 Глобальное состояние
let currentUser = null;
let currentChat = null;
let unsubChat = null;
let unsubUsers = null;
let unsubOwnProfile = null;
let userProfile = {};

const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪','🎯','🌟','💬','🚀','✅','❌','⚡','🎮','🎵','🍕'];

// ============================================
// 🔐 СЛУШАТЕЛЬ СЕССИИ АВТОРИЗАЦИИ
// ============================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    
    trackOwnProfile(user.uid);
    loadChats();
  } else {
    currentUser = null;
    userProfile = {};
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
    chatScreen.classList.remove('active');
    cleanupListeners();
  }
});

loginBtn.onclick = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  if (authError) authError.textContent = '';
  
  if (!email || !pass) {
    if (authError) authError.textContent = 'Заполните все поля';
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast('С возвращением! 👋');
  } catch(e) {
    if (authError) authError.textContent = getAuthError(e.code);
    showToast('Ошибка авторизации', 'error');
  }
};

registerBtn.onclick = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  if (authError) authError.textContent = '';
  
  if (!email || pass.length < 6) {
    if (authError) authError.textContent = 'Email и пароль (минимум 6 символов)';
    return;
  }
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const defaultName = email.split('@')[0];
    
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName: defaultName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=6366f1&color=fff`,
      status: 'online',
      statusText: '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
    
    showToast('Аккаунт создан! 🎉');
  } catch(e) {
    if (authError) authError.textContent = getAuthError(e.code);
    showToast('Ошибка регистрации', 'error');
  }
};

logoutBtn.onclick = async () => {
  if (currentUser) {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        status: 'offline',
        lastSeen: serverTimestamp()
      });
    } catch(e) { console.error(e); }
  }
  await signOut(auth);
  showToast('Вы вышли из системы');
};

// ============================================
// 👤 РАБОТА С ПРОФИЛЕМ (REAL-TIME)
// ============================================
function trackOwnProfile(uid) {
  if (unsubOwnProfile) unsubOwnProfile();
  
  unsubOwnProfile = onSnapshot(doc(db, 'users', uid), (docSnap) => {
    if (docSnap.exists()) {
      userProfile = { id: uid, ...docSnap.data() };
      updateProfileUI(userProfile);
    }
  });
}

editProfileBtns.forEach(btn => {
  btn.onclick = () => {
    if (!currentUser) return;
    displayNameInput.value = userProfile.displayName || '';
    userStatusSelect.value = userProfile.status || 'online';
    statusTextInput.value = userProfile.statusText || '';
    avatarPreview.src = userProfile.avatar || '';
    
    if (profileModal) profileModal.showModal();
  };
});

function closeModal() {
  if (profileModal) profileModal.close();
}
if (closeProfileBtn) closeProfileBtn.onclick = closeModal;
if (cancelProfileBtn) cancelProfileBtn.onclick = closeModal;

avatarInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      showToast('Размер файла превышает 2МБ', 'error');
      avatarInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => { avatarPreview.src = ev.target.result; };
    reader.readAsDataURL(file);
  }
};

saveProfileBtn.onclick = async () => {
  if (!currentUser) return;
  
  const displayName = displayNameInput.value.trim() || userProfile.displayName;
  const status = userStatusSelect.value;
  const statusText = statusTextInput.value.trim();
  
  try {
    let avatarUrl = userProfile.avatar;
    
    if (avatarInput.files[0]) {
      showToast('Загружаем изображение...');
      const file = avatarInput.files[0];
      const storageRef = ref(storage, `avatars/${currentUser.uid}/avatar_${Date.now()}`);
      await uploadBytes(storageRef, file);
      avatarUrl = await getDownloadURL(storageRef);
    }
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
      displayName, status, statusText, avatar: avatarUrl, lastSeen: serverTimestamp()
    });
    
    closeModal();
    showToast('Профиль успешно сохранен! ✨');
  } catch(e) {
    console.error(e);
    showToast('Ошибка сохранения данных', 'error');
  }
};

function updateProfileUI(profile) {
  const name = profile.displayName || 'Пользователь';
  const avatar = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  const status = profile.status || 'online';
  const statusText = profile.statusText;
  
  const statusLabels = { online: '● В сети', busy: '🔴 Занят', away: '🟡 Отошёл', offline: '⚫ Не в сети' };
  const resolvedStatus = statusText ? `${statusLabels[status]} • ${statusText}` : statusLabels[status];

  const bindings = [
    { nameId: 'my-name', avatarId: 'my-avatar', statusId: 'my-status-text', dotId: 'my-status-dot' },
    { nameId: 'my-name-mobile', avatarId: 'my-avatar-mobile', statusId: 'my-status-mobile', dotId: null }
  ];

  bindings.forEach(b => {
    const n = document.getElementById(b.nameId);
    const a = document.getElementById(b.avatarId);
    const s = document.getElementById(b.statusId);
    const d = b.dotId ? document.getElementById(b.dotId) : null;

    if (n) n.textContent = name;
    if (a) a.src = avatar;
    if (s) s.textContent = resolvedStatus;
    if (d) d.className = `status-indicator status-${status}`;
  });
}

// ============================================
// 💬 ЗАГРУЗКА СПИСКА КОНТАКТОВ
// ============================================
function loadChats() {
  if (!currentUser) return;
  const q = query(collection(db, 'users'));
  
  if (unsubUsers) unsubUsers();
  
  unsubUsers = onSnapshot(q, (snap) => {
    chatList.innerHTML = '';
    let hasChats = false;
    
    snap.forEach(docSnap => {
      if (docSnap.id === currentUser.uid) return;
      hasChats = true;
      
      const user = docSnap.data();
      const li = document.createElement('li');
      
      const wrap = document.createElement('div');
      wrap.className = 'avatar-wrapper';
      
      const img = document.createElement('img');
      img.className = 'avatar';
      img.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`;
      
      const dot = document.createElement('span');
      dot.className = `status-indicator status-${user.status || 'offline'}`;
      
      wrap.appendChild(img);
      wrap.appendChild(dot);
      
      const info = document.createElement('div');
      info.className = 'chat-info';
      info.innerHTML = `
        <h4>${escapeHtml(user.displayName || 'Аноним')}</h4>
        <p class="text-muted">${escapeHtml(user.statusText || 'Нажми для начала диалога 💬')}</p>
      `;
      
      li.appendChild(wrap);
      li.appendChild(info);
      li.onclick = () => openChat(docSnap.id, user.displayName, user.avatar);
      
      chatList.appendChild(li);
    });
    
    const empty = document.getElementById('chats-empty');
    if (empty) empty.style.display = hasChats ? 'none' : 'block';
  });
}

// ============================================
// ✉️ ПЕРЕПИСКА В ЧАТЕ
// ============================================
function openChat(userId, name, avatar) {
  currentChat = { id: userId, name, avatar };
  
  if (window.innerWidth < 768) mainScreen.classList.remove('active');
  chatScreen.classList.add('active');
  
  document.getElementById('chat-name').textContent = name;
  document.getElementById('chat-avatar').src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  
  msgArea.innerHTML = '<div class="empty-state">Синхронизация сообщений...</div>';
  
  const room = [currentUser.uid, userId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  
  if (unsubChat) unsubChat();
  
  unsubChat = onSnapshot(q, (snap) => {
    msgArea.innerHTML = '';
    if (snap.empty) {
      msgArea.innerHTML = '<div class="empty-state">Тут пока пусто. Напишите что-нибудь! ✨</div>';
    } else {
      snap.forEach(d => {
        msgArea.appendChild(renderMessage(d.data()));
      });
    }
    setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 300);
  });
}

function renderMessage(msg) {
  const div = document.createElement('div');
  const isOwn = msg.senderId === currentUser?.uid;
  div.className = `msg ${isOwn ? 'out' : 'in'}`;
  div.innerHTML = `${escapeHtml(msg.text)}<span class="time">${formatTime(msg.createdAt)}</span>`;
  return div;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

sendBtn.onclick = async () => {
  const text = textInput.value.trim();
  if (!text || !currentChat) return;
  
  try {
    const room = [currentUser.uid, currentChat.id].sort().join('_');
    await addDoc(collection(db, 'messages'), {
      room, senderId: currentUser.uid, text, createdAt: serverTimestamp()
    });
    textInput.value = '';
    textInput.focus();
  } catch(e) {
    showToast('Ошибка отправки', 'error');
  }
};

textInput.onkeypress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
};

backBtn.onclick = () => {
  chatScreen.classList.remove('active');
  mainScreen.classList.add('active');
  currentChat = null;
  if (unsubChat) { unsubChat(); unsubChat = null; }
};

// ============================================
// 😊 ПАНЕЛЬ ЭМОДЗИ
// ============================================
function initEmojiPicker() {
  if (!emojiPicker) return;
  emojiPicker.innerHTML = '';
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = emoji;
    btn.onclick = () => {
      const pos = textInput.selectionStart;
      textInput.value = textInput.value.substring(0, pos) + emoji + textInput.value.substring(pos);
      textInput.focus();
      hideEmojiPicker();
    };
    emojiPicker.appendChild(btn);
  });
}

if (emojiToggle) {
  emojiToggle.onclick = (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('active');
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-picker') && !e.target.closest('#emojiToggle')) hideEmojiPicker();
  });
}
function hideEmojiPicker() { if (emojiPicker) emojiPicker.classList.remove('active'); }
initEmojiPicker();

// ============================================
// 🧭 ТАБ-НАВИГАЦИЯ
// ============================================
navBtns.forEach(btn => {
  btn.onclick = () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    const target = document.getElementById('tab-' + btn.dataset.tab);
    if (target) target.classList.add('active');
    
    const titles = { chats: 'Чаты', status: 'Статус', calls: 'Звонки', profile: 'Профиль' };
    const titleEl = document.getElementById('tab-title');
    if (titleEl) titleEl.textContent = titles[btn.dataset.tab] || 'Woops';
  };
});

// ============================================
// 🛡️ СЕРВИСНЫЕ ФУНКЦИИ
// ============================================
function showToast(message, type = 'success') {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getAuthError(code) {
  const errors = {
    'auth/invalid-email': 'Некорректный формат почты',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/email-already-in-use': 'Почта уже используется'
  };
  return errors[code] || 'Ошибка доступа';
}

function cleanupListeners() {
  if (unsubChat) unsubChat();
  if (unsubUsers) unsubUsers();
  if (unsubOwnProfile) unsubOwnProfile();
  unsubChat = null; unsubUsers = null; unsubOwnProfile = null; currentChat = null;
}

function adjustViewport() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
window.addEventListener('resize', adjustViewport);
adjustViewport();
