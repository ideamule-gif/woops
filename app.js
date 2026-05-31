import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, updateProfile as updateAuthProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, limit, getDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔧 Config
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

// 📦 DOM
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// State
let currentUser = null;
let currentChat = null;
let listeners = { chat: null, users: null, contacts: null, feed: null, profile: null };
let feedData = [];

// ================= AUTH =================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    $('#auth-screen').classList.remove('active');
    $('#auth-screen').classList.add('hidden');
    $('#app-screen').classList.remove('hidden');
    $('#app-screen').classList.add('active');
    loadUserProfile(user.uid);
    setupListeners();
    initTheme();
  } else {
    currentUser = null;
    $('#auth-screen').classList.remove('hidden');
    $('#auth-screen').classList.add('active');
    $('#app-screen').classList.remove('active');
    $('#app-screen').classList.add('hidden');
    cleanupListeners();
    $('#app-screen').classList.remove('active');
  }
});

$('#login-btn').onclick = async () => authAction('login');
$('#register-btn').onclick = async () => authAction('register');
async function authAction(type) {
  const email = $('#auth-email').value.trim();
  const pass = $('#auth-password').value;
  $('#auth-error').textContent = '';
  try {
    let cred;
    if (type === 'login') cred = await signInWithEmailAndPassword(auth, email, pass);
    else {
      cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: email.split('@')[0], email, createdAt: serverTimestamp(), status: 'online', statusText: 'Привет, я использую Woops!'
      });
    }
  } catch (e) { $('#auth-error').textContent = e.message; }
}

// ================= PROFILE & THEME =================
async function loadUserProfile(uid) {
  const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      userProfile = { id: uid, ...data };
      $('#profile-name').textContent = data.displayName || 'Пользователь';
      $('#profile-status').textContent = data.statusText || '';
      $('#profile-avatar').src = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'U')}&background=6366f1&color=fff`;
      $('#edit-displayName').value = data.displayName || '';
      $('#edit-statusText').value = data.statusText || '';
      if (data.theme === 'dark') document.documentElement.classList.add('dark');
    }
  });
  listeners.profile = unsub;
}

$('#edit-profile-btn').onclick = () => $('#modal-edit-profile').showModal();
$('#save-profile-btn').onclick = async () => {
  if (!currentUser) return;
  await updateDoc(doc(db, 'users', currentUser.uid), {
    displayName: $('#edit-displayName').value.trim() || userProfile.displayName,
    statusText: $('#edit-statusText').value.trim()
  });
  closeModal('modal-edit-profile');
  showToast('Профиль обновлён');
};

$('#theme-switch').onchange = async (e) => {
  const isDark = e.target.checked;
  document.documentElement.classList.toggle('dark', isDark);
  await updateDoc(doc(db, 'users', currentUser.uid), { theme: isDark ? 'dark' : 'light' });
};

$('#share-profile-btn').onclick = () => {
  navigator.clipboard.writeText(currentUser.uid);
  showToast('UID скопирован в буфер обмена');
};

$('#delete-profile-btn').onclick = async () => {
  if (confirm('Удалить профиль и все данные? Это действие нельзя отменить.')) {
    try {
      // Очистка Firestore (упрощённо)
      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(auth.currentUser);
      showToast('Профиль удалён');
    } catch (e) { showToast('Ошибка удаления: ' + e.message, 'error'); }
  }
};

// ================= TABS =================
$$('.nav-btn').forEach(btn => {
  btn.onclick = () => {
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $$('.tab').forEach(t => t.classList.remove('active'));
    $(`#tab-${tab}`).classList.add('active');
    $('#header-title').textContent = btn.querySelector('span').textContent;
    $('#search-btn').style.display = tab === 'profile' ? 'none' : 'flex';
  };
});

// ================= CHATS =================
function setupListeners() {
  if (!currentUser) return;
  // Чаты
  listeners.chat = onSnapshot(query(collection(db, 'chatRooms'), where('participants', 'array-contains', currentUser.uid), orderBy('lastTime', 'desc')), (snap) => {
    const list = $('#chat-list');
    list.innerHTML = '';
    if (snap.empty) { $('#chats-empty').style.display = 'block'; return; }
    $('#chats-empty').style.display = 'none';
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const isLastSender = data.lastSenderId === currentUser.uid;
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <img class="avatar" src="${data.contactAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.contactName)}`}" alt="">
        <div class="info"><h4>${escapeHtml(data.contactName)}</h4><p>${isLastSender ? 'Вы: ' : ''}${escapeHtml(data.lastMessage || 'Нет сообщений')}</p></div>
      `;
      li.onclick = () => openChat(docSnap.id, data.contactName, data.contactAvatar, data.contactId);
      list.appendChild(li);
    });
  });
}

async function openChat(roomId, name, avatar, contactId) {
  currentChat = { id: contactId, roomId, name, avatar };
  $('#app-screen').classList.add('hidden');
  $('#chat-screen').classList.remove('hidden');
  $('#chat-name').textContent = name;
  $('#chat-avatar').src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  $('#msg-area').innerHTML = '<div class="empty-state">Загрузка...</div>';
  if (listeners.chat) listeners.chat();

  listeners.chat = onSnapshot(query(collection(db, 'messages'), where('room', '==', roomId), orderBy('createdAt', 'asc')), (snap) => {
    const area = $('#msg-area');
    area.innerHTML = '';
    if (snap.empty) { area.innerHTML = '<div class="empty-state">Напишите первое сообщение ✨</div>'; return; }
    snap.forEach(d => {
      const msg = d.data();
      const div = document.createElement('div');
      div.className = `msg ${msg.senderId === currentUser.uid ? 'out' : 'in'}`;
      div.innerHTML = `${escapeHtml(msg.text)}<span class="time">${formatTime(msg.createdAt)}</span>`;
      area.appendChild(div);
    });
    area.scrollTop = area.scrollHeight;
  });
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
  const room = currentChat.roomId;
  await addDoc(collection(db, 'messages'), { room, senderId: currentUser.uid, text, createdAt: serverTimestamp() });
  await setDoc(doc(db, 'chatRooms', room), {
    participants: [currentUser.uid, currentChat.id],
    contactId: currentChat.id,
    contactName: currentChat.name,
    contactAvatar: currentChat.avatar,
    lastMessage: text,
    lastSenderId: currentUser.uid,
    lastTime: serverTimestamp()
  }, { merge: true });
};

$('#text-input').onkeypress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#send-btn').click(); } };

// ================= CONTACTS =================
$('#add-contact-btn').onclick = () => $('#modal-add-contact').showModal();
$('#search-contact-input').oninput = async (e) => {
  const q = e.target.value.trim();
  if (q.length < 3) return;
  const snap = await getDocs(query(collection(db, 'users'), where('displayName', '>=', q), where('displayName', '<=', q + '\uf8ff'), limit(5)));
  const res = $('#contact-search-results');
  res.innerHTML = '';
  snap.forEach(d => {
    const u = d.data();
    if (u.id === currentUser.uid) return;
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `<div class="info"><h4>${escapeHtml(u.displayName)}</h4><p>${escapeHtml(u.email)}</p></div>`;
    li.onclick = async () => {
      await addDoc(collection(db, 'contacts'), { ownerId: currentUser.uid, contactId: d.id, displayName: u.displayName, avatar: u.avatar, addedAt: serverTimestamp() });
      showToast('Контакт добавлен');
      closeModal('modal-add-contact');
    };
    res.appendChild(li);
  });
};

function loadContacts() {
  listeners.contacts = onSnapshot(query(collection(db, 'contacts'), where('ownerId', '==', currentUser.uid)), (snap) => {
    const list = $('#contacts-list');
    list.innerHTML = '';
    if (snap.empty) { $('#contacts-empty').style.display = 'block'; return; }
    $('#contacts-empty').style.display = 'none';
    snap.forEach(d => {
      const c = d.data();
      const li = document.createElement('li');
      li.className = 'list-item';
      li.dataset.name = (c.displayName || '').toLowerCase();
      li.innerHTML = `
        <img class="avatar" src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.displayName)}`}" alt="">
        <div class="info"><h4>${escapeHtml(c.displayName)}</h4><p>Нажмите для чата</p></div>
        <button class="btn danger remove-contact" data-id="${d.id}">✕</button>
      `;
      li.onclick = (e) => { if (!e.target.classList.contains('remove-contact')) {
        // Открыть чат (создаём комнату если нет)
        const room = [currentUser.uid, c.contactId].sort().join('_');
        openChat(room, c.displayName, c.avatar, c.contactId);
      }};
      list.appendChild(li);
    });
    $$('.remove-contact').forEach(btn => {
      btn.onclick = async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'contacts', btn.dataset.id)); showToast('Контакт удалён'); };
    });
  });
}

$('#contact-search').oninput = (e) => {
  const q = e.target.value.toLowerCase();
  $$('#contacts-list .list-item').forEach(li => {
    li.style.display = li.dataset.name.includes(q) ? 'flex' : 'none';
  });
};

// ================= FEED =================
function loadFeed() {
  listeners.feed = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
    feedData = [];
    const cont = $('#feed-list');
    cont.innerHTML = '';
    snap.forEach(d => {
      const p = { id: d.id, ...d.data() };
      feedData.push(p);
      cont.appendChild(renderPost(p));
    });
    // Также загружаем мои посты для профиля
    const myCont = $('#my-posts-feed');
    myCont.innerHTML = '';
    feedData.filter(p => p.authorId === currentUser.uid).forEach(p => myCont.appendChild(renderPost(p, true)));
  });
}

$('#new-post-btn').onclick = () => $('#modal-new-post').showModal();
$('#publish-post-btn').onclick = async () => {
  const text = $('#post-text').value.trim();
  if (!text) return;
  await addDoc(collection(db, 'posts'), {
    authorId: currentUser.uid,
    authorName: userProfile.displayName || 'Пользователь',
    authorAvatar: userProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}`,
    text,
    createdAt: serverTimestamp(),
    likes: [],
    comments: []
  });
  $('#post-text').value = '';
  closeModal('modal-new-post');
  showToast('Пост опубликован');
};

function renderPost(post, isProfile = false) {
  const div = document.createElement('div');
  div.className = 'feed-card';
  const isLiked = post.likes?.includes(currentUser.uid);
  div.innerHTML = `
    <div class="feed-author">
      <img class="avatar" src="${post.authorAvatar}" style="width:32px;height:32px">
      <div><h4>${escapeHtml(post.authorName)}</h4><p class="text-muted">${formatTime(post.createdAt)}</p></div>
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
        <input type="text" placeholder="Комментарий...">
        <button class="btn primary">→</button>
      </div>
    </div>
  `;

  // Like
  div.querySelector('[data-action="like"]').onclick = async () => {
    const ref = doc(db, 'posts', post.id);
    const liked = post.likes?.includes(currentUser.uid);
    if (liked) await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
    else await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
    showToast(liked ? 'Лайк убран' : 'Пост понравился');
  };

  // Comments
  div.querySelector('[data-action="comment"]').onclick = () => div.querySelector('.comments-section').classList.toggle('open');
  div.querySelector('.add-comment button').onclick = async () => {
    const inp = div.querySelector('.add-comment input');
    const txt = inp.value.trim();
    if (!txt) return;
    await updateDoc(doc(db, 'posts', post.id), { comments: arrayUnion({ name: userProfile.displayName || 'Вы', authorId: currentUser.uid, text: txt, createdAt: new Date().toISOString() }) });
    inp.value = '';
  };

  // Share
  div.querySelector('[data-action="share"]').onclick = () => {
    if (navigator.share) navigator.share({ title: 'Woops Post', text: post.text });
    else { navigator.clipboard.writeText(post.text); showToast('Текст скопирован'); }
  };

  return div;
}

// ================= GLOBAL SEARCH =================
$('#search-btn').onclick = () => { $('#search-overlay').classList.remove('hidden'); $('#global-search').focus(); };
$('#close-search').onclick = () => $('#search-overlay').classList.add('hidden');
$('#global-search').oninput = async (e) => {
  const q = e.target.value.trim();
  if (q.length < 2) return;
  const snap = await getDocs(query(collection(db, 'users'), where('displayName', '>=', q), where('displayName', '<=', q + '\uf8ff'), limit(8)));
  const res = $('#search-results');
  res.innerHTML = '';
  snap.forEach(d => {
    const u = d.data();
    if (u.id === currentUser.uid) return;
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `<img class="avatar" src="${u.avatar}" style="width:40px;height:40px"><div class="info"><h4>${escapeHtml(u.displayName)}</h4></div>`;
    li.onclick = () => { openChat([currentUser.uid, d.id].sort().join('_'), u.displayName, u.avatar, d.id); $('#search-overlay').classList.add('hidden'); };
    res.appendChild(li);
  });
};

// ================= HELPERS =================
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
function cleanupListeners() { Object.values(listeners).forEach(l => l && l()); }
function initTheme() {
  const saved = localStorage.getItem('woops-theme') || userProfile.theme;
  if (saved === 'dark') { document.documentElement.classList.add('dark'); $('#theme-switch').checked = true; }
}

// Init
loadContacts();
loadFeed();
console.log('Woops v2 loaded');
