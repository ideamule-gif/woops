import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔧 Конфиг Firebase
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

// 🔹 Элементы DOM (строго под ваш index.html)
const els = {
  authScreen: document.getElementById('auth-screen'),
  mainScreen: document.getElementById('main-screen'),
  chatScreen: document.getElementById('chat-screen'),
  emailInput: document.getElementById('email'),
  passInput: document.getElementById('password'),
  authError: document.getElementById('auth-error'),
  loginBtn: document.getElementById('login-btn'),
  registerBtn: document.getElementById('register-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  pageTitle: document.getElementById('page-title'),
  
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
  
  chatAvatar: document.getElementById('chat-avatar'),
  chatName: document.getElementById('chat-name'),
  chatStatus: document.getElementById('chat-status'),
  msgArea: document.getElementById('msg-area'),
  textInput: document.getElementById('text-input'),
  sendBtn: document.getElementById('send-btn'),
  backBtn: document.getElementById('back-btn'),
  emojiToggle: document.getElementById('emoji-toggle'),
  emojiPanel: document.getElementById('emoji-panel'),
  emojiGrid: document.getElementById('emoji-grid'),
  
  themeSwitch: document.getElementById('theme-switch'),
  toast: document.getElementById('toast')
};

// 🔹 Глобальное состояние
let currentUser = null;
let currentChat = null;
let unsubChat = null;
let unsubProfile = null;
let unsubFeed = null;
let unsubUsers = null;

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    els.authScreen.classList.remove('active');
    els.mainScreen.classList.add('active');
    initApp(user.uid);
  } else {
    currentUser = null;
    els.authScreen.classList.add('active');
    els.mainScreen.classList.remove('active');
    els.chatScreen.classList.remove('active');
    cleanup();
  }
});

els.loginBtn.onclick = async () => {
  els.authError.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, els.emailInput.value.trim(), els.passInput.value);
  } catch (e) {
    els.authError.textContent = e.code === 'auth/invalid-credential' ? 'Неверный email или пароль' : 'Ошибка входа';
  }
};

els.registerBtn.onclick = async () => {
  els.authError.textContent = '';
  try {
    const cred = await createUserWithEmailAndPassword(auth, els.emailInput.value.trim(), els.passInput.value);
    const defAvatar = `https://ui-avatars.com/api/?name=${cred.user.email}&background=6366f1&color=fff&size=128`;
    await setDoc(doc(db, 'users', cred.user.uid), {
      username: cred.user.email.split('@')[0],
      displayName: cred.user.email.split('@')[0],
      avatar: defAvatar,
      statusText: '',
      createdAt: serverTimestamp()
    });
  } catch (e) {
    els.authError.textContent = e.message;
  }
};

els.logoutBtn.onclick = () => signOut(auth);

// ============================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ============================================
function initApp(uid) {
  applyTheme(localStorage.getItem('theme') || 'light');
  trackProfile(uid);
  loadUsers();
  loadFeed();
  loadMyPosts(uid);
  initEmojis();
  setupNav();
  setupModals();
  setupSearch();
}

// Тема
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (els.themeSwitch) els.themeSwitch.checked = theme === 'dark';
}
if (els.themeSwitch) {
  els.themeSwitch.onchange = (e) => applyTheme(e.target.checked ? 'dark' : 'light');
}

// ============================================
// 👤 ПРОФИЛЬ
// ============================================
function trackProfile(uid) {
  unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    els.profileAvatar.src = data.avatar || '';
    els.profileName.textContent = data.displayName || '';
    els.profileUsername.textContent = `@${data.username || 'user'}`;
    els.profileStatusText.textContent = data.statusText || '';
  });
}

// Модалка аватаров
els.btnChangeAvatar.onclick = () => {
  const grid = document.getElementById('avatar-selection-grid');
  grid.innerHTML = '';
  const chars = ['IronMan','Batman','Joker','Thor','Loki','Yoda','Gandalf','Harry','Hermione','Draco','Natasha','Steve','Hulk','Scarlett','ChrisE','RDJ'];
  
  chars.forEach(name => {
    const img = document.createElement('img');
    img.src = `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=128`;
    img.className = 'avatar-option';
    img.onclick = async () => {
      await updateDoc(doc(db, 'users', currentUser.uid), { avatar: img.src });
      showToast('Аватар обновлён');
      document.getElementById('avatar-modal').close();
    };
    grid.appendChild(img);
  });
  document.getElementById('avatar-modal').showModal();
};

// Редактирование профиля
els.btnEditProfile.onclick = () => {
  document.getElementById('edit-name').value = els.profileName.textContent;
  document.getElementById('edit-username').value = els.profileUsername.textContent.replace('@', '');
  document.getElementById('edit-status').value = els.profileStatusText.textContent;
  document.getElementById('edit-profile-modal').showModal();
};

document.getElementById('save-profile-btn').onclick = async () => {
  await updateDoc(doc(db, 'users', currentUser.uid), {
    displayName: document.getElementById('edit-name').value.trim(),
    username: document.getElementById('edit-username').value.trim().replace('@', ''),
    statusText: document.getElementById('edit-status').value.trim()
  });
  showToast('Сохранено');
  document.getElementById('edit-profile-modal').close();
};

// Настройки
els.btnSettings.onclick = () => document.getElementById('settings-modal').showModal();

// Удаление
els.btnDeleteProfile.onclick = async () => {
  if (!confirm('Удалить профиль безвозвратно?')) return;
  await deleteDoc(doc(db, 'users', currentUser.uid));
  signOut(auth);
  showToast('Профиль удалён');
};

// ============================================
// 📱 ЛЕНТА
// ============================================
els.publishBtn.onclick = async () => {
  const text = els.postText.value.trim();
  if (!text) return;
  await addDoc(collection(db, 'posts'), {
    authorId: currentUser.uid,
    authorName: els.profileName.textContent,
    authorAvatar: els.profileAvatar.src,
    text, createdAt: serverTimestamp()
  });
  els.postText.value = '';
  showToast('Опубликовано');
};

function loadFeed() {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  unsubFeed = onSnapshot(q, (snap) => {
    els.feedList.innerHTML = '';
    if (snap.empty) { els.feedEmpty.style.display = 'block'; return; }
    els.feedEmpty.style.display = 'none';
    
    snap.forEach(d => {
      const p = d.data();
      els.feedList.innerHTML += `
        <div class="card feed-card">
          <img src="${p.authorAvatar}" class="avatar small">
          <div style="flex:1">
            <div class="feed-meta"><b>${p.authorName}</b> • ${timeAgo(p.createdAt)}</div>
            <div class="feed-text">${escapeHtml(p.text)}</div>
          </div>
        </div>`;
    });
  });
}

function loadMyPosts(uid) {
  const q = query(collection(db, 'posts'), where('authorId', '==', uid), orderBy('createdAt', 'desc'), limit(20));
  onSnapshot(q, (snap) => {
    els.myPostsList.innerHTML = '';
    if (snap.empty) { els.myPostsEmpty.style.display = 'block'; return; }
    els.myPostsEmpty.style.display = 'none';
    snap.forEach(d => {
      const p = d.data();
      els.myPostsList.innerHTML += `
        <div class="card" style="margin-bottom:8px; padding:12px;">
          <p style="margin:0; font-size:14px;">${escapeHtml(p.text)}</p>
          <div class="feed-meta" style="margin-top:6px;">${timeAgo(p.createdAt)}</div>
        </div>`;
    });
  });
}

// ============================================
// 👥 КОНТАКТЫ & ЧАТЫ
// ============================================
function loadUsers() {
  const q = query(collection(db, 'users'), limit(50));
  unsubUsers = onSnapshot(q, (snap) => {
    els.contactsList.innerHTML = '';
    els.chatList.innerHTML = '';
    let found = false;
    
    snap.forEach(d => {
      if (d.id === currentUser.uid) return;
      found = true;
      const u = d.data();
      const html = `
        <div class="list-item" data-id="${d.id}" data-name="${u.displayName}" data-avatar="${u.avatar}">
          <img src="${u.avatar}" class="avatar small">
          <div>
            <h4 style="margin:0; font-size:15px;">${u.displayName}</h4>
            <span class="text-muted text-xs">@${u.username || '...'}</span>
          </div>
        </div>`;
      els.contactsList.innerHTML += html;
      els.chatList.innerHTML += html;
    });
    
    els.contactsEmpty.style.display = found ? 'none' : 'block';
    els.chatsEmpty.style.display = found ? 'none' : 'block';
    
    // Привязка кликов
    document.querySelectorAll('.list-item').forEach(el => {
      el.onclick = () => openChat(el.dataset.id, el.dataset.name, el.dataset.avatar);
    });
  });
}

els.addContactBtn.onclick = () => document.getElementById('add-contact-modal').showModal();

document.getElementById('confirm-add-contact').onclick = async () => {
  const email = document.getElementById('new-contact-email').value.trim();
  if (!email) return showToast('Введите email', 'error');
  const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
  if (snap.empty) return showToast('Пользователь не найден', 'error');
  showToast('Контакт найден');
  document.getElementById('add-contact-modal').close();
};

function setupSearch() {
  els.contactSearch.oninput = (e) => {
    const v = e.target.value.toLowerCase();
    document.querySelectorAll('#contacts-list .list-item').forEach(el => {
      const name = el.querySelector('h4').textContent.toLowerCase();
      el.style.display = name.includes(v) ? 'flex' : 'none';
    });
  };
}

// ============================================
// ✉️ ЧАТ
// ============================================
function openChat(uid, name, avatar) {
  currentChat = { id: uid, name, avatar };
  els.chatName.textContent = name;
  els.chatAvatar.src = avatar || `https://ui-avatars.com/api/?name=${name}&background=random`;
  els.chatStatus.textContent = 'в сети';
  
  els.mainScreen.classList.remove('active');
  els.chatScreen.classList.add('active');
  loadMessages(uid);
}

function loadMessages(chatId) {
  const room = [currentUser.uid, chatId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  if (unsubChat) unsubChat();
  
  els.msgArea.innerHTML = '<div class="empty-state">Загрузка...</div>';
  unsubChat = onSnapshot(q, (snap) => {
    els.msgArea.innerHTML = '';
    if (snap.empty) { els.msgArea.innerHTML = '<div class="empty-state">Нет сообщений. Напишите первым!</div>'; return; }
    
    snap.forEach(d => {
      const m = d.data();
      const div = document.createElement('div');
      div.className = `msg ${m.senderId === currentUser.uid ? 'out' : 'in'}`;
      div.innerHTML = `${escapeHtml(m.text)}<span class="time">${timeAgo(m.createdAt)}</span>`;
      els.msgArea.appendChild(div);
    });
    els.msgArea.scrollTop = els.msgArea.scrollHeight;
  });
}

els.sendBtn.onclick = async () => {
  const text = els.textInput.value.trim();
  if (!text || !currentChat) return;
  const room = [currentUser.uid, currentChat.id].sort().join('_');
  try {
    await addDoc(collection(db, 'messages'), { room, text, senderId: currentUser.uid, createdAt: serverTimestamp() });
    els.textInput.value = '';
  } catch (e) { showToast('Ошибка отправки', 'error'); }
};
els.textInput.onkeypress = (e) => { if (e.key === 'Enter' && !e.shiftKey) els.sendBtn.click(); };

els.backBtn.onclick = () => {
  els.chatScreen.classList.remove('active');
  els.mainScreen.classList.add('active');
  if (unsubChat) unsubChat();
  currentChat = null;
};

// ============================================
// ☺ ЭМДЗИ & НАВИГАЦИЯ
// ============================================
const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪'];

function initEmojis() {
  els.emojiGrid.innerHTML = '';
  EMOJIS.forEach(em => {
    const b = document.createElement('button');
    b.textContent = em;
    b.onclick = () => {
      const s = els.textInput.selectionStart || els.textInput.value.length;
      els.textInput.value = els.textInput.value.slice(0, s) + em + els.textInput.value.slice(s);
      els.textInput.focus();
    };
    els.emojiGrid.appendChild(b);
  });
}

els.emojiToggle.onclick = (e) => { e.stopPropagation(); els.emojiPanel.classList.toggle('open'); };
document.addEventListener('click', (e) => { if (!els.emojiPanel.contains(e.target) && e.target !== els.emojiToggle) els.emojiPanel.classList.remove('open'); });

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      
      const titles = { chats: 'Чаты', feed: 'Лента', contacts: 'Контакты', profile: 'Профиль' };
      els.pageTitle.textContent = titles[btn.dataset.tab] || 'Woops';
    };
  });
}

function setupModals() {
  document.querySelectorAll('dialog.modal').forEach(d => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });
}

// ============================================
// 🛠 УТИЛИТЫ
// ============================================
function cleanup() {
  if (unsubChat) unsubChat();
  if (unsubProfile) unsubProfile();
  if (unsubFeed) unsubFeed();
  if (unsubUsers) unsubUsers();
}

function showToast(msg, type = 'success') {
  els.toast.textContent = msg;
  els.toast.className = `toast show ${type}`;
  setTimeout(() => els.toast.classList.remove('show'), 2500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - (ts.toDate ? ts.toDate().getTime() : ts)) / 1000);
  return s < 60 ? 'только что' : s < 3600 ? `${Math.floor(s/60)} мин` : s < 86400 ? `${Math.floor(s/3600)} ч` : 'давно';
}

console.log('%c✅ Woops App Loaded', 'color: #6366f1; font-weight: bold');
