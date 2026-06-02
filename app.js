import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc, deleteDoc, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// 📦 DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const chatScreen = document.getElementById('chat-screen');

const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');

const tabTitle = document.getElementById('tab-title');
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab');

const userSearch = document.getElementById('user-search');
const chatList = document.getElementById('chat-list');
const chatsEmpty = document.getElementById('chats-empty');

const feedInput = document.getElementById('feed-input');
const postBtn = document.getElementById('post-btn');
const feedList = document.getElementById('feed-list');

const profileAvatarView = document.getElementById('profile-avatar-view');
const profileNameView = document.getElementById('profile-name-view');
const profileStatusView = document.getElementById('profile-status-view');
const editProfileBtn = document.getElementById('edit-profile');
const deleteProfileBtn = document.getElementById('delete-profile-btn');

const backBtn = document.getElementById('back-btn');
const chatAvatar = document.getElementById('chat-avatar');
const chatName = document.getElementById('chat-name');
const chatStatus = document.getElementById('chat-status');
const msgArea = document.getElementById('msg-area');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const emojiToggle = document.getElementById('emoji-toggle');
const emojiPicker = document.getElementById('emoji-picker');

const profileModal = document.getElementById('profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const editName = document.getElementById('edit-name');
const editStatusText = document.getElementById('edit-status-text');
const editStatus = document.getElementById('edit-status');
const avatarSelector = document.getElementById('avatar-selector');
const cancelProfile = document.getElementById('cancel-profile');
const saveProfile = document.getElementById('save-profile');

const editPostModal = document.getElementById('edit-post-modal');
const closeEditPostModal = document.getElementById('close-edit-post-modal');
const editPostText = document.getElementById('edit-post-text');
const cancelEditPost = document.getElementById('cancel-edit-post');
const saveEditPost = document.getElementById('save-edit-post');

const toast = document.getElementById('toast');

// 🌍 Глобальное состояние
let currentUser = null;
let currentChat = null;
let currentEditPostId = null;
let unsubChat = null;
let unsubUsers = null;
let unsubFeed = null;
let unsubOwnProfile = null;
let userProfile = {};
let selectedAvatar = '';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Spiderman&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Batman&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ironman&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Wonderwoman&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Goku&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Naruto&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Harry&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Hermione&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Yoda&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Vader&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Elsa&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mario&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sailor&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Thor&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Loki&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Flash&backgroundColor=ffdfbf'
];

const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪','🎯','🌟','💬','🚀','✅','❌','⚡','🎮','🎵','🍕'];

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    if (authScreen) authScreen.classList.remove('active');
    if (mainScreen) mainScreen.classList.add('active');
    trackOwnProfile(user.uid);
    loadUsersList();
    loadFeed();
    updateLastSeen();
  } else {
    currentUser = null;
    userProfile = {};
    if (authScreen) authScreen.add ? authScreen.add('active') : authScreen.classList.add('active');
    if (mainScreen) mainScreen.classList.remove('active');
    if (chatScreen) chatScreen.classList.remove('active');
    cleanupListeners();
  }
});

if (loginBtn) {
  loginBtn.onclick = async () => {
    try {
      if (authError) authError.textContent = '';
      await signInWithEmailAndPassword(auth, authEmail.value.trim(), authPassword.value);
    } catch (e) {
      if (authError) authError.textContent = 'Ошибка входа: ' + (e.message.includes('auth/') ? 'Неверный email или пароль' : e.message);
    }
  };
}

if (registerBtn) {
  registerBtn.onclick = async () => {
    try {
      if (authError) authError.textContent = '';
      const userCred = await createUserWithEmailAndPassword(auth, authEmail.value.trim(), authPassword.value);
      const defaultAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      await setDoc(doc(db, 'users', userCred.user.uid), {
        displayName: 'Новый пользователь',
        status: 'online',
        statusText: 'Привет! Я использую Woops',
        avatar: defaultAvatar,
        email: authEmail.value.trim(),
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
      showToast('Аккаунт создан! 🎉');
    } catch (e) {
      if (authError) authError.textContent = 'Ошибка регистрации: ' + (e.message.includes('auth/') ? 'Email уже используется или слабый пароль' : e.message);
    }
  };
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    if (currentUser) {
      await updateDoc(doc(db, 'users', currentUser.uid), { status: 'offline', lastSeen: serverTimestamp() });
      await signOut(auth);
    }
  };
}

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

function updateProfileUI(profile) {
  if (profileAvatarView) profileAvatarView.src = profile.avatar || AVATARS[0];
  if (profileNameView) profileNameView.textContent = profile.displayName || 'Без имени';
  const statusMap = { online: 'В сети', busy: 'Занят', away: 'Отошёл', offline: 'Не в сети' };
  if (profileStatusView) profileStatusView.textContent = profile.statusText || statusMap[profile.status] || 'В сети';
}

if (editProfileBtn) {
  editProfileBtn.onclick = () => {
    if (!currentUser) return;
    if (editName) editName.value = userProfile.displayName || '';
    if (editStatusText) editStatusText.value = userProfile.statusText || '';
    if (editStatus) editStatus.value = userProfile.status || 'online';
    selectedAvatar = userProfile.avatar || AVATARS[0];
    renderAvatarSelector();
    if (profileModal) profileModal.showModal();
  };
}

function renderAvatarSelector() {
  if (!avatarSelector) return;
  avatarSelector.innerHTML = '';
  AVATARS.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.className = `avatar-option ${url === selectedAvatar ? 'selected' : ''}`;
    img.onclick = () => {
      selectedAvatar = url;
      document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
      img.classList.add('selected');
    };
    avatarSelector.appendChild(img);
  });
}

if (closeProfileModal) closeProfileModal.onclick = () => profileModal?.close();
if (cancelProfile) cancelProfile.onclick = () => profileModal?.close();

if (saveProfile) {
  saveProfile.onclick = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: editName.value.trim() || 'Пользователь',
        status: editStatus.value,
        statusText: editStatusText.value.trim(),
        avatar: selectedAvatar,
        lastSeen: serverTimestamp()
      });
      if (profileModal) profileModal.close();
      showToast('Профиль обновлён ✨');
    } catch (e) {
      showToast('Ошибка сохранения', 'error');
    }
  };
}

if (deleteProfileBtn) {
  deleteProfileBtn.onclick = async () => {
    if (!currentUser) return;
    if (!confirm('Вы уверены? Это действие нельзя отменить. Все ваши данные будут удалены.')) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(currentUser);
      showToast('Аккаунт удалён');
    } catch (e) {
      showToast('Ошибка удаления. Попробуйте выйти и войти снова.', 'error');
    }
  };
}

// ============================================
// 🔍 ПОИСК И СПИСОК ПОЛЬЗОВАТЕЛЕЙ
// ============================================
function loadUsersList(searchTerm = '') {
  if (unsubUsers) unsubUsers();
  
  let q;
  if (searchTerm.trim()) {
    const endStr = searchTerm.trim() + '\uf8ff';
    q = query(collection(db, 'users'), where('displayName', '>=', searchTerm.trim()), where('displayName', '<=', endStr), limit(20));
  } else {
    q = query(collection(db, 'users'), limit(50));
  }

  unsubUsers = onSnapshot(q, (snap) => {
    if (!chatList) return;
    chatList.innerHTML = '';
    let hasUsers = false;
    snap.forEach(docSnap => {
      if (docSnap.id === currentUser?.uid) return;
      hasUsers = true;
      const user = docSnap.data();
      const li = createUserListItem(docSnap.id, user);
      chatList.appendChild(li);
    });
    if (chatsEmpty) {
      chatsEmpty.style.display = hasUsers ? 'none' : 'block';
      if (!hasUsers && searchTerm.trim()) {
        chatsEmpty.textContent = 'Никого не найдено 😔';
        chatsEmpty.style.display = 'block';
      } else if (!hasUsers) {
        chatsEmpty.textContent = 'Пока никого нет.\nНайдите друга через поиск! 🧐';
        chatsEmpty.style.display = 'block';
      }
    }
  });
}

if (userSearch) {
  userSearch.addEventListener('input', (e) => {
    loadUsersList(e.target.value);
  });
}

function createUserListItem(uid, user) {
  const li = document.createElement('li');
  li.className = 'chat-item animate-fade-in';
  li.innerHTML = `
    <div class="avatar-wrapper">
      <img class="avatar" src="${user.avatar || AVATARS[0]}" alt="avatar">
      <span class="status-indicator status-${user.status || 'offline'}"></span>
    </div>
    <div class="chat-info">
      <h4>${escapeHtml(user.displayName || 'Пользователь')}</h4>
      <p>${escapeHtml(user.statusText || 'В сети')}</p>
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
  if (window.innerWidth < 768 && mainScreen) mainScreen.classList.remove('active');
  if (chatScreen) chatScreen.classList.add('active');
  if (chatName) chatName.textContent = name || 'Пользователь';
  if (chatAvatar) chatAvatar.src = avatar || AVATARS[0];
  if (msgArea) msgArea.innerHTML = '<div class="empty-state">Загрузка сообщений...</div>';
  
  const room = [currentUser.uid, userId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  
  if (unsubChat) unsubChat();
  unsubChat = onSnapshot(q, (snap) => {
    if (!msgArea) return;
    msgArea.innerHTML = '';
    if (snap.empty) {
      msgArea.innerHTML = '<div class="empty-state">Напишите первое сообщение ✨</div>';
      return;
    }
    snap.forEach(docSnap => {
      msgArea.appendChild(renderMessage(docSnap.id, docSnap.data()));
    });
    msgArea.scrollTop = msgArea.scrollHeight;
  });
}

function renderMessage(msgId, msg) {
  const div = document.createElement('div');
  const isOwn = msg.senderId === currentUser?.uid;
  div.className = `msg ${isOwn ? 'out' : 'in'} animate-fade-in`;
  
  const time = formatTime(msg.createdAt);
  const editedTag = msg.isEdited ? ' <span style="font-size:10px; opacity:0.7">(изм.)</span>' : '';
  
  let actionsHtml = '';
  if (isOwn) {
    actionsHtml = `
      <div class="msg-actions">
        <button class="msg-action-btn" onclick="editMessage('${msgId}', '${escapeHtml(msg.text).replace(/'/g, "\\'")}')">✏️</button>
        <button class="msg-action-btn delete" onclick="deleteMessage('${msgId}')">🗑️</button>
      </div>
    `;
  }
  
  div.innerHTML = `
    ${actionsHtml}
    <div>${escapeHtml(msg.text)}${editedTag}</div>
    <span class="time">${time}</span>
  `;
  return div;
}

window.editMessage = async (msgId, currentText) => {
  const newText = prompt('Редактировать сообщение:', currentText);
  if (newText !== null && newText.trim() !== '' && newText.trim() !== currentText) {
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        text: newText.trim(),
        isEdited: true,
        editedAt: serverTimestamp()
      });
      showToast('Сообщение обновлено');
    } catch (e) {
      showToast('Ошибка редактирования', 'error');
    }
  }
};

window.deleteMessage = async (msgId) => {
  if (!confirm('Удалить это сообщение?')) return;
  try {
    await deleteDoc(doc(db, 'messages', msgId));
    showToast('Сообщение удалено');
  } catch (e) {
    showToast('Ошибка удаления', 'error');
  }
};

if (sendBtn) {
  sendBtn.onmousedown = (e) => {
    e.preventDefault(); 
  };

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
      showToast('Не удалось отправить', 'error');
    }
  };
}

if (textInput) {
  textInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (sendBtn) sendBtn.click();
    }
  };
}

if (backBtn) {
  backBtn.onclick = () => {
    if (chatScreen) chatScreen.classList.remove('active');
    if (mainScreen) mainScreen.classList.add('active');
    if (unsubChat) unsubChat();
    currentChat = null;
  };
}

// ============================================
// 🌍 ЛЕНТА (FEED)
// ============================================
function loadFeed() {
  if (unsubFeed) unsubFeed();
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  unsubFeed = onSnapshot(q, (snap) => {
    if (!feedList) return;
    feedList.innerHTML = '';
    if (snap.empty) {
      feedList.innerHTML = '<div class="empty-state">Лента пуста. Напишите первый пост! 📝</div>';
      return;
    }
    snap.forEach(docSnap => {
      feedList.appendChild(renderPost(docSnap.id, docSnap.data()));
    });
  });
}

function renderPost(postId, post) {
  const div = document.createElement('div');
  div.className = 'feed-post animate-fade-in';
  const isOwn = post.authorId === currentUser?.uid;
  const time = formatTime(post.createdAt);
  
  let actionsHtml = '';
  if (isOwn) {
    actionsHtml = `
      <button class="action-btn" onclick="openEditPost('${postId}', '${escapeHtml(post.text).replace(/'/g, "\\'")}')">✏️ Изменить</button>
      <button class="action-btn delete" onclick="deletePost('${postId}')">🗑️ Удалить</button>
    `;
  }

  div.innerHTML = `
    <div class="feed-post-header">
      <img class="avatar" src="${post.authorAvatar || AVATARS[0]}" alt="avatar">
      <div class="feed-post-info">
        <h4>${escapeHtml(post.authorName || 'Пользователь')}</h4>
        <span>${time}${post.isEdited ? ' • (изменено)' : ''}</span>
      </div>
    </div>
    <div class="feed-post-content">${escapeHtml(post.text).replace(/\n/g, '<br>')}</div>
    <div class="feed-post-actions">
      ${actionsHtml}
    </div>
  `;
  return div;
}

if (postBtn) {
  postBtn.onclick = async () => {
    const text = feedInput.value.trim();
    if (!text) return;
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorName: userProfile.displayName || 'Пользователь',
        authorAvatar: userProfile.avatar || AVATARS[0],
        text,
        createdAt: serverTimestamp()
      });
      feedInput.value = '';
      showToast('Пост опубликован! 🚀');
    } catch (e) {
      showToast('Ошибка публикации', 'error');
    }
  };
}

window.openEditPost = (postId, currentText) => {
  currentEditPostId = postId;
  if (editPostText) editPostText.value = currentText;
  if (editPostModal) editPostModal.showModal();
};

if (closeEditPostModal) closeEditPostModal.onclick = () => editPostModal?.close();
if (cancelEditPost) cancelEditPost.onclick = () => editPostModal?.close();

if (saveEditPost) {
  saveEditPost.onclick = async () => {
    if (!currentEditPostId) return;
    const newText = editPostText.value.trim();
    if (!newText) return;
    try {
      await updateDoc(doc(db, 'posts', currentEditPostId), {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp()
      });
      if (editPostModal) editPostModal.close();
      currentEditPostId = null;
      showToast('Пост обновлён');
    } catch (e) {
      showToast('Ошибка обновления', 'error');
    }
  };
}

window.deletePost = async (postId) => {
  if (!confirm('Удалить этот пост?')) return;
  try {
    await deleteDoc(doc(db, 'posts', postId));
    showToast('Пост удалён');
  } catch (e) {
    showToast('Ошибка удаления', 'error');
  }
};

// ============================================
// 🛠️ УТИЛИТЫ И UI (ЛОГИКА ЭМОДЗИ)
// ============================================
function initEmojiPicker() {
  if (!emojiPicker) return;
  emojiPicker.innerHTML = '';
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    
    btn.onmousedown = (e) => {
      e.preventDefault();
    };

    btn.onclick = (e) => {
      e.preventDefault();
      const start = textInput.selectionStart;
      textInput.value = textInput.value.slice(0, start) + emoji + textInput.value.slice(start);
      
      const newCursorPos = start + emoji.length;
      textInput.setSelectionRange(newCursorPos, newCursorPos);
    };
    emojiPicker.appendChild(btn);
  });
}

if (emojiToggle) {
  emojiToggle.onmousedown = (e) => {
    e.preventDefault();
  };

  emojiToggle.onclick = (e) => {
    e.stopPropagation();
    if (emojiPicker) emojiPicker.classList.toggle('active');
  };
}

document.addEventListener('click', (e) => {
  if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiToggle) {
    emojiPicker.classList.remove('active');
  }
});

function showToast(message, type = 'success') {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '--:--';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function updateLastSeen() {
  if (!currentUser) return;
  setInterval(() => {
    updateDoc(doc(db, 'users', currentUser.uid), {
      lastSeen: serverTimestamp(),
      status: 'online'
    }).catch(() => {});
  }, 45000);
}

navBtns.forEach(btn => {
  btn.onclick = () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tabId = 'tab-' + btn.dataset.tab;
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const titles = { chats: 'Чаты', feed: 'Лента', profile: 'Профиль' };
    if (tabTitle) tabTitle.textContent = titles[btn.dataset.tab] || 'Woops';
  };
});

function cleanupListeners() {
  if (unsubChat) unsubChat();
  if (unsubUsers) unsubUsers();
  if (unsubFeed) unsubFeed();
  if (unsubOwnProfile) unsubOwnProfile();
}

// Инициализация
initEmojiPicker();
console.log('%cWoops Messenger загружен успешно 🚀', 'color: #6366f1; font-weight: bold; font-size: 14px;');
