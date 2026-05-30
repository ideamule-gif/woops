import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

// Профиль
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

// Эмодзи
const emojiToggle = document.getElementById('emojiToggle');
const emojiPicker = document.getElementById('emojiPicker');

// Toast
const toast = document.getElementById('toast');

// Глобальное состояние
let currentUser = null;
let currentChat = null;
let unsubChat = null;
let unsubUsers = null;
let unsubOwnProfile = null;
let userProfile = {};

const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪','🎯','🌟','💬','🚀','✅','❌','⚡','🎮','🎵','🍕'];

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    
    trackOwnProfile(user.uid);
    loadUsersList();
    updateLastSeen(); // обновляем lastSeen при входе
  } else {
    currentUser = null;
    userProfile = {};
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
    chatScreen.classList.remove('active');
    cleanupListeners();
  }
});

// ============================================
// 👤 ПРОФИЛЬ
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
    profileModal.showModal();
  };
});

closeProfileBtn.onclick = cancelProfileBtn.onclick = () => profileModal.close();

avatarInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Файл слишком большой (макс 2МБ)', 'error');
    avatarInput.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => avatarPreview.src = reader.result;
  reader.readAsDataURL(file);
};

saveProfileBtn.onclick = async () => {
  if (!currentUser) return;

  let avatarUrl = userProfile.avatar;

  if (avatarInput.files[0]) {
    showToast('Загрузка аватара...');
    const file = avatarInput.files[0];
    const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    avatarUrl = await getDownloadURL(storageRef);
  }

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      displayName: displayNameInput.value.trim() || userProfile.displayName,
      status: userStatusSelect.value,
      statusText: statusTextInput.value.trim(),
      avatar: avatarUrl,
      lastSeen: serverTimestamp()
    });

    profileModal.close();
    showToast('Профиль сохранён ✨');
  } catch (e) {
    console.error(e);
    showToast('Ошибка сохранения', 'error');
  }
};

// ============================================
// 💬 СПИСОК ПОЛЬЗОВАТЕЛЕЙ (ЧАТЫ)
// ============================================
function loadUsersList() {
  if (unsubUsers) unsubUsers();

  const q = query(collection(db, 'users'), limit(50));

  unsubUsers = onSnapshot(q, (snap) => {
    chatList.innerHTML = '';
    let hasUsers = false;

    snap.forEach(docSnap => {
      if (docSnap.id === currentUser.uid) return;
      hasUsers = true;

      const user = docSnap.data();
      const li = createUserListItem(docSnap.id, user);
      chatList.appendChild(li);
    });

    document.getElementById('chats-empty').style.display = hasUsers ? 'none' : 'block';
  });
}

function createUserListItem(uid, user) {
  const li = document.createElement('li');
  li.className = 'chat-item';
  li.innerHTML = `
    <div class="avatar-wrapper">
      <img class="avatar" src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`}" alt="">
      <span class="status-indicator status-${user.status || 'offline'}"></span>
    </div>
    <div class="chat-info">
      <h4>${escapeHtml(user.displayName || 'Пользователь')}</h4>
      <p class="text-muted">${escapeHtml(user.statusText || 'Онлайн')}</p>
    </div>
  `;

  li.onclick = () => openChat(uid, user.displayName, user.avatar);
  return li;
}

// ============================================
// ✉️ ЧАТ
// ============================================
async function openChat(userId, name, avatar) {
  currentChat = { id: userId, name, avatar };

  if (window.innerWidth < 768) mainScreen.classList.remove('active');
  chatScreen.classList.add('active');

  document.getElementById('chat-name').textContent = name;
  document.getElementById('chat-avatar').src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

  msgArea.innerHTML = '<div class="empty-state">Загрузка сообщений...</div>';

  const room = [currentUser.uid, userId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));

  if (unsubChat) unsubChat();

  unsubChat = onSnapshot(q, (snap) => {
    msgArea.innerHTML = '';
    
    if (snap.empty) {
      msgArea.innerHTML = '<div class="empty-state">Напишите первое сообщение ✨</div>';
      return;
    }

    snap.forEach(doc => {
      msgArea.appendChild(renderMessage(doc.data()));
    });

    msgArea.scrollTop = msgArea.scrollHeight;
  });
}

function renderMessage(msg) {
  const div = document.createElement('div');
  const isOwn = msg.senderId === currentUser?.uid;
  div.className = `msg ${isOwn ? 'out' : 'in'}`;
  
  const time = formatTime(msg.createdAt);
  div.innerHTML = `${escapeHtml(msg.text)}<span class="time">${time}</span>`;
  return div;
}

function formatTime(timestamp) {
  if (!timestamp) return '--:--';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Отправка сообщения
sendBtn.onclick = async () => {
  const text = textInput.value.trim();
  if (!text || !currentChat) return;

  const room = [currentUser.uid, currentChat.id].sort().join('_');

  try {
    await addDoc(collection(db, 'messages'), {
      room,
      senderId: currentUser.uid,
      text,
      createdAt: serverTimestamp()
    });
    textInput.value = '';
  } catch (e) {
    showToast('Не удалось отправить сообщение', 'error');
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
  if (unsubChat) unsubChat();
  currentChat = null;
};

// ============================================
// Эмодзи + Toast + Helpers
// ============================================
function initEmojiPicker() {
  emojiPicker.innerHTML = '';
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.onclick = () => {
      const start = textInput.selectionStart;
      textInput.value = textInput.value.slice(0, start) + emoji + textInput.value.slice(start);
      textInput.focus();
      emojiPicker.classList.remove('active');
    };
    emojiPicker.appendChild(btn);
  });
}

emojiToggle.onclick = (e) => {
  e.stopPropagation();
  emojiPicker.classList.toggle('active');
};

document.addEventListener('click', () => emojiPicker.classList.remove('active'));

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateLastSeen() {
  if (!currentUser) return;
  setInterval(() => {
    updateDoc(doc(db, 'users', currentUser.uid), {
      lastSeen: serverTimestamp(),
      status: 'online'
    }).catch(() => {});
  }, 45000); // каждые 45 секунд
}

// Навигация
navBtns.forEach(btn => {
  btn.onclick = () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    
    const titles = { chats: 'Чаты', status: 'Статус', calls: 'Звонки', profile: 'Профиль' };
    document.getElementById('tab-title').textContent = titles[btn.dataset.tab] || 'Woops';
  };
});

function cleanupListeners() {
  if (unsubChat) unsubChat();
  if (unsubUsers) unsubUsers();
  if (unsubOwnProfile) unsubOwnProfile();
}

// Инициализация
initEmojiPicker();
updateLastSeen();

console.log('%cWoops Chat успешно загружен', 'color: #6366f1; font-weight: bold');
