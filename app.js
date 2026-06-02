// ==========================================================================
// 🔌 ПОДКЛЮЧЕНИЕ К FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot, doc, updateDoc, deleteDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase конфигурация
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

// ==========================================================================
// 🔌 КОНФИГУРАЦИЯ И СТРУКТУРА ДАННЫХ
// ==========================================================================
const CONFIG = {
  version: '3.1.0',
  themeKey: 'woops_theme',
  sessionKey: 'woops_session',
  avatarApi: 'https://ui-avatars.com/api/?background=0f172a&color=fff&name='
};

const state = {
  currentUser: null,
  activeTab: 'chats',
  activeChatUser: null,
  users: [],
  messages: [],
  posts: [],
  selectedMsgId: null,
  isEditingMode: false,
  longTapTimeout: null,
  unsubscribeUsers: null,
  unsubscribeMessages: null
};

// ==========================================================================
// 🛠️ ИНИЦИАЛИЗАЦИЯ
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupNavigation();
  setupChat();
  setupFeed();
  setupProfile();
  setupGlobalSearch();
  setupContextMenuClose();
  
  // Слушаем изменения авторизации
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Пользователь вошел
      state.currentUser = {
        id: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        username: user.email.split('@')[0].toLowerCase(),
        statusText: 'Использую Woops',
        avatar: user.photoURL || null
      };
      
      $('auth-screen')?.classList.add('hidden');
      $('app-screen')?.classList.remove('hidden');
      $('app-screen')?.classList.add('active');
      
      updateProfileDOM();
      loadUsersFromFirebase();
      showToast(`Добро пожаловать, ${state.currentUser.name}`);
    } else {
      // Пользователь вышел
      state.currentUser = null;
      if (state.unsubscribeUsers) state.unsubscribeUsers();
      if (state.unsubscribeMessages) state.unsubscribeMessages();
      
      $('app-screen')?.classList.add('hidden');
      $('auth-screen')?.classList.remove('hidden');
      $('auth-screen')?.classList.add('active');
    }
  });
});

// ==========================================================================
// 🔐 АВТОРИЗАЦИЯ С FIREBASE
// ==========================================================================
function setupAuth() {
  const emailInput = $('auth-email');
  const passwordInput = $('auth-password');
  const rememberCheckbox = $('auth-remember');
  const errorDiv = $('auth-error');

  $('login-btn')?.addEventListener('click', async () => {
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    
    if (!email || !password) {
      if (errorDiv) errorDiv.innerText = 'Заполните все поля';
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (rememberCheckbox?.checked) {
        localStorage.setItem(CONFIG.sessionKey, JSON.stringify({ email }));
      }
      showToast('Вход выполнен!');
    } catch (error) {
      console.error(error);
      if (errorDiv) errorDiv.innerText = getAuthErrorMessage(error.code);
    }
  });

  $('register-btn')?.addEventListener('click', async () => {
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    
    if (!email || !password) {
      if (errorDiv) errorDiv.innerText = 'Заполните все поля';
      return;
    }
    
    if (password.length < 6) {
      if (errorDiv) errorDiv.innerText = 'Пароль должен быть не менее 6 символов';
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      showToast('Регистрация прошла успешно!');
    } catch (error) {
      console.error(error);
      if (errorDiv) errorDiv.innerText = getAuthErrorMessage(error.code);
    }
  });
}

function getAuthErrorMessage(code) {
  const errors = {
    'auth/invalid-email': 'Неверный формат email',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/email-already-in-use': 'Email уже занят',
    'auth/weak-password': 'Пароль слишком короткий (мин. 6 символов)'
  };
  return errors[code] || 'Ошибка авторизации';
}

// ==========================================================================
// 👥 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ИЗ FIRESTORE
// ==========================================================================
async function loadUsersFromFirebase() {
  if (state.unsubscribeUsers) state.unsubscribeUsers();
  
  const q = query(collection(db, 'users'));
  
  state.unsubscribeUsers = onSnapshot(q, (snapshot) => {
    state.users = [];
    
    snapshot.forEach(doc => {
      if (doc.id !== state.currentUser?.id) {
        const userData = doc.data();
        state.users.push({
          id: doc.id,
          name: userData.displayName || userData.email?.split('@')[0] || 'Пользователь',
          email: userData.email,
          username: userData.email?.split('@')[0].toLowerCase(),
          statusText: userData.statusText || 'В сети',
          avatar: userData.avatar || null
        });
      }
    });
    
    console.log('📋 Загружено пользователей:', state.users.length);
    renderContacts();
    renderChats();
  }, (error) => {
    console.error('Ошибка загрузки пользователей:', error);
  });
}

// ==========================================================================
// 👥 КОНТАКТЫ И ПОИСК
// ==========================================================================
function renderContacts() {
  const container = $('contacts-list');
  if (!container) return;
  container.innerHTML = '';
  
  const filtered = state.users.filter(u => u.id !== state.currentUser?.id);
  const emptyEl = $('contacts-empty');
  
  if (filtered.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  
  filtered.forEach(user => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <img class="avatar" src="${user.avatar || CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
      <div class="info">
        <h4>${user.name}</h4>
        <p>${user.statusText || 'Использует Woops'}</p>
      </div>
    `;
    li.addEventListener('click', () => openChat(user));
    container.appendChild(li);
  });
}

function setupGlobalSearch() {
  const overlay = $('search-overlay');
  const input = $('global-search');
  const results = $('search-results');
  
  $('search-btn')?.addEventListener('click', () => {
    overlay?.classList.remove('hidden');
    input?.focus();
  });
  
  $('close-search')?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
  });
  
  input?.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!results) return;
    results.innerHTML = '';
    if (!q) return;
    
    const matched = state.users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) || 
      (u.username && u.username.toLowerCase().includes(q))
    );
    
    if (matched.length === 0) {
      results.innerHTML = '<div class="empty-state">Никого не найдено</div>';
      return;
    }
    
    matched.forEach(user => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <img class="avatar" src="${user.avatar || CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
        <div class="info">
          <h4>${user.name}</h4>
          <p>${user.email || '@' + user.username}</p>
        </div>
      `;
      li.addEventListener('click', () => {
        overlay?.classList.add('hidden');
        if (input) input.value = '';
        results.innerHTML = '';
        openChat(user);
      });
      results.appendChild(li);
    });
  });
  
  $('add-contact-btn')?.addEventListener('click', () => {
    overlay?.classList.remove('hidden');
    input?.focus();
  });
}

// ==========================================================================
// 💬 ЧАТ С СОХРАНЕНИЕМ В FIRESTORE
// ==========================================================================
async function openChat(user) {
  state.activeChatUser = user;
  
  const nameEl = $('chat-name');
  const statusEl = $('chat-status');
  const avatarEl = $('chat-avatar');
  
  if (nameEl) nameEl.innerText = user.name;
  if (statusEl) statusEl.innerText = 'в сети';
  if (avatarEl) avatarEl.src = user.avatar || CONFIG.avatarApi + encodeURIComponent(user.name);
  
  $('chat-screen')?.classList.remove('hidden-mobile');
  $('chat-welcome-view')?.classList.add('style-hidden');
  $('chat-active-view')?.classList.remove('style-hidden');
  
  await loadMessagesFromFirebase(user.id);
}

async function loadMessagesFromFirebase(otherUserId) {
  if (state.unsubscribeMessages) state.unsubscribeMessages();
  
  const room = [state.currentUser.id, otherUserId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
  
  state.unsubscribeMessages = onSnapshot(q, (snapshot) => {
    state.messages = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      state.messages.push({
        id: doc.id,
        from: data.senderId,
        to: data.senderId === state.currentUser.id ? otherUserId : state.currentUser.id,
        text: data.text,
        time: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        edited: false
      });
    });
    
    renderMessages();
  });
}

function setupChat() {
  $('back-btn')?.addEventListener('click', () => {
    $('chat-screen')?.classList.add('hidden-mobile');
    state.activeChatUser = null;
    if (state.unsubscribeMessages) state.unsubscribeMessages();
    renderChats();
  });
  
  const sendMsg = async () => {
    const input = $('text-input');
    if (!input || !state.activeChatUser || !state.currentUser) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    const room = [state.currentUser.id, state.activeChatUser.id].sort().join('_');
    
    try {
      await addDoc(collection(db, 'messages'), {
        room: room,
        senderId: state.currentUser.id,
        text: text,
        createdAt: serverTimestamp()
      });
      
      input.value = '';
      showToast('Сообщение отправлено');
    } catch (error) {
      console.error('Ошибка отправки:', error);
      showToast('Не удалось отправить сообщение');
    }
  };
  
  $('send-btn')?.addEventListener('click', sendMsg);
  $('text-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });
}

function renderMessages() {
  const area = $('msg-area');
  if (!area || !state.activeChatUser || !state.currentUser) return;
  area.innerHTML = '';
  
  const conversation = state.messages.filter(
    m => (m.from === state.currentUser.id && m.to === state.activeChatUser.id) || 
         (m.from === state.activeChatUser.id && m.to === state.currentUser.id)
  );
  
  conversation.forEach(m => {
    const div = document.createElement('div');
    const isOut = m.from === state.currentUser.id;
    div.className = `msg ${isOut ? 'out' : 'in'}`;
    div.innerHTML = `${m.text} <span class="time">${m.time}</span>`;
    area.appendChild(div);
  });
  
  area.scrollTop = area.scrollHeight;
}

function renderChats() {
  const container = $('chat-list');
  if (!container) return;
  container.innerHTML = '';
  
  // Группируем сообщения по собеседникам
  const chatPartners = new Set();
  state.messages.forEach(m => {
    if (m.from === state.currentUser?.id) chatPartners.add(m.to);
    if (m.to === state.currentUser?.id) chatPartners.add(m.from);
  });
  
  const partners = Array.from(chatPartners).map(id => state.users.find(u => u.id === id)).filter(Boolean);
  const emptyEl = $('chats-empty');
  
  if (partners.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  
  partners.forEach(user => {
    const lastMsg = state.messages
      .filter(m => (m.from === state.currentUser?.id && m.to === user.id) || (m.from === user.id && m.to === state.currentUser?.id))
      .pop();
    
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <img class="avatar" src="${user.avatar || CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
      <div class="info">
        <div style="display: flex; justify-content: space-between;">
          <h4>${user.name}</h4>
          <span style="font-size: 10px; color: var(--text-muted);">${lastMsg?.time || ''}</span>
        </div>
        <p>${lastMsg?.text || 'Начните диалог'}</p>
      </div>
    `;
    li.addEventListener('click', () => openChat(user));
    container.appendChild(li);
  });
}

// ==========================================================================
// 🎛️ ПРОФИЛЬ И ВЫХОД
// ==========================================================================
function updateProfileDOM() {
  if (!state.currentUser) return;
  const nameEl = $('profile-name');
  const userEl = $('profile-username-display');
  const statusEl = $('profile-status');
  const avatarEl = $('profile-avatar');
  
  if (nameEl) nameEl.innerText = state.currentUser.name;
  if (userEl) userEl.innerText = `@${state.currentUser.username || 'username'}`;
  if (statusEl) statusEl.innerText = state.currentUser.statusText || 'В сети';
  if (avatarEl) avatarEl.src = state.currentUser.avatar || CONFIG.avatarApi + encodeURIComponent(state.currentUser.name);
}

function setupProfile() {
  $('edit-profile-btn')?.addEventListener('click', () => {
    if (!state.currentUser) return;
    const dispName = $('edit-displayName');
    const uName = $('edit-username');
    const sText = $('edit-statusText');
    
    if (dispName) dispName.value = state.currentUser.name || '';
    if (uName) uName.value = state.currentUser.username || '';
    if (sText) sText.value = state.currentUser.statusText || '';
    
    $('modal-edit-profile')?.showModal();
  });
  
  $('save-profile-btn')?.addEventListener('click', async () => {
    if (!state.currentUser) return;
    
    const dispNameVal = $('edit-displayName')?.value.trim();
    const uNameVal = $('edit-username')?.value.replace(/[^a-zA-Z0-9_]/g, '').trim();
    const sTextVal = $('edit-statusText')?.value.trim();
    
    if (!dispNameVal || !uNameVal) {
      showToast('Имя и никнейм обязательны');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', state.currentUser.id), {
        displayName: dispNameVal,
        statusText: sTextVal || ''
      });
      
      state.currentUser.name = dispNameVal;
      state.currentUser.username = uNameVal.toLowerCase();
      state.currentUser.statusText = sTextVal || '';
      
      updateProfileDOM();
      $('modal-edit-profile')?.close();
      showToast('Профиль сохранен');
    } catch (error) {
      console.error(error);
      showToast('Ошибка сохранения');
    }
  });
  
  $('delete-profile-btn')?.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem(CONFIG.sessionKey);
    showToast('Вы вышли из аккаунта');
  });
}

// ==========================================================================
// 📝 ЛЕНТА, ТЕМА, ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================================================
function setupFeed() {
  $('new-post-btn')?.addEventListener('click', () => $('modal-new-post')?.showModal());
  
  $('publish-post-btn')?.addEventListener('click', () => {
    const postTextEl = $('post-text');
    if (!postTextEl) return;
    
    const text = postTextEl.value.trim();
    if (!text) return;
    
    state.posts.unshift({
      id: 'post_' + Date.now(),
      author: state.currentUser?.name || 'Пользователь',
      authorId: state.currentUser?.id || 'anon',
      text: text,
      likes: 0,
      liked: false
    });
    
    postTextEl.value = '';
    $('modal-new-post')?.close();
    showToast('Публикация добавлена');
    renderFeed();
  });
}

function renderFeed() {
  const container = $('feed-list');
  if (!container) return;
  container.innerHTML = '';
  
  const emptyEl = $('feed-empty');
  if (state.posts.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  
  state.posts.forEach(post => {
    const card = createPostCard(post);
    container.appendChild(card);
  });
}

function createPostCard(post) {
  const div = document.createElement('div');
  div.className = 'feed-card';
  div.innerHTML = `
    <div class="feed-author">
      <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(post.author)}" style="width:32px; height:32px;" alt="">
      <div>
        <h4>${post.author}</h4>
        <p>Только что</p>
      </div>
    </div>
    <div class="feed-text">${post.text}</div>
    <div class="feed-actions">
      <button class="like-btn ${post.liked ? 'active' : ''}">❤️ ${post.likes}</button>
    </div>
  `;
  
  const likeBtn = div.querySelector('.like-btn');
  likeBtn?.addEventListener('click', () => {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    likeBtn.classList.toggle('active');
    likeBtn.innerText = `❤️ ${post.likes}`;
  });
  
  return div;
}

function setupNavigation() {
  const titles = { chats: 'Чаты', contacts: 'Контакты', feed: 'Лента', profile: 'Профиль' };
  
  $$('.bottom-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      if (!targetTab || targetTab === state.activeTab) return;
      
      $$('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      $$('.tab-content .tab').forEach(tab => tab.classList.replace('active', 'hidden'));
      const activeTabEl = $(`tab-${targetTab}`);
      activeTabEl?.classList.replace('hidden', 'active');
      
      const titleEl = $('header-title');
      if (titleEl) titleEl.innerText = titles[targetTab] || 'Woops';
      state.activeTab = targetTab;
      
      const searchBtn = $('search-btn');
      if (searchBtn) {
        searchBtn.style.display = (targetTab === 'profile' || targetTab === 'feed') ? 'none' : 'flex';
      }
      
      if (targetTab === 'profile') renderMyPosts();
    });
  });
}

function renderMyPosts() {
  const container = $('my-posts-feed');
  if (!container || !state.currentUser) return;
  container.innerHTML = '';
  
  const myPosts = state.posts.filter(p => p.authorId === state.currentUser.id);
  if (myPosts.length === 0) {
    container.innerHTML = '<div class="empty-state">У вас еще нет публикаций</div>';
    return;
  }
  
  myPosts.forEach(post => {
    post.author = state.currentUser.name;
    const card = createPostCard(post);
    container.appendChild(card);
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem(CONFIG.themeKey);
  const useDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  updateThemeIcons(useDark);
  
  $('theme-toggle-btn')?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(CONFIG.themeKey, isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
  });
}

function updateThemeIcons(isDark) {
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  if (!sunIcon || !moonIcon) return;
  
  if (isDark) {
    document.documentElement.classList.add('dark');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    document.documentElement.classList.remove('dark');
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

function setupContextMenuClose() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.msg') && !e.target.closest('#msg-context-menu')) {
      $('msg-context-menu')?.classList.add('style-hidden');
    }
  });
}

function showToast(text) {
  const toast = $('toast');
  if (!toast) return;
  toast.innerText = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

// Вызываем setupAuth после инициализации
setTimeout(() => setupAuth(), 100);
