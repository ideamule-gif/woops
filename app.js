import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc, deleteDoc, limit, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let currentPostCommentsId = null; // ID поста, чьи комментарии сейчас открыты
let unsubChat = null;
let unsubComments = null; // Подписка на комментарии
let unsubUsers = null;
let unsubFeed = null;
let unsubOwnProfile = null;
let userProfile = {};
let selectedAvatar = '';
let lastSeenInterval = null;

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

// Монохромные SVG-иконки для ленты (средний размер)
const svgEdit = `<svg class="svg-feed-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const svgDelete = `<svg class="svg-feed-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const svgLike = `<svg class="svg-feed-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const svgComment = `<svg class="svg-feed-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

// Динамическое создание экрана комментариев (копия экрана чата)
let commentScreen = document.getElementById('comment-screen');
if (!commentScreen) {
  commentScreen = document.createElement('div');
  commentScreen.id = 'comment-screen';
  commentScreen.className = 'screen';
  commentScreen.innerHTML = `
    <div class="screen-header">
      <button id="comment-back-btn" class="icon-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <div class="chat-user-info">
        <h3 id="comment-title">Комментарии</h3>
        <span id="comment-subtitle">к публикации</span>
      </div>
    </div>
    <div id="comment-msg-area" class="chat-messages"></div>
    <div class="chat-input-area">
      <textarea id="comment-text-input" placeholder="Напишите комментарий..."></textarea>
      <button id="comment-send-btn" class="icon-btn active">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(commentScreen);
}

// Привязка событий для экрана комментариев
const commentBackBtn = document.getElementById('comment-back-btn');
const commentMsgArea = document.getElementById('comment-msg-area');
const commentTextInput = document.getElementById('comment-text-input');
const commentSendBtn = document.getElementById('comment-send-btn');

if (commentBackBtn) {
  commentBackBtn.onclick = () => {
    if (commentScreen) commentScreen.classList.remove('active');
    if (mainScreen) mainScreen.classList.add('active');
    if (unsubComments) unsubComments();
    currentPostCommentsId = null;
  };
}

if (commentSendBtn) {
  commentSendBtn.onclick = async () => {
    const text = commentTextInput.value.trim();
    if (!text || !currentPostCommentsId) return;
    try {
      await addDoc(collection(db, 'posts', currentPostCommentsId, 'comments'), {
        authorId: currentUser.uid,
        authorName: userProfile.displayName || 'Пользователь',
        authorAvatar: userProfile.avatar || AVATARS[0],
        text,
        createdAt: serverTimestamp()
      });
      commentTextInput.value = '';
    } catch (e) {
      showToast('Не удалось отправить комментарий', 'error');
    }
  };
}

if (commentTextInput) {
  commentTextInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (commentSendBtn) commentSendBtn.click();
    }
  };
}

// ============================================
// 🔐 АВТОРИЗАЦИЯ И СТАТУСЫ
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    if (authScreen) authScreen.classList.remove('active');
    if (mainScreen) mainScreen.classList.add('active');
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        status: 'online',
        lastSeen: serverTimestamp()
      });
    } catch (e) {
      console.error("Ошибка обновления статуса при входе:", e);
    }

    trackOwnProfile(user.uid);
    loadUsersList();
    loadFeed();
    updateLastSeen();
  } else {
    currentUser = null;
    userProfile = {};
    if (authScreen) authScreen.classList.add('active');
    if (mainScreen) mainScreen.classList.remove('active');
    if (chatScreen) chatScreen.classList.remove('active');
    if (commentScreen) commentScreen.classList.remove('active');
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
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { 
          status: 'offline', 
          lastSeen: serverTimestamp() 
        });
        await signOut(auth);
      } catch (e) {
        console.error("Ошибка при выходе:", e);
        await signOut(auth);
      }
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
      if (docSnap.id === currentUser.uid) return;
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
  
  const isOnline = user.status === 'online';
  const statusClass = isOnline ? 'status-online' : 'status-offline';
  const statusText = isOnline ? 'в сети' : 'был(а) недавно';

  li.innerHTML = `
    <div class="avatar-wrapper">
      <img class="avatar" src="${user.avatar || AVATARS[0]}" alt="avatar">
      <span class="status-indicator ${statusClass}"></span>
    </div>
    <div class="chat-info">
      <h4>${escapeHtml(user.displayName || 'Пользователь')}</h4>
      <p>${escapeHtml(user.statusText || statusText)}</p>
    </div>
  `;
  li.onclick = () => openChat(uid, user.displayName, user.avatar);
  return li;
}

// ============================================
// ✉️ ЧАТ (БЕЗ МЕРЦАНИЯ И ПЕРЕРИСОВОК)
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
  
  let isFirstLoad = true;

  unsubChat = onSnapshot(q, (snap) => {
    if (!msgArea) return;

    if (isFirstLoad) {
      msgArea.innerHTML = '';
      if (snap.empty) {
        msgArea.innerHTML = '<div class="empty-state">Напишите первое сообщение ✨</div>';
      } else {
        snap.forEach(docSnap => {
          msgArea.appendChild(renderMessage(docSnap.id, docSnap.data()));
        });
        msgArea.scrollTop = msgArea.scrollHeight;
      }
      isFirstLoad = false;
      return;
    }

    snap.docChanges().forEach((change) => {
      const emptyState = msgArea.querySelector('.empty-state');
      if (emptyState) emptyState.remove();

      const msgId = change.doc.id;
      const msgData = change.doc.data();

      if (change.type === 'added') {
        const msgEl = renderMessage(msgId, msgData);
        msgArea.appendChild(msgEl);
        msgArea.scrollTop = msgArea.scrollHeight;
      } 
      else if (change.type === 'modified') {
        const oldMsg = msgArea.querySelector(`[data-msg-id="${msgId}"]`);
        if (oldMsg) {
          const newMsg = renderMessage(msgId, msgData);
          oldMsg.replaceWith(newMsg);
        }
      } 
      else if (change.type === 'removed') {
        const msgToDel = msgArea.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgToDel) msgToDel.remove();
        
        if (msgArea.children.length === 0) {
          msgArea.innerHTML = '<div class="empty-state">Напишите первое сообщение ✨</div>';
        }
      }
    });
  });
}

function renderMessage(msgId, msg) {
  const div = document.createElement('div');
  const isOwn = msg.senderId === currentUser?.uid;
  div.className = `msg ${isOwn ? 'out' : 'in'} animate-fade-in`;
  div.setAttribute('data-msg-id', msgId);
  
  const time = formatTime(msg.createdAt);
  const editedTag = msg.isEdited ? ' <span style="font-size:10px; opacity:0.7">(изм.)</span>' : '';
  
  let actionsHtml = '';
  if (isOwn) {
    const safeText = escapeHtml(msg.text).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    actionsHtml = `
      <div class="msg-actions">
        <button class="msg-action-btn" onclick="editMessage('${msgId}', '${safeText}')" title="Редактировать">
          ${svgEdit}
        </button>
        <button class="msg-action-btn delete" onclick="deleteMessage('${msgId}')" title="Удалить">
          ${svgDelete}
        </button>
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
      showToast('Ошибка editing', 'error');
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
// 🌍 ЛЕНТА (FEED) WITH LIKES & COMMENTS
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
  
  const likesArr = post.likes || [];
  const hasLiked = likesArr.includes(currentUser?.uid);
  const likesCount = likesArr.length;

  let ownerActionsHtml = '';
  if (isOwn) {
    ownerActionsHtml = `
      <button class="feed-icon-btn" onclick="openEditPost('${postId}', '${escapeHtml(post.text).replace(/'/g, "\\'")}')" title="Изменить">
        ${svgEdit}
      </button>
      <button class="feed-icon-btn delete" onclick="deletePost('${postId}')" title="Удалить">
        ${svgDelete}
      </button>
    `;
  }

  div.innerHTML = `
    <div class="feed-post-header">
      <img class="avatar" src="${post.authorAvatar || AVATARS[0]}" alt="avatar">
      <div class="feed-post-info">
        <h4>${escapeHtml(post.authorName || 'Пользователь')}</h4>
        <span>${time}${post.isEdited ? ' • (изменено)' : ''}</span>
      </div>
      <div class="feed-post-owner-actions">
        ${ownerActionsHtml}
      </div>
    </div>
    <div class="feed-post-content">${escapeHtml(post.text).replace(/\n/g, '<br>')}</div>
    
    <div class="feed-post-footer">
      <button class="feed-action-trigger ${hasLiked ? 'liked' : ''}" onclick="toggleLike('${postId}', ${hasLiked})">
        ${svgLike} <span class="counter">${likesCount}</span>
      </button>
      <button class="feed-action-trigger" onclick="openComments('${postId}')">
        ${svgComment} <span class="counter">Обсудить</span>
      </button>
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
        likes: [], // <--- ОБЯЗАТЕЛЬНО: создаем пустой массив при публикации
        createdAt: serverTimestamp()
      });
      feedInput.value = '';
      showToast('Пост опубликован! 🚀');
    } catch (e) {
      showToast('Ошибка публикации', 'error');
    }
  };
}

window.toggleLike = async (postId, hasLiked) => {
  if (!currentUser) return;
  const postRef = doc(db, 'posts', postId);
  try {
    if (hasLiked) {
      await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
    }
  } catch (e) {
    console.error("Ошибка при переключении лайка:", e);
  }
};

window.openComments = (postId) => {
  currentPostCommentsId = postId;
  if (mainScreen) mainScreen.classList.remove('active');
  if (commentScreen) commentScreen.classList.add('active');
  
  if (commentMsgArea) commentMsgArea.innerHTML = '<div class="empty-state">Загрузка комментариев...</div>';
  
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
  
  if (unsubComments) unsubComments();
  
  unsubComments = onSnapshot(q, (snap) => {
    if (!commentMsgArea) return;
    commentMsgArea.innerHTML = '';
    
    if (snap.empty) {
      commentMsgArea.innerHTML = '<div class="empty-state">Пока нет комментариев. Будьте первым! 💬</div>';
      return;
    }
    
    snap.forEach(docSnap => {
      const comm = docSnap.data();
      const div = document.createElement('div');
      const isOwnComm = comm.authorId === currentUser?.uid;
      
      div.className = `msg ${isOwnComm ? 'out' : 'in'} animate-fade-in`;
      div.style.flexDirection = 'column';
      div.style.alignItems = isOwnComm ? 'flex-end' : 'flex-start';
      
      const commTime = formatTime(comm.createdAt);
      
      div.innerHTML = `
        <div style="font-size: 11px; font-weight: bold; opacity: 0.6; margin-bottom: 2px;">${escapeHtml(comm.authorName)}</div>
        <div>${escapeHtml(comm.text)}</div>
        <span class="time">${commTime}</span>
      `;
      commentMsgArea.appendChild(div);
    });
    commentMsgArea.scrollTop = commentMsgArea.scrollHeight;
  });
};

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
// 🛠️ УТИЛИТЫ И UI
// ============================================
function initEmojiPicker() {
  if (!emojiPicker) return;
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

if (emojiToggle) {
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
  if (lastSeenInterval) clearInterval(lastSeenInterval);

  const sendPing = () => {
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        lastSeen: serverTimestamp(),
        status: 'online'
      }).catch((e) => console.error("Ошибка периодического пинга:", e));
    }
  };

  sendPing(); 
  lastSeenInterval = setInterval(sendPing, 45000); 
}

navBtns.forEach(btn => {
  btn.onclick = () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tabId = 'tab-' + btn.dataset.tab;
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const titles = { chats: 'Чаты', feed: 'Лента', profile: 'Профиль', contacts: 'Контакты', notes: 'Заметки' };
    if (tabTitle) tabTitle.textContent = titles[btn.dataset.tab] || 'Woops';
  };
});

function cleanupListeners() {
  if (unsubChat) unsubChat();
  if (unsubUsers) unsubUsers();
  if (unsubFeed) unsubFeed();
  if (unsubOwnProfile) unsubOwnProfile();
  if (unsubComments) unsubComments();
  if (lastSeenInterval) {
    clearInterval(lastSeenInterval);
    lastSeenInterval = null;
  }
}

// ============================================
// 🌓 ЛОГИКА СМЕНЫ ТЕМЫ (ДЕНЬ / НОЧЬ)
// ============================================
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme');

const sunSvg = `<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
const moonSvg = `<svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
  if (themeToggle) themeToggle.innerHTML = sunSvg;
} else {
  if (themeToggle) themeToggle.innerHTML = moonSvg;
}

if (themeToggle) {
  themeToggle.onclick = () => {
    const isLight = document.body.classList.toggle('light-theme');
    
    if (isLight) {
      themeToggle.innerHTML = sunSvg;
      localStorage.setItem('theme', 'light');
      showToast('Включена дневная тема');
    } else {
      themeToggle.innerHTML = moonSvg;
      localStorage.setItem('theme', 'dark');
      showToast('Включена ночная тема');
    }
  };
}

// Инициализация
initEmojiPicker();
console.log('%cWoops Messenger загружен успешно 🚀', 'color: #6366f1; font-weight: bold; font-size: 14px;');
