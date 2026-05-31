                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  background-color: white; /* Ensure the iframe has a white background */
                }

                
              </style>
                        </head>
                        <body>
                            

              <script>
                              import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs, limit, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔧 Firebase Config
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

// 📦 DOM Helpers
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// 🌍 State
let currentUser = null;
let userProfile = {};
let currentChat = null;
let listeners = {};
let feedPosts = [];

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    $('#auth-screen').classList.remove('active');
    $('#auth-screen').classList.add('hidden');
    $('#app-screen').classList.remove('hidden');
    $('#app-screen').classList.add('active');

    // Создаем профиль если не существует
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: user.email.split('@')[0],
        email: user.email,
        status: 'online',
        statusText: 'Привет, я в Woops!',
        createdAt: serverTimestamp(),
        theme: 'light'
      });
    }

    loadUserProfile(user.uid);
    setupTabs();
    initTheme();
  } else {
    currentUser = null;
    $('#auth-screen').classList.remove('hidden');
    $('#auth-screen').classList.add('active');
    $('#app-screen').classList.remove('active');
    $('#app-screen').classList.add('hidden');
    cleanupListeners();
  }
});

$('#login-btn').onclick = () => handleAuth('login');
$('#register-btn').onclick = () => handleAuth('register');

async function handleAuth(type) {
  const email = $('#auth-email').value.trim();
  const pass = $('#auth-password').value;
  $('#auth-error').textContent = '';
  try {
    if (type === 'login') {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: email.split('@')[0],
        email: cred.user.email,
        status: 'online',
        statusText: 'Новый пользователь',
        createdAt: serverTimestamp(),
        theme: 'light'
      });
    }
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
}

// ============================================
// 👤 ПРОФИЛЬ & ТЕМА
// ============================================
async function loadUserProfile(uid) {
  listeners.profile = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      userProfile = { id: uid, ...snap.data() };
      $('#profile-name').textContent = userProfile.displayName || 'Пользователь';
      $('#profile-status').textContent = userProfile.statusText || '';
      $('#profile-avatar').src = userProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || 'U')}&background=6366f1&color=fff`;
      $('#edit-displayName').value = userProfile.displayName || '';
      $('#edit-statusText').value = userProfile.statusText || '';
      if (userProfile.theme === 'dark') {
        document.documentElement.classList.add('dark');
        $('#theme-switch').checked = true;
      }
    }
  });
}

$('#theme-switch').onchange = async (e) => {
  const isDark = e.target.checked;
  document.documentElement.classList.toggle('dark', isDark);
  if (currentUser) {
    await updateDoc(doc(db, 'users', currentUser.uid), { theme: isDark ? 'dark' : 'light' });
  }
};

$('#edit-profile-btn').onclick = () => $('#modal-edit-profile').showModal();
$('#save-profile-btn').onclick = async () => {
  const name = $('#edit-displayName').value.trim() || userProfile.displayName;
  const text = $('#edit-statusText').value.trim();
  await updateDoc(doc(db, 'users', currentUser.uid), { displayName: name, statusText: text });
  closeModal('modal-edit-profile');
  showToast('Профиль обновлён');
};

$('#share-profile-btn').onclick = () => {
  navigator.clipboard.writeText(currentUser.uid);
  showToast('Ваш ID скопирован');
};

$('#delete-profile-btn').onclick = async () => {
  if (confirm('Вы уверены? Все данные и чаты будут удалены.')) {
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(auth.currentUser);
    } catch (err) { showToast('Ошибка удаления: ' + err.message, 'error'); }
  }
};

// ============================================
// 🧭 НАВИГАЦИЯ
// ============================================
function setupTabs() {
  $$('.nav-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });
}

function switchTab(tabId) {
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  $$(`.nav-btn[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));
  $$('.tab').forEach(t => t.classList.remove('active'));
  $(`#tab-${tabId}`).classList.add('active');
  $('#header-title').textContent = $$(`.nav-btn[data-tab="${tabId}"] span`)[0].textContent;
  $('#search-btn').style.display = tabId === 'profile' ? 'none' : 'flex';

  if (tabId === 'chats') loadChats();
  if (tabId === 'contacts') loadContacts();
  if (tabId === 'feed') loadFeed();
}

// ============================================
// 💬 ЧАТЫ
// ============================================
function loadChats() {
  if (listeners.chats) listeners.chats();
  listeners.chats = onSnapshot(
    query(collection(db, 'chatRooms'), where('participants', 'array-contains', currentUser.uid)),
    (snap) => {
      const list = $('#chat-list');
      list.innerHTML = '';
      if (snap.empty) {
        $('#chats-empty').style.display = 'block';
        return;
      }
      $('#chats-empty').style.display = 'none';
      
      const rooms = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.lastTime?.toMillis?.() || 0) - (a.lastTime?.toMillis?.() || 0));

      rooms.forEach(room => {
        const li = document.createElement('li');
        li.className = 'list-item';
        const isLast = room.lastSenderId === currentUser.uid;
        li.innerHTML = `
          <img class="avatar" src="${room.contactAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.contactName)}`}" alt="">
          <div class="info">
            <h4>${escapeHtml(room.contactName)}</h4>
            <p>${isLast ? 'Вы: ' : ''}${escapeHtml(room.lastMessage || 'Нет сообщений')}</p>
          </div>
        `;
        li.onclick = () => openChat(room.id, room.contactName, room.contactAvatar, room.contactId);
        list.appendChild(li);
      });
    }
  );
}

async function openChat(roomId, name, avatar, contactId) {
  currentChat = { id: contactId, roomId, name, avatar };
  $('#app-screen').classList.add('hidden');
  $('#chat-screen').classList.remove('hidden');
  $('#chat-name').textContent = name;
  $('#chat-avatar').src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  $('#msg-area').innerHTML = '<div class="empty-state">Загрузка...</div>';

  if (listeners.chatMsg) listeners.chatMsg();
  listeners.chatMsg = onSnapshot(
    query(collection(db, 'messages'), where('room', '==', roomId)),
    (snap) => {
      const area = $('#msg-area');
      area.innerHTML = '';
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        
      if (msgs.length === 0) {
        area.innerHTML = '<div class="empty-state">Начните диалог ✨</div>';
        return;
      }
      msgs.forEach(msg => {
        const div = document.createElement('div');
        div.className = `msg ${msg.senderId === currentUser.uid ? 'out' : 'in'}`;
        div.innerHTML = `${escapeHtml(msg.text)}<span class="time">${formatTime(msg.createdAt)}</span>`;
        area.appendChild(div);
      });
      area.scrollTop = area.scrollHeight;
    }
  );
}

$('#back-btn').onclick = () => {
  $('#chat-screen').classList.add('hidden');
  $('#app-screen').classList.remove('hidden');
  currentChat = null;
};

$('#send-btn').onclick = async () => {
  const text = $('#text-input').value.trim();
  if (!text || !currentChat) return;
  $('#text-input').value = '';
  const { roomId } = currentChat;

  await addDoc(collection(db, 'messages'), {
    room: roomId,
    senderId: currentUser.uid,
    text,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, 'chatRooms', roomId), {
    participants: [currentUser.uid, currentChat.id],
    contactId: currentChat.id,
    contactName: currentChat.name,
    contactAvatar: currentChat.avatar,
    lastMessage: text,
    lastSenderId: currentUser.uid,
    lastTime: serverTimestamp()
  }, { merge: true });
};

$('#text-input').onkeypress = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#send-btn').click(); } };

// ============================================
// 👥 КОНТАКТЫ
// ============================================
function loadContacts() {
  if (listeners.contacts) listeners.contacts();
  listeners.contacts = onSnapshot(
    query(collection(db, 'contacts'), where('ownerId', '==', currentUser.uid)),
    (snap) => {
      const list = $('#contacts-list');
      list.innerHTML = '';
      if (snap.empty) {
        $('#contacts-empty').style.display = 'block';
        return;
      }
      $('#contacts-empty').style.display = 'none';
      snap.forEach(d => {
        const c = { id: d.id, ...d.data() };
        const li = document.createElement('li');
        li.className = 'list-item';
        li.dataset.name = (c.displayName || '').toLowerCase();
        li.innerHTML = `
          <img class="avatar" src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.displayName)}`}" alt="">
          <div class="info">
            <h4>${escapeHtml(c.displayName)}</h4>
            <p>Нажмите для чата</p>
          </div>
          <button class="btn danger remove-contact" data-id="${c.id}">✕</button>
        `;
        li.onclick = (e) => {
          if (!e.target.classList.contains('remove-contact')) {
            openChat([currentUser.uid, c.contactId].sort().join('_'), c.displayName, c.avatar, c.contactId);
          }
        };
        list.appendChild(li);
      });
      $$('.remove-contact').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          await deleteDoc(doc(db, 'contacts', btn.dataset.id));
          showToast('Контакт удалён');
        };
      });
    }
  );
}

$('#add-contact-btn').onclick = () => $('#modal-add-contact').showModal();
$('#search-contact-input').oninput = async (e) => {
  const q = e.target.value.trim();
  const res = $('#contact-search-results');
  res.innerHTML = '';
  if (q.length < 2) return;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('displayName', '>=', q), where('displayName', '<=', q + '\uf8ff'), limit(5)));
    snap.forEach(d => {
      const u = d.data();
      if (u.id === currentUser.uid) return;
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<div class="info"><h4>${escapeHtml(u.displayName)}</h4><p>${escapeHtml(u.email)}</p></div>`;
      li.onclick = async () => {
        await addDoc(collection(db, 'contacts'), {
          ownerId: currentUser.uid,
          contactId: d.id,
          displayName: u.displayName,
          avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}`,
          addedAt: serverTimestamp()
        });
        showToast('Контакт добавлен');
        closeModal('modal-add-contact');
      };
      res.appendChild(li);
    });
    if (res.children.length === 0) res.innerHTML = '<div class="empty-state">Пользователи не найдены</div>';
  } catch (err) { console.error(err); }
};

$('#contact-search').oninput = (e) => {
  const q = e.target.value.toLowerCase();
  $$('#contacts-list .list-item').forEach(li => {
    li.style.display = li.dataset.name.includes(q) ? 'flex' : 'none';
  });
};

// ============================================
// 📝 ЛЕНТА
// ============================================
function loadFeed() {
  if (listeners.feed) listeners.feed();
  listeners.feed = onSnapshot(
    collection(db, 'posts'),
    (snap) => {
      feedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      renderFeedList(feedPosts, $('#feed-list'));
      renderFeedList(feedPosts.filter(p => p.authorId === currentUser.uid), $('#my-posts-feed'));
    }
  );
}

function renderFeedList(posts, container) {
  container.innerHTML = '';
  if (posts.length === 0) {
    container.innerHTML = '<div class="empty-state">Пока нет публикаций</div>';
    return;
  }
  posts.forEach(post => container.appendChild(createPostCard(post)));
}

function createPostCard(post) {
  const div = document.createElement('div');
  div.className = 'feed-card';
  const isLiked = post.likes?.includes(currentUser.uid);
  div.innerHTML = `
    <div class="feed-author">
      <img class="avatar" src="${post.authorAvatar}" style="width:32px;height:32px;border-radius:50%">
      <div>
        <h4>${escapeHtml(post.authorName || 'Пользователь')}</h4>
        <p class="text-muted">${formatTime(post.createdAt)}</p>
      </div>
    </div>
    <div class="feed-text">${escapeHtml(post.text)}</div>
    <div class="feed-actions">
      <button data-action="like" class="${isLiked ? 'active' : ''}">♥ ${post.likes?.length || 0}</button>
      <button data-action="comment">💬 ${post.comments?.length || 0}</button>
      <button data-action="share">↗</button>
    </div>
    <div class="comments-section">
      ${(post.comments || []).map(c => `<div class="comment"><strong>${escapeHtml(c.name)}</strong>: ${escapeHtml(c.text)}</div>`).join('')}
      <div class="add-comment">
        <input type="text" placeholder="Написать комментарий...">
        <button class="btn primary">→</button>
      </div>
    </div>
  `;

  div.querySelector('[data-action="like"]').onclick = async () => {
    const ref = doc(db, 'posts', post.id);
    if (post.likes?.includes(currentUser.uid)) {
      await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
    }
  };

  div.querySelector('[data-action="comment"]').onclick = () => {
    div.querySelector('.comments-section').classList.toggle('open');
  };

  div.querySelector('.add-comment button').onclick = async () => {
    const inp = div.querySelector('.add-comment input');
    const txt = inp.value.trim();
    if (!txt) return;
    await updateDoc(doc(db, 'posts', post.id), {
      comments: arrayUnion({
        name: userProfile.displayName || 'Вы',
        authorId: currentUser.uid,
        text: txt,
        createdAt: new Date().toISOString()
      })
    });
    inp.value = '';
  };

  div.querySelector('[data-action="share"]').onclick = () => {
    if (navigator.share) {
      navigator.share({ title: 'Woops Post', text: post.text });
    } else {
      navigator.clipboard.writeText(post.text);
      showToast('Текст скопирован');
    }
  };

  return div;
}

$('#new-post-btn').onclick = () => $('#modal-new-post').showModal();
$('#publish-post-btn').onclick = async () => {
  const text = $('#post-text').value.trim();
  if (!text) return;
  await addDoc(collection(db, 'posts'), {
    authorId: currentUser.uid,
    authorName: userProfile.displayName || 'Пользователь',
    authorAvatar: userProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || 'U')}&background=6366f1&color=fff`,
    text,
    createdAt: serverTimestamp(),
    likes: [],
    comments: []
  });
  $('#post-text').value = '';
  closeModal('modal-new-post');
  showToast('Пост опубликован');
};

// ============================================
// 🔍 ГЛОБАЛЬНЫЙ ПОИСК
// ============================================
$('#search-btn').onclick = () => { $('#search-overlay').classList.remove('hidden'); $('#global-search').focus(); };
$('#close-search').onclick = () => $('#search-overlay').classList.add('hidden');
$('#global-search').oninput = async (e) => {
  const q = e.target.value.trim();
  const res = $('#search-results');
  res.innerHTML = '';
  if (q.length < 2) return;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('displayName', '>=', q), where('displayName', '<=', q + '\uf8ff'), limit(8)));
    snap.forEach(d => {
      const u = d.data();
      if (u.id === currentUser.uid) return;
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `<img class="avatar" src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}`}" style="width:40px;height:40px"><div class="info"><h4>${escapeHtml(u.displayName)}</h4><p>${escapeHtml(u.email)}</p></div>`;
      li.onclick = () => {
        openChat([currentUser.uid, d.id].sort().join('_'), u.displayName, u.avatar, d.id);
        $('#search-overlay').classList.add('hidden');
      };
      res.appendChild(li);
    });
  } catch (err) { console.error(err); }
};

// ============================================
// 🛠️ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function closeModal(id) { $(`#${id}`).close(); }
function showToast(msg, type = 'success') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 2500);
}
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function cleanupListeners() {
  Object.values(listeners).forEach(l => l && l());
}
function initTheme() { /* тема подгружается в loadUserProfile */ }

console.log('%c Woops Messenger v2 готов', 'color: #6366f1; font-weight: bold');


              </script>
                        </body>
                        </html>
