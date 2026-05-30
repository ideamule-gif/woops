import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, where, getDocs, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const chatScreen = document.getElementById('chat-screen');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const authError = document.getElementById('auth-error');
const chatList = document.getElementById('chat-list');
const backBtn = document.getElementById('back-btn');
const msgArea = document.getElementById('msg-area');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const navBtns = document.querySelectorAll('.nav-btn');
const tabs = document.querySelectorAll('.tab');

let currentUser = null, currentChat = null, unsub = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    loadChats();
  } else {
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
  }
});

loginBtn.onclick = async () => {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch(e) { authError.textContent = e.message; }
};

registerBtn.onclick = async () => {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, 'users', cred.user.uid), { email, name: email.split('@')[0] });
  } catch(e) { authError.textContent = e.message; }
};

logoutBtn.onclick = () => signOut(auth);

async function loadChats() {
  const snap = await getDocs(collection(db, 'users'));
  chatList.innerHTML = '';
  snap.forEach(d => {
    if (d.id === currentUser.uid) return;
    const u = d.data();
    const li = document.createElement('li');
    li.textContent = u.name || 'Пользователь';
    li.onclick = () => openChat(d.id, u.name);
    chatList.appendChild(li);
  });
}

function openChat(userId, name) {
  currentChat = { id: userId, name };
  mainScreen.classList.remove('active');
  chatScreen.classList.add('active');
  document.getElementById('chat-name').textContent = name;
  msgArea.innerHTML = '';
  
  const room = [currentUser.uid, userId].sort().join('_');
  const q = query(collection(db, 'messages'), where('room','==',room), orderBy('createdAt','asc'));
  
  if (unsub) unsub();
  unsub = onSnapshot(q, snap => {
    msgArea.innerHTML = '';
    snap.forEach(doc => {
      const m = doc.data();
      const div = document.createElement('div');
      div.className = 'msg ' + (m.senderId === currentUser.uid ? 'out' : 'in');
      div.textContent = m.text;
      msgArea.appendChild(div);
    });
    msgArea.scrollTop = msgArea.scrollHeight;
  });
}

backBtn.onclick = () => {
  chatScreen.classList.remove('active');
  mainScreen.classList.add('active');
  if (unsub) unsub();
};

sendBtn.onclick = async () => {
  const text = textInput.value.trim();
  if (!text || !currentChat) return;
  const room = [currentUser.uid, currentChat.id].sort().join('_');
  await addDoc(collection(db, 'messages'), {
    room, senderId: currentUser.uid, text,
    createdAt: serverTimestamp()
  });
  textInput.value = '';
};

textInput.onkeypress = e => { if (e.key === 'Enter') sendBtn.click(); };

navBtns.forEach(btn => {
  btn.onclick = () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  };
});
