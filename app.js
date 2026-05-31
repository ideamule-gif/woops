import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// 🔹 DOM Elements
const screens = {
  auth: document.getElementById('auth-screen'),
  main: document.getElementById('main-screen'),
  chat: document.getElementById('chat-screen')
};

const elements = {
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  authError: document.getElementById('auth-error'),
  loginBtn: document.getElementById('login-btn'),
  registerBtn: document.getElementById('register-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  pageTitle: document.getElementById('page-title'),
  
  // Вкладки
  chatList: document.getElementById('chat-list'),
  chatsEmpty: document.getElementById('chats-empty'),
  feedList: document.getElementById('feed-list'),
  feedEmpty: document.getElementById('feed-empty'),
  postText: document.getElementById('post-text'),
  publishBtn: document.getElementById('publish-btn'),
  contactsList: document.getElementById('contacts-list'),
  contactsEmpty: document.getElementById('contacts-empty'),
  contactSearch: document.getElementById('contact-search'),
  addContactBtn: document.getElementById('add-contact-btn'),
  
  // Профиль
  profileAvatar: document.getElementById('profile-avatar'),
  profileName: document.getElementById('profile-name'),
  profileUsername: document.getElementById('profile-username'),
  profileStatusText: document.getElementById('profile-status-text'),
  myPostsList: document.getElementById('my-posts-list'),
  myPostsEmpty: document.getElementById('my-posts-empty'),
  btnChangeAvatar: document.getElementById('btn-change-avatar'),
  btnEditProfile: document.getElementById('btn-edit-profile'),
  btnSettings: document.getElementById('btn-settings'),
  btnDeleteProfile: document.getElementById('btn-delete-profile'),
  
  // Чат
  chatAvatar: document.getElementById('chat-avatar'),
  chatName: document.getElementById('chat-name'),
  chatStatus: document.getElementById('chat-status'),
  msgArea: document.getElementById('msg-area'),
  textInput: document.getElementById('text-input'),
  sendBtn: document.getElementById('send-btn'),
  backBtn: document.getElementById('back-btn'),
  emojiToggle: document.getElementById('emoji-toggle'),
  emojiPanel: document.getElementById('emoji-panel'),
  emojiGrid: document.getElementById('emoji-grid')
};

const modals = {
  avatar: document.getElementById('avatar-modal'),
  editProfile: document.getElementById('edit-profile-modal'),
  settings: document.getElementById('settings-modal'),
  addContact: document.getElementById('add-contact-modal')
};

// 🔹 Состояние
let currentUser = null;
let currentChatUser = null;
let unsubChat = null;
let unsubProfile = null;
let unsubFeed = null;
let unsubContacts = null;
let selectedAvatarUrl = null;

// 🔹 Авторизация
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    screens.auth.classList.remove('active');
    screens.main.classList.add('active');
    await initApp(user.uid);
  } else {
    currentUser = null;
    screens.auth.classList.add('active');
    screens.main.classList.remove('active');
    screens.chat.classList.remove('active');
    cleanupListeners();
  }
});

elements.loginBtn.onclick = async () => {
  elements.authError.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, elements.email.value.trim(), elements.password.value);
  } catch (e) {
    elements.authError.textContent = e.code === 'auth/invalid-credential' ? 'Неверный email или пароль' : e.message;
  }
};

elements.registerBtn.onclick = async () => {
  elements.authError.textContent = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, elements.email.value.trim(), elements.password.value);
    const defAvatar = `https://ui-avatars.com/api/?name=${cred.user.email}&background=6366f1&color=fff&size=128`;
    await setDoc(doc(db, 'users', cred.user.uid), {
      username: cred.user.email.split('@')[0],
      displayName: cred.user.email.split('@')[0],
      avatar: defAvatar, statusText: '', status: 'online', createdAt: serverTimestamp()
    });
  } catch (e) {
    elements.authError.textContent = e.message;
  }
};

elements.logoutBtn.onclick = () => signOut(auth);

// 🔹 Инициализация
async function initApp(uid) {
  applyTheme(localStorage.getItem('theme') || 'light');
  
  // Профиль
  unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    elements.profileAvatar.src = data.avatar || '';
    elements.profileName.textContent = data.displayName || '';
    elements.profileUsername.textContent = `@${data.username || 'user'}`;
    elements.profileStatusText.textContent = data.statusText || '';
    selectedAvatarUrl = data.avatar;
  });

  loadChats();
  loadFeed();
  loadMyPosts();
  loadContacts();
  renderAvatarGrid();
  initEmojis();
  setupNav();
  setupModals();
}

// 🔹 Тема
const themeSwitch = document.getElementById('theme-switch');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeSwitch.checked = theme === 'dark';
}
themeSwitch.onchange = (e) => applyTheme(e.target.checked ? 'dark' : 'light');

// 🔹 Профиль
elements.btnChangeAvatar.onclick = () => modals.avatar.showModal();
elements.btnEditProfile.onclick = () => {
  document.getElementById('edit-name').value = elements.profileName.textContent;
  document.getElementById('edit-username').value = elements.profileUsername.textContent.replace('@', '');
  document.getElementById('edit-status').value = elements.profileStatusText.textContent;
  modals.editProfile.showModal();
};
elements.btnSettings.onclick = () => modals.settings.showModal();

document.getElementById('save-profile-btn').onclick = async () => {
  const name = document.getElementById('edit-name').value.trim();
  const username = document.getElementById('edit-username').value.trim().replace('@', '');
  const status = document.getElementById('edit-status').value.trim();
  
  await updateDoc(doc(db, 'users', currentUser.uid), { displayName: name, username, statusText: status });
  showToast('Профиль сохранён');
  modals.editProfile.close();
};

elements.btnDeleteProfile.onclick = async () => {
  if (!confirm('Удалить профиль безвозвратно?')) return;
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid));
    signOut(auth);
    showToast('Профиль удалён');
  } catch (e) { showToast('Ошибка удаления', 'error'); }
};

// Аватары
function renderAvatarGrid() {
  const grid = document.getElementById('avatar-selection-grid');
  grid.innerHTML = '';
  const chars = ['IronMan','Batman','Joker','Thor','Loki','Yoda','Gandalf','Harry','Hermione','Draco','Natasha','Steve','Hulk','Scarlett','ChrisE','RDJ'];
  
  chars.forEach(name => {
    const img = document.createElement('img');
    img.src = `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128`;
    img.className = 'avatar-option';
    img.onclick = async () => {
      document.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
      img.classList.add('selected');
      await updateDoc(doc(db, 'users', currentUser.uid), { avatar: img.src });
      showToast('Аватар обновлён');
      modals.avatar.close();
    };
    grid.appendChild(img);
  });
}

// 🔹 Лента
elements.publishBtn.onclick = async () => {
  const text = elements.postText.value.trim();
  if (!text) return;
  
  await addDoc(collection(db, 'posts'), {
    authorId: currentUser.uid,
    authorName: elements.profileName.textContent,
    authorAvatar: selectedAvatarUrl,
    text, createdAt: serverTimestamp()
  });
  elements.postText.value = '';
  showToast('Опубликовано');
};

function loadFeed() {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  if (unsubFeed) unsubFeed();
  
  unsubFeed = onSnapshot(q, (snap) => {
    elements.feedList.innerHTML = '';
    if (snap.empty) { elements.feedEmpty.style.display = 'block'; return; }
    elements.feedEmpty.style.display = 'none';
    
    snap.forEach(d => {
      const p = d.data();
      elements.feedList.innerHTML += `
        <div class="card feed-card">
          <img src="${p.authorAvatar}" class="avatar small">
          <div class="content" style="flex:1;">
            <div class="feed-meta"><b>${p.authorName}</b> • ${timeAgo(p.createdAt)}</div>
            <div class="feed-text">${escapeHtml(p.text)}</div>
          </div>
        </div>`;
    });
  });
}

function loadMyPosts() {
  const q = query(collection(db, 'posts'), where('authorId', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(20));
  onSnapshot(q, (snap) => {
    elements.myPostsList.innerHTML = '';
    if (snap.empty) { elements.myPostsEmpty.style.display = 'block'; return; }
    elements.myPostsEmpty.style.display = 'none';
    snap.forEach(d => {
      const p = d.data();
      elements.myPostsList.innerHTML += `
        <div class="card" style="margin-bottom:8px; padding:12px;">
          <p style="margin:0; font-size:14px;">${escapeHtml(p.text)}</p>
          <div class="feed-meta" style="margin-top:6px;">${timeAgo(p.createdAt)}</div>
        </div>`;
    });
  });
}

// 🔹 Контакты
elements.addContactBtn.onclick = () => modals.addContact.showModal();
document.getElementById('confirm-add-contact').onclick = () => {
  const email = document.getElementById('new-contact-email').value.trim();
  if (!email.includes('@')) return showToast('Введите корректный email', 'error');
  
  query(collection(db, 'users'), where('email', '==', email)).then(snap => {
    if (snap.empty) return showToast('Пользователь не найден', 'error');
    showToast('Контакт добавлен');
    modals.addContact.close();
  });
};

function loadContacts() {
  const q = query(collection(db, 'users'), limit(50));
  if (unsubContacts) unsubContacts();
  
  unsubContacts = onSnapshot(q, (snap) => {
    elements.contactsList.innerHTML = '';
    let found = false;
    snap.forEach(d => {
      if (d.id === currentUser.uid) return;
      found = true;
      const u = d.data();
      const el = document.createElement('div');
      el.className = 'list-item';
      el.innerHTML = `<img src="${u.avatar || ''}" class="avatar small"><div><h4 style="margin:0; font-size:15px;">${u.displayName}</h4><span class="text-muted text-xs">@${u.username || '...'}</span></div>`;
      el.onclick = () => openChat(d.id, u.displayName, u.avatar);
      elements.contactsList.appendChild(el);
    });
    elements.contactsEmpty.style.display = found ? 'none' : 'block';
  });
}

// Поиск контактов
elements.contactSearch.oninput = (e) => {
  const val = e.target.value.toLowerCase();
  document.querySelectorAll('#contacts-list .list-item').forEach(el => {
    const name = el.querySelector('h4').textContent.toLowerCase();
    el.style.display = name.includes(val) ? 'flex' : 'none';
  });
};

// 🔹 Чаты
function loadChats() {
  // Для демо используем контакты как список чатов. В продакшене здесь будет коллекция `conversations`
  loadContacts(); 
  // Копируем контакты в список чатов для быстрого старта
  elements.contactsList.querySelectorAll('.list-item').forEach(el => {
    elements.chatList.appendChild(el.cloneNode(true));
  });
  // Переназначаем клики
  document.querySelectorAll('#chat-list .list-item').forEach(el => {
    el.onclick = () => openChat(el.dataset.id || currentUser.uid, el.querySelector('h4').textContent, el.querySelector('img').src);
  });
}

function openChat(uid, name, avatar) {
  currentChatUser = { id: uid, name, avatar };
  elements.chatName.textContent = name;
  elements.chatAvatar.src = avatar || `https://ui-avatars.com/api/?name=${name}&background=random`;
  elements.chatStatus.textContent = 'в сети';
  
  screens.main.classList.remove('active');
  screens.chat.classList.add('active');
  loadMessages(uid);
}

function loadMessages(chatId) {
  const room = [currentUser.uid, chatId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  if (unsubChat) unsubChat();
  
  elements.msgArea.innerHTML = '<div class="empty-state">Загрузка...</div>';
  unsubChat = onSnapshot(q, (snap) => {
    elements.msgArea.innerHTML = '';
    if (snap.empty) {
      elements.msgArea.innerHTML = '<div class="empty-state">Нет сообщений. Напишите первым!</div>';
      return;
    }
    snap.forEach(d => {
      const m = d.data();
      const div = document.createElement('div');
      div.className = `msg ${m.senderId === currentUser.uid ? 'out' : 'in'}`;
      div.innerHTML = `${escapeHtml(m.text)}<span class="time">${timeAgo(m.createdAt)}</span>`;
      elements.msgArea.appendChild(div);
    });
    elements.msgArea.scrollTop = elements.msgArea.scrollHeight;
  });
}

elements.sendBtn.onclick = async () => {
  const text = elements.textInput.value.trim();
  if (!text || !currentChatUser) return;
  const room = [currentUser.uid, currentChatUser.id].sort().join('_');
  
  try {
    await addDoc(collection(db, 'messages'), { room, text, senderId: currentUser.uid, createdAt: serverTimestamp() });
    elements.textInput.value = '';
  } catch (e) { showToast('Ошибка отправки', 'error'); }
};
elements.textInput.onkeypress = (e) => { if (e.key === 'Enter' && !e.shiftKey) elements.sendBtn.click(); };

elements.backBtn.onclick = () => {
  screens.chat.classList.remove('active');
  screens.main.classList.add('active');
  if (unsubChat) unsubChat();
  currentChatUser = null;
};

// 🔹 Эмодзи & Навигация
const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪'];
function initEmojis() {
  elements.emojiGrid.innerHTML = '';
  EMOJIS.forEach(em => {
    const b = document.createElement('button');
    b.textContent = em;
    b.onclick = () => {
      const start = elements.textInput.selectionStart || elements.textInput.value.length;
      elements.textInput.value = elements.textInput.value.slice(0, start) + em + elements.textInput.value.slice(start);
      elements.textInput.focus();
    };
    elements.emojiGrid.appendChild(b);
  });
}
elements.emojiToggle.onclick = (e) => { e.stopPropagation(); elements.emojiPanel.classList.toggle('open'); };
document.addEventListener('click', (e) => { if (!elements.emojiPanel.contains(e.target) && e.target !== elements.emojiToggle) elements.emojiPanel.classList.remove('open'); });

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      
      const titles = { chats: 'Чаты', feed: 'Лента', contacts: 'Контакты', profile: 'Профиль' };
      elements.pageTitle.textContent = titles[btn.dataset.tab] || 'Woops';
    };
  });
}

function setupModals() {
  // Закрытие по клику на backdrop
  document.querySelectorAll('dialog.modal').forEach(d => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });
}

function cleanupListeners() {
  if (unsubChat) unsubChat();
  if (unsubProfile) unsubProfile();
  if (unsubFeed) unsubFeed();
  if (unsubContacts) unsubContacts();
}

// 🔹 Утилиты
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 2500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - (ts.toDate ? ts.toDate().getTime() : ts)) / 1000);
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s/60)} мин назад`;
  if (s < 86400) return `${Math.floor(s/3600)} ч назад`;
  return new Date(ts.toDate ? ts.toDate() : ts).toLocaleDateString('ru-RU');
}

console.log('%c✅ Woops App Loaded', 'color: #6366f1; font-weight: bold; font-size: 14px');
