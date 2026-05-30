// 🔥 Импорт только бесплатных модулей (Auth + Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, 
  where, getDocs, doc, setDoc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 Твой конфиг
const firebaseConfig = {
  apiKey: "AIzaSyAIN2kwSLT6zyFOY7WyonpvdtNM9xpmV4g",
  authDomain: "woops-4ded6.firebaseapp.com",
  projectId: "woops-4ded6",
  storageBucket: "woops-4ded6.firebasestorage.app",
  messagingSenderId: "371589558003",
  appId: "1:371589558003:web:9e50637114a1526b9c5186",
  measurementId: "G-7G6T986RVG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Элементы
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const chatScreen = document.getElementById('chat-screen');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authError = document.getElementById('auth-error');
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab');
const tabTitle = document.getElementById('tab-title');
const chatList = document.getElementById('chat-list');
const backBtn = document.getElementById('back-btn');
const msgArea = document.getElementById('msg-area');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const editProfileBtn = document.getElementById('edit-profile');
const logoutBtn = document.getElementById('logout-btn');

let currentUser = null;
let currentChat = null;
let unsubscribeChat = null;

// 🔐 Авторизация
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    await loadProfile();
    loadChatsList();
  } else {
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
    currentUser = null;
  }
});

// Вход
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  if (!email || pass.length < 6) return showError('Введите email и пароль (мин. 6 символов)');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) { showError('Ошибка входа: ' + e.code); }
});

// Регистрация
registerBtn.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const name = email.split('@')[0]; // Имя по умолчанию из email
  if (!email || pass.length < 6) return showError('Введите email и пароль (мин. 6 символов)');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    // Сохраняем данные пользователя в базу
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, avatar: null, status: 'В сети', createdAt: serverTimestamp()
    });
  } catch (e) { showError('Ошибка регистрации: ' + e.code); }
});

function showError(msg) { 
  authError.textContent = msg; 
  setTimeout(() => authError.textContent = '', 4000); 
}

logoutBtn.addEventListener('click', () => signOut(auth));

// 👤 Загрузка профиля
async function loadProfile() {
  if (!currentUser) return;
  const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
  let userData = { name: currentUser.displayName || 'Пользователь', avatar: null, status: 'В сети' };
  if (!userDoc.empty) userData = { ...userData, ...userDoc.docs[0].data() };
  
  document.getElementById('my-name').textContent = userData.name;
  document.getElementById('my-status').textContent = userData.status;
  // Аватар пока только текстовый (бесплатно)
  document.getElementById('my-avatar').textContent = (userData.name || '?')[0].toUpperCase();
}

editProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const newName = prompt('Ваше имя:', currentUser.displayName || '');
  if (newName) {
    await updateProfile(currentUser, { displayName: newName });
    await updateDoc(doc(db, 'users', currentUser.uid), { name: newName });
    loadProfile();
  }
});

// 💬 Список чатов (показывает всех зарегистрированных пользователей)
async function loadChatsList() {
  chatList.innerHTML = '<li style="padding:16px;color:#888">Загрузка...</li>';
  const usersSnap = await getDocs(collection(db, 'users'));
  chatList.innerHTML = '';
  let count = 0;
  usersSnap.forEach(docSnap => {
    if (docSnap.id === currentUser.uid) return; // Не показывать себя
    const u = docSnap.data();
    const li = document.createElement('li');
    li.innerHTML = `<div class="avatar">${(u.name||'?')[0].toUpperCase()}</div><div><h4>${u.name||'Аноним'}</h4><p>Нажмите, чтобы написать</p></div>`;
    li.onclick = () => openChat(docSnap.id, u.name);
    chatList.appendChild(li);
