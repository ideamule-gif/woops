// ==========================================================================
// 🔌 КОНФИГУРАЦИЯ И СТРУКТУРА ПРИЛОЖЕНИЯ
// ==========================================================================
const CONFIG = {
  version: '3.0.0',
  themeKey: 'woops_theme',
  avatarApi: 'https://ui-avatars.com/api/?background=6366f1&color=fff&name='
};

// Хранилище состояния приложения (State)
const state = {
  currentUser: null, // Данные авторизованного юзера
  activeTab: 'chats',
  activeChatUser: null,
  // Имитация базы данных (замени на реальный Firebase/Fetch при интеграции)
  users: [
    { id: '1', name: 'Алексей Иванов', email: 'alex@woops.com', statusText: 'Пишу код на коленке 💻' },
    { id: '2', name: 'Мария Смирнова', email: 'maria@test.ru', statusText: 'Дизайн — это жизнь ✨' },
    { id: '3', name: 'Техподдержка Woops', email: 'support@woops.com', statusText: 'Всегда на связи 🚀' }
  ],
  messages: [
    { from: '3', to: 'me', text: 'Добро пожаловать в Woops! Локальный демо-режим запущен.', time: '12:00' }
  ],
  posts: [
    { id: 'p1', author: 'Алексей Иванов', authorId: '1', text: 'Ребята, зацените новый мобильный интерфейс! Наконец-то ничего не вылезает за края 😍', likes: 12, liked: false, comments: [] }
  ]
};

// ==========================================================================
// 🛠️ ИНИЦИАЛИЗАЦИЯ И ПОИСК DOM-ЭЛЕМЕНТОВ
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupNavigation();
  setupAuth();
  setupChat();
  setupFeed();
  setupProfile();
  setupGlobalSearch();
  initServiceWorker();
});

// Утилита для быстрого получения элементов
const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

// Показ уведомлений (Toast)
function showToast(text) {
  const toast = $('toast');
  if (!toast) return;
  toast.innerText = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==========================================================================
// 🌗 ТЕМНАЯ ТЕМА
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem(CONFIG.themeKey);
  const useDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (useDark) {
    document.documentElement.classList.add('dark');
    if ($('theme-switch')) $('theme-switch').checked = true;
  }

  $('theme-switch')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(CONFIG.themeKey, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(CONFIG.themeKey, 'light');
    }
  });
}

// ==========================================================================
// 🔐 АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ (ИМИТАЦИЯ)
// ==========================================================================
function setupAuth() {
  const emailInput = $('auth-email');
  const passwordInput = $('auth-password');
  const errorDiv = $('auth-error');

  $('login-btn')?.addEventListener('click', () => {
    const email = emailInput.value.trim();
    if (!email || !passwordInput.value) {
      errorDiv.innerText = 'Заполните все поля';
      return;
    }
    
    // Демо-вход: берем существующего юзера или создаем профиль «Я»
    let user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = { id: 'me', name: email.split('@')[0], email: email, statusText: 'Использую Woops!' };
    }
    
    loginSuccess(user);
  });

  $('register-btn')?.addEventListener('click', () => {
    const email = emailInput.value.trim();
    if (!email || passwordInput.value.length < 4) {
      errorDiv.innerText = 'Email и пароль (мин. 4 символа) обязательны';
      return;
    }
    const user = { id: 'me', name: email.split('@')[0], email: email, statusText: 'Новичок в чате 🎉' };
    loginSuccess(user);
  });
}

function loginSuccess(user) {
  state.currentUser = user;
  $('auth-screen').className = 'screen hidden';
  $('app-screen').className = 'screen active';
  
  // Инициализируем данные профиля
  $('profile-name').innerText = user.name;
  $('profile-status').innerText = user.statusText;
  $('profile-avatar').src = CONFIG.avatarApi + encodeURIComponent(user.name);
  
  showToast(`С возвращением, ${user.name}!`);
  renderContacts();
  renderChats();
  renderFeed();
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

      // Меняем активную кнопку в меню
      $$('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Переключаем контентные вкладки
      $$('.tab-content .tab').forEach(tab => {
        tab.classList.remove('active');
        tab.classList.add('hidden');
      });
      
      const activeTabEl = $(`tab-${targetTab}`);
      activeTabEl.classList.remove('hidden');
      activeTabEl.classList.add('active');

      // Меняем заголовок в шапке
      $('header-title').innerText = titles[targetTab] || 'Woops';
      state.activeTab = targetTab;

      // Специфические действия при переходе
      if (targetTab === 'profile') renderMyPosts();
    });
  });
}

// ==========================================================================
// 👥 КОНТАКТЫ И ЧАТЫ
// ==========================================================================
function renderContacts() {
  const container = $('contacts-list');
  if (!container) return;
  container.innerHTML = '';

  const filtered = state.users.filter(u => u.id !== 'me');
  
  if (filtered.length === 0) {
    $('contacts-empty').style.display = 'block';
    return;
  }
  $('contacts-empty').style.display = 'none';

  filtered.forEach(user => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
      <div class="info">
        <h4>${user.name}</h4>
        <p>${user.statusText}</p>
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

  // Находим уникальных собеседников
  const chatPartners = state.users.filter(u => u.id !== 'me');
  
  if (chatPartners.length === 0) {
    $('chats-empty').style.display = 'block';
    return;
  }
  $('chats-empty').style.display = 'none';

  chatPartners.forEach(user => {
    // Ищем последнее сообщение
    const lastMsg = state.messages
      .filter(m => (m.from === 'me' && m.to === user.id) || (m.from === user.id && m.to === 'me'))
      .pop();

    const text = lastMsg ? lastMsg.text : 'Нет сообщений';
    const time = lastMsg ? lastMsg.time : '';

    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
      <div class="info">
        <div style="display: flex; justify-content: space-between;">
          <h4>${user.name}</h4>
          <span style="font-size: 11px; color: var(--text-muted);">${time}</span>
        </div>
        <p>${text}</p>
      </div>
    `;
    li.addEventListener('click', () => openChat(user));
    container.appendChild(li);
  });
}

// ==========================================================================
// 💬 ОКНО ДИАЛОГА (ЧАТ)
// ==========================================================================
function openChat(user) {
  state.activeChatUser = user;
  $('chat-name').innerText = user.name;
  $('chat-status').innerText = 'в сети';
  $('chat-avatar').src = CONFIG.avatarApi + encodeURIComponent(user.name);

  $('chat-screen').className = 'screen active';
  renderMessages();
}

function setupChat() {
  $('back-btn')?.addEventListener('click', () => {
    $('chat-screen').className = 'screen hidden';
    state.activeChatUser = null;
    renderChats(); // Обновляем превью чатов на главном экране
  });

  const sendMsg = () => {
    const input = $('text-input');
    const text = input.value.trim();
    if (!text || !state.activeChatUser) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    state.messages.push({
      from: 'me',
      to: state.activeChatUser.id,
      text: text,
      time: timeStr
    });

    input.value = '';
    renderMessages();

    // Имитация автоответа от собеседника через 1.5 секунды
    setTimeout(() => {
      if (state.activeChatUser) {
        state.messages.push({
          from: state.activeChatUser.id,
          to: 'me',
          text: `Вы написали: "${text}". Это автоматический ответ локальной демо-версии.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        renderMessages();
      }
    }, 1500);
  };

  $('send-btn')?.addEventListener('click', sendMsg);
  $('text-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMsg(); });
}

function renderMessages() {
  const area = $('msg-area');
  if (!area || !state.activeChatUser) return;
  area.innerHTML = '';

  const activeId = state.activeChatUser.id;
  const conversation = state.messages.filter(
    m => (m.from === 'me' && m.to === activeId) || (m.from === activeId && m.to === 'me')
  );

  conversation.forEach(m => {
    const div = document.createElement('div');
    const isOut = m.from === 'me';
    div.className = `msg ${isOut ? 'out' : 'in'}`;
    div.innerHTML = `${m.text}<span class="time">${m.time}</span>`;
    area.appendChild(div);
  });

  // Автоматический скролл вниз чата
  area.scrollTop = area.scrollHeight;
}

// ==========================================================================
// 📝 ЛЕНТА ПУБЛИКАЦИЙ (FEED)
// ==========================================================================
function setupFeed() {
  $('new-post-btn')?.addEventListener('click', () => $('modal-new-post').showModal());

  $('publish-post-btn')?.addEventListener('click', () => {
    const text = $('post-text').value.trim();
    if (!text) return;

    state.posts.unshift({
      id: 'p_' + Date.now(),
      author: state.currentUser ? state.currentUser.name : 'Гость',
      authorId: 'me',
      text: text,
      likes: 0,
      liked: false,
      comments: []
    });

    $('post-text').value = '';
    $('modal-new-post').close();
    showToast('Пост опубликован!');
    renderFeed();
  });
}

function renderFeed() {
  const container = $('feed-list');
  if (!container) return;
  container.innerHTML = '';

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
      <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(post.author)}" style="width:34px; height:34px;" alt="">
      <div>
        <h4>${post.author}</h4>
        <p>Только что</p>
      </div>
    </div>
    <div class="feed-text">${post.text}</div>
    <div class="feed-actions">
      <button class="like-btn ${post.liked ? 'active' : ''}">❤️ ${post.likes}</button>
      <button class="comment-trigger-btn">💬 ${post.comments.length}</button>
    </div>
    <div class="comments-section">
      <div class="comments-list"></div>
      <div class="add-comment">
        <input type="text" placeholder="Написать комментарий...">
        <button class="btn primary send-comment-btn" style="padding:6px 12px; font-size:12px;">➔</button>
      </div>
    </div>
  `;

  // Логика лайков
  const likeBtn = div.querySelector('.like-btn');
  likeBtn.addEventListener('click', () => {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
    likeBtn.classList.toggle('active');
    likeBtn.innerText = `❤️ ${post.likes}`;
  });

  // Открытие секции комментариев
  const trigger = div.querySelector('.comment-trigger-btn');
  const commentSection = div.querySelector('.comments-section');
  trigger.addEventListener('click', () => commentSection.classList.toggle('open'));

  // Добавление комментария
  const sendCommentBtn = div.querySelector('.send-comment-btn');
  const commentInput = div.querySelector('.add-comment input');
  const commentsList = div.querySelector('.comments-list');

  const addCommentHandler = () => {
    const cText = commentInput.value.trim();
    if (!cText) return;
    post.comments.push(cText);
    commentInput.value = '';
    
    const cDiv = document.createElement('div');
    cDiv.className = 'comment';
    cDiv.innerText = cText;
    commentsList.appendChild(cDiv);
    trigger.innerText = `💬 ${post.comments.length}`;
  };

  sendCommentBtn.addEventListener('click', addCommentHandler);
  commentInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addCommentHandler(); });

  return div;
}

// ==========================================================================
// 🎛️ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ==========================================================================
function setupProfile() {
  $('edit-profile-btn')?.addEventListener('click', () => {
    $('edit-displayName').value = state.currentUser.name;
    $('edit-statusText').value = state.currentUser.statusText;
    $('modal-edit-profile').showModal();
  });

  $('save-profile-btn')?.addEventListener('click', () => {
    const newName = $('edit-displayName').value.trim();
    const newStatus = $('edit-statusText').value.trim();

    if (newName) {
      state.currentUser.name = newName;
      state.currentUser.statusText = newStatus;

      $('profile-name').innerText = newName;
      $('profile-status').innerText = newStatus;
      $('profile-avatar').src = CONFIG.avatarApi + encodeURIComponent(newName);

      $('modal-edit-profile').close();
      showToast('Профиль успешно обновлен');
      renderMyPosts();
    }
  });

  $('share-profile-btn')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: 'Профиль Woops', text: `Свяжись со мной в Woops! Мой email: ${state.currentUser.email}` });
    } else {
      navigator.clipboard.writeText(state.currentUser.email);
      showToast('Email скопирован в буфер обмена');
    }
  });

  $('delete-profile-btn')?.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите выйти из аккаунта? Все локальные сессии будут сброшены.')) {
      state.currentUser = null;
      $('app-screen').className = 'screen hidden';
      $('auth-screen').className = 'screen active';
    }
  });
}

function renderMyPosts() {
  const container = $('my-posts-feed');
  if (!container) return;
  container.innerHTML = '';

  const myPosts = state.posts.filter(p => p.authorId === 'me');
  if (myPosts.length === 0) {
    container.innerHTML = '<div class="empty-state">У вас еще нет публикаций</div>';
    return;
  }

  myPosts.forEach(post => {
    // Обновляем имя автора на актуальное (если юзер сменил имя)
    post.author = state.currentUser.name;
    const card = createPostCard(post);
    container.appendChild(card);
  });
}

// ==========================================================================
// 🔍 СИСТЕМА ГЛОБАЛЬНОГО ПОИСКА
// ==========================================================================
function setupGlobalSearch() {
  const overlay = $('search-overlay');
  const input = $('global-search');
  const results = $('search-results');

  $('search-btn')?.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    input.focus();
  });

  $('close-search')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    input.value = '';
    results.innerHTML = '';
  });

  input?.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    results.innerHTML = '';
    if (!q) return;

    const matched = state.users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    matched.forEach(user => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <img class="avatar" src="${CONFIG.avatarApi + encodeURIComponent(user.name)}" alt="">
        <div class="info">
          <h4>${user.name}</h4>
          <p>${user.email}</p>
        </div>
      `;
      li.addEventListener('click', () => {
        overlay.classList.add('hidden');
        input.value = '';
        results.innerHTML = '';
        openChat(user);
      });
      results.appendChild(li);
    });
  });
}

// ==========================================================================
// ⚡ OFFLINE SERVICE WORKER REGISTRATION
// ==========================================================================
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Woops ServiceWorker успешно развернут'))
        .catch(err => console.error('Ошибка ServiceWorker:', err));
    });
  }
}
