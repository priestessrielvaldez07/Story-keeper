if (typeof firebase === "undefined") {
  document.getElementById("authError").innerText = "Could not load Firebase. Check internet and refresh.";
}

const firebaseConfig = {
  apiKey: "AIzaSyDcHQYy1jYQE5C2czUyd_Dfwas7W_YadsA",
  authDomain: "story-keeper-69461.firebaseapp.com",
  projectId: "story-keeper-69461",
  storageBucket: "story-keeper-69461.firebasestorage.app",
  messagingSenderId: "98973797111",
  appId: "1:98973797111:web:902a992029baf15f5a61f2",
  measurementId: "G-7HGDZ7SRHQ"
};
const GM_EMAIL = "priestessriel@storykeeper.game";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function isGM() { return currentUser && currentUser.email && currentUser.email.toLowerCase() === GM_EMAIL.toLowerCase(); }
function updateGMVisibility() { const b = document.getElementById("tab-btn-desk"); if (b) b.style.display = isGM() ? "" : "none"; if (!isGM() && currentTab === "desk") showTab("inscribe"); }

function showTab(t) { if (t === "desk" && !isGM()) t = "inscribe"; currentTab = t; const p = ["inscribe","team","reading","companions","archive","desk"]; for (const x of p) { document.getElementById("tab-" + x).style.display = x === t ? "block" : "none"; const b = document.getElementById("tab-btn-" + x); if (x === t) b.classList.add("active"); else b.classList.remove("active"); } }

function saveState() {
  if (!state) return;
  try { localStorage.setItem("storykeeper_save_local", JSON.stringify(state)); } catch (e) {}
  if (auth.currentUser) { db.collection("players").doc(auth.currentUser.uid).set(state).catch(function (e) { console.error(e); }); }
}

function loadUserData(user) {
  db.collection("players").doc(user.uid).get().then(function (snap) {
    if (snap.exists) { state = snap.data(); ensureCollections(); } else { state = defaultState(); saveState(); }
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("gameApp").style.display = "block";
    document.getElementById("userEmail").innerText = user.email;
    renderAll();
  }).catch(function (e) { document.getElementById("authError").innerText = "Failed to load save."; });
}

function doLogin() {
  const email = document.getElementById("authEmail").value;
  const pass = document.getElementById("authPassword").value;
  document.getElementById("authError").innerText = "Connecting…";
  auth.signInWithEmailAndPassword(email, pass).catch(function (e) { document.getElementById("authError").innerText = "Login failed. Check email/password."; });
}

function doRegister() {
  const email = document.getElementById("authEmail").value;
  const pass = document.getElementById("authPassword").value;
  document.getElementById("authError").innerText = "Creating account…";
  auth.createUserWithEmailAndPassword(email, pass).catch(function (e) { document.getElementById("authError").innerText = "Register failed. Email may be taken."; });
}

function doLogout() { auth.signOut(); }

auth.onAuthStateChanged(function (user) {
  if (user) { currentUser = user; loadUserData(user); }
  else { currentUser = null; state = null; document.getElementById("loginScreen").style.display = "flex"; document.getElementById("gameApp").style.display = "none"; }
});
