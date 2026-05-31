import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, doc, setDoc, serverTimestamp, updateDoc, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔧 Firebase config
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

// 📦 DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const chatScreen = document.getElementById('chat-screen');

// Auth forms
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');

// Main Screen
const chatList = document.getElementById('chat-list');
const chatsEmpty = document.getElementById('chats-empty');
const loadingChats = document.getElementById('loading-chats');
const chatSearchInput = document.getElementById('chat-search');
const addContactBtn = document.getElementById('add-contact-btn');
const addContactEmptyBtn = document.getElementById('add-contact-empty-btn');
const logoutBtn = document.getElementById('logout-btn');

// Navigation
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab');
const tabTitle = document.getElementById('tab-title');

// Chat Screen
const backBtn = document.getElementById('back-btn');
const msgArea = document.getElementById('msg-area');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const chatNameDisplay = document.getElementById('chat-name');
const chatAvatarDisplay = document.getElementById('chat-avatar');
const chatStatusDisplay = document.getElementById('chat-status');
const editProfileMobileBtn = document.getElementById('edit-profile-mobile');

// Profile Modal
const editProfileBtns = document.querySelectorAll('#edit-profile, #edit-profile-mobile');
const profileModal = document.getElementById('profileModal');
const closeProfileBtn = document.getElementById('closeProfile');
const cancelProfileBtn = document.getElementById('cancelProfile');
const saveProfileBtn = document.getElementById('saveProfile');
const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
const displayNameInput = document.getElementById('displayName');
const userStatusSelect = document.getElementById('userStatus');
const statusTextInput = document.getElementById('statusText');

// Add Contact Modal
const addContactModal = document.getElementById('addContactModal');
const closeAddContactBtn = document.getElementById('closeAddContact');
const cancelAddContactBtn = document.getElementById('cancelAddContact');
const sendInviteBtn = document.getElementById('sendInvite');
const contactNameInput = document.getElementById('contactName');
const contactEmailInput = document.getElementById('contactEmail');

// Emoji & Toast
const emojiToggle = document.getElementById('emojiToggle');
const emojiPicker = document.getElementById('emojiPicker');
const toastEl = document.getElementById('toast');

// Profile Header Elements
const headerAvatar = document.getElementById('user-avatar-header');
const profilePreviewMain = document.getElementById('profile-preview-main');
const profileNameMain = document.getElementById('profile-name-main');
const profileStatusTextMain = document.getElementById('profile-status-text-main');

// Глобальное состояние
let currentUser = null;
let currentChat = null;
let unsubChat = null;
let unsubUsers = null;
let unsubOwnProfile = null;
let userProfile = {};
let allUsers = []; // Кэш пользователей для поиска
let lastSeenInterval = null;

const EMOJIS = ['😀','😂','😍','🤔','😎','👍','❤️','🔥','🎉','✨','🙌','💯','🤝','👋','🤗','😇','🤩','😜','🙃','💪','🎯','🌟','💬','🚀','✅','❌','⚡','🎮','🎵','🍕'];

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        showScreen('main-screen');
        trackOwnProfile(user.uid);
        await loadUsersList();
        updateLastSeenLoop();
    } else {
        currentUser = null;
        userProfile = {};
        allUsers = [];
        showScreen('auth-screen');
        cleanupListeners();
    }
});

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Auth Handlers
loginBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authError.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        authError.textContent = getAuthErrorMessage(e.code);
    }
};

registerBtn.onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authError.textContent = '';
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Создаем запись профиля пользователя
        await setDoc(doc(db, 'users', cred.user.uid), {
            displayName: email.split('@')[0],
            email: email,
            status: 'online',
            statusText: 'Привет! Я использую Woops.',
            avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=random`,
            lastSeen: serverTimestamp()
        });
    } catch (e) {
        authError.textContent = getAuthErrorMessage(e.code);
    }
};

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

// ============================================
// 👤 ПРОФИЛЬ
// ============================================
function trackOwnProfile(uid) {
    if (unsubOwnProfile) unsubOwnProfile();
    unsubOwnProfile = onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if (docSnap.exists()) {
            userProfile = { id: uid, ...docSnap.data() };
            updateProfileUI(userProfile);
        }
    });
}

function updateProfileUI(profile) {
    if (!profile) return;
    const name = profile.displayName || 'Пользователь';
    const avatar = profile.avatar || `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff`;
    const statusText = profile.statusText || 'В сети';

    // Header
    headerAvatar.src = avatar;
    
    // Profile Tab
    profilePreviewMain.src = avatar;
    profileNameMain.textContent = name;
    profileStatusTextMain.textContent = statusText;
}

// Edit Profile Modal Logic
editProfileBtns.forEach(btn => {
    if (!btn) return;
    btn.onclick = () => {
        if (!currentUser) return;
        displayNameInput.value = userProfile.displayName || '';
        userStatusSelect.value = userProfile.status || 'online';
        statusTextInput.value = userProfile.statusText || '';
        avatarPreview.src = userProfile.avatar || '';
        avatarInput.value = ''; // Reset file input
        profileModal.showModal();
    };
});

closeProfileBtn.onclick = () => profileModal.close();
cancelProfileBtn.onclick = () => profileModal.close();

avatarInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showToast('Файл слишком большой (макс 2МБ)', 'error');
        avatarInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => avatarPreview.src = reader.result;
    reader.readAsDataURL(file);
};

saveProfileBtn.onclick = async () => {
    if (!currentUser) return;
    
    const originalBtnText = saveProfileBtn.textContent;
    saveProfileBtn.textContent = 'Сохранение...';
    saveProfileBtn.disabled = true;

    try {
        let avatarUrl = userProfile.avatar;
        
        // Если выбран новый файл - загружаем его
        if (avatarInput.files[0]) {
            const file = avatarInput.files[0];
            const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            avatarUrl = await getDownloadURL(storageRef);
        }

        await updateDoc(doc(db, 'users', currentUser.uid), {
            displayName: displayNameInput.value.trim() || userProfile.displayName,
            status: userStatusSelect.value,
            statusText: statusTextInput.value.trim(),
            avatar: avatarUrl,
            lastSeen: serverTimestamp()
        });
        
        profileModal.close();
        showToast('Профиль обновлен');
    } catch (e) {
        console.error(e);
        showToast('Ошибка сохранения', 'error');
    } finally {
        saveProfileBtn.textContent = originalBtnText;
        saveProfileBtn.disabled = false;
    }
};

// ============================================
// 💬 СПИСОК ПОЛЬЗОВАТЕЛЕЙ (ЧАТЫ)
// ============================================
async function loadUsersList() {
    if (unsubUsers) unsubUsers();
    loadingChats.style.display = 'block';
    chatList.innerHTML = '';

    const q = query(collection(db, 'users'), limit(50));
    
    try {
        unsubUsers = onSnapshot(q, (snap) => {
            loadingChats.style.display = 'none';
            chatList.innerHTML = '';
            allUsers = []; // Reset cache
            
            let hasUsers = false;
            snap.forEach(docSnap => {
                if (docSnap.id === currentUser.uid) return;
                const user = { id: docSnap.id, ...docSnap.data() };
                allUsers.push(user);
                
                const li = createUserListItem(user);
                chatList.appendChild(li);
                hasUsers = true;
            });

            chatsEmpty.style.display = hasUsers ? 'none' : 'block';
            renderChatList(); // Initial render
        }, (err) => {
            console.error("Ошибка загрузки списка:", err);
            loadingChats.style.display = 'none';
            chatList.innerHTML = '<li class="chat-item">Ошибка загрузки списка</li>';
        });
    } catch (e) {
        console.error(e);
        loadingChats.style.display = 'none';
    }
}

// Функция рендеринга с учетом фильтра
function renderChatList(filterText = '') {
    chatList.innerHTML = '';
    const filtered = allUsers.filter(u => 
        u.displayName?.toLowerCase().includes(filterText.toLowerCase()) ||
        u.statusText?.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0 && allUsers.length > 0) {
        chatList.innerHTML = '<li class="chat-item" style="justify-content:center; color:var(--text-muted)">Никого не найдено</li>';
    } else if (filtered.length === 0) {
        chatsEmpty.style.display = 'block';
    }

    filtered.forEach(user => {
        chatList.appendChild(createUserListItem(user));
    });
}

function createUserListItem(user) {
    const li = document.createElement('li');
    li.className = 'chat-item';
    
    const name = escapeHtml(user.displayName || 'Пользователь');
    const statusText = escapeHtml(user.statusText || 'Онлайн');
    const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=6366f1&color=fff`;
    const statusClass = user.status === 'online' ? 'status-online' : 'status-offline';

    li.innerHTML = `
        <div class="avatar-wrapper">
            <img class="avatar" src="${avatar}" alt="${name}" loading="lazy">
            <span class="status-indicator ${statusClass}"></span>
        </div>
        <div class="chat-info">
            <h4>${name}</h4>
            <p class="text-muted">${statusText}</p>
        </div>
    `;

    li.onclick = () => openChat(user.id, user.displayName, user.avatar);
    return li;
}

// Поиск
chatSearchInput.addEventListener('input', (e) => {
    renderChatList(e.target.value);
});

// ============================================
// ✉️ ЧАТ
// ============================================
async function openChat(userId, name, avatar) {
    currentChat = { id: userId, name, avatar };
    
    // UI Updates
    chatNameDisplay.textContent = name;
    chatAvatarDisplay.src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    chatStatusDisplay.textContent = 'в сети'; // По умолчанию
    msgArea.innerHTML = '<div class="loading-state" style="flex:1; display:flex; justify-content:center; align-items:center;"><div class="spinner"></div></div>';
    textInput.value = '';
    textInput.focus();

    // На мобильных переходим на экран чата
    if (window.innerWidth < 768) {
        mainScreen.classList.remove('active');
        chatScreen.classList.add('active');
    } else {
        // На десктопе активируем панель чата
        chatScreen.classList.add('active');
    }

    const room = [currentUser.uid, userId].sort().join('_');
    const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
    
    if (unsubChat) unsubChat();
    
unsubChat = onSnapshot(q, 
  // ✅ Успешная загрузка
  (snap) => {
    msgArea.innerHTML = '';
    
    if (snap.empty) {
      msgArea.innerHTML = '<div class="empty-state">Напишите первое сообщение ✨</div>';
      return;
    }
    
    snap.forEach(docSnap => {
      msgArea.appendChild(renderMessage(docSnap.data()));
    });
    
    msgArea.scrollTop = msgArea.scrollHeight;
  },
  
  // ❌ ОБРАБОТКА ОШИБОК (это исправляет бесконечную загрузку!)
  (error) => {
    console.error("❌ Firestore error:", error.code, error.message);
    
    if (error.code === 'failed-precondition') {
      msgArea.innerHTML = `<div class="empty-state" style="color:var(--danger)">
        ⚠️ Требуется индекс Firestore.<br>
        <small>Открой консоль (F12) — там будет ссылка "Create Index"</small>
      </div>`;
      showToast('Нужно создать индекс в Firebase', 'error');
    } else if (error.code === 'permission-denied') {
      msgArea.innerHTML = '<div class="empty-state">❌ Нет доступа к чату</div>';
      showToast('Ошибка прав доступа', 'error');
    } else {
      msgArea.innerHTML = `<div class="empty-state">Ошибка: ${error.message}</div>`;
      showToast('Не удалось загрузить чат', 'error');
    }
  }
);

function renderMessage(msg) {
    const div = document.createElement('div');
    const isOwn = msg.senderId === currentUser?.uid;
    div.className = `msg ${isOwn ? 'out' : 'in'}`;
    
    const time = formatTime(msg.createdAt);
    
    div.innerHTML = `
        <div class="msg-text">${escapeHtml(msg.text)}</div>
        <span class="time">${time}</span>
    `;
    return div;
}

function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Отправка сообщения
sendBtn.onclick = async () => {
    const text = textInput.value.trim();
    if (!text || !currentChat) return;
    
    const room = [currentUser.uid, currentChat.id].sort().join('_');
    
    // Disable button briefly to prevent double send
    sendBtn.disabled = true;
    setTimeout(() => sendBtn.disabled = false, 500);

    try {
        await addDoc(collection(db, 'messages'), {
            room,
            senderId: currentUser.uid,
            text,
            createdAt: serverTimestamp()
        });
        textInput.value = '';
        textInput.focus();
        msgArea.scrollTop = msgArea.scrollHeight;
    } catch (e) {
        console.error("Send error:", e);
        showToast('Не удалось отправить', 'error');
    }
};

textInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
};

backBtn.onclick = () => {
    if (window.innerWidth < 768) {
        chatScreen.classList.remove('active');
        mainScreen.classList.add('active');
    } else {
        chatScreen.classList.remove('active');
    }
    if (unsubChat) unsubChat();
    currentChat = null;
};

// ============================================
// 🛠 ДОБАВИТЬ КОНТАКТ
// ============================================
function openAddContactModal() {
    contactNameInput.value = '';
    contactEmailInput.value = '';
    addContactModal.showModal();
}

addContactBtn.onclick = openAddContactModal;
addContactEmptyBtn.onclick = openAddContactModal;
closeAddContactBtn.onclick = () => addContactModal.close();
cancelAddContactBtn.onclick = () => addContactModal.close();

sendInviteBtn.onclick = async () => {
    const name = contactNameInput.value.trim();
    const email = contactEmailInput.value.trim();

    if (!email) {
        showToast('Введите email');
        return;
    }

    const originalText = sendInviteBtn.textContent;
    sendInviteBtn.textContent = 'Поиск...';
    sendInviteBtn.disabled = true;

    try {
        // Пытаемся найти пользователя по email
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snap = await getDocs(q);

        if (snap.empty) {
            showToast('Пользователь с таким email не найден', 'error');
        } else {
            // Если нашли, можно сразу открыть чат (в реальной аппке нужно добавить в список контактов)
            // Здесь для упрощения мы просто говорим, что контакт "найден"
            const userDoc = snap.docs[0];
            const userData = userDoc.data();
            
            // Если это сам пользователь
            if (userDoc.id === currentUser.uid) {
                showToast('Вы не можете добавить себя', 'error');
                return;
            }

            showToast('Контакт найден! Можно писать.', 'success');
            addContactModal.close();
            openChat(userDoc.id, userData.displayName, userData.avatar);
        }
    } catch (e) {
        console.error(e);
        showToast('Ошибка при поиске', 'error');
    } finally {
        sendInviteBtn.textContent = originalText;
        sendInviteBtn.disabled = false;
    }
};

// ============================================
// 🎨 Эмодзи + Toast + Helpers + Nav
// ============================================
function initEmojiPicker() {
    emojiPicker.innerHTML = '';
    EMOJIS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.onclick = (e) => {
            e.stopPropagation();
            const start = textInput.selectionStart;
            const end = textInput.selectionEnd;
            textInput.value = textInput.value.substring(0, start) + emoji + textInput.value.substring(end);
            textInput.focus();
            textInput.setSelectionRange(start + emoji.length, start + emoji.length);
            // Don't close picker on every click for better UX, or close?
            // Keeping open allows rapid typing. Let's keep open.
        };
        emojiPicker.appendChild(btn);
    });
}

emojiToggle.onclick = (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('active');
};

// Close emoji on outside click
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiToggle) {
        emojiPicker.classList.remove('active');
    }
});

function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateLastSeenLoop() {
    if (!currentUser || lastSeenInterval) return;
    
    // Обновляем статус при входе
    updateDoc(doc(db, 'users', currentUser.uid), {
        status: 'online',
        lastSeen: serverTimestamp()
    }).catch(() => {});

    lastSeenInterval = setInterval(() => {
        updateDoc(doc(db, 'users', currentUser.uid), {
            status: 'online',
            lastSeen: serverTimestamp()
        }).catch(() => {});
    }, 45000);
}

// Навигация
navBtns.forEach(btn => {
    btn.onclick = () => {
        navBtns.forEach(b => b.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        
        const tabId = `tab-${btn.dataset.tab}`;
        const tabEl = document.getElementById(tabId);
        if (tabEl) tabEl.classList.add('active');

        const titles = { chats: 'Чаты', status: 'Статус', calls: 'Звонки', profile: 'Профиль' };
        tabTitle.textContent = titles[btn.dataset.tab] || 'Woops';
    };
});

// Logout
logoutBtn.onclick = async () => {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            status: 'offline',
            lastSeen: serverTimestamp()
        });
        await signOut(auth);
    } catch (e) {
        console.error(e);
    }
};

function cleanupListeners() {
    if (unsubChat) unsubChat();
    if (unsubUsers) unsubUsers();
    if (unsubOwnProfile) unsubOwnProfile();
    if (lastSeenInterval) clearInterval(lastSeenInterval);
    lastSeenInterval = null;
}

// Инициализация
initEmojiPicker();

// Handle Enter key on Auth forms
authForm.onkeypress = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        // Определяем, какая кнопка "фокусирована" или просто пробуем войти
        // Для простоты можно сделать переключение, но лучше по ID
        loginBtn.click(); 
    }
}

console.log('%cWoops Chat Initialized', 'color: #6366f1; font-weight: bold; font-size: 14px');
