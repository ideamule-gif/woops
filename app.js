document.addEventListener('DOMContentLoaded', () => {
  // Элементы интерфейса
  const authScreen = document.getElementById('auth-screen');
  const mainScreen = document.getElementById('main-screen');
  const chatScreen = document.getElementById('chat-screen');
  const loginBtn = document.getElementById('login-btn');
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabs = document.querySelectorAll('.tab');
  const tabTitle = document.getElementById('tab-title');
  const chatList = document.getElementById('chat-list');
  const backBtn = document.getElementById('back-btn');
  const msgArea = document.getElementById('msg-area');
  const textInput = document.getElementById('text-input');
  const sendBtn = document.getElementById('send-btn');
  const attachBtn = document.getElementById('attach-btn');
  const fileInput = document.getElementById('file-input');
  const voiceBtn = document.getElementById('voice-btn');
  const editProfileBtn = document.getElementById('edit-profile');
  const logoutBtn = document.getElementById('logout-btn');

  let currentUser = JSON.parse(localStorage.getItem('woops_user'));
  let currentChat = null;
  let mediaRecorder = null;
  let audioChunks = [];

  // 1️⃣ Инициализация при загрузке
  if (currentUser) {
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    loadProfile();
    loadChats();
  }

  loginBtn.addEventListener('click', () => {
    const phone = document.getElementById('auth-phone').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    if (!phone && !email) return alert('Введите телефон или email');

    currentUser = { phone, email, name: phone || email, avatar: null };
    localStorage.setItem('woops_user', JSON.stringify(currentUser));
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    loadProfile();
    loadChats();
  });

  // 2️⃣ Переключение вкладок
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      tabTitle.textContent = btn.textContent.replace(/[^\wа-яА-ЯёЁ\s]/g, '').trim();
    });
  });

  // 3️⃣ Профиль
  function loadProfile() {
    document.getElementById('my-name').textContent = currentUser.name || 'Пользователь';
    if (currentUser.avatar) {
      const av = document.getElementById('my-avatar');
      av.style.backgroundImage = `url(${currentUser.avatar})`;
      av.textContent = '';
    }
  }

  editProfileBtn.addEventListener('click', () => {
    const newName = prompt('Ваше имя:', currentUser.name || '');
    if (newName) {
      currentUser.name = newName;
      localStorage.setItem('woops_user', JSON.stringify(currentUser));
      loadProfile();
    }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        currentUser.avatar = ev.target.result;
        localStorage.setItem('woops_user', JSON.stringify(currentUser));
        loadProfile();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('woops_user');
    location.reload();
  });

  // 4️⃣ Список чатов (демо)
  function loadChats() {
    const mock = [
      { id: 1, name: 'Алексей', last: 'Привет, как дела?', time: '12:30' },
      { id: 2, name: 'Мария', last: '📎 Договор.pdf', time: 'Вчера' },
      { id: 3, name: 'Поддержка', last: 'Заявка обработана', time: 'Пн' }
    ];
    chatList.innerHTML = '';
    mock.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="avatar">${c.name[0]}</div><div><h4>${c.name}</h4><p>${c.last} • ${c.time}</p></div>`;
      li.onclick = () => openChat(c);
      chatList.appendChild(li);
    });
  }

  // 5️⃣ Экран диалога
  function openChat(contact) {
    currentChat = contact;
    mainScreen.classList.remove('active');
    chatScreen.classList.add('active');
    document.getElementById('chat-name').textContent = contact.name;
    document.getElementById('chat-avatar').textContent = contact.name[0];
    msgArea.innerHTML = '';
    const history = JSON.parse(localStorage.getItem(`woops_chat_${contact.id}`) || '[]');
    history.forEach(m => appendMessage(m.text, m.type, false));
  }

  backBtn.addEventListener('click', () => {
    chatScreen.classList.remove('active');
    mainScreen.classList.add('active');
    currentChat = null;
  });

  // 6️⃣ Отправка сообщений
  function appendMessage(text, type = 'text', isMine = true) {
    const div = document.createElement('div');
    div.className = `msg ${isMine ? 'out' : 'in'}`;
    if (type === 'image') div.innerHTML = `<img src="${text}" style="max-width:100%;border-radius:8px;">`;
    else if (type === 'audio') div.innerHTML = `<audio controls src="${text}"></audio>`;
    else if (type === 'file') div.innerHTML = `📎 <a href="${text}" target="_blank" style="color:#fff;text-decoration:underline;">Файл</a>`;
    else div.textContent = text;

    msgArea.appendChild(div);
    msgArea.scrollTop = msgArea.scrollHeight;

    if (currentChat) {
      const key = `woops_chat_${currentChat.id}`;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      history.push({ text, type, isMine, time: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(history.slice(-50))); // храним последние 50
    }
  }

  function sendText() {
    const val = textInput.value.trim();
    if (!val) return;
    appendMessage(val, 'text', true);
    textInput.value = '';
  }
  sendBtn.addEventListener('click', sendText);
  textInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendText(); });

  // 7️⃣ Вложения
  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      appendMessage(ev.target.result, type, true);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  // 8️⃣ Голосовые (работает на ПК и мобильных)
  voiceBtn.addEventListener('mousedown', startRecord);
  voiceBtn.addEventListener('mouseup', stopRecord);
  voiceBtn.addEventListener('touchstart', e => { e.preventDefault(); startRecord(); });
  voiceBtn.addEventListener('touchend', e => { e.preventDefault(); stopRecord(); });

  async function startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        appendMessage(URL.createObjectURL(blob), 'audio', true);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      voiceBtn.style.color = '#ef4444';
    } catch (err) { alert('Разрешите доступ к микрофону в браузере'); }
  }
  function stopRecord() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      voiceBtn.style.color = '';
    }
  }
});
