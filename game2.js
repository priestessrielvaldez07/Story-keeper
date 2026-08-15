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
function repairIbbUrls() {
  const fix = function (u, label) { if (!u || u.indexOf("://ibb.co/") === -1) return u; const code = u.split("://ibb.co/")[1].split("?")[0]; return "https://i.ibb.co/" + code + "/" + (label || "image.png"); };
  for (const m of content.media) m.path = fix(m.path, m.label);
  for (const c of content.characters) if (c.images && c.images.portrait && c.images.portrait.indexOf("://ibb.co/") !== -1) { const med = content.media.find(mm => mm.path === c.images.portrait); c.images.portrait = fix(c.images.portrait, med ? med.label : "image.png"); }
  try { localStorage.setItem(CONTENT_KEY, JSON.stringify(content)); } catch (e) {}
}
function saveState() {
  if (!state) return;
  try { localStorage.setItem("storykeeper_save_local", JSON.stringify(state)); } catch (e) {}
  if (auth.currentUser) { if (isGM()) { try { state.gm_content = content; } catch (e) {} } db.collection("players").doc(auth.currentUser.uid).set(state).catch(function (e) {}); }
}
function loadUserData(user) {
  db.collection("players").doc(user.uid).get().then(function (snap) {
    if (snap.exists) {
      state = snap.data();
      if (isGM() && state.gm_content && state.gm_content.characters) { content = state.gm_content; if (!content.media) content.media = []; if (!content.settings) content.settings = {}; try { localStorage.setItem(CONTENT_KEY, JSON.stringify(content)); } catch (e) {} }
      ensureCollections();
    } else { state = defaultState(); saveState(); }
    repairIbbUrls();
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("gameApp").style.display = "block";
    document.getElementById("userEmail").innerText = user.email;
    renderAll();
  }).catch(function (e) { document.getElementById("authError").innerText = "Failed to load save."; });
}
(function () {
  const o1 = document.getElementById("imgbbBtn"); if (o1) o1.style.display = "none";
  const o2 = document.getElementById("imgbbBtn2"); if (o2) o2.style.display = "none";
  if (document.getElementById("imgbbBtn3")) return;
  const mediaBox = document.getElementById("deskMedia"); if (!mediaBox) return;
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.id = "imgbbInput3"; inp.style.display = "none";
  const btn = document.createElement("button"); btn.id = "imgbbBtn3"; btn.innerText = "Upload & Assign Photo";
  btn.onclick = function () { inp.click(); };
  inp.addEventListener("change", function () {
    const f = inp.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = function () {
      const b64 = String(reader.result).split(",")[1];
      const fd = new FormData(); fd.append("image", b64); fd.append("name", f.name.replace(/\.[^.]+$/, ""));
      fetch("https://api.imgbb.com/1/upload?key=" + IMGBB_KEY, { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.data) {
            const url = j.data.display_url || (j.data.image && j.data.image.url) || j.data.url;
            if (!content.media.some(m => m.path === url)) content.media.push({ id: slugId(f.name) + "_" + (Date.now() % 1000), label: f.name, path: url });
            const base = f.name.replace(/\.[^.]+$/, "");
            const matched = content.characters.find(x => x.id === slugId(base) || x.name.toLowerCase() === base.toLowerCase());
            saveContent(); renderAll();
            deskAssignPicture(url, f.name, matched ? matched.id : (content.characters[0] ? content.characters[0].id : ""));
          } else { alert("Upload failed. ImgBB refused it."); }
        })
        .catch(function () { alert("Upload failed. Check internet."); });
    };
    reader.readAsDataURL(f);
    inp.value = "";
  });
  mediaBox.parentNode.insertBefore(inp, mediaBox.nextSibling);
  mediaBox.parentNode.insertBefore(btn, inp.nextSibling);
})();
(function () {
  if (document.getElementById("toTopBtn")) return;
  const b = document.createElement("button"); b.id = "toTopBtn"; b.innerText = "↑ Top";
  b.style.position = "fixed"; b.style.right = "12px"; b.style.bottom = "12px"; b.style.width = "auto"; b.style.zIndex = "999";
  b.onclick = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };
  document.body.appendChild(b);
})();
