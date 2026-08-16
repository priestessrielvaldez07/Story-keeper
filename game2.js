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
(function () {
  const olds = ["imgbbBtn", "imgbbBtn2", "imgbbBtn3"];
  for (const id of olds) { const el = document.getElementById(id); if (el) el.style.display = "none"; }
  if (document.getElementById("cldBtn")) return;
  const mediaBox = document.getElementById("deskMedia"); if (!mediaBox) return;
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.id = "cldInput"; inp.style.display = "none";
  const btn = document.createElement("button"); btn.id = "cldBtn"; btn.innerText = "Upload & Assign Photo";
  btn.onclick = function () { inp.click(); };
  inp.addEventListener("change", function () {
    const f = inp.files[0]; if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("upload_preset", "jnklkxgk");
    fetch("https://api.cloudinary.com/v1_1/equbrwx4/image/upload", { method: "POST", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.secure_url) {
          const url = j.secure_url;
          if (!content.media.some(m => m.path === url)) content.media.push({ id: slugId(f.name) + "_" + (Date.now() % 1000), label: f.name, path: url });
          const base = f.name.replace(/\.[^.]+$/, "");
          const matched = content.characters.find(x => x.id === slugId(base) || x.name.toLowerCase() === base.toLowerCase());
          saveContent(); renderAll();
          deskAssignPicture(url, f.name, matched ? matched.id : (content.characters[0] ? content.characters[0].id : ""));
        } else { alert("Upload failed: " + ((j && j.error && j.error.message) || "unknown")); }
      })
      .catch(function () { alert("Upload failed. Check internet."); });
    inp.value = "";
  });
  mediaBox.parentNode.insertBefore(inp, mediaBox.nextSibling);
  mediaBox.parentNode.insertBefore(btn, inp.nextSibling);
})();
function renderDesk() {
  let me = ""; for (const m of content.media) me += "<option value='" + m.id + "'>" + m.label + "</option>";
  document.getElementById("deskMedia").innerHTML = card("<div class='small'>Selected media:</div><select id='deskMediaSelect'>" + (me || "<option value=''>none</option>") + "</select>");
  let ba = ""; for (const b of content.banners) ba += "<option value='" + b.id + "'>" + b.name + "</option>";
  let ch = ""; for (const c of content.characters) ch += "<option value='" + c.id + "'>" + c.name + "</option>";
  let fo = ""; for (const f of content.refreshments) fo += "<option value='" + f.id + "'>" + f.name + "</option>";
  let re = ""; for (const r of content.relationships) re += "<option value='" + r.id + "'>" + r.name + "</option>";
  let ex = ""; for (const e of content.expeditions) ex += "<option value='" + e.id + "'>" + e.name + "</option>";
  document.getElementById("deskBanners").innerHTML = card("<div class='small'>Selected banner:</div><select id='deskBannerSelect'>" + (ba || "<option value=''>none</option>") + "</select>");
  document.getElementById("deskCharacters").innerHTML = card("<div class='small'>Selected character:</div><select id='deskCharSelect'>" + (ch || "<option value=''>none</option>") + "</select>");
  document.getElementById("deskRelationships").innerHTML = card("<div class='small'>Selected relationship:</div><select id='deskRelSelect'>" + (re || "<option value=''>none</option>") + "</select>");
  document.getElementById("deskRefreshments").innerHTML = card("<div class='small'>Selected refreshment:</div><select id='deskFoodSelect'>" + (fo || "<option value=''>none</option>") + "</select>");
  document.getElementById("deskExpeditions").innerHTML = card("<div class='small'>Selected expedition:</div><select id='deskExpSelect'>" + (ex || "<option value=''>none</option>") + "</select>");
  let art = document.getElementById("artControls");
  if (!art) { art = document.createElement("div"); art.id = "artControls"; const mediaBox = document.getElementById("deskMedia"); mediaBox.parentNode.insertBefore(art, mediaBox.nextSibling); }
  art.innerHTML = card("<div class='small'>Set Portrait on:</div><select id='artCharSelect'>" + (ch || "<option value=''>none</option>") + "</select><div class='small'>Set Banner Art on:</div><select id='artBannerSelect'>" + (ba || "<option value=''>none</option>") + "</select><div class='small'>Set Icon on:</div><select id='artFoodSelect'>" + (fo || "<option value=''>none</option>") + "</select>");
}
function deskSetCharacterImage() { const cid = getSelectValue("artCharSelect") || getSelectValue("deskCharSelect"); if (!cid) { alert("Pick a character first."); return; } const path = getSelectedMediaPath(); if (!path) { alert("Add or upload media first."); return; } const c = content.characters.find(x => x.id === cid); if (!c) return; if (!c.images) c.images = {}; c.images.portrait = path; saveContent(); renderAll(); alert(c.name + " portrait set."); }
function deskSetBannerImage() { const bid = getSelectValue("artBannerSelect") || getSelectValue("deskBannerSelect"); if (!bid) { alert("Pick a banner first."); return; } const path = getSelectedMediaPath(); if (!path) { alert("Add or upload media first."); return; } const b = content.banners.find(x => x.id === bid); if (!b) return; if (!b.images) b.images = {}; b.images.background = path; saveContent(); renderAll(); alert(b.name + " art set."); }
function deskSetFoodImage() { const fid = getSelectValue("artFoodSelect") || getSelectValue("deskFoodSelect"); if (!fid) { alert("Pick a refreshment first."); return; } const path = getSelectedMediaPath(); if (!path) { alert("Add or upload media first."); return; } const f = content.refreshments.find(x => x.id === fid); if (!f) return; if (!f.images) f.images = {}; f.images.icon = path; saveContent(); renderAll(); alert(f.name + " icon set."); }
(function () {
  const btns = document.querySelectorAll("#tab-desk button");
  for (const b of btns) { if (b.innerText === "Clear Selected Portrait") b.style.display = "none"; }
})();
function updateStatus() { regenCandlelight(); document.getElementById("currencies").innerHTML = "<span class='cur'>💎 " + state.shards + "</span> <span class='cur'>🪶 " + state.quills + "</span> <span class='cur'>📜 " + state.pages + "</span> <span class='cur'>🕯 " + state.candlelight + "/" + CANDLELIGHT_MAX + "</span>"; }
function repairIbbUrls() { let cleared = 0; const dead = function (u) { return !!u && u.indexOf("ibb.co/") !== -1; }; for (const m of content.media) if (dead(m.path)) { m.path = ""; cleared++; } content.media = content.media.filter(m => m.path !== ""); for (const c of content.characters) if (c.images && dead(c.images.portrait)) { c.images.portrait = ""; cleared++; } if (cleared) { try { localStorage.setItem(CONTENT_KEY, JSON.stringify(content)); } catch (e) {} } }
(function () {
  const st = document.createElement("style");
  st.textContent = ".topbar{flex-direction:column;align-items:stretch;gap:6px}.topbar .actions{justify-content:space-between;align-items:center;width:100%}.topbar #currencies{display:flex;flex-wrap:wrap;gap:6px}.cur{background:#2b2142;padding:4px 8px;border-radius:8px;font-size:13px;color:#d9cff7}#userEmail{font-size:11px}";
  document.head.appendChild(st);
  const ps = document.querySelectorAll("body > p");
  for (const p of ps) { if (p.innerText && p.innerText.indexOf("Step") === 0) p.style.display = "none"; }
})();
function deskOpenForm(title, fields, onSave) { deskFormCallback = onSave; let h = "<div class='card'><strong>" + title + "</strong>"; for (const f of fields) { h += "<div class='small'>" + f.label + "</div>"; if (f.options) { h += "<select id='df_" + f.id + "'>"; for (const o of f.options) h += "<option value='" + o.value + "'" + (String(o.value) === String(f.value) ? " selected" : "") + ">" + o.label + "</option>"; h += "</select>"; } else { h += "<input id='df_" + f.id + "' type='text' value=\"" + String(f.value == null ? "" : f.value).replace(/"/g, "&quot;") + "\">"; } } h += "<button onclick=\"deskSaveForm()\">Save</button><button onclick=\"deskCloseForm()\">Cancel</button></div>"; deskFormContainer().innerHTML = h; deskFormContainer().scrollIntoView({ behavior: "smooth", block: "center" }); }
function deskSendGift() { const types = ["shards", "pages", "quills", "dust", "embers", "stones", "refreshment"].map(function (t) { return { value: t, label: t }; }); const foods = content.refreshments.map(function (f) { return { value: f.id, label: f.name }; }); deskOpenForm("Send Gift", [ { id: "type", label: "Gift type", options: types, value: "shards" }, { id: "idref", label: "If refreshment: which one", options: foods, value: "" }, { id: "amount", label: "Amount", value: "100" }, { id: "note", label: "Note to player", value: "A gift from the Keeper." } ], function () { const type = deskGet("type"); const idref = type === "refreshment" ? deskGet("idref") : ""; state.gifts.push({ id: "gift_" + Date.now(), type: type, idref: idref, amount: parseInt(deskGet("amount")) || 1, note: deskGet("note") }); saveState(); renderGiftBox(); alert("Gift sent! Players claim it in Archive → Gift Box."); }); }
function deskAddRelationship() { const chars = content.characters.map(function (c) { return { value: c.id, label: c.name }; }); deskOpenForm("Add Bond / Couple", [ { id: "m1", label: "Member 1", options: chars, value: "" }, { id: "m2", label: "Member 2", options: chars, value: "" }, { id: "name", label: "Bond name", value: "Bound Hearts" }, { id: "type", label: "Type", options: [{ value: "couple", label: "couple" }, { value: "friend", label: "friend" }, { value: "rival", label: "rival" }], value: "couple" }, { id: "stat", label: "Buff stat", options: [{ value: "hp", label: "HP" }, { value: "atk", label: "ATK" }, { value: "def", label: "DEF" }], value: "atk" }, { id: "value", label: "Buff percent", value: "15" } ], function () { const m1 = deskGet("m1"); const m2 = deskGet("m2"); if (!m1 || !m2 || m1 === m2) { alert("Pick two different members."); return; } const name = deskGet("name") || "Bound Hearts"; const stat = deskGet("stat") || "atk"; const value = parseInt(deskGet("value")) || 15; content.relationships.push({ id: m1 + "_" + m2 + "_" + (deskGet("type") || "couple"), name: name, type: deskGet("type") || "couple", members: [m1, m2], enabled: true, team_buff: { name: name, description: getCharacterName(m1) + " & " + getCharacterName(m2) + " together: " + stat.toUpperCase() + " +" + value + "%.", effects: [{ type: "stat_percent", stat: stat, value: value }] } }); saveContent(); renderAll(); alert("Relationship added."); }); }
function deskEditRelationship() { const id = getSelectValue("deskRelSelect"); if (!id) { alert("No relationship selected."); return; } const r = content.relationships.find(x => x.id === id); if (!r) return; const chars = content.characters.map(function (c) { return { value: c.id, label: c.name }; }); const eff = r.team_buff.effects[0] || { stat: "atk", value: 15 }; deskOpenForm("Edit Relationship", [ { id: "m1", label: "Member 1", options: chars, value: r.members[0] }, { id: "m2", label: "Member 2", options: chars, value: r.members[1] }, { id: "name", label: "Bond name", value: r.name }, { id: "type", label: "Type", options: [{ value: "couple", label: "couple" }, { value: "friend", label: "friend" }, { value: "rival", label: "rival" }], value: r.type }, { id: "stat", label: "Buff stat", options: [{ value: "hp", label: "HP" }, { value: "atk", label: "ATK" }, { value: "def", label: "DEF" }], value: eff.stat }, { id: "value", label: "Buff percent", value: eff.value } ], function () { const m1 = deskGet("m1"); const m2 = deskGet("m2"); if (!m1 || !m2 || m1 === m2) { alert("Pick two different members."); return; } r.members = [m1, m2]; r.name = deskGet("name") || r.name; r.type = deskGet("type") || r.type; let e = r.team_buff.effects[0] || { type: "stat_percent" }; e.stat = deskGet("stat") || e.stat; e.value = parseInt(deskGet("value")) || e.value; r.team_buff.effects = [e]; r.team_buff.name = r.name; r.team_buff.description = getCharacterName(m1) + " & " + getCharacterName(m2) + " together: " + e.stat.toUpperCase() + " +" + e.value + "%."; saveContent(); renderAll(); alert("Relationship updated."); }); }
function deskOpenForm(title, fields, onSave) { deskFormCallback = onSave; let h = "<div class='card'><strong>" + title + "</strong>"; for (const f of fields) { h += "<div class='small'>" + f.label + "</div>"; if (f.options) { h += "<select id='df_" + f.id + "'>"; for (const o of f.options) h += "<option value='" + o.value + "'" + (String(o.value) === String(f.value) ? " selected" : "") + ">" + o.label + "</option>"; h += "</select>"; } else { h += "<input id='df_" + f.id + "' type='text' value=\"" + String(f.value == null ? "" : f.value).replace(/"/g, "&quot;") + "\">"; } } h += "<button onclick=\"deskSaveForm()\">Save</button><button onclick=\"deskCloseForm()\">Cancel</button></div>"; deskFormContainer().innerHTML = h; deskFormContainer().scrollIntoView({ behavior: "smooth", block: "center" }); }
const RELATION_LINES = { couple: ["I always feel safe when you are near.", "Your hand fits mine perfectly.", "When this story ends, I want you in every ending.", "You make quiet moments feel like magic.", "I choose you. In every volume, every world."], friend: ["Want to go on an adventure together?", "I saved a snack just for you.", "You never have to pretend around me.", "Let's stay up late and read tonight.", "With you, even boring pages are fun."], rival: ["I'll beat you next time. Just watch.", "Don't think this means I like you.", "Hmph. You're not completely useless.", "Race you to the next chapter!", "One day my name will be above yours."], family: ["You forgot your scarf again, didn't you?", "Home is wherever you are.", "I'll always save a seat for you.", "You've grown so much. I'm proud of you.", "No matter what happens, we're family."] };
function deskAddRelationship() { const chars = content.characters.map(function (c) { return { value: c.id, label: c.name }; }); const types = ["couple", "friend", "rival", "family"].map(function (t) { return { value: t, label: t }; }); deskOpenForm("Add Bond", [ { id: "m1", label: "Member 1", options: chars, value: "" }, { id: "m2", label: "Member 2", options: chars, value: "" }, { id: "name", label: "Bond name", value: "Bound Hearts" }, { id: "type", label: "Type", options: types, value: "couple" }, { id: "stat", label: "Buff stat", options: [{ value: "hp", label: "HP" }, { value: "atk", label: "ATK" }, { value: "def", label: "DEF" }], value: "atk" }, { id: "value", label: "Buff percent", value: "15" } ], function () { const m1 = deskGet("m1"); const m2 = deskGet("m2"); if (!m1 || !m2 || m1 === m2) { alert("Pick two different members."); return; } const type = deskGet("type") || "couple"; const name = deskGet("name") || "Bound Hearts"; const stat = deskGet("stat") || "atk"; const value = parseInt(deskGet("value")) || 15; content.relationships.push({ id: m1 + "_" + m2 + "_" + type, name: name, type: type, members: [m1, m2], enabled: true, lines: (RELATION_LINES[type] || []).slice(), team_buff: { name: name, description: getCharacterName(m1) + " & " + getCharacterName(m2) + " together: " + stat.toUpperCase() + " +" + value + "%.", effects: [{ type: "stat_percent", stat: stat, value: value }] } }); saveContent(); renderAll(); alert("Bond added! Use Edit Bond Lines to customize their talk."); }); }
function deskEditRelLines() { const id = getSelectValue("deskRelSelect"); if (!id) { alert("No relationship selected."); return; } const r = content.relationships.find(x => x.id === id); if (!r) return; const cur = r.lines || RELATION_LINES[r.type] || RELATION_LINES.friend; const fields = []; for (let i = 0; i < 5; i++) fields.push({ id: "l" + i, label: "Line " + (i + 1) + " (spoken alternately)", value: cur[i] || "" }); deskOpenForm("Edit Bond Lines: " + r.name, fields, function () { const lines = []; for (let i = 0; i < 5; i++) { const t = deskGet("l" + i); if (t) lines.push(t); } r.lines = lines; if (!content.reading_room) content.reading_room = {}; if (!content.reading_room.pair_scenes) content.reading_room.pair_scenes = []; const sceneId = "rel_" + r.id; const pl = []; for (let i = 0; i < lines.length; i++) pl.push({ character: (i % 2 === 0 ? r.members[0] : r.members[1]), text: lines[i] }); const ex = content.reading_room.pair_scenes.find(s => s.id === sceneId); if (ex) { ex.lines = pl; ex.name = r.name; ex.members = r.members; } else content.reading_room.pair_scenes.push({ id: sceneId, name: r.name, members: r.members, bookmark: r.name + " share a moment.", lines: pl, background: "" }); saveContent(); renderAll(); alert("Bond lines saved! Put both characters in Reading to see them."); }); }
function deskEditSoloLines() { const id = getSelectValue("deskCharSelect"); if (!id) { alert("No character selected."); return; } const c = content.characters.find(x => x.id === id); if (!c) return; if (!content.reading_room) content.reading_room = {}; if (!content.reading_room.solo_lines) content.reading_room.solo_lines = {}; const cur = content.reading_room.solo_lines[id] || []; const fields = []; for (let i = 0; i < 5; i++) fields.push({ id: "s" + i, label: "Line " + (i + 1), value: cur[i] || "" }); deskOpenForm("Edit Solo Lines: " + c.name, fields, function () { const lines = []; for (let i = 0; i < 5; i++) { const t = deskGet("s" + i); if (t) lines.push(t); } content.reading_room.solo_lines[id] = lines; saveContent(); renderAll(); alert("Solo lines saved! Put one character in Reading to see them."); }); }
(function () { const relBox = document.getElementById("deskRelationships"); if (relBox && !document.getElementById("relLinesBtn")) { const b = document.createElement("button"); b.id = "relLinesBtn"; b.innerText = "Edit Bond Lines"; b.onclick = deskEditRelLines; relBox.parentNode.insertBefore(b, relBox.nextSibling); } const charBox = document.getElementById("deskCharacters"); if (charBox && !document.getElementById("soloLinesBtn")) { const b = document.createElement("button"); b.id = "soloLinesBtn"; b.innerText = "Edit Solo Lines"; b.onclick = deskEditSoloLines; charBox.parentNode.insertBefore(b, charBox.nextSibling); } })();
function saveContent() { try { localStorage.setItem(CONTENT_KEY, JSON.stringify(content)); } catch (e) {} if (typeof isGM === "function" && isGM() && auth.currentUser) { try { state.gm_content = content; db.collection("players").doc(auth.currentUser.uid).set(state).catch(function () {}); } catch (e) {} } }
function renderInventory() { ensureCollections(); let opts = ""; for (const f of content.refreshments) { const n = state.inventory[f.id] || 0; if (n > 0) opts += "<option value='" + f.id + "'>" + f.name + " x" + n + "</option>"; } let ch = ""; for (const cid in state.owned) { const c = content.characters.find(x => x.id === cid); if (c) ch += "<option value='" + c.id + "'>" + c.name + "</option>"; } document.getElementById("inventory").innerHTML = card("<div class='small'>Companion:</div><select id='archCharSelect'>" + (ch || "<option value=''>none</option>") + "</select><div class='small'>Refreshment:</div><select id='archFoodSelect'>" + (opts || "<option value=''>none owned</option>") + "</select><button onclick=\"feedPicked()\">Feed</button>"); }
function feedPicked() { const cid = getSelectValue("archCharSelect"); if (!cid) { alert("Pick a companion."); return; } selectedCharacterId = cid; const fid = getSelectValue("archFoodSelect"); if (!fid) { alert("No refreshment owned."); return; } feedFood(fid); renderInventory(); }
(function () { const b = document.getElementById("charLinesBtn"); if (b) b.style.display = "none"; })();
