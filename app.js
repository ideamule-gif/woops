import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, getDocs, doc, setDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

// 📦 DOM Elements (основные)
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

// 👤 Профиль элементы
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
const modalOverlay = document.getElementById('modalOverlay');

// 😊 Эмодзи
const emojiToggle = document.getElementById('emojiToggle');
const emojiPicker = document.getElementById('emojiPicker');

// 🔔 Toast
const toast = document.getElementById('toast');

// 🌐 Состояние
let currentUser = null;
let currentChat = null;
let unsubChat = null;
let unsubUsers = null;
let userProfile = {};

// 🎨 Набор эмодзи
const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪','🎯','🌟','💬','🚀','✅','❌','⚡','🎮','🎵','🍕'];

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    
    // Загружаем профиль и чаты
    await loadUserProfile(user.uid);
    loadChats();
    updateProfileUI(userProfile);
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
  authError.textContent = '';
  
  if (!email || !pass) {
    authError.textContent = 'Заполните все поля';
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast('Добро пожаловать! 👋', 'success');
  } catch(e) {
    authError.textContent = getAuthError(e.code);
    showToast('Ошибка входа', 'error');
  }
};

registerBtn.onclick = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  authError.textContent = '';
  
  if (!email || pass.length < 6) {
    authError.textContent = 'Email и пароль (мин. 6 символов)';
    return;
  }
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const defaultName = email.split('@')[0];
    
    // Создаём документ пользователя
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName: defaultName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=6366f1&color=fff`,
      status: 'online',
      statusText: '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
    
    showToast('Аккаунт создан! 🎉', 'success');
  } catch(e) {
    authError.textContent = getAuthError(e.code);
    showToast('Ошибка регистрации', 'error');
  }
};

logoutBtn.onclick = async () => {
  if (currentUser) {
    // Обновляем статус на офлайн
    await updateDoc(doc(db, 'users', currentUser.uid), {
      status: 'offline',
      lastSeen: serverTimestamp()
    });
  }
  await signOut(auth);
  showToast('До встречи! 👋', 'success');
};

// ============================================
// 👤 ПРОФИЛЬ
// ============================================
async function loadUserProfile(uid) {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', uid)));
    if (!userDoc.empty) {
      userProfile = { id: uid, ...userDoc.docs[0].data() };
    }
  } catch(e) {
    console.error('Ошибка загрузки профиля:', e);
  }
}

// Открытие модального окна профиля
editProfileBtns.forEach(btn => {
  btn.onclick = () => {
    if (!currentUser) return;
    
    // Заполняем форму текущими данными
    displayNameInput.value = userProfile.displayName || '';
    userStatusSelect.value = userProfile.status || 'online';
    statusTextInput.value = userProfile.statusText || '';
    avatarPreview.src = userProfile.avatar || `https://ui-avatars.com/api/?name=U&background=6366f1&color=fff`;
    
    // Показываем модалку
    profileModal.classList.add('active');
    profileModal.setAttribute('open', 'true');
    document.body.style.overflow = 'hidden'; // Блокируем скролл
  };
});

// Закрытие модалки
function closeModal() {
  profileModal.classList.remove('active');
  profileModal.removeAttribute('open');
  document.body.style.overflow = '';
}

closeProfileBtn.onclick = closeModal;
cancelProfileBtn.onclick = closeModal;
modalOverlay.onclick = closeModal;

// Предпросмотр аватара
avatarInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      showToast('Файл слишком большой (макс. 2MB)', 'error');
      avatarInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => avatarPreview.src = ev.target.result;
    reader.readAsDataURL(file);
  }
};

// Сохранение профиля
saveProfileBtn.onclick = async () => {
  if (!currentUser) return;
  
  const displayName = displayNameInput.value.trim() || userProfile.displayName;
  const status = userStatusSelect.value;
  const statusText = statusTextInput.value.trim();
  
  try {
    let avatarUrl = userProfile.avatar;
    
    // Если выбран новый аватар — загружаем в Storage
    if (avatarInput.files[0]) {
      showToast('Загрузка аватара...', 'success');
      const file = avatarInput.files[0];
      const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}`);
      await uploadBytes(storageRef, file);
      avatarUrl = await getDownloadURL(storageRef);
    }
    
    // Обновляем Firestore
    const updates = {
      displayName,
      status,
      statusText,
      avatar: avatarUrl,
      lastSeen: serverTimestamp()
    };
    
    await updateDoc(doc(db, 'users', currentUser.uid), updates);
    
    // Обновляем локальный профиль и UI
    userProfile = { ...userProfile, ...updates };
    updateProfileUI(userProfile);
    
    closeModal();
    showToast('Профиль обновлён! ✨', 'success');
    
    // Перезагружаем список чатов для обновления аватаров
    loadChats();
    
  } catch(e) {
    console.error('Ошибка сохранения:', e);
    showToast('Не удалось сохранить', 'error');
  }
};

// Обновление UI профиля
function updateProfileUI(profile) {
  const name = profile.displayName || 'Пользователь';
  const avatar = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
  const status = profile.status || 'online';
  const statusText = profile.statusText;
  
  // Элементы профиля
  const elements = [
    { name: document.getElementById('my-name'), avatar: document.getElementById('my-avatar'), status: document.getElementById('my-status-text'), dot: document.getElementById('my-status-dot') },
    { name: document.getElementById('my-name-mobile'), avatar: document.getElementById('my-avatar-mobile'), status: document.getElementById('my-status-mobile') }
  ];
  
  elements.forEach(el => {
    if (el.name) el.name.textContent = name;
    if (el.avatar) el.avatar.src = avatar;
    if (el.status) {
      const statusLabels = { online: '● В сети', busy: '🔴 Занят', away: '🟡 Отошёл', offline: '⚫ Не в сети' };
      el.status.textContent = statusText ? `${statusLabels[status] || '● В сети'} • ${statusText}` : statusLabels[status];
    }
    if (el.dot) {
      el.dot.className = `status-indicator status-${status}`;
    }
  });
  
  // Обновляем заголовок в чате, если открыт
  if (currentChat && currentChat.id === currentUser.uid) {
    document.getElementById('chat-name').textContent = name;
    document.getElementById('chat-avatar').src = avatar;
  }
}

// ============================================
// 💬 ЧАТЫ
// ============================================
function loadChats() {
  if (!currentUser) return;
  
  // Подписка на пользователей в реальном времени
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
      
      // Аватар
      const avatar = document.createElement('img');
      avatar.className = 'avatar';
      avatar.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=6366f1&color=fff`;
      avatar.alt = user.displayName || 'User';
      avatar.onerror = (e) => { e.target.src = `https://ui-avatars.com/api/?name=U&background=6366f1&color=fff`; };
      
      // Инфо
      const info = document.createElement('div');
      info.className = 'chat-info';
      info.innerHTML = `<h4>${escapeHtml(user.displayName || 'Пользователь')}</h4><p class="text-muted">${user.statusText || 'Напишите первое сообщение 👋'}</p>`;
      
      // Статус
      const statusDot = document.createElement('span');
      statusDot.className = `status-indicator status-${user.status || 'offline'}`;
      statusDot.style.position = 'absolute';
      statusDot.style.marginLeft = '-4px';
      
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'avatar-wrapper';
      avatarWrapper.style.position = 'relative';
      avatarWrapper.appendChild(avatar);
      avatarWrapper.appendChild(statusDot);
      
      li.appendChild(avatarWrapper);
      li.appendChild(info);
      li.onclick = () => openChat(docSnap.id, user.displayName || 'Пользователь', user.avatar);
      
      chatList.appendChild(li);
    });
    
    // Пустое состояние
    const emptyState = document.getElementById('chats-empty');
    if (emptyState) {
      emptyState.style.display = hasChats ? 'none' : 'block';
    }
  }, (error) => {
    console.error('Ошибка загрузки чатов:', error);
    showToast('Не удалось загрузить чаты', 'error');
  });
}

function openChat(userId, name, avatar) {
  currentChat = { id: userId, name, avatar };
  
  // Переключаем экраны
  mainScreen.classList.remove('active');
  chatScreen.classList.add('active');
  
  // Обновляем шапку чата
  document.getElementById('chat-name').textContent = name;
  document.getElementById('chat-avatar').src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22c55e&color=fff`;
  
  // Очищаем и показываем загрузку
  msgArea.innerHTML = '<div class="msg in" style="align-self:center;background:var(--surface-2)">Загрузка сообщений...</div>';
  
  // Room ID (сортируем, чтобы был одинаковым для обоих участников)
  const room = [currentUser.uid, userId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  
  // Очищаем предыдущий слушатель
  if (unsubChat) unsubChat();
  
  // Подписка на сообщения
  unsubChat = onSnapshot(q, (snap) => {
    msgArea.innerHTML = '';
    
    if (snap.empty) {
      msgArea.innerHTML = '<div class="empty" style="padding:40px 20px">💬 Начните беседу — напишите первое сообщение!</div>';
    } else {
      snap.forEach(docSnap => {
        const msg = docSnap.data();
        const div = renderMessage(msg);
        msgArea.appendChild(div);
      });
    }
    
    // Скролл вниз
    msgArea.scrollTop = msgArea.scrollHeight;
  }, (error) => {
    console.error('Ошибка чата:', error);
    msgArea.innerHTML = '<div class="msg in" style="background:var(--danger);color:white">Ошибка загрузки сообщений</div>';
  });
}

// Рендер сообщения с поддержкой эмодзи
function renderMessage(msg) {
  const div = document.createElement('div');
  const isOwn = msg.senderId === currentUser?.uid;
  
  div.className = `msg ${isOwn ? 'out' : 'in'}`;
  
  // Обработка эмодзи и экранирование HTML
  let text = escapeHtml(msg.text);
  // Простая замена эмодзи-шорткодов (если будут)
  text = text.replace(/:([a-z_]+):/g, (match, code) => {
    const emojiMap = { smile: '😀', laugh: '😂', heart: '❤️', fire: '🔥', star: '✨' };
    return emojiMap[code] || match;
  });
  
  div.innerHTML = `${text}<span class="time">${formatTime(msg.createdAt)}</span>`;
  return div;
}

// Форматирование времени
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Отправка сообщения
sendBtn.onclick = async () => {
  const text = textInput.value.trim();
  if (!text || !currentChat) return;
  
  try {
    const room = [currentUser.uid, currentChat.id].sort().join('_');
    await addDoc(collection(db, 'messages'), {
      room,
      senderId: currentUser.uid,
      text,
      createdAt: serverTimestamp()
    });
    textInput.value = '';
    textInput.focus();
  } catch(e) {
    console.error('Ошибка отправки:', e);
    showToast('Не удалось отправить', 'error');
  }
};

// Отправка по Enter
textInput.onkeypress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
};

// Фокус на поле ввода при открытии чата
chatScreen.addEventListener('transitionend', () => {
  if (chatScreen.classList.contains('active')) {
    setTimeout(() => textInput.focus(), 300);
  }
});

// ============================================
// 😊 ЭМОДЗИ
// ============================================
// Генерация панели эмодзи
function initEmojiPicker() {
  if (!emojiPicker) return;
  
  emojiPicker.innerHTML = '';
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.setAttribute('aria-label', `Вставить ${emoji}`);
    btn.onclick = () => {
      insertEmoji(emoji);
      hideEmojiPicker();
    };
    emojiPicker.appendChild(btn);
  });
}

// Вставка эмодзи в поле ввода
function insertEmoji(emoji) {
  const input = textInput;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const value = input.value;
  
  input.value = value.substring(0, start) + emoji + value.substring(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  input.focus();
}

// Показать/скрыть эмодзи
if (emojiToggle && emojiPicker) {
  emojiToggle.onclick = (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('active');
    emojiToggle.setAttribute('aria-expanded', emojiPicker.classList.contains('active'));
  };
  
  // Закрыть при клике вне
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-picker') && !e.target.closest('#emojiToggle')) {
      hideEmojiPicker();
    }
  });
}

function hideEmojiPicker() {
  if (emojiPicker) {
    emojiPicker.classList.remove('active');
    if (emojiToggle) emojiToggle.setAttribute('aria-expanded', 'false');
  }
}

// Инициализация
initEmojiPicker();

// ============================================
// 🧭 НАВИГАЦИЯ
// ============================================
navBtns.forEach(btn => {
  btn.onclick = () => {
    // Убираем активные классы
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    
    // Добавляем активный
    btn.classList.add('active');
    const tabId = 'tab-' + btn.dataset.tab;
    document.getElementById(tabId)?.classList.add('active');
    
    // Обновляем заголовок
    const titles = { chats: 'Чаты', status: 'Статус', calls: 'Звонки', profile: 'Профиль' };
    const titleEl = document.getElementById('tab-title');
    if (titleEl) titleEl.textContent = titles[btn.dataset.tab] || 'Woops';
  };
});

// ============================================
// 🔙 НАЗАД ИЗ ЧАТА
// ============================================
backBtn.onclick = () => {
  chatScreen.classList.remove('active');
  mainScreen.classList.add('active');
  currentChat = null;
  
  if (unsubChat) {
    unsubChat();
    unsubChat = null;
  }
  
  // Возвращаем фокус на список чатов
  setTimeout(() => {
    const firstChat = chatList.querySelector('li');
    if (firstChat) firstChat.scrollIntoView({ behavior: 'smooth' });
  }, 100);
};

// ============================================
// 🔔 TOAST УВЕДОМЛЕНИЯ
// ============================================
function showToast(message, type = 'success') {
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  // Авто-скрытие
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// 🛡️ УТИЛИТЫ
// ============================================
// Экранирование HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Читаемые ошибки Firebase Auth
function getAuthError(code) {
  const errors = {
    'auth/invalid-email': 'Неверный формат email',
    'auth/user-disabled': 'Аккаунт заблокирован',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/email-already-in-use': 'Email уже занят',
    'auth/weak-password': 'Пароль слишком простой',
    'auth/network-request-failed': 'Проверьте подключение к интернету'
  };
  return errors[code] || 'Произошла ошибка';
}

// Очистка слушателей при выходе
function cleanupListeners() {
  if (unsubChat) unsubChat();
  if (unsubUsers) unsubUsers();
  unsubChat = null;
  unsubUsers = null;
  currentChat = null;
}

// ============================================
// 🖥️ АДАПТИВ: КЛАВИАТУРА И РАЗМЕРЫ
// ============================================
// Корректировка высоты под мобильную клавиатуру
function adjustViewport() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', adjustViewport);
window.addEventListener('orientationchange', adjustViewport);
adjustViewport();

// ============================================
// 🚀 СТАРТ
// ============================================
// Проверка, авторизован ли пользователь при загрузке
if (auth.currentUser) {
  loadUserProfile(auth.currentUser.uid).then(() => {
    loadChats();
    updateProfileUI(userProfile);
  });
}

// Обработка онлайн-статуса
window.addEventListener('online', () => {
  if (currentUser) {
    updateDoc(doc(db, 'users', currentUser.uid), { 
      status: 'online', 
      lastSeen: serverTimestamp() 
    });
    showToast('Вы в сети 🟢', 'success');
  }
});

window.addEventListener('offline', () => {
  showToast('Нет подключения 🔌', 'error');
});

// PWA: установка приложения
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Можно показать кнопку "Установить"
});

// Уведомления (запрос разрешения)
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('Уведомления включены 🔔', 'success');
    }
  }
}
// Запрашиваем после входа
onAuthStateChanged(auth, (user) => {
  if (user) requestNotificationPermission();
});

console.log('✨ Woops loaded — готов к общению!');
