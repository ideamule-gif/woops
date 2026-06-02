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
  
  // База данных приложения (В продакшене эти массивы заменяются на запросы к серверу)
  users: [],       // Список зарегистрированных пользователей
  messages: [],    // История сообщений
  posts: [],       // Лента постов
  
  // Служебные переменные для управления контекстным меню сообщений
  selectedMsgId: null,
  isEditingMode: false,
  longTapTimeout: null
};

// ==========================================================================
// 🛠️ ИНИЦИАЛИЗАЦИЯ И ПРОВЕРКА СЕССИИ
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkSavedSession();
  setupNavigation();
  setupAuth();
  setupChat();
  setupFeed();
  setupProfile();
  setupGlobalSearch();
  setupContextMenuClose();
});

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

function showToast(text) {
  const toast = $('toast');
  if (!toast) return;
  toast.innerText = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Автоматический вход, если юзер выбрал "Запомнить меня"
function checkSavedSession() {
  const savedUser = localStorage.getItem(CONFIG.sessionKey);
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      // Имитируем наполнение базы данных для корректного поиска сохраненного юзера
      state.users = [user];
      loginSuccess(user);
    } catch (e) {
      localStorage.removeItem(CONFIG.sessionKey);
    }
  }
}

// ==========================================================================
// 🌗 МИНИМАЛИСТИЧНЫЙ ТУМБЛЕР ТЕМЫ
// ==========================================================================
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

// ==========================================================================
// 🔐 АВТОРИЗАЦИЯ С ФУНКЦИЕЙ "ЗАПОМНИТЬ МЕНЯ"
// ==========================================================================
function setupAuth() {
  const emailInput = $('auth-email');
  const passwordInput = $('auth-password');
  const rememberCheckbox = $('auth-remember');
  const errorDiv = $('auth-error');

  const processAuth = (isRegister = false) => {
    if (!emailInput || !passwordInput || !errorDiv) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorDiv.innerText = 'Заполните все поля';
      return;
    }
    if (password.length < 4) {
      errorDiv.innerText = 'Пароль должен быть не менее 4 символов';
      return;
    }

    let user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (isRegister) {
      if (user) {
        errorDiv.innerText = 'Пользователь с таким Email уже существует';
        return;
      }
      const rawName = email.split('@')[0];
      user = { 
        id: 'user_' + Date.now(), 
        name: rawName, 
        username: rawName.toLowerCase() + '_id', // Дефолтный уникальный ник
        email: email, 
        statusText: 'Использую Woops' 
      };
      state.users.push(user);
    } else {
      // Логика входа
      if (!user) {
        // Если база пуста (демо-режим), создаем новый профиль на лету
        user = { id: 'me', name: email.split('@')[0], username: email.split('@')[0].toLowerCase(), email: email, statusText: 'Использую Woops' };
        state.users.push(user);
      }
    }

    // Сохраняем сессию при активации чекбокса "Запомнить меня"
    if (rememberCheckbox && rememberCheckbox.checked) {
      localStorage.setItem(CONFIG.sessionKey, JSON.stringify(user));
    }

    loginSuccess(user);
  };

  $('login-btn')?.addEventListener('click', () => processAuth(false));
  $('register-btn')?.addEventListener('click', () => processAuth(true));
}

// Функция успешного переключения экранов интерфейса
function loginSuccess(user) {
  state.currentUser = user;
  
  // Безотказное монохромное переключение экранов
  $('auth-screen')?.classList.add('hidden');
  $('auth-screen')?.classList.remove('active');
  
  $('app-screen')?.classList.remove('hidden');
  $('app-screen')?.classList.add('active');
  
  updateProfileDOM();
  showToast(`Успешный вход: ${user.name}`);
  
  renderChats();
  renderContacts();
  renderFeed();
}

function updateProfileDOM() {
  if (!state.currentUser) return;
  const nameEl = $('profile-name');
  const userEl = $('profile-username-display');
  const statusEl = $('profile-status');
  const avatarEl = $('profile-avatar');

  if (nameEl) nameEl.innerText = state.currentUser.name;
  if (userEl) userEl.innerText = `@${state.currentUser.username || 'username'}`;
  if (statusEl) statusEl.innerText = state.currentUser.statusText || 'В сети';
  if (avatarEl) avatarEl.src = CONFIG.avatarApi + encodeURIComponent(state.currentUser.name);
}

// ==========================================================================
// 📱 НАВИГАЦИЯ МЕЖДУ ВКЛАДКАМИ
// ==========================================================================
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

      // Скрываем или показываем кнопку глобального поиска в зависимости от экрана
      const searchBtn = $('search-btn');
      if (searchBtn) {
        if (targetTab === 'profile' || targetTab === 'feed') {
          searchBtn.style.display = 'none';
        } else {
          searchBtn.style.display = 'flex';
        }
      }

      if (targetTab === 'profile') renderMyPosts();
    });
  });
}

// ==========================================================================
// 👥 УПРАВЛЕНИЕ КОНТАКТАМИ И ПОИСК С УЧЕТОМ @USERNAME
// ==========================================================================
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

    // Ищем совпадения по Имени, Email или уникальному @username
    const matched = state.users.filter(u => 
      u.id !== state.currentUser?.id && (
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) || 
        (u.username && u.username.toLowerCase().includes(q))
      )
    );

    if (matched.length === 0) {
      results.innerHTML = '<div class="empty-state">Никого не найдено</div>';
      return;
    }

    matched.forEach(user => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
        <div class="info">
          <h4>${user.name}</h4>
          <p>@${user.username || 'id'} • ${user.email}</p>
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

  // Логика лаконичного плюсика в контактах
  $('add-contact-btn')?.addEventListener('click', () => {
    overlay?.classList.remove('hidden');
    input?.focus();
  });
}

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
      <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
      <div class="info">
        <h4>${user.name}</h4>
        <p>${user.statusText || 'Использует Woops'}</p>
      </div>
    `;
    li.addEventListener('click', () => openChat(user));
    container.appendChild(li);
  });
}

function renderChats() {
  const container = $('chat-list');
  if (!container) return;
  container.innerHTML = '';

  const chatPartners = state.users.filter(u => u.id !== state.currentUser?.id);
  
  // Отбираем только тех партнеров, с кем есть хотя бы одно сообщение
  const activePartners = chatPartners.filter(user => {
    return state.messages.some(m => 
      (m.from === state.currentUser?.id && m.to === user.id) || 
      (m.from === user.id && m.to === state.currentUser?.id)
    );
  });

  const emptyEl = $('chats-empty');
  if (activePartners.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  activePartners.forEach(user => {
    const lastMsg = state.messages
      .filter(m => (m.from === state.currentUser?.id && m.to === user.id) || (m.from === user.id && m.to === state.currentUser?.id))
      .pop();

    const text = lastMsg ? lastMsg.text : '';
    const time = lastMsg ? lastMsg.time : '';

    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
      <div class="info">
        <div style="display: flex; justify-content: space-between;">
          <h4>${user.name}</h4>
          <span style="font-size: 10px; color: var(--text-muted);">${time}</span>
        </div>
        <p>${text}</p>
      </div>
    `;
    li.addEventListener('click', () => openChat(user));
    container.appendChild(li);
  });
}

// ==========================================================================
// 💬 ДИАЛОГОВАЯ СРЕДА (РЕДАКТИРОВАНИЕ & УДАЛЕНИЕ СООБЩЕНИЙ)
// ==========================================================================
function openChat(user) {
  state.activeChatUser = user;
  
  const nameEl = $('chat-name');
  const statusEl = $('chat-status');
  const avatarEl = $('chat-avatar');

  if (nameEl) nameEl.innerText = user.name;
  if (statusEl) statusEl.innerText = 'в сети';
  if (avatarEl) avatarEl.src = CONFIG.avatarApi + encodeURIComponent(user.name);

  // Переключение экранов на мобильных устройствах
  $('chat-screen')?.classList.remove('hidden-mobile');
  $('chat-welcome-view')?.classList.add('style-hidden');
  $('chat-active-view')?.classList.remove('style-hidden');
  
  renderMessages();
}

function setupChat() {
  $('back-btn')?.addEventListener('click', () => {
    $('chat-screen')?.classList.add('hidden-mobile');
    state.activeChatUser = null;
    renderChats();
  });

  const sendMsg = () => {
    const input = $('text-input');
    if (!input || !state.activeChatUser || !state.currentUser) return;
    
    const text = input.value.trim();
    if (!text) return;

    if (state.isEditingMode && state.selectedMsgId) {
      // Режим редактирования существующего сообщения
      const msgObj = state.messages.find(m => m.id === state.selectedMsgId);
      if (msgObj) {
        msgObj.text = text;
        msgObj.edited = true;
      }
      state.isEditingMode = false;
      state.selectedMsgId = null;
      showToast('Сообщение изменено');
    } else {
      // Обычный режим отправки нового сообщения
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      state.messages.push({
        id: 'msg_' + Date.now(),
        from: state.currentUser.id,
        to: state.activeChatUser.id,
        text: text,
        time: timeStr,
        edited: false
      });
    }

    input.value = '';
    renderMessages();
  };

  $('send-btn')?.addEventListener('click', sendMsg);
  $('text-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });
  
  setupContextMenuActions();
}

function renderMessages() {
  const area = $('msg-area');
  if (!area || !state.activeChatUser || !state.currentUser) return;
  area.innerHTML = '';

  const activeId = state.activeChatUser.id;
  const conversation = state.messages.filter(
    m => (m.from === state.currentUser.id && m.to === activeId) || (m.from === activeId && m.to === state.currentUser.id)
  );

  conversation.forEach(m => {
    const div = document.createElement('div');
    const isOut = m.from === state.currentUser.id;
    div.className = `msg ${isOut ? 'out' : 'in'}`;
    div.dataset.id = m.id;
    
    const editedHtml = m.edited ? `<span class="edited-label">(изменено)</span>` : '';
    div.innerHTML = `${m.text} ${editedHtml} <span class="time">${m.time}</span>`;
    
    // Подключаем вызов контекстного меню управления для своих исходящих сообщений
    if (isOut) {
      // 1. Для компьютеров (Правый клик мыши)
      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY, m.id);
      });

      // 2. Для мобильных устройств (Долгое нажатие/Зажатие)
      div.addEventListener('touchstart', (e) => {
        state.longTapTimeout = setTimeout(() => {
          const touch = e.touches[0];
          openContextMenu(touch.clientX, touch.clientY, m.id);
        }, 600); // 0.6 секунды зажатия
      });

      div.addEventListener('touchend', () => clearTimeout(state.longTapTimeout));
      div.addEventListener('touchmove', () => clearTimeout(state.longTapTimeout));
    }

    area.appendChild(div);
  });

  area.scrollTop = area.scrollHeight;
}

// ==========================================================================
// 🛠 *ЛОГИКА РАБОТЫ КОНТЕКСТНОГО МЕНЮ СООБЩЕНИЙ*
// ==========================================================================
function openContextMenu(x, y, msgId) {
  const menu = $('msg-context-menu');
  if (!menu) return;
  
  state.selectedMsgId = msgId;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove('style-hidden');
}

function setupContextMenuActions() {
  // Действие: Изменение сообщения
  $('ctx-edit-btn')?.addEventListener('click', () => {
    if (!state.selectedMsgId) return;
    const msgObj = state.messages.find(m => m.id === state.selectedMsgId);
    if (msgObj) {
      const input = $('text-input');
      if (input) {
        input.value = msgObj.text;
        input.focus();
        state.isEditingMode = true;
      }
    }
    $('msg-context-menu')?.classList.add('style-hidden');
  });

  // Действие: Полное удаление сообщения
  $('ctx-delete-btn')?.addEventListener('click', () => {
    if (!state.selectedMsgId) return;
    state.messages = state.messages.filter(m => m.id !== state.selectedMsgId);
    state.selectedMsgId = null;
    state.isEditingMode = false;
    
    const input = $('text-input');
    if (input) input.value = '';
    
    renderMessages();
    showToast('Сообщение полностью удалено');
    $('msg-context-menu')?.classList.add('style-hidden');
  });
}

function setupContextMenuClose() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.msg') && !e.target.closest('#msg-context-menu')) {
      $('msg-context-menu')?.classList.add('style-hidden');
    }
  });
}

// ==========================================================================
// 📝 ЛЕНТА ПУБЛИКАЦИЙ (FEED)
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
      author: state.currentUser ? state.currentUser.name : 'Пользователь',
      authorId: state.currentUser ? state.currentUser.id : 'anon',
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

// ==========================================================================
// 🎛️ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ И НАСТРОЙКА НИКНЕЙМА
// ==========================================================================
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

  $('save-profile-btn')?.addEventListener('click', () => {
    if (!state.currentUser) return;
    const dispNameVal = $('edit-displayName')?.value.trim();
    const uNameVal = $('edit-username')?.value.replace(/[^a-zA-Z0-9__]/g, '').trim(); 
    const sTextVal = $('edit-statusText')?.value.trim();

    if (!dispNameVal || !uNameVal) {
      showToast('Имя и никнейм обязательны');
      return;
    }

    state.currentUser.name = dispNameVal;
    state.currentUser.username = uNameVal.toLowerCase();
    state.currentUser.statusText = sTextVal || '';

    // Синхронизируем обновленные данные во всех кэшированных сессиях
    const savedSession = localStorage.getItem(CONFIG.sessionKey);
    if (savedSession) {
      localStorage.setItem(CONFIG.sessionKey, JSON.stringify(state.currentUser));
    }

    updateProfileDOM();
    $('modal-edit-profile')?.close();
    showToast('Профиль сохранен');
  });

  $('share-profile-btn')?.addEventListener('click', () => {
    if (!state.currentUser) return;
    const shareText = `Свяжись со мной в Woops! Мой ник: @${state.currentUser.username}`;
    if (navigator.share) {
      navigator.share({ title: 'Профиль Woops', text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      showToast('Инвайт-текст скопирован');
    }
  });

  $('delete-profile-btn')?.addEventListener('click', () => {
    localStorage.removeItem(CONFIG.sessionKey);
    state.currentUser = null;
    
    // Переключение обратно на вход
    $('app-screen')?.classList.add('hidden');
    $('app-screen')?.classList.remove('active');
    
    $('auth-screen')?.classList.remove('hidden');
    $('auth-screen')?.classList.add('active');
    
    showToast('Сессия завершена');
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
    post.author = state.currentUser.name; // На случай смены имени
    const card = createPostCard(post);
    container.appendChild(card);
  });
}
