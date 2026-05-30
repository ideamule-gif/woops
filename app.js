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

// 👤 Профиль элементы (Модальное окно <dialog>)
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

// 🌐 Состояние приложения
let currentUser = null;
let currentChat = null;
let unsubChat = null;
let unsubUsers = null;
let unsubOwnProfile = null;
let userProfile = {};

const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪','🎯','🌟','💬','🚀','✅','❌','⚡','🎮','🎵','🍕'];

// ============================================
// 🔐 АВТОРИЗАЦИЯ И MONITORING СТАТУСА
// ============================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    
    // Включаем real-time отслеживание профиля и списка чатов
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
  authError.textContent = '';
  
  if (!email || !pass) {
    authError.textContent = 'Заполните все поля';
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast('С возвращением! 👋', 'success');
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
    
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName: defaultName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=6366f1&color=fff`,
      status: 'online',
      statusText: '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
    
    showToast('Аккаунт успешно создан! 🎉', 'success');
  } catch(e) {
    authError.textContent = getAuthError(e.code);
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
    } catch (e) { console.error(e); }
  }
  await signOut(auth);
  showToast('До встречи! 👋', 'success');
};

// ============================================
// 👤 ПРОФИЛЬ (REAL-TIME СЛУШАТЕЛЬ)
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

// Открытие модального окна профиля (через HTML5 Dialog API)
editProfileBtns.forEach(btn => {
  btn.onclick = () => {
    if (!currentUser) return;
    
    displayNameInput.value = userProfile.displayName || '';
    userStatusSelect.value = userProfile.status || 'online';
    statusTextInput.value = userProfile.statusText || '';
    avatarPreview.src = userProfile.avatar || `https://ui-avatars.com/api/?name=U&background=6366f1&color=fff`;
    
    if (profileModal) {
      profileModal.showModal(); // Нативный метод открытия <dialog>
    }
  };
});

function closeModal() {
  if (profileModal) profileModal.close(); // Нативный метод закрытия
}

if (closeProfileBtn) closeProfileBtn.onclick = closeModal;
if (cancelProfileBtn) cancelProfileBtn.onclick = closeModal;

// Предпросмотр локального аватара перед отправкой
avatarInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      showToast('Файл слишком большой (макс. 2MB)', 'error');
      avatarInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => { avatarPreview.src = ev.target.result; };
    reader.readAsDataURL(file);
  }
};

// Сохранение изменений профиля в Firebase
saveProfileBtn.onclick = async () => {
  if (!currentUser) return;
  
  const displayName = displayNameInput.value.trim() || userProfile.displayName;
  const status = userStatusSelect.value;
  const statusText = statusTextInput.value.trim();
  
  try {
    let avatarUrl = userProfile.avatar;
    
    if (avatarInput.files[0]) {
      showToast('Загрузка аватара...', 'success');
      const file = avatarInput.files[0];
      const storageRef = ref(storage, `avatars/${currentUser.uid}/avatar_${Date.now()}`);
      await uploadBytes(storageRef, file);
      avatarUrl = await getDownloadURL(storageRef);
    }
    
    const updates = {
      displayName,
      status,
      statusText,
      avatar: avatarUrl,
      lastSeen: serverTimestamp()
    };
    
    await updateDoc(doc(db, 'users', currentUser.uid), updates);
    closeModal();
    showToast('Профиль успешно обновлён! ✨', 'success');
  } catch(e) {
    console.error('Ошибка сохранения:', e);
    showToast('Не удалось сохранить изменения', 'error');
  }
};

// Заполнение интерфейса данными профиля (безопасно, без крашей)
function updateProfileUI(profile) {
  const name = profile.displayName || 'Пользователь';
  const avatar = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
  const status = profile.status || 'online';
  const statusText = profile.statusText;
  
  const statusLabels = { online: '● В сети', busy: '🔴 Занят', away: '🟡 Отошёл', offline: '⚫ Не в сети' };
  const resolvedStatus = statusText ? `${statusLabels[status] || '● В сети'} • ${statusText}` : statusLabels[status];

  // Массив селекторов для десктопной и мобильной версий
  const bindings = [
    { nameId: 'my-name', avatarId: 'my-avatar', statusId: 'my-status-text', dotId: 'my-status-dot' },
    { nameId: 'my-name-mobile', avatarId: 'my-avatar-mobile', statusId: 'my-status-mobile', dotId: null }
  ];

  bindings.forEach(b => {
    const nameEl = document.getElementById(b.nameId);
    const avatarEl = document.getElementById(b.avatarId);
    const statusEl = document.getElementById(b.statusId);
    const dotEl = b.dotId ? document.getElementById(b.dotId) : null;

    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.src = avatar;
    if (statusEl) statusEl.textContent = resolvedStatus;
    if (dotEl) {
      dotEl.className = `status-indicator status-${status}`;
    }
  });
  
  if (currentChat && currentChat.id === currentUser.uid) {
    const chatNameEl = document.getElementById('chat-name');
    const chatAvatarEl = document.getElementById('chat-avatar');
    if (chatNameEl) chatNameEl.textContent = name;
    if (chatAvatarEl) chatAvatarEl.src = avatar;
  }
}

// ============================================
// 💬 СПИСОК ЧАТОВ
// ============================================
function loadChats() {
  if (!currentUser) return;
  
  const q = query(collection(db, 'users'));
  if (unsubUsers) unsubUsers();
  
  unsubUsers = onSnapshot(q, (snap) => {
    chatList.innerHTML = '';
    let hasChats = false;
    
    snap.forEach(docSnap => {
      if (docSnap.id === currentUser.uid) return; // Пропускаем себя
      
      hasChats = true;
      const user = docSnap.data();
      const li = document.createElement('li');
      
      // Блок аватара
      const avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'avatar-wrapper';
      
      const avatar = document.createElement('img');
      avatar.className = 'avatar';
      avatar.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=6366f1&color=fff`;
      avatar.alt = user.displayName || 'User';
      avatar.onerror = (e) => { e.target.src = `https://ui-avatars.com/api/?name=U&background=6366f1&color=fff`; };
      
      const statusDot = document.createElement('span');
      statusDot.className = `status-indicator status-${user.status || 'offline'}`;
      
      avatarWrapper.appendChild(avatar);
      avatarWrapper.appendChild(statusDot);
      
      // Блок текстовой информации
      const info = document.createElement('div');
      info.className = 'chat-info';
      info.innerHTML = `
        <h4>${escapeHtml(user.displayName || 'Пользователь')}</h4>
        <p class="text-muted">${escapeHtml(user.statusText || 'Напишите первое сообщение 👋')}</p>
      `;
      
      li.appendChild(avatarWrapper);
      li.appendChild(info);
      li.onclick = () => openChat(docSnap.id, user.displayName || 'Пользователь', user.avatar);
      
      chatList.appendChild(li);
    });
    
    const emptyState = document.getElementById('chats-empty');
    if (emptyState) {
      emptyState.style.display = hasChats ? 'none' : 'block';
    }
  }, (error) => {
    console.error('Ошибка загрузки списка контактов:', error);
    showToast('Не удалось обновить список чатов', 'error');
  });
}

// ============================================
// ✉️ ОКНО ДИАЛОГА И СООБЩЕНИЯ
// ============================================
function openChat(userId, name, avatar) {
  currentChat = { id: userId, name, avatar };
  
  // Анимация выезда окна чата
  if (window.innerWidth < 768) {
    mainScreen.classList.remove('active');
  }
  chatScreen.classList.add('active');
  
  document.getElementById('chat-name').textContent = name;
  document.getElementById('chat-avatar').src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22c55e&color=fff`;
  
  msgArea.innerHTML = '<div class="msg in" style="align-self:center;background:var(--surface-2-solid)">Загрузка истории...</div>';
  
  const room = [currentUser.uid, userId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  
  if (unsubChat) unsubChat();
  
  unsubChat = onSnapshot(q, (snap) => {
    msgArea.innerHTML = '';
    
    if (snap.empty) {
      msgArea.innerHTML = '<div class="empty-state">Начните беседу — напишите первое сообщение!</div>';
    } else {
      snap.forEach(docSnap => {
        msgArea.appendChild(renderMessage(docSnap.data()));
      });
    }
    
    // Плавный скролл вниз к последнему сообщению
    setTimeout(() => {
      msgArea.scrollTop = msgArea.scrollHeight;
    }, 50);
  }, (error) => {
    console.error('Ошибка стрима сообщений:', error);
    msgArea.innerHTML = '<div class="msg in" style="background:var(--danger);color:white">Ошибка загрузки сообщений</div>';
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
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

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
    showToast('Не удалось отправить сообщение', 'error');
  }
};

textInput.onkeypress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
};

// Авто-фокус на инпут ввода после завершения CSS транзиции выезда чата
chatScreen.addEventListener('transitionend', () => {
  if (chatScreen.classList.contains('active')) {
    textInput.focus();
  }
});

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
    btn.setAttribute('aria-label', `Вставить ${emoji}`);
    btn.onclick = () => {
      const start = textInput.selectionStart;
      const end = textInput.selectionEnd;
      textInput.value = textInput.value.substring(0, start) + emoji + textInput.value.substring(end);
      textInput.selectionStart = textInput.selectionEnd = start + emoji.length;
      textInput.focus();
      hideEmojiPicker();
    };
    emojiPicker.appendChild(btn);
  });
}

if (emojiToggle && emojiPicker) {
  emojiToggle.onclick = (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('active');
  };
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.emoji-picker') && !e.target.closest('#emojiToggle')) {
      hideEmojiPicker();
    }
  });
}

function hideEmojiPicker() {
  if (emojiPicker) emojiPicker.classList.remove('active');
}

initEmojiPicker();

// ============================================
// 🧭 ТАБ-НАВИГАЦИЯ (МОБИЛЬНАЯ + ДЕСКТОП)
// ============================================
navBtns.forEach(btn => {
  btn.onclick = () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    const tabId = 'tab-' + btn.dataset.tab;
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const titles = { chats: 'Чаты', status: 'Статус', calls: 'Звонки', profile: 'Профиль' };
    const titleEl = document.getElementById('tab-title');
    if (titleEl) titleEl.textContent = titles[btn.dataset.tab] || 'Woops';
  };
});

// 🔙 Назад к списку чатов (для мобильных девайсов)
backBtn.onclick = () => {
  chatScreen.classList.remove('active');
  mainScreen.classList.add('active');
  currentChat = null;
  
  if (unsubChat) {
    unsubChat();
    unsubChat = null;
  }
};

// ============================================
// 🔔 СЕРВИСНЫЕ ФУНКЦИИ И УТИЛИТЫ
// ============================================
function showToast(message, type = 'success') {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show`;
  
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getAuthError(code) {
  const errors = {
    'auth/invalid-email': 'Неверный формат почты',
    'auth/user-disabled': 'Учётная запись деактивирована',
    'auth/user-not-found': 'Пользователь не зарегистрирован',
    'auth/wrong-password': 'Неверный пароль',
    'auth/email-already-in-use': 'Данный Email уже занят',
    'auth/weak-password': 'Пароль должен содержать минимум 6 символов',
    'auth/network-request-failed': 'Проблема с сетью. Проверьте соединение'
  };
  return errors[code] || 'Ошибка аутентификации';
}

function cleanupListeners() {
  if (unsubChat) unsubChat();
  if (unsubUsers) unsubUsers();
  if (unsubOwnProfile) unsubOwnProfile();
  unsubChat = null;
  unsubUsers = null;
  unsubOwnProfile = null;
  currentChat = null;
}

// Корректный расчет высоты для мобильных браузеров (фикс бага прыгающей строки ввода)
function adjustViewport() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
window.addEventListener('resize', adjustViewport);
adjustViewport();

// Мониторинг системных событий сети
window.addEventListener('online', () => {
  if (currentUser) {
    updateDoc(doc(db, 'users', currentUser.uid), { status: 'online' });
    showToast('Соединение восстановлено 🟢', 'success');
  }
});
window.addEventListener('offline', () => { showToast('Интернет-соединение потеряно 🔌', 'error'); });
