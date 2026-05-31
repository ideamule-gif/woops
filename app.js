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
// 🔤 ФОРМАТИРОВАНИЕ ОШИБОК FIREBASE
// ============================================
function getAuthErrorMessage(code) {
    const errors = {
        'auth/invalid-email': 'Неверный формат email',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/email-already-in-use': 'Email уже занят',
        'auth/weak-password': 'Пароль слишком короткий (мин. 6 символов)',
        'auth/network-request-failed': 'Нет соединения с интернетом',
        'auth/too-many-requests': 'Слишком много попыток, попробуйте позже'
    };
    return errors[code] || 'Ошибка авторизации: ' + code;
}

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Показываем главный экран
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
        // Отслеживаем профиль
        trackOwnProfile(user.uid);
        // Загружаем список пользователей
        loadUsersList();
        // Обновляем lastSeen
        updateLastSeenLoop();
    } else {
        currentUser = null;
        userProfile = {};
        // Показываем экран входа
        authScreen.classList.add('active');
        mainScreen.classList.remove('active');
        chatScreen.classList.remove('active');
        // Чистим слушатели
        cleanupListeners();
    }
});

// 🔘 Обработчик входа
if (loginBtn) {
    loginBtn.onclick = async () => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (!emailInput || !passwordInput) {
            showToast('Ошибка: поля не найдены', 'error');
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            showToast('Введите email и пароль', 'error');
            return;
        }
        
        authError.textContent = 'Вход...';
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            authError.textContent = '';
            showToast('Добро пожаловать! ✨');
        } catch (e) {
            console.error('Login error:', e);
            authError.textContent = getAuthErrorMessage(e.code);
            showToast('Ошибка входа', 'error');
        }
    };
}

// 🔘 Обработчик регистрации
if (registerBtn) {
    registerBtn.onclick = async () => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        if (!emailInput || !passwordInput) {
            showToast('Ошибка: поля не найдены', 'error');
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            showToast('Введите email и пароль', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Пароль минимум 6 символов', 'error');
            return;
        }
        
        authError.textContent = 'Регистрация...';
        
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            
            // Создаём профиль в Firestore
            await setDoc(doc(db, 'users', cred.user.uid), {
                displayName: email.split('@')[0],
                email: email,
                status: 'online',
                statusText: 'Привет! Я использую Woops 👋',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=6366f1&color=fff`,
                lastSeen: serverTimestamp()
            });
            
            authError.textContent = '';
            showToast('Аккаунт создан! 🎉');
        } catch (e) {
            console.error('Register error:', e);
            authError.textContent = getAuthErrorMessage(e.code);
            showToast('Ошибка регистрации', 'error');
        }
    };
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

if (closeProfileBtn) closeProfileBtn.onclick = () => profileModal.close();
if (cancelProfileBtn) cancelProfileBtn.onclick = () => profileModal.close();

if (avatarInput) {
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
}

if (saveProfileBtn) {
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
}

// ============================================
// 💬 СПИСОК ПОЛЬЗОВАТЕЛЕЙ (ЧАТЫ)
// ============================================
async function loadUsersList() {
    if (unsubUsers) unsubUsers();
    if (loadingChats) loadingChats.style.display = 'block';
    if (chatList) chatList.innerHTML = '';

    const q = query(collection(db, 'users'), limit(50));
    
    try {
        unsubUsers = onSnapshot(q, (snap) => {
            if (loadingChats) loadingChats.style.display = 'none';
            if (chatList) chatList.innerHTML = '';
            allUsers = []; // Reset cache
            
            let hasUsers = false;
            snap.forEach(docSnap => {
                if (docSnap.id === currentUser.uid) return;
                const user = { id: docSnap.id, ...docSnap.data() };
                allUsers.push(user);
                
                const li = createUserListItem(user);
                if (chatList) chatList.appendChild(li);
                hasUsers = true;
            });

            if (chatsEmpty) chatsEmpty.style.display = hasUsers ? 'none' : 'block';
            renderChatList(); // Initial render
        }, (err) => {
            console.error("Ошибка загрузки списка:", err);
            if (loadingChats) loadingChats.style.display = 'none';
            if (chatList) chatList.innerHTML = '<li class="chat-item">Ошибка загрузки списка</li>';
        });
    } catch (e) {
        console.error(e);
        if (loadingChats) loadingChats.style.display = 'none';
    }
}

// Функция рендеринга с учетом фильтра
function renderChatList(filterText = '') {
    if (!chatList) return;
    chatList.innerHTML = '';
    const filtered = allUsers.filter(u => 
        u.displayName?.toLowerCase().includes(filterText.toLowerCase()) ||
        u.statusText?.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0 && allUsers.length > 0) {
        chatList.innerHTML = '<li class="chat-item" style="justify-content:center; color:var(--text-muted)">Никого не найдено</li>';
    } else if (filtered.length === 0 && allUsers.length === 0) {
        if (chatsEmpty) chatsEmpty.style.display = 'block';
    }

    filtered.forEach(user => {
        if (chatList) chatList.appendChild(createUserListItem(user));
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
if (chatSearchInput) {
    chatSearchInput.addEventListener('input', (e) => {
        renderChatList(e.target.value);
    });
}

// ============================================
// ✉️ ЧАТ
// ============================================
async function openChat(userId, name, avatar) {
    currentChat = { id: userId, name, avatar };
    
    // UI Updates
    if (chatNameDisplay) chatNameDisplay.textContent = name;
    if (chatAvatarDisplay) chatAvatarDisplay.src = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    if (chatStatusDisplay) chatStatusDisplay.textContent = 'в сети';
    if (msgArea) msgArea.innerHTML = '<div class="loading-state" style="flex:1; display:flex; justify-content:center; align-items:center;"><div class="spinner"></div></div>';
    
    // УБИРАЕМ автозаполнение и НЕ фокусируемся автоматически
    if (textInput) {
        textInput.value = '';
        textInput.blur(); // Убираем фокус, чтобы клавиатура не открывалась
        textInput.setAttribute('autocomplete', 'off');
        textInput.setAttribute('autocapitalize', 'none');
        textInput.setAttribute('autocorrect', 'off');
        textInput.setAttribute('spellcheck', 'false');
        textInput.setAttribute('type', 'text');
        textInput.setAttribute('inputmode', 'text');
        textInput.setAttribute('name', 'chat_message_' + Date.now());
    }

    // На мобильных переходим на экран чата
    if (window.innerWidth < 768) {
        mainScreen.classList.remove('active');
        chatScreen.classList.add('active');
    } else {
        chatScreen.classList.add('active');
    }

    const room = [currentUser.uid, userId].sort().join('_');
    const q = query(collection(db, 'messages'), where('room', '==', room), orderBy('createdAt', 'asc'));
    
    if (unsubChat) unsubChat();
    
    unsubChat = onSnapshot(q, 
        (snap) => {
            if (!msgArea) return;
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
        (error) => {
            console.error("❌ Firestore error:", error.code, error.message);
            if (!msgArea) return;
            
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
}

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
if (sendBtn) {
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
            // УБИРАЕМ фокус после отправки
            textInput.blur();
            if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;
        } catch (e) {
            console.error("Send error:", e);
            showToast('Не удалось отправить', 'error');
        }
    };
}

if (textInput) {
    textInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (sendBtn) sendBtn.click();
            // Убираем фокус после отправки через Enter
            textInput.blur();
        }
    };
}

if (backBtn) {
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
}

// ============================================
// 🛠 ДОБАВИТЬ КОНТАКТ
// ============================================
function openAddContactModal() {
    if (contactNameInput) contactNameInput.value = '';
    if (contactEmailInput) contactEmailInput.value = '';
    if (addContactModal) addContactModal.showModal();
}

if (addContactBtn) addContactBtn.onclick = openAddContactModal;
if (addContactEmptyBtn) addContactEmptyBtn.onclick = openAddContactModal;
if (closeAddContactBtn) closeAddContactBtn.onclick = () => addContactModal.close();
if (cancelAddContactBtn) cancelAddContactBtn.onclick = () => addContactModal.close();

if (sendInviteBtn) {
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
}

// ============================================
// 🎨 Эмодзи + Toast + Helpers + Nav
// ============================================
function initEmojiPicker() {
    if (!emojiPicker) return;
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
        };
        emojiPicker.appendChild(btn);
    });
}

if (emojiToggle) {
    emojiToggle.onclick = (e) => {
        e.stopPropagation();
        if (emojiPicker) emojiPicker.classList.toggle('active');
    };
}

// Close emoji on outside click
document.addEventListener('click', (e) => {
    if (emojiPicker && emojiToggle && !emojiPicker.contains(e.target) && e.target !== emojiToggle) {
        emojiPicker.classList.remove('active');
    }
});

function showToast(message, type = 'success') {
    if (!toastEl) return;
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
        if (currentUser) {
            updateDoc(doc(db, 'users', currentUser.uid), {
                status: 'online',
                lastSeen: serverTimestamp()
            }).catch(() => {});
        }
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
        if (tabTitle) tabTitle.textContent = titles[btn.dataset.tab] || 'Woops';
    };
});

// Logout
if (logoutBtn) {
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
}

function cleanupListeners() {
    if (unsubChat) unsubChat();
    if (unsubUsers) unsubUsers();
    if (unsubOwnProfile) unsubOwnProfile();
    if (lastSeenInterval) clearInterval(lastSeenInterval);
    lastSeenInterval = null;
}

// Инициализация
initEmojiPicker();

// Добавляем обработчик клика для поля ввода (чтобы клавиатура открывалась ТОЛЬКО по клику)
if (textInput) {
    textInput.addEventListener('click', (e) => {
        e.stopPropagation();
        // Поле ввода получит фокус только при прямом клике
    });
}

// Handle Enter key on Auth forms
if (authForm) {
    authForm.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (loginBtn) loginBtn.click();
        }
    };
}

// Обработка при переключении между экранами (на мобильных)
if (backBtn) {
    const originalBackClick = backBtn.onclick;
    backBtn.onclick = () => {
        if (textInput) textInput.blur(); // Убираем фокус при возврате
        if (originalBackClick) originalBackClick();
    };
}

console.log('%cWoops Chat Initialized', 'color: #6366f1; font-weight: bold; font-size: 14px');

// 🔧 Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ SW registered:', reg.scope))
            .catch(err => console.log('❌ SW failed:', err));
    });
}

// Полная блокировка автофокуса на мобильных
if ('ontouchstart' in window) {
    // Сохраняем исходное поведение
    const originalFocus = HTMLInputElement.prototype.focus;
    
    // Переопределяем focus для поля ввода сообщения
    HTMLInputElement.prototype.focus = function() {
        if (this.id === 'text-input') {
            // Не вызываем оригинальный focus автоматически
            // Только если это не прямой клик
            if (!this.hasAttribute('data-manual-focus')) {
                return;
            }
        }
        originalFocus.call(this);
    };
    
    // Добавляем обработчик клика для ручного фокуса
    document.addEventListener('click', (e) => {
        if (e.target.id === 'text-input') {
            e.target.setAttribute('data-manual-focus', 'true');
            setTimeout(() => {
                e.target.removeAttribute('data-manual-focus');
            }, 100);
        }
    });
}

// Предотвращаем автофокус при открытии чата
const originalOpenChat = openChat;
window.openChat = function(userId, name, avatar) {
    if (textInput) {
        textInput.blur();
        textInput.removeAttribute('data-manual-focus');
    }
    return originalOpenChat(userId, name, avatar);
};
