document.addEventListener('DOMContentLoaded', () => {
  const authScreen = document.getElementById('auth-screen');
  const mainScreen = document.getElementById('main-screen');
  const chatScreen = document.getElementById('chat-screen');

  // Переключение вкладок
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      document.getElementById('header-title').textContent = btn.textContent.replace(/[^\wа-яА-ЯёЁ]/g, '').trim();
    });
  });

  // Авторизация (заглушка)
  document.getElementById('auth-btn').addEventListener('click', () => {
    const phone = document.getElementById('phone-input').value;
    const email = document.getElementById('email-input').value;
    if (!phone && !email) return alert('Введите телефон или email');
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    localStorage.setItem('woops_user', JSON.stringify({ phone, email }));
  });

  // Открытие чата
  const chatList = document.getElementById('chat-list');
  const mockChats = [
    { id: 1, name: 'Алексей', last: 'Привет!', time: '12:30' },
    { id: 2, name: 'Мария', last: '📎 Документ.pdf', time: 'Вчера' }
  ];
  mockChats.forEach(c => {
    const li = document.createElement('li');
    li.className = 'chat-item';
    li.innerHTML = `<div class="avatar">👤</div><div class="chat-info"><h4>${c.name}</h4><p>${c.last} • ${c.time}</p></div>`;
    li.onclick = () => openChat(c);
    chatList.appendChild(li);
  });

  function openChat(contact) {
    mainScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    document.getElementById('chat-name').textContent = contact.name;
    document.getElementById('messages-container').innerHTML = '';
  }

  document.getElementById('btn-back').onclick = () => {
    chatScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
  };

  // Отправка сообщений
  const msgInput = document.getElementById('msg-input');
  const msgContainer = document.getElementById('messages-container');
  document.getElementById('btn-send').onclick = () => sendMsg('text');
  msgInput.addEventListener('keypress', e => e.key === 'Enter' && sendMsg('text'));

  function sendMsg(type, content = null) {
    const text = content || msgInput.value.trim();
    if (!text) return;
    const div = document.createElement('div');
    div.className = 'msg out';
    div.textContent = text;
    msgContainer.appendChild(div);
    msgInput.value = '';
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  // Вложения
  document.getElementById('btn-attach').onclick = () => document.getElementById('media-input').click();
  document.getElementById('media-input').onchange = e => {
    const file = e.target.files[0];
    if (file) sendMsg('media', `📎 ${file.name}`);
  };

  // Голосовые (базовый MediaRecorder)
  let mediaRecorder, audioChunks = [];
  document.getElementById('btn-voice').onmousedown = startRecord;
  document.getElementById('btn-voice').onmouseup = stopRecord;

  async function startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/ogg' });
        const url = URL.createObjectURL(blob);
        const div = document.createElement('div');
        div.className = 'msg out';
        div.innerHTML = `<audio controls src="${url}"></audio>`;
        msgContainer.appendChild(div);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
    } catch (err) { alert('Нет доступа к микрофону'); }
  }
  function stopRecord() { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); }

  // Профиль
  document.getElementById('btn-edit-profile').onclick = () => {
    const name = prompt('Ваше имя:', localStorage.getItem('woops_name') || 'Пользователь');
    if (name) {
      localStorage.setItem('woops_name', name);
      document.getElementById('profile-name').textContent = name;
    }
    document.getElementById('avatar-input').click();
  };
  document.getElementById('avatar-input').onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => document.getElementById('profile-avatar').style.backgroundImage = `url(${ev.target.result})`;
      reader.readAsDataURL(file);
    }
  };

  document.getElementById('btn-logout').onclick = () => {
    localStorage.clear();
    location.reload();
  };
});
