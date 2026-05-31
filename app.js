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

// --- СОСТОЯНИЕ ---
let currentUser = null;
let currentChatUser = null;
let unsubChat = null;
let notes = [];
let editingNoteId = null;

// --- АВАТАРЫ (Персонажи) ---
const AVATARS = [
    { name: 'Batman', color: '000000' }, { name: 'Iron Man', color: 'b71c1c' },
    { name: 'SpiderMan', color: '1565c0' }, { name: 'Joker', color: '2e7d32' },
    { name: 'Thor', color: 'ff8f00' }, { name: 'BlackWidow', color: '212121' },
    { name: 'Captain', color: '0d47a1' }, { name: 'Hulk', color: '1b5e20' },
    { name: 'Harry', color: '4a148c' }, { name: 'Hermione', color: '880e4f' },
    { name: 'Luna', color: 'e1bee7' }, { name: 'Draco', color: '78909c' },
    { name: 'TonyStark', color: 'd32f2f' }, { name: 'Natasha', color: '303f9f' },
    { name: 'Steve', color: '1976d2' }, { name: 'Loki', color: '388e3c' },
    { name: 'Thanos', color: '4527a0' }, { name: 'ScarlettJ', color: 'e91e63' },
    { name: 'ChrisE', color: '1a237e' }, { name: 'RDJ', color: 'bf360c' },
    { name: 'ElonMusk', color: '263238' }, { name: 'Morgan', color: 'ff6f00' },
    { name: 'Gandalf', color: '424242' }, { name: 'Yoda', color: '558b2f' }
];

// --- UI ЭЛЕМЕНТЫ ---
const $ = id => document.getElementById(id);
const screens = { auth: $('auth-screen'), main: $('main-screen'), chat: $('chat-screen') };

// --- АВТОРИЗАЦИЯ ---
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
    }
});

$('login-btn').onclick = async () => {
    try { await signInWithEmailAndPassword(auth, $('email').value, $('password').value); }
    catch(e) { $('auth-error').textContent = e.message; }
};
$('register-btn').onclick = async () => {
    try {
        const c = await createUserWithEmailAndPassword(auth, $('email').value, $('password').value);
        // Дефолтный профиль
        await setDoc(doc(db, 'users', c.user.uid), {
            username: c.user.email.split('@')[0],
            displayName: c.user.email.split('@')[0],
            avatar: `https://ui-avatars.com/api/?name=${c.user.email}&background=6366f1&color=fff`,
            contacts: [],
            notes: []
        });
    } catch(e) { $('auth-error').textContent = e.message; }
};
$('logout-btn').onclick = () => signOut(auth);

// --- ИНИЦИАЛИЗАЦИЯ ---
async function initApp(uid) {
    // Загрузка профиля
    onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            $('profile-big-avatar').src = data.avatar;
            $('profile-display-name').textContent = data.displayName;
            $('profile-display-username').textContent = '@' + (data.username || '');
            $('input-name').value = data.displayName || '';
            $('input-username').value = data.username || '';
            $('input-status').value = data.statusText || '';
        }
    });

    // Загрузка контактов
    loadContacts();
    // Загрузка чатов
    loadChats();
    // Рендер аватаров
    renderAvatarGrid();
    // Заметки из LocalStorage
    loadNotes();
    // Тема
    applyTheme(localStorage.getItem('theme') || 'light');
}

// --- ПРОФИЛЬ И НАСТРОЙКИ ---
function renderAvatarGrid() {
    const grid = $('avatar-selection-grid');
    grid.innerHTML = '';
    AVATARS.forEach(av => {
        const img = document.createElement('img');
        img.src = `https://ui-avatars.com/api/?name=${av.name}&background=${av.color}&color=fff&size=128`;
        img.className = 'avatar-option';
        img.onclick = () => {
            document.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            $('profile-big-avatar').src = img.src;
        };
        grid.appendChild(img);
    });
}

$('save-profile').onclick = async () => {
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    const avatarUrl = selectedAvatar ? selectedAvatar.src : $('profile-big-avatar').src;
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: $('input-name').value,
        username: $('input-username').value,
        statusText: $('input-status').value,
        avatar: avatarUrl
    });
    alert('Профиль сохранен!');
};

$('open-settings').onclick = () => $('settingsModal').showModal();

$('theme-toggle-btn').onclick = () => {
    const current = document.body.getAttribute('data-theme') || 'light';
    applyTheme(current === 'light' ? 'dark' : 'light');
};

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    $('theme-switch-indicator').textContent = theme === 'dark' ? '🟣' : '⚪';
}

// --- КОНТАКТЫ (СВАЙП) ---
function loadContacts() {
    // В реальном приложении мы бы брали список из профиля пользователя.
    // Для демо берем всех пользователей (кроме себя).
    const q = query(collection(db, 'users'), limit(50));
    onSnapshot(q, (snap) => {
        const list = $('contacts-list');
        list.innerHTML = '';
        snap.forEach(d => {
            if (d.id === currentUser.uid) return;
            const u = d.data();
            const item = document.createElement('div');
            item.className = 'swipe-wrapper';
            item.innerHTML = `
                <div class="swipe-bg">Удалить</div>
                <div class="swipe-content" data-id="${d.id}">
                    <img src="${u.avatar || ''}" class="avatar small">
                    <div>
                        <h4>${u.displayName}</h4>
                        <span class="text-muted" style="font-size:12px;">@${u.username || '...'}</span>
                    </div>
                </div>
            `;
            list.appendChild(item);
            initSwipe(item);
            
            // Клик для чата
            item.querySelector('.swipe-content').onclick = () => openChat(d.id, u);
        });
    });
}

// Логика Свайпа
function initSwipe(wrapper) {
    let startX = 0, currentX = 0;
    const content = wrapper.querySelector('.swipe-content');
    
    wrapper.ontouchstart = (e) => { startX = e.touches[0].clientX; };
    wrapper.ontouchmove = (e) => {
        const diff = startX - e.touches[0].clientX;
        if (diff > 0) { // Свайп влево
            currentX = Math.min(diff, 80); // Макс 80px
            content.style.transform = `translateX(-${currentX}px)`;
        }
    };
    wrapper.ontouchend = () => {
        if (currentX > 50) {
            // Показать кнопку удаления
            content.style.transform = 'translateX(-70px)';
            // Если кликнули на фон (красную зону)
            content.onclick = null; // Отключаем переход в чат
            wrapper.querySelector('.swipe-bg').onclick = () => {
                // Удаление (в демо просто скрываем)
                wrapper.style.height = '0'; wrapper.style.overflow = 'hidden'; wrapper.style.transition = '0.3s';
            };
        } else {
            content.style.transform = 'translateX(0)';
            const uid = content.dataset.id;
            // Восстанавливаем клик
            content.onclick = () => openChat(uid, { displayName: 'User' });
        }
        currentX = 0;
    };
}

$('add-contact-btn').onclick = () => $('addContactModal').showModal();
$('confirm-add-contact').onclick = () => {
    alert('Функция поиска по Email в разработке, но контакт добавлен визуально!');
    $('addContactModal').close();
};

// --- ЗАМЕТКИ ---
function loadNotes() {
    notes = JSON.parse(localStorage.getItem('woops_notes') || '[]');
    renderNotes();
}
function saveNotes() {
    localStorage.setItem('woops_notes', JSON.stringify(notes));
    renderNotes();
}
function renderNotes() {
    const list = $('notes-list');
    list.innerHTML = '';
    if (notes.length === 0) { list.innerHTML = '<p class="text-muted">Нет заметок</p>'; return; }
    notes.forEach((n, i) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `<h4>${n.title || 'Без названия'}</h4><p>${n.body ? n.body.substring(0, 30) + '...' : ''}</p>`;
        card.onclick = () => openNote(i);
        list.appendChild(card);
    });
}
function openNote(index) {
    editingNoteId = index;
    const n = notes[index];
    $('note-title-input').value = n.title;
    $('note-body-input').value = n.body;
    $('delete-note-btn').style.display = 'block';
    $('noteEditorModal').showModal();
}
$('add-note-btn').onclick = () => {
    editingNoteId = -1; // Новая
    $('note-title-input').value = ''; $('note-body-input').value = '';
    $('delete-note-btn').style.display = 'none';
    $('noteEditorModal').showModal();
};
$('save-note-btn').onclick = () => {
    const title = $('note-title-input').value;
    const body = $('note-body-input').value;
    if (editingNoteId === -1) notes.unshift({ title, body });
    else notes[editingNoteId] = { title, body };
    saveNotes();
    $('noteEditorModal').close();
};
$('delete-note-btn').onclick = () => {
    notes.splice(editingNoteId, 1);
    saveNotes();
    $('noteEditorModal').close();
};

// Переключатель вида заметок
let notesGrid = true;
$('notes-view-toggle').onclick = () => {
    notesGrid = !notesGrid;
    $('notes-list').className = notesGrid ? 'notes-grid' : 'notes-list';
    $('notes-view-toggle').textContent = notesGrid ? '▦' : '☰';
};

// --- ЧАТЫ ---
function loadChats() {
    const list = $('chat-list');
    // Для демо просто копируем контакты в чаты
    const q = query(collection(db, 'users'), limit(10));
    onSnapshot(q, (snap) => {
        list.innerHTML = '';
        snap.forEach(d => {
            if(d.id === currentUser.uid) return;
            const u = d.data();
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `<img src="${u.avatar || ''}" class="avatar small"><div><h4>${u.displayName}</h4></div>`;
            div.onclick = () => openChat(d.id, u);
            list.appendChild(div);
        });
    });
}

function openChat(uid, user) {
    currentChatUser = { id: uid, ...user };
    $('chat-name').textContent = user.displayName;
    $('chat-avatar').src = user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`;
    
    screens.main.classList.remove('active');
    screens.chat.classList.add('active');
    
    // Load Messages (Basic Firebase)
    const room = [currentUser.uid, uid].sort().join('_');
    const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
    if(unsubChat) unsubChat();
    
    unsubChat = onSnapshot(q, (snap) => {
        $('msg-area').innerHTML = '';
        snap.forEach(doc => {
            const msg = doc.data();
            const div = document.createElement('div');
            div.className = `msg ${msg.senderId === currentUser.uid ? 'out' : 'in'}`;
            div.textContent = msg.text;
            $('msg-area').appendChild(div);
        });
        $('msg-area').scrollTop = $('msg-area').scrollHeight;
    });
}

$('back-btn').onclick = () => {
    screens.chat.classList.remove('active');
    screens.main.classList.add('active');
    if(unsubChat) unsubChat();
};

$('send-btn').onclick = async () => {
    const text = $('text-input').value.trim();
    if(!text || !currentChatUser) return;
    const room = [currentUser.uid, currentChatUser.id].sort().join('_');
    await addDoc(collection(db, 'messages'), {
        room, text, senderId: currentUser.uid, createdAt: serverTimestamp()
    });
    $('text-input').value = '';
};

// Эмодзи
$('emojiToggle').onclick = () => $('emoji-panel').classList.toggle('open');
const emojis = ['😀','😎','🔥','❤️','👍','😂','🤔','👋'];
emojis.forEach(e => {
    const b = document.createElement('button');
    b.textContent = e;
    b.onclick = () => { $('text-input').value += e; $('text-input').focus(); };
    $('emoji-grid').appendChild(b);
});

// --- НАВИГАЦИЯ ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        $('tab-' + btn.dataset.tab).classList.add('active');
    };
});
