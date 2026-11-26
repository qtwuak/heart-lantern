/* Heart Lantern 心燈 - app logic. No build step, no dependencies. Data is kept in localStorage. */
(function () {
  "use strict";
  var D = HL.data;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function h(tag, attrs) {
    var el = document.createElement(tag); attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === "class") el.className = v; else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return el;
  }
  var mem = {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("hl." + k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem("hl." + k, JSON.stringify(v)); } catch (e) {} }
  };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var ymd = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var addDays = function (d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  var avg = function (a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; };
  var f1 = function (n) { return n == null ? "–" : (Math.round(n * 10) / 10).toString(); };
  var hashStr = function (s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var svgNS = "http://www.w3.org/2000/svg";
  function toast(msg) {
    var t = h("div", { class: "toast", text: msg }); $("#toasts").appendChild(t);
    setTimeout(function () { t.remove(); }, 3300);
  }
  var CRISIS = /(suicid\w*|kill\s*(my|him|her)self|end\s+my\s+life|end\s+it\s+all|want(ed)?\s+to\s+die|wanna\s+die|don'?t\s+want\s+to\s+(live|be\s+here)|self[\s-]?harm|hurt\s+myself|cut\s+myself|better\s+off\s+dead|no\s+reason\s+to\s+live|自殺|想死|不想活|輕生|結束生命|自殘|傷害自己|割腕|活不下去|尋短|了結)/i;
  var COLORS = { 1: "#8E9CFF", 2: "#7FB6FF", 3: "#B7A8E8", 4: "#FFD27A", 5: "#FFAA70" };

  /* ---------- state ---------- */
  var S = {
    checkins: store.get("checkins", {}),
    mine: store.get("mine", []),
    lit: store.get("lit", []),
    hidden: store.get("hidden", []),
    exams: store.get("exams", []),
    quests: store.get("quests", {}),
    xp: store.get("xp", 0),
    pomo: store.get("pomo", {}),
    draft: { mood: 0, stress: 0, sleep: 7, tags: [], note: "" },
    touched: false, wallTag: "Venting", filter: "All", libTopic: "All", libQ: "",
    chat: [], busy: false, zeIdx: {}, ai: store.get("ai", { provider: "demo", base: "", model: "", key: "" })
  };
  var today = function () { return ymd(new Date()); };

  /* ---------- Cloud Database Sync (Node.js Backend) ---------- */
  function getSyncKey() {
    var k = store.get("syncKey", "");
    if (!k) {
      k = "hl-" + Math.random().toString(36).slice(2, 7) + "-" + Math.random().toString(36).slice(2, 7);
      store.set("syncKey", k);
    }
    return k;
  }
  var SYNC_KEY = getSyncKey();
  var serverLanterns = [];

  function apiFetch(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      "Content-Type": "application/json",
      "X-Sync-Key": SYNC_KEY
    }, opts.headers || {});
    return fetch(url, opts).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function pushStateToServer() {
    apiFetch("/api/state", {
      method: "POST",
      body: JSON.stringify({
        checkins: S.checkins,
        exams: S.exams,
        quests: S.quests,
        xp: S.xp,
        pomo: S.pomo
      })
    }).catch(function () {});
  }

  function pushChatToServer(reset) {
    apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify(reset ? { reset: true } : { chat: S.chat })
    }).catch(function () {});
  }

  function pullStateFromServer() {
    apiFetch("/api/state").then(function (data) {
      if (!data) return;
      var changed = false;
      if (data.checkins && Object.keys(data.checkins).length) {
        S.checkins = Object.assign({}, data.checkins, S.checkins);
        store.set("checkins", S.checkins);
        changed = true;
      }
      if (Array.isArray(data.exams) && data.exams.length && !S.exams.length) {
        S.exams = data.exams;
        store.set("exams", S.exams); pushStateToServer();
        changed = true;
      }
      if (typeof data.xp === "number" && data.xp > S.xp) {
        S.xp = data.xp;
        store.set("xp", S.xp);
        changed = true;
      }
      if (data.quests) {
        S.quests = Object.assign({}, data.quests, S.quests);
        store.set("quests", S.quests);
      }
      if (data.pomo) {
        S.pomo = Object.assign({}, data.pomo, S.pomo);
        store.set("pomo", S.pomo); pushStateToServer();
      }
      if (Array.isArray(data.chat) && data.chat.length) {
        S.chat = data.chat;
        var logEl = $("#log");
        if (logEl) {
          logEl.textContent = "";
          $("#starters").hidden = true;
          S.chat.forEach(function (m) {
            logAdd(m.role === "user" ? "me" : "ze", m.content);
          });
        }
      }
      if (changed) {
        hydrateToday();
        paintTonight();
        renderQuests();
        renderExams();
        if (!$("#v-sky").hidden) renderSky();
      }
      // Push any local-only items back up so both sides stay in sync
      pushStateToServer();
    }).catch(function () {});

    apiFetch("/api/lanterns").then(function (res) {
      if (res && Array.isArray(res.lanterns)) {
        serverLanterns = res.lanterns;
        if (!$("#v-lanterns").hidden) renderSea();
      }
    }).catch(function () {});
  }

  function mountSyncCard() {
    var skyView = $("#v-sky");
    if (!skyView || $("#syncCard")) return;
    var card = h("div", { id: "syncCard", class: "card" },
      h("h2", { text: "Cross-device sync code" }),
      h("p", { class: "sub", text: "Use this code to sync across devices." })
    );
    var inp = h("input", { type: "text", value: SYNC_KEY, "aria-label": "Sync code", style: "max-width:260px;font-family:monospace" });
    var status = h("span", { class: "fine", text: "Synced" });
    var btn = h("button", {
      type: "button",
      class: "btn btn-sm btn-primary",
      text: "Switch / Load code",
      onclick: function () {
        var val = inp.value.trim();
        if (!val) return;
        SYNC_KEY = val;
        store.set("syncKey", SYNC_KEY);
        S.checkins = {}; S.exams = []; S.quests = {}; S.xp = 0; S.chat = [];
        status.textContent = "Loading…";
        pullStateFromServer();
        setTimeout(function () { status.textContent = "Loaded code: " + SYNC_KEY; toast("Synced with " + SYNC_KEY); }, 500);
      }
    });
    var row = h("div", { class: "row" }, inp, btn, status);
    card.appendChild(row);
    skyView.appendChild(card);
  }


  /* ---------- XP + quests ---------- */
  var QUESTS = [
    { id: "checkin", label: "Light today's star (check in)", xp: 15, auto: true },
    { id: "breathe", label: "Do one breathing round", xp: 10, auto: true },
    { id: "focus", label: "Finish a 25-minute focus round", xp: 20, auto: true },
    { id: "lantern", label: "Release or light a lantern", xp: 15, auto: true },
    { id: "water", label: "Drink a glass of water", xp: 5 },
    { id: "move", label: "Stand up and stretch for 2 minutes", xp: 10 },
    { id: "friend", label: "Message a friend or family member", xp: 10 },
    { id: "bed", label: "Decide tonight's bedtime", xp: 10 }
  ];
  var LEVELS = ["Spark", "Firefly", "Moth", "Lantern keeper", "Night owl", "Crane", "Phoenix"];
  var doneToday = function () { return (S.quests[today()] || []); };
  function award(id) {
    var q = QUESTS.filter(function (x) { return x.id === id; })[0]; if (!q) return false;
    var list = S.quests[today()] || (S.quests[today()] = []);
    if (list.indexOf(id) >= 0) return false;
    list.push(id); S.xp += q.xp; store.set("quests", S.quests); store.set("xp", S.xp); pushStateToServer();
    toast("+" + q.xp + " lantern fuel · " + q.label); renderQuests(); return true;
  }
  function unaward(id) {
    var q = QUESTS.filter(function (x) { return x.id === id; })[0], list = S.quests[today()] || [], i = list.indexOf(id);
    if (!q || i < 0) return; list.splice(i, 1); S.xp = Math.max(0, S.xp - q.xp); store.set("quests", S.quests); store.set("xp", S.xp); pushStateToServer(); renderQuests();
  }
  function levelInfo() {
    var step = 80, lv = Math.floor(S.xp / step), into = S.xp - lv * step;
    return { n: lv + 1, name: LEVELS[Math.min(lv, LEVELS.length - 1)], into: into, step: step, pct: Math.round(into / step * 100) };
  }
  function fuelBlock(withTitle) {
    var L = levelInfo();
    return h("div", {}, h("div", { class: "level" }, h("div", { class: "badge", text: String(L.n) }), h("div", {}, h("b", { text: L.name }), h("span", { text: L.into + " / " + L.step + " fuel to next level" }))), h("div", { class: "fuel", role: "img", "aria-label": L.pct + " percent to next level" }, h("i", { style: "width:" + L.pct + "%" })));
  }
  function renderQuests() {
    var done = doneToday(), box = $("#questBody"), mini = $("#questMini");
    if (box) {
      box.textContent = ""; box.appendChild(fuelBlock());
      var ul = h("ul", { class: "steps" });
      QUESTS.forEach(function (q) {
        var on = done.indexOf(q.id) >= 0;
        var b = h("button", { type: "button", class: q.auto ? "auto" : "", "aria-pressed": String(on) }, document.createTextNode(q.label + (q.auto ? " (automatic)" : "")), h("span", { class: "xp", text: "+" + q.xp }));
        if (!q.auto) b.addEventListener("click", function () { if (done.indexOf(q.id) >= 0) unaward(q.id); else award(q.id); });
        else b.setAttribute("aria-disabled", "true");
        ul.appendChild(h("li", {}, b));
      });
      box.appendChild(ul);
      
    }
    if (mini) {
      mini.textContent = "";
      mini.appendChild(h("h3", { text: "Today's quests" }));
      mini.appendChild(h("p", { class: "sub", text: done.length + " / " + QUESTS.length + " done" }));
      mini.appendChild(fuelBlock());
      mini.appendChild(h("div", { class: "row" }, h("a", { class: "btn btn-sm", href: "#exams", text: "Open quests" })));
    }
  }

  /* ---------- moon ---------- */
  function moonPhase(d) { var syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14); var days = (d.getTime() - ref) / 86400000; return ((days % syn) + syn) % syn / syn; }
  function moonName(p) {
    if (p < 0.03 || p > 0.97) return "a new moon"; if (p < 0.22) return "a waxing crescent"; if (p < 0.28) return "a first quarter moon";
    if (p < 0.47) return "a waxing gibbous moon"; if (p < 0.53) return "a full moon"; if (p < 0.72) return "a waning gibbous moon";
    if (p < 0.78) return "a last quarter moon"; return "a waning crescent";
  }
  function drawMoon(el, p) {
    var r = 46, cx = 50, cy = 50, a = 2 * Math.PI * p, rx = Math.abs(Math.cos(a)) * r, waxing = p < 0.5, d;
    if (p < 0.03 || p > 0.97) d = "";
    else if (waxing) d = "M" + cx + " " + (cy - r) + " A" + r + " " + r + " 0 0 1 " + cx + " " + (cy + r) + " A" + rx + " " + r + " 0 0 " + (p < 0.25 ? 0 : 1) + " " + cx + " " + (cy - r) + "Z";
    else d = "M" + cx + " " + (cy - r) + " A" + r + " " + r + " 0 0 0 " + cx + " " + (cy + r) + " A" + rx + " " + r + " 0 0 " + (p < 0.75 ? 1 : 0) + " " + cx + " " + (cy - r) + "Z";
    var full = Math.abs(p - 0.5) < 0.03;
    el.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="mg" cx="38%" cy="34%"><stop offset="0" stop-color="#FFFBEA"/><stop offset="1" stop-color="#FFE29A"/></radialGradient></defs><circle cx="50" cy="50" r="46" fill="rgba(60,64,130,.55)" stroke="rgba(255,244,214,.35)" stroke-width="1.5"/>' + (full ? '<circle cx="50" cy="50" r="46" fill="url(#mg)"/>' : (d ? '<path d="' + d + '" fill="url(#mg)"/>' : '')) + '<circle cx="38" cy="40" r="5" fill="rgba(160,130,60,.18)"/><circle cx="60" cy="58" r="7" fill="rgba(160,130,60,.14)"/><circle cx="52" cy="30" r="3" fill="rgba(160,130,60,.16)"/></svg>';
  }

  /* ---------- check-ins ---------- */
  var HORIZON = { 1: "#7B7FE8", 2: "#6FA0E6", 3: "#B79FD8", 4: "#FFB574", 5: "#FF9A62" };
  function entries() { return Object.keys(S.checkins).sort().map(function (k) { return S.checkins[k]; }); }
  function streak() { var d = new Date(); if (!S.checkins[ymd(d)]) d = addDays(d, -1); var n = 0; while (S.checkins[ymd(d)]) { n++; d = addDays(d, -1); } return n; }
  function paintHello() {
    var d = new Date(), hr = d.getHours(), p = moonPhase(d);
    $("#dateLine").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    $("#hello").textContent = hr < 5 ? "Still up? The sky is with you." : hr < 12 ? "Good morning." : hr < 18 ? "Good afternoon." : "Good evening.";
    drawMoon($("#moon"), p);
  }
  function buildForm() {
    var w = $("#weather");
    D.weather.forEach(function (x) {
      var b = h("button", { type: "button", class: "w", "data-v": x.v, "aria-pressed": "false", title: x.hint, style: "--c:var(--m" + x.v + ");--c-ink:var(--m" + x.v + "-ink)" });
      b.innerHTML = D.icons[x.v]; b.appendChild(document.createTextNode(x.name));
      b.addEventListener("click", function () { S.draft.mood = x.v; S.touched = true; paintForm(); HL.sky.setHorizon(HORIZON[x.v]); });
      w.appendChild(b);
    });
    var sg = $("#stress");
    D.wind.forEach(function (t, i) { sg.appendChild(h("button", { type: "button", "data-v": i + 1, "aria-pressed": "false", text: t, onclick: function () { S.draft.stress = i + 1; S.touched = true; paintForm(); } })); });
    var tg = $("#tags");
    D.tags.forEach(function (t) { tg.appendChild(h("button", { type: "button", class: "chip", "data-t": t, "aria-pressed": "false", text: t, onclick: function () { var i = S.draft.tags.indexOf(t); if (i >= 0) S.draft.tags.splice(i, 1); else S.draft.tags.push(t); S.touched = true; paintForm(); } })); });
    $("#sleep").addEventListener("input", function (e) { S.draft.sleep = Number(e.target.value); S.touched = true; paintForm(); });
    $("#note").addEventListener("input", function (e) { S.draft.note = e.target.value; S.touched = true; $("#noteCount").textContent = e.target.value.length + "/400"; });
    $("#checkin").addEventListener("submit", function (e) { e.preventDefault(); submitCheckin(); });
  }
  function paintForm() {
    $$("#weather .w").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.v) === S.draft.mood)); });
    $$("#stress button").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.v) === S.draft.stress)); });
    $$("#tags .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(S.draft.tags.indexOf(b.dataset.t) >= 0)); });
    $("#sleep").value = S.draft.sleep; $("#sleepOut").textContent = S.draft.sleep + " h";
    if ($("#note").value !== S.draft.note) $("#note").value = S.draft.note;
    $("#noteCount").textContent = S.draft.note.length + "/400";
  }
  function hydrateToday() {
    var e = S.checkins[today()]; if (!e) return;
    S.draft = { mood: e.mood, stress: e.stress || 0, sleep: e.sleep == null ? 7 : e.sleep, tags: (e.tags || []).slice(), note: e.note || "" };
    paintForm(); $("#saveBtn").textContent = "Update today's star"; HL.sky.setHorizon(HORIZON[e.mood]); paintAfter(e);
  }
  function suggest(e) {
    var a = function (label, href, cls) { return { label: label, href: href, cls: cls }; }, tags = e.tags || [];
    if (e.mood <= 2 || e.stress >= 5) return { t: "That sounds like a heavy one.", b: "You do not have to fix everything tonight. Pick one: let it out as a lantern, talk it through with Ze, or breathe with the glowing moon for a minute.", acts: [a("Talk to Ze", "#ze", "btn-primary"), a("Release a lantern", "#lanterns"), { label: "Breathe", act: "breathe" }] };
    if (e.stress >= 4 || (tags.indexOf("Exams") >= 0 && e.stress >= 3)) return { t: "Exam pressure is real.", b: "Try one 25-minute focus round on a single topic, then a proper break. Add your exam dates so you can see what is actually coming.", acts: [a("Open exam quest", "#exams", "btn-primary"), a("Read: blank in the exam", "#library")] };
    if (e.sleep != null && e.sleep < 6) return { t: "Short night.", b: "Keep today simple and start winding down 30 minutes earlier tonight. One steady night helps more than a perfect plan.", acts: [a("Sleep guide", "#library", "btn-primary"), a("Talk it through", "#ze")] };
    if (e.mood >= 4) return { t: "Good to see your sky clear.", b: "Notice what helped today so you can repeat it. Your star is lit. You can also send some light to others.", acts: [a("See your constellation", "#sky", "btn-primary"), a("Share a small win", "#lanterns")] };
    return { t: "Thanks for checking in.", b: "A steady day counts. Come back tomorrow and your constellation will start to show your rhythm.", acts: [a("See your constellation", "#sky", "btn-primary"), a("Talk to Ze", "#ze")] };
  }
  function lowRun() {
    var l = entries().slice(-3); if (l.length < 3) return false;
    for (var i = 1; i < 3; i++) if ((new Date(l[i].date) - new Date(l[i - 1].date)) / 86400000 !== 1) return false;
    return l.every(function (x) { return x.mood <= 2; });
  }
  function paintAfter(e) {
    var box = $("#after"); box.textContent = "";
    var s = suggest(e), st = streak(), card = h("div", { class: "card" }, h("h2", { text: s.t }), h("p", { class: "sub", text: s.b }));
    var row = h("div", { class: "row" });
    s.acts.forEach(function (x) { if (x.act) row.appendChild(h("button", { type: "button", class: "btn", text: x.label, onclick: function () { openBreath(0); } })); else row.appendChild(h("a", { class: "btn " + (x.cls || ""), href: x.href, text: x.label })); });
    card.appendChild(row); card.appendChild(h("p", { class: "fine", style: "margin-top:12px", text: st > 1 ? st + " nights in a row. Lovely rhythm." : "Night 1 of a new streak." }));
    box.appendChild(card);
    if (lowRun()) box.appendChild(h("div", { class: "card" }, h("h2", { text: "Three low days in a row" }), h("p", { class: "sub", text: "That is worth taking seriously. Talking to the YZU counselling team or your tutor can help, and you do not need to be in crisis to ask. The Library has details and free hotlines." }), h("div", { class: "row" }, h("a", { class: "btn btn-primary", href: "#library", text: "Open the Library" }))));
  }
  function submitCheckin() {
    var d = S.draft, msg = $("#saveMsg");
    if (!d.mood) { msg.textContent = "Pick today's weather first."; return; }
    var e = { date: today(), mood: d.mood, stress: d.stress || 0, sleep: d.sleep, tags: d.tags.slice(), note: d.note.trim().slice(0, 400), ts: Date.now() };
    S.checkins[e.date] = e; store.set("checkins", S.checkins);
    msg.textContent = "Saved & synced to cloud."; pushStateToServer(); $("#saveBtn").textContent = "Update today's star";
    HL.sky.setHorizon(HORIZON[e.mood]); paintAfter(e); award("checkin"); paintTonight(); toast("A new star is lit in your sky");
  }
  function paintTonight() {
    var box = $("#tonight"); box.textContent = "";
    var n = Math.floor(Date.now() / 86400000), tip = D.tips[n % D.tips.length], st = streak(), e = S.checkins[today()];
    box.appendChild(h("p", { class: "eyebrow", text: "Tonight's thought" }));
    box.appendChild(h("p", { class: "big", text: tip }));
    var meta = h("div", { class: "meta" });
    var b1 = h("span", { class: "pill" }, document.createTextNode("Streak "), h("b", { text: st + (st === 1 ? " night" : " nights") })); meta.appendChild(b1);
    meta.appendChild(h("span", { class: "pill" }, document.createTextNode("Stars lit "), h("b", { text: String(Object.keys(S.checkins).length) })));
    if (e) meta.appendChild(h("span", { class: "pill" }, document.createTextNode("Today "), h("b", { text: D.weather[e.mood - 1].name })));
    box.appendChild(meta);
  }

  /* ---------- sky journal ---------- */
  function demoList() {
    var mo = [3,3,4,2,2,3,4,4,5,3,3,2,2,1,2,3,3,4,3,4,4,3,4,4,3,2,2,3,4,4], st = [3,3,2,4,4,3,2,2,1,3,4,4,5,5,4,3,3,2,3,2,2,3,2,2,3,4,4,3,2,2];
    var sl = [6.5,7,7.5,5,5.5,6.5,7,8,8,6.5,6,5,4.5,5,6,7,7,7.5,6.5,7,7.5,7,7.5,8,6.5,5.5,5.5,6.5,7.5,7.5];
    var tg = [["Assignments"],["Friends"],["Friends"],["Exams","Sleep"],["Exams"],["Assignments"],["Friends"],["Dorm life"],["Friends"],["Exams"],["Assignments"],["Exams","Money"],["Exams","Sleep"],["Exams","Loneliness"],["Exams"],["Family"],["Assignments"],["Friends"],["Assignments"],["Friends"],["Dorm life"],["Friends"],["Friends"],["Dorm life"],["Assignments"],["Exams"],["Exams","Sleep"],["Assignments"],["Friends"],["Friends"]];
    var out = [], t = new Date(), n = mo.length;
    for (var i = 0; i < n; i++) out.push({ date: ymd(addDays(t, i - (n - 1))), mood: mo[i], stress: st[i], sleep: sl[i], tags: tg[i] });
    return out;
  }
  function renderSky() {
    var real = entries(), demo = real.length < 3, data = demo ? demoList() : real;
    var map = {}; data.forEach(function (x) { map[x.date] = x; });
    var days = []; for (var i = 29; i >= 0; i--) { var dt = addDays(new Date(), -i); days.push({ d: dt, e: map[ymd(dt)] || null }); }
    var last14 = days.slice(-14).filter(function (x) { return x.e; }).map(function (x) { return x.e; });
    var stats = $("#stats"); stats.textContent = "";
    [[f1(avg(last14.map(function (x) { return x.mood; }))), "average mood, 14 days"], [f1(avg(last14.filter(function (x) { return x.stress; }).map(function (x) { return x.stress; }))), "average wind (1 to 5)"], [f1(avg(last14.filter(function (x) { return x.sleep != null; }).map(function (x) { return x.sleep; }))) + " h", "average sleep"], [last14.length + "/14", "stars lit, last 14 days"]].forEach(function (p) { stats.appendChild(h("div", { class: "stat" }, h("b", { text: p[0] }), h("span", { text: p[1] }))); });
    drawConstellation(days); drawCal(map); drawInsights(data);
  }
  function el(svg, tag, attrs, text) { var e = document.createElementNS(svgNS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (text != null) e.textContent = text; svg.appendChild(e); return e; }
  function sparkle(cx, cy, r) { var k = r * 0.28; return "M" + cx + " " + (cy - r) + " Q" + (cx + k) + " " + (cy - k) + " " + (cx + r) + " " + cy + " Q" + (cx + k) + " " + (cy + k) + " " + cx + " " + (cy + r) + " Q" + (cx - k) + " " + (cy + k) + " " + (cx - r) + " " + cy + " Q" + (cx - k) + " " + (cy - k) + " " + cx + " " + (cy - r) + "Z"; }
  function drawConstellation(all) {
    var box = $("#chart"); box.textContent = "";
    var W = Math.max(300, Math.floor(box.clientWidth || 700)), narrow = W < 520, list = narrow ? all.slice(-14) : all, n = list.length;
    var L = 54, R = 16, T = 18, B = 40, H = 250, pw = W - L - R, ph = H - T - B;
    var xAt = function (i) { return L + i * pw / (n - 1); }, yAt = function (v) { return T + (5 - v) * ph / 4; };
    var svg = document.createElementNS(svgNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Constellation of mood stars over the last " + n + " days");
    el(svg, "defs", {}).innerHTML = '<filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    [1, 2, 3, 4, 5].forEach(function (v) { el(svg, "line", { class: "grid", x1: L, x2: W - R, y1: yAt(v), y2: yAt(v) }); el(svg, "text", { x: L - 10, y: yAt(v) + 4, "text-anchor": "end" }, String(v)); });
    list.forEach(function (x, i) { if (n <= 14 || i % 3 === 0 || i === n - 1) { el(svg, "text", { x: xAt(i), y: H - 20, "text-anchor": "middle" }, String(x.d.getDate())); if (x.d.getDate() === 1 || i === 0) el(svg, "text", { x: xAt(i), y: H - 6, "text-anchor": "middle" }, x.d.toLocaleDateString("en-GB", { month: "short" })); } });
    var sd = "", pen = false, md = "";
    list.forEach(function (x, i) { var v = x.e && x.e.stress; if (!v) { pen = false; return; } var y = yAt(v); sd += (pen ? "L" : "M") + xAt(i).toFixed(1) + " " + y.toFixed(1) + " "; pen = true; });
    pen = false;
    list.forEach(function (x, i) { var v = x.e && x.e.mood; if (!v) { pen = false; return; } md += (pen ? "L" : "M") + xAt(i).toFixed(1) + " " + yAt(v).toFixed(1) + " "; pen = true; });
    if (sd) el(svg, "path", { d: sd, fill: "none", stroke: "var(--blue)", "stroke-width": 2, "stroke-dasharray": "5 6", "stroke-linecap": "round", opacity: ".8" });
    if (md) el(svg, "path", { d: md, fill: "none", stroke: "var(--ink)", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: ".55" });
    var lastI = -1; list.forEach(function (x, i) { if (x.e) lastI = i; });
    list.forEach(function (x, i) {
      if (!x.e) { el(svg, "circle", { cx: xAt(i), cy: yAt(1) + 14, r: 1.6, fill: "var(--ink-3)", opacity: ".5" }); return; }
      var r = 5 + x.e.mood * 1.6 + (i === lastI ? 3 : 0);
      var p = el(svg, "path", { d: sparkle(xAt(i), yAt(x.e.mood), r), fill: "var(--m" + x.e.mood + ")", filter: "url(#gl)" });
      var t = document.createElementNS(svgNS, "title"); t.textContent = x.d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + ": " + D.weather[x.e.mood - 1].name + (x.e.stress ? ", wind " + x.e.stress : ""); p.appendChild(t);
    });
    box.appendChild(svg);
  }
  function drawCal(map) {
    var cal = $("#cal"); cal.textContent = "";
    ["M", "T", "W", "T", "F", "S", "S"].forEach(function (d) { cal.appendChild(h("div", { class: "hd", text: d })); });
    var t = new Date(), dow = (t.getDay() + 6) % 7, start = addDays(t, -(dow + 28)), ts = ymd(t);
    for (var i = 0; i < 35; i++) {
      var d = addDays(start, i), s = ymd(d), e = map[s], fut = s > ts;
      var c = h("div", { class: "day" + (e ? " on" : "") + (s === ts ? " today" : "") + (fut ? " future" : ""), title: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + (e ? ": " + D.weather[e.mood - 1].name : "") });
      if (e) c.setAttribute("style", "--c:var(--m" + e.mood + ");--c-ink:var(--m" + e.mood + "-ink)");
      c.textContent = String(d.getDate()); cal.appendChild(c);
    }
    var sw = $("#swatches"); sw.textContent = "";
    D.weather.forEach(function (w) { sw.appendChild(h("span", {}, h("i", { style: "background:var(--m" + w.v + ")" }), document.createTextNode(w.name))); });
  }
  function drawInsights(data) {
    var box = $("#insights"), bars = $("#tagBars"); box.textContent = ""; bars.textContent = "";
    var out = [], end = ymd(new Date()), w1s = ymd(addDays(new Date(), -6)), w0s = ymd(addDays(new Date(), -13));
    var w1 = data.filter(function (x) { return x.date >= w1s && x.date <= end; }), w0 = data.filter(function (x) { return x.date >= w0s && x.date < w1s; });
    if (w1.length >= 3 && w0.length >= 3) { var a1 = avg(w1.map(function (x) { return x.mood; })), a0 = avg(w0.map(function (x) { return x.mood; })), df = a1 - a0; out.push("This week your mood averaged " + f1(a1) + ", " + (Math.abs(df) < 0.3 ? "about the same as" : df > 0 ? "brighter than" : "lower than") + " " + f1(a0) + " the week before."); }
    var good = data.filter(function (x) { return x.sleep != null && x.sleep >= 7; }), sh = data.filter(function (x) { return x.sleep != null && x.sleep < 7; });
    if (good.length >= 3 && sh.length >= 3) out.push("After 7+ hours of sleep your mood averaged " + f1(avg(good.map(function (x) { return x.mood; }))) + ", against " + f1(avg(sh.map(function (x) { return x.mood; }))) + " after shorter nights.");
    var cnt = {}, low = data.filter(function (x) { return x.mood <= 2; }); low.forEach(function (x) { (x.tags || []).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
    var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
    if (top && cnt[top] >= 2) out.push("“" + top + "” shows up on " + cnt[top] + " of your " + low.length + " stormy or rainy days.");
    if (!out.length) out.push("Keep checking in. Patterns usually appear after about a week.");
    out.forEach(function (t) { box.appendChild(h("p", { text: t })); });
    var all = {}; data.forEach(function (x) { (x.tags || []).forEach(function (t) { all[t] = (all[t] || 0) + 1; }); });
    var keys = Object.keys(all).sort(function (a, b) { return all[b] - all[a]; }).slice(0, 5);
    if (keys.length) { bars.appendChild(h("h3", { text: "Most often on your mind" })); keys.forEach(function (k) { bars.appendChild(h("div", { class: "bar" }, h("span", { text: k }), h("i", { style: "width:" + Math.round(all[k] / all[keys[0]] * 100) + "%" }), h("span", { class: "v", text: String(all[k]) }))); }); }
  }
  function exportData() {
    var blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), checkins: S.checkins, exams: S.exams, xp: S.xp }, null, 2)], { type: "application/json" });
    var a = h("a", { href: URL.createObjectURL(blob), download: "heart-lantern-data.json" }); document.body.appendChild(a); a.click(); a.remove();
  }
  var wipeArmed = false;
  function wipe() {
    var b = $("#wipeBtn"); if (!wipeArmed) { wipeArmed = true; b.textContent = "Tap again to erase everything"; setTimeout(function () { wipeArmed = false; b.textContent = "Erase my data"; }, 4000); return; }
    wipeArmed = false; try { Object.keys(localStorage).filter(function (k) { return k.indexOf("hl.") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    location.hash = "#today"; location.reload();
  }

  /* ---------- crisis card ---------- */
  function crisisCard(extra) {
    var ul = h("ul", { class: "lines" });
    [["1925", "Safe Mind Line", "Free, 24 hours"], ["1995", "Lifeline", "24 hours"], ["110 / 119", "Police / ambulance", "If you are in danger right now"]].forEach(function (x) { ul.appendChild(h("li", {}, h("a", { class: "tel", href: "tel:" + x[0].split(" ")[0], text: x[0] }), h("span", {}, h("b", { text: x[1] }), h("small", { text: x[2] })))); });
    var c = h("div", { class: "crisis", role: "alert" }, h("h3", { text: "You matter more than this moment." }), h("p", { text: "If you are thinking about ending your life or hurting yourself, please reach a person now. These are free in Taiwan:" }), ul, h("p", { class: "fine", text: "If you can, tell someone near you: a roommate, a friend, a teacher or campus security." }));
    if (extra) c.appendChild(extra); return c;
  }

  /* ---------- lanterns ---------- */
  var ADJ = ["Quiet", "Gentle", "Brave", "Sleepy", "Steady", "Kind", "Curious", "Calm", "Warm", "Bright", "Soft", "Patient"];
  var NOUN = ["Persimmon", "Ginkgo", "Firefly", "Egret", "Plum", "Bamboo", "Heron", "Lantern", "Cloud", "Pangolin", "Magpie", "Camphor"];
  var TAGCLS = { "Venting": "rose", "Exam stress": "glow", "Lonely": "blue", "Small win": "mint", "Question": "lilac", "Gratitude": "gold" };
  function allLanterns() {
    var ex = D.examples.map(function (x) { return { id: x.id, tag: x.tag, text: x.text, ts: Date.now() - x.h * 3600000, light: x.light, handle: ADJ[hashStr(x.id) % ADJ.length] + " " + NOUN[hashStr(x.id + "n") % NOUN.length], mine: false }; });
    var my = S.mine.map(function (x) { var o = {}; Object.keys(x).forEach(function (k) { o[k] = x[k]; }); o.mine = true; return o; });
    var seen = {}; my.forEach(function (m) { seen[m.id] = 1; }); var srv = serverLanterns.filter(function (s) { return !seen[s.id]; }); return my.concat(srv).concat(ex).filter(function (x) { return S.hidden.indexOf(x.id) < 0; }).sort(function (a, b) { return b.ts - a.ts; });
  }
  function ago(ts) { var s = Math.max(0, (Date.now() - ts) / 1000); if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago"; return Math.floor(s / 86400) + " d ago"; }
  function lanternEl(x, i) {
    var cls = TAGCLS[x.tag] || "glow", lit = S.lit.indexOf(x.id) >= 0, count = (x.light || 0) + (lit ? 1 : 0);
    var b = h("button", { type: "button", class: "lantern " + cls + (x.mine ? " mine" : ""), style: "--d:" + (-(i % 7) * 0.9) + "s;margin-top:" + ((hashStr(x.id) % 5) * 12) + "px", "aria-label": "Open lantern: " + x.text.slice(0, 60) });
    b.appendChild(h("span", { class: "cap t" })); b.appendChild(h("span", { class: "paper" }, h("span", { class: "snip", text: x.text })));
    b.appendChild(h("span", { class: "cap b" })); b.appendChild(h("span", { class: "tassel" })); b.appendChild(h("span", { class: "lit", text: count ? count + " lit" : "" }));
    b.addEventListener("click", function () { openLantern(x.id); }); return b;
  }
  function renderSea() {
    var sea = $("#sea"); sea.textContent = "";
    var fl = $("#wallFilters"); fl.textContent = "";
    ["All"].concat(Object.keys(TAGCLS)).forEach(function (t) { fl.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": String(S.filter === t), text: t, onclick: function () { S.filter = t; renderSea(); } })); });
    var list = allLanterns().filter(function (x) { return S.filter === "All" || x.tag === S.filter; });
    if (!list.length) { sea.appendChild(h("div", { class: "empty" }, h("b", { text: "No lanterns here yet" }), "Be the first to release one.")); return; }
    list.forEach(function (x, i) { sea.appendChild(lanternEl(x, i)); });
  }
  var SAFETY_BLOCK = /\b([sS]?1[0-4]\d{5,6}|09\d{2}[-\s]?\d{3}[-\s]?\d{3})\b|(fuck|bitch|slut|whore|kys|幹你娘|靠北|去死|白痴|智障)/i;
  var transCache = {};

  function translateText(text, cb) {
    if (transCache[text]) return cb(transCache[text]);
    var hasChinese = /[\u4e00-\u9fa5]/.test(text);
    var pair = hasChinese ? "zh-TW|en" : "en|zh-TW";
    fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + pair)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var out = (d && d.responseData && d.responseData.translatedText) ? d.responseData.translatedText : text;
        transCache[text] = out;
        cb(out);
      })
      .catch(function () {
        cb(hasChinese ? "[Translation unavailable offline]" : "[無法連線翻譯]");
      });
  }

  function openLantern(id) {
    var x = allLanterns().filter(function (y) { return y.id === id; })[0]; if (!x) return;
    var lit = S.lit.indexOf(id) >= 0, count = (x.light || 0) + (lit ? 1 : 0), body = $("#lanternBody"), cls = TAGCLS[x.tag] || "glow"; body.textContent = "";
    var isZh = /[\u4e00-\u9fa5]/.test(x.text);
    var showingTranslated = false;

    var meta = h("div", { class: "meta", style: "--lc:var(--" + cls + ")" },
      h("span", { class: "tag", text: x.tag }),
      h("span", { text: (x.handle || "You") + " · " + ago(x.ts) })
    );
    var tBtn = h("button", {
      type: "button",
      class: "btn btn-sm btn-ghost",
      style: "margin-left:auto;padding:4px 10px;font-size:12px;",
      text: isZh ? "中 → EN" : "EN → 繁中"
    });
    meta.appendChild(tBtn);
    body.appendChild(meta);

    body.appendChild(h("h2", { id: "ldTitle", class: "sr", text: "Lantern" }));
    var pText = h("p", { class: "lantern-big", text: x.text });
    body.appendChild(pText);

    tBtn.addEventListener("click", function () {
      if (showingTranslated) {
        pText.textContent = x.text;
        tBtn.textContent = isZh ? "中 → EN" : "EN → 繁中";
        showingTranslated = false;
      } else {
        tBtn.textContent = "Translating...";
        translateText(x.text, function (translated) {
          pText.textContent = translated;
          tBtn.textContent = "Show Original";
          showingTranslated = true;
        });
      }
    });

    var row = h("div", { class: "row" });
    var lb = h("button", { type: "button", class: "btn " + (lit ? "lit-on" : ""), "aria-pressed": String(lit), text: (lit ? "Lit with a hug" : "Light it with a hug") + (count ? " · " + count : "") });
    lb.addEventListener("click", function () {
      var i = S.lit.indexOf(id);
      if (i >= 0) S.lit.splice(i, 1);
      else {
        S.lit.push(id);
        award("lantern");
        apiFetch("/api/lanterns/" + encodeURIComponent(id) + "/light", { method: "POST" }).catch(function () {});
      }
      store.set("lit", S.lit);
      renderSea();
      openLantern(id);
    });
    row.appendChild(lb);

    if (x.mine) {
      row.appendChild(h("button", {
        type: "button",
        class: "btn btn-ghost",
        text: "Delete",
        onclick: function () {
          S.mine = S.mine.filter(function (m) { return m.id !== id; });
          store.set("mine", S.mine);
          $("#lanternDlg").close();
          renderSea();
          toast("Lantern removed");
        }
      }));
    } else {
      row.appendChild(h("button", {
        type: "button",
        class: "btn btn-ghost",
        text: "Report / Block",
        onclick: function () {
          S.hidden.push(id);
          store.set("hidden", S.hidden);
          apiFetch("/api/lanterns/" + encodeURIComponent(id) + "/report", { method: "POST" }).catch(function () {});
          $("#lanternDlg").close();
          renderSea();
          toast("Hidden and reported");
        }
      }));
    }

    row.appendChild(h("button", {
      type: "button",
      class: "btn btn-ghost",
      style: "color:#ff8f70;",
      text: "Admin Delete",
      onclick: function () {
        var secret = store.get("adminSecret", "") || prompt("Enter developer admin password:");
        if (!secret) return;
        fetch("/api/admin/lanterns/" + encodeURIComponent(id), {
          method: "DELETE",
          headers: { "X-Admin-Secret": secret }
        }).then(function (r) {
          if (!r.ok) {
            store.set("adminSecret", "");
            toast("Wrong admin password");
            return;
          }
          store.set("adminSecret", secret);
          serverLanterns = serverLanterns.filter(function (s) { return s.id !== id; });
          S.hidden.push(id);
          store.set("hidden", S.hidden);
          $("#lanternDlg").close();
          renderSea();
          toast("Deleted from server");
        }).catch(function () {
          toast("Server unreachable");
        });
      }
    }));

    row.appendChild(h("button", { type: "button", class: "btn btn-ghost", text: "Close", onclick: function () { $("#lanternDlg").close(); } }));
    body.appendChild(row);
    var d = $("#lanternDlg"); if (!d.open) d.showModal();
  }

  function buildWall() {
    var tw = $("#wallTags");
    Object.keys(TAGCLS).forEach(function (t) { tw.appendChild(h("button", { type: "button", class: "chip", "data-t": t, "aria-pressed": String(t === S.wallTag), text: t, onclick: function () { S.wallTag = t; paintWallTags(); } })); });
    $("#wallText").addEventListener("input", function (e) { $("#wallCount").textContent = e.target.value.length + "/400"; $("#wallCrisis").hidden = true; $("#wallMsg").textContent = ""; });
    $("#composer").addEventListener("submit", function (e) { e.preventDefault(); submitPost(false); });
  }

  function paintWallTags() { $$("#wallTags .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.t === S.wallTag)); }); }

  function submitPost(force) {
    var ta = $("#wallText"), msg = $("#wallMsg"), text = ta.value.trim();
    if (text.length < 3) { msg.textContent = "Write a little more first."; return; }
    if (SAFETY_BLOCK.test(text)) {
      msg.textContent = "Please remove student IDs, phone numbers, or offensive words.";
      return;
    }
    if (!force && CRISIS.test(text)) {
      var box = $("#wallCrisis"); box.textContent = "";
      box.appendChild(crisisCard(h("div", { class: "row" }, h("a", { class: "btn btn-primary", href: "#ze", text: "Talk to Ze now" }), h("button", { type: "button", class: "btn", text: "Release anyway", onclick: function () { submitPost(true); } })))); box.hidden = false; return;
    }
    var id = "m" + Date.now().toString(36), o = { id: id, tag: S.wallTag, text: text.slice(0, 400), ts: Date.now(), light: 0, handle: pick(ADJ) + " " + pick(NOUN) };
    S.mine.unshift(o); store.set("mine", S.mine);
    apiFetch("/api/lanterns", { method: "POST", body: JSON.stringify(o) }).catch(function () {});
    ta.value = ""; $("#wallCount").textContent = "0/400"; $("#wallCrisis").hidden = true; msg.textContent = "";
    var l = h("div", { class: "lantern " + (TAGCLS[o.tag] || "glow") + " launch" }, h("span", { class: "cap t" }), h("span", { class: "paper" }, h("span", { class: "snip", text: o.text })), h("span", { class: "cap b" }), h("span", { class: "tassel" }));
    document.body.appendChild(l); setTimeout(function () { l.remove(); }, 3100);
    toast("Your lantern is rising"); award("lantern"); setTimeout(renderSea, 350);
  }

  /* ---------- exams ---------- */
  function examList() { var cut = Date.now() - 86400000; return S.exams.filter(function (x) { return x.at > cut; }).sort(function (a, b) { return a.at - b.at; }); }
  function leftText(at) { var d = at - Date.now(); if (d <= 0) return "Now"; var days = Math.floor(d / 86400000), hr = Math.floor((d % 86400000) / 3600000), mi = Math.floor((d % 3600000) / 60000); return days > 0 ? days + "d " + hr + "h" : hr > 0 ? hr + "h " + mi + "m" : mi + "m"; }
  function planText(at) {
    var days = Math.ceil((at - Date.now()) / 86400000);
    if (days > 7) return "Plan: first " + Math.round(days * 0.45) + " days learn the topics, next " + Math.round(days * 0.4) + " practise past questions, last " + (days - Math.round(days * 0.45) - Math.round(days * 0.4)) + " review and rest.";
    if (days > 2) return "Plan: " + (days - 2) + " days of practice questions, then one day of review and a calm night before.";
    return days >= 1 ? "Plan: light review only. Sleep, eat, pack your bag." : "Today: breathe, bring your ID, trust what you know.";
  }
  function renderExams() {
    var list = $("#examList"); list.textContent = ""; var items = examList();
    if (!items.length) list.appendChild(h("p", { class: "fine", text: "No exams added yet." }));
    items.forEach(function (x) {
      list.appendChild(h("div", { class: "exam-item" }, h("div", {}, h("b", { text: x.name }), h("span", { text: new Date(x.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })),
        h("div", { class: "row", style: "margin:0" }, h("span", { class: "left", text: leftText(x.at) }), h("button", { type: "button", class: "btn btn-sm btn-ghost", text: "Remove", "aria-label": "Remove " + x.name, onclick: function () { S.exams = S.exams.filter(function (y) { return y.id !== x.id; }); store.set("exams", S.exams); pushStateToServer(); renderExams(); } })), h("p", { class: "plan", text: planText(x.at) })));
    });
    var chip = $("#examChip"), nx = items[0];
    if (nx && nx.at - Date.now() < 14 * 86400000) { chip.hidden = false; chip.textContent = "Next exam in " + leftText(nx.at); } else chip.hidden = true;
  }
  function addExam(e) {
    e.preventDefault(); var name = $("#examName").value.trim(), at = new Date($("#examAt").value).getTime(), msg = $("#examMsg");
    if (!name || !isFinite(at)) { msg.textContent = "Add a name and a date."; return; }
    S.exams.push({ id: "e" + Date.now().toString(36), name: name.slice(0, 60), at: at }); store.set("exams", S.exams); pushStateToServer();
    $("#examName").value = ""; $("#examAt").value = ""; msg.textContent = "Added."; renderExams();
  }
  /* breathing dialog */
  var PAT = { box: { name: "Box 4-4-4-4", steps: [["Breathe in", 4, "in"], ["Hold", 4, "hold"], ["Breathe out", 4, "out"], ["Hold", 4, "hold"]] }, calm: { name: "Calm 4-7-8", steps: [["Breathe in", 4, "in"], ["Hold", 7, "hold"], ["Breathe out", 8, "out"]] } };
  var B = { run: false, t: null, cyc: 0, idx: 0, left: 0, max: 0, pat: "box" };
  function bStop(msg, done) {
    B.run = false; clearInterval(B.t); $("#bLabel").textContent = msg || "Ready"; $("#bCount").textContent = "";
    var o = $("#orb"); o.style.transitionDuration = "0.6s"; o.style.transform = "scale(.6)"; $("#bStart").textContent = "Start";
    if (done) { var g = $("#bGround"); g.hidden = false; }
  }
  function bStep() {
    var steps = PAT[B.pat].steps, st = steps[B.idx], o = $("#orb"), kind = st[2], reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("#bLabel").textContent = st[0]; B.left = st[1]; $("#bCount").textContent = String(B.left);
    o.style.transitionDuration = reduce || kind === "hold" ? "0s" : st[1] + "s";
    if (kind === "in") o.style.transform = "scale(1)"; if (kind === "out") o.style.transform = "scale(.6)";
    clearInterval(B.t);
    B.t = setInterval(function () {
      B.left--; if (B.left > 0) { $("#bCount").textContent = String(B.left); return; }
      clearInterval(B.t); B.idx++;
      if (B.idx >= steps.length) { B.idx = 0; B.cyc++; $("#bCycles").textContent = B.cyc + (B.cyc === 1 ? " round" : " rounds"); award("breathe"); if (B.max && B.cyc >= B.max) { bStop("Well done. Now look around and name five things you can see.", true); return; } }
      bStep();
    }, 1000);
  }
  function bStart(max) { if (B.run) { bStop(); return; } B.run = true; B.cyc = 0; B.idx = 0; B.max = max || 0; $("#bCycles").textContent = ""; $("#bGround").hidden = true; $("#bStart").textContent = "Stop"; bStep(); }
  function openBreath(autoRounds) {
    var d = $("#breathDlg"); if (!d.open) d.showModal(); bStop(); $("#bCycles").textContent = ""; $("#bGround").hidden = true;
    if (autoRounds) { B.pat = "box"; paintPatterns(); setTimeout(function () { bStart(autoRounds); }, 300); }
  }
  function paintPatterns() { $$("#patterns .chip").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === B.pat)); }); }
  function buildBreath() {
    var pw = $("#patterns");
    Object.keys(PAT).forEach(function (k) { pw.appendChild(h("button", { type: "button", class: "chip", "data-k": k, "aria-pressed": String(k === B.pat), text: PAT[k].name, onclick: function () { if (B.run) bStop(); B.pat = k; paintPatterns(); } })); });
    $("#bStart").addEventListener("click", function () { bStart(0); });
    $("#bClose").addEventListener("click", function () { $("#breathDlg").close(); });
    $("#breathDlg").addEventListener("close", function () { bStop(); });
    buildChecklist("#bGround", ["5 things you can see", "4 things you can touch", "3 things you can hear", "2 things you can smell", "1 slow breath, and 1 thing you like about today"], null, null);
    $("#bGround").hidden = true;
    $("#panicBtn").addEventListener("click", function () { openBreath(3); });
    $("#breatheBtn").addEventListener("click", function () { openBreath(0); });
    $$('[data-act="breathe"]').forEach(function (b) { b.addEventListener("click", function () { openBreath(3); }); });
  }
  /* focus timer */
  var T = { mode: "focus", rem: 25 * 60000, run: false, end: 0, iv: null, audio: null };
  var tLen = function () { return (T.mode === "focus" ? 25 : 5) * 60000; };
  function tPaint() {
    var s = Math.max(0, Math.ceil(T.rem / 1000)); $("#tDisplay").textContent = pad(Math.floor(s / 60)) + ":" + pad(s % 60);
    var done = S.pomo[today()] || 0; $("#tInfo").textContent = (T.mode === "focus" ? "Focus round" : "Break") + " · " + done + " focus " + (done === 1 ? "round" : "rounds") + " done today"; $("#tStart").textContent = T.run ? "Pause" : "Start";
  }
  function beep() { try { if (!T.audio) return; var o = T.audio.createOscillator(), g = T.audio.createGain(); o.frequency.value = 660; g.gain.value = 0.08; o.connect(g); g.connect(T.audio.destination); o.start(); o.stop(T.audio.currentTime + 0.35); } catch (e) {} }
  function tTick() {
    T.rem = T.end - Date.now();
    if (T.rem <= 0) { clearInterval(T.iv); T.run = false; beep(); if (T.mode === "focus") { S.pomo[today()] = (S.pomo[today()] || 0) + 1; store.set("pomo", S.pomo); pushStateToServer(); award("focus"); } T.mode = T.mode === "focus" ? "break" : "focus"; T.rem = tLen(); }
    tPaint();
  }
  function buildTimer() {
    $("#tStart").addEventListener("click", function () {
      if (T.run) { clearInterval(T.iv); T.run = false; T.rem = T.end - Date.now(); tPaint(); return; }
      try { if (!T.audio) T.audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      T.run = true; T.end = Date.now() + T.rem; clearInterval(T.iv); T.iv = setInterval(tTick, 250); tPaint();
    });
    $("#tReset").addEventListener("click", function () { clearInterval(T.iv); T.run = false; T.mode = "focus"; T.rem = tLen(); tPaint(); });
    tPaint();
  }
  function buildChecklist(id, items, key, reset) {
    var ul = $(id), state = key ? store.get(key, {}) : {}; ul.textContent = "";
    items.forEach(function (t, i) { var b = h("button", { type: "button", "aria-pressed": String(!!state[i]), text: t }); b.addEventListener("click", function () { state[i] = !state[i]; b.setAttribute("aria-pressed", String(!!state[i])); if (key) store.set(key, state); }); ul.appendChild(h("li", {}, b)); });
    if (reset) $(reset).onclick = function () { state = {}; if (key) store.set(key, state); $$("button", ul).forEach(function (b) { b.setAttribute("aria-pressed", "false"); }); };
  }

  /* ---------- Ze ---------- */
  var PROMPT = [
    "You are \"Ze\", a warm, steady AI companion for university students at Yuan Ze University (YZU) in Taoyuan, Taiwan. You are not a therapist, doctor or crisis service, and you never claim to be one. Your job is to help the student feel heard, think a little more clearly, and take one small next step.",
    "", "How you talk",
    "- Reply in the language the student writes in (English, Traditional Chinese, or a mix). Sound like a kind older classmate: plain words, no jargon, no lectures.",
    "- Keep replies short: 2 to 5 sentences. Reflect what you heard first, then ask at most one gentle question.",
    "- Do not rush to fix things. Offer one small idea at a time (a breathing exercise, a 5-4-3-2-1 grounding round, a 10-minute start on a task, splitting a big task, a plan for sleep, messaging a friend) and ask if they want it.",
    "- Use ideas from CBT, behavioural activation and mindfulness in everyday words. Never argue with their feelings.",
    "- You understand Taiwanese student life: midterms and finals, group projects, credit pressure, graduate school and job worries, family expectations, money, homesickness, dorm life, relationships, sleep and screen habits.",
    "", "Boundaries",
    "- No diagnoses, no medication or dosage advice, no promises about outcomes. For eating, sleep or substance problems, stay supportive and encourage seeing a professional. Give no numbers for calories, weights or doses.",
    "- Do not help with cheating. Do help with honest studying: planning, active recall, spaced practice, rest.",
    "- Ask students not to share full names, student ID numbers or other identifying details. Do not promise confidentiality.",
    "- Encourage human support: friends, family, tutors (導師), and the YZU Student Affairs counselling team (諮就組).",
    "", "Safety first",
    "If the student mentions suicide, wanting to die, self-harm, abuse, or being in danger:",
    "1. Stay calm and warm and take it seriously. Ask directly and kindly whether they are thinking about ending their life, and whether they are safe right now.",
    "2. Never say that wanting to die makes sense or is a choice to respect. Say that the pain and exhaustion are real and that you want them to stay safe.",
    "3. Share Taiwan resources: 1925 (free mental health line, 24 hours), 1995 (Lifeline, 24 hours), 1980 (Teacher Chang), 113 (protection line for abuse or violence). If they are in immediate danger: 110 for police or 119 for an ambulance.",
    "4. Encourage them to tell someone nearby right now (a roommate, friend, family member, teacher or campus security). Offer to stay and talk while they reach out.",
    "5. Never give methods, never write goodbye notes or messages meant to be read after death, and never agree to keep it secret.",
    "", "Start by greeting the student briefly and asking how they are doing today."
  ].join("\n");
  var DEMO = [
    { re: /(exam|midterm|final|test|quiz|考試|期中|期末)/i, a: ["Exam weeks can feel like everything lands at once. That pressure is real, and it does not mean you are not prepared.", "Here is one small thing: pick the single topic that worries you most and give it 10 focused minutes, then stop. Starting usually shrinks the fear.", "Which subject is taking up the most space in your head right now?"] },
    { re: /(sleep|tired|insomnia|awake|睡|失眠|累)/i, a: ["Being short on sleep makes everything feel heavier, so I am not surprised you feel this way.", "Tonight you could try a brain dump: write tomorrow's worries on paper with one next step each, then close the notebook. The Library has a full guide on this.", "Do you know what usually keeps you up, thoughts or screens?"] },
    { re: /(lonely|alone|no friends|homesick|miss home|孤單|寂寞|想家)/i, a: ["Feeling alone, especially far from home, is really hard. Thank you for putting it into words.", "A tiny step that often helps: message one person, even just a meme or a 'thinking of you'. Connection can start very small.", "Is there someone you used to feel close to that you could reach out to?"] },
    { re: /(anxious|anxiety|panic|nervous|scared|worried|緊張|焦慮|恐慌|害怕)/i, a: ["That sounds like a lot of tension in your body and mind. It makes sense to want it to ease.", "Try breathing out slowly for longer than you breathe in. In for 4, out for 6, a few times. You can also open the Breathe tool at the top of this page.", "What is the worry that keeps coming back the most?"] },
    { re: /(group|team|project|teammate|同學|組員|報告)/i, a: ["Group work stress is its own kind of tiring, especially when you feel responsible for everyone.", "It can help to write down who does what and by when, in a short message to the group. Talking about the task, not the person, keeps it calmer.", "What is the part that is bothering you most, the workload or how people are acting?"] },
    { re: /(family|parent|mom|mum|dad|expectation|家人|爸|媽|期待)/i, a: ["Family expectations can weigh a lot, even when they come from love.", "It might help to separate what you want from what you think they want, just on paper first. You do not have to decide anything tonight.", "Would it help to think through how you might talk to them?"] },
    { re: /(money|rent|broke|tuition|錢|學費|經濟)/i, a: ["Money stress follows you everywhere, and it is hard to focus when it is on your mind.", "A small step is to write down the one money decision that is due soonest. The campus offices can often help with aid and part-time work, and your tutor can point you to them.", "Is it more of a this-month problem or a longer-term worry?"] },
    { re: /(thank|thanks|謝謝)/i, a: ["I am really glad it helped. You did the hard part by showing up and saying how you feel.", "Take one gentle thing for yourself tonight, even if it is just a glass of water.", "Is there anything else on your mind before you go?"] },
    { re: /(vent|just need|rant|tired of|sick of|煩|崩潰)/i, a: ["I am here. You can say all of it, no tidying needed.", "I will just listen for now, and if you want ideas later, tell me.", "What happened today?"] }
  ];
  var DEMO_DEFAULT = [["Thank you for telling me. I am listening, and what you feel makes sense.", "If it helps, we can slow things down: tell me the one part that feels heaviest right now.", "What would feel like a small relief tonight?"], ["That sounds like a lot to carry. I am glad you are not holding it completely alone.", "We can pick one small step together, like a short break, a message to someone, or just writing down what is going on.", "What would feel most doable?"]];
  function demoReply(text, share) {
    if (CRISIS.test(text)) return "I am really glad you told me. What you are feeling sounds very painful, and I want you to stay safe. Are you thinking about ending your life, and are you safe right now? Please reach a person now: call 1925 (free, 24 hours) or 1995 (Lifeline, 24 hours). If you are in immediate danger call 110 or 119. If you can, tell someone near you, like a roommate, friend or teacher. I am here and will stay with you while you reach out.";
    var found = null; for (var i = 0; i < DEMO.length; i++) if (DEMO[i].re.test(text)) { found = i; break; }
    var parts, key; if (found == null) { key = "d"; parts = DEMO_DEFAULT[(S.zeIdx[key] = (S.zeIdx[key] || 0) + 1) % DEMO_DEFAULT.length]; } else parts = DEMO[found].a;
    var out = parts.join("\n\n");
    if (share && S.checkins[today()]) { var e = S.checkins[today()]; out = "I see today you marked " + D.weather[e.mood - 1].name.toLowerCase() + (e.stress >= 4 ? " with a lot of wind" : "") + ". " + out; }
    return out;
  }
  function logAdd(role, text) { var log = $("#log"), b = h("div", { class: "bubble " + role }, h("small", { text: role === "me" ? "You" : role === "ze" ? "Ze" : "Notice" }), document.createTextNode(text)); log.appendChild(b); log.scrollTop = log.scrollHeight; return b; }
  function zeMode() {}
  function chatReset(skipServer) { S.chat = []; $("#log").textContent = ""; $("#chatCrisis").hidden = true; $("#starters").hidden = false; logAdd("ze", "Hi, I'm Ze. How are you doing today? Chinese or English is fine, and you can start anywhere."); if (!skipServer) pushChatToServer(true); }
  async function sendChat(text) {
    text = (text || "").trim(); if (S.busy || !text) return; $("#starters").hidden = true;
    if (CRISIS.test(text)) { var cc = $("#chatCrisis"); cc.textContent = ""; cc.appendChild(crisisCard()); cc.hidden = false; }
    logAdd("me", text); S.chat.push({ role: "user", content: text }); $("#chatInput").value = "";
    S.busy = true; $("#sendBtn").disabled = true; var share = $("#shareCheckin").checked, bub = logAdd("ze", "…");
    try {
      var reply;
      if (S.ai.provider !== "demo" && S.ai.key && S.ai.base) {
        var sys = PROMPT + "\n\n(This chat runs inside a website for YZU students. Keep each reply under about 120 words.)", e = S.checkins[today()];
        if (share && e) sys += "\n\nThe student shared today's check-in: mood " + e.mood + "/5 (" + D.weather[e.mood - 1].name + "), stress " + (e.stress || "not given") + "/5, sleep " + (e.sleep == null ? "not given" : e.sleep + " hours") + (e.tags && e.tags.length ? ", on their mind: " + e.tags.join(", ") : "") + ". Use it gently; do not recite it back.";
        var res = await fetch(S.ai.base.replace(/\/+$/, "") + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + S.ai.key }, body: JSON.stringify({ model: S.ai.model || "gpt-4o-mini", temperature: 0.7, max_tokens: 320, messages: [{ role: "system", content: sys }].concat(S.chat.slice(-20)) }) });
        if (!res.ok) throw new Error(res.status === 401 ? "The key was not accepted." : res.status === 429 ? "Too many requests or the key's limit was reached." : "The AI service returned an error (" + res.status + ").");
        var j = await res.json(); reply = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!reply) throw new Error("The AI service sent an empty reply.");
      } else { await new Promise(function (r) { setTimeout(r, 700 + Math.random() * 500); }); reply = demoReply(text, share); }
      bub.lastChild.textContent = reply.trim(); S.chat.push({ role: "assistant", content: reply.trim() }); pushChatToServer(false);
    } catch (err) { bub.remove(); logAdd("err", (err && err.message ? err.message : "Something went wrong.") + " You can switch back to demo replies in the settings below."); if (S.chat.length && S.chat[S.chat.length - 1].role === "user") S.chat.pop(); }
    S.busy = false; $("#sendBtn").disabled = false; $("#log").scrollTop = $("#log").scrollHeight;
  }
  var PRESETS = { openai: { base: "https://api.openai.com/v1", model: "gpt-4o-mini" }, xai: { base: "https://api.x.ai/v1", model: "grok-3-mini" }, custom: { base: "", model: "" } };
  function buildZe() {
    var st = $("#starters"); ["I'm stressed about midterms", "I can't sleep", "I feel lonely at school", "I just need to vent"].forEach(function (t) { st.appendChild(h("button", { type: "button", class: "chip", text: t, onclick: function () { sendChat(t); } })); });
    $("#chatForm").addEventListener("submit", function (e) { e.preventDefault(); sendChat($("#chatInput").value); });
    $("#chatInput").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendChat($("#chatInput").value); } });
    $("#newChat").addEventListener("click", chatReset); chatReset();
    var sel = $("#aiProvider"); sel.value = S.ai.provider; $("#aiBase").value = S.ai.base || ""; $("#aiModel").value = S.ai.model || ""; $("#aiKey").value = S.ai.key || "";
    sel.addEventListener("change", function () { var p = PRESETS[sel.value]; if (p) { $("#aiBase").value = p.base; $("#aiModel").value = p.model; } });
    $("#aiSave").addEventListener("click", function () { S.ai = { provider: sel.value, base: $("#aiBase").value.trim(), model: $("#aiModel").value.trim(), key: $("#aiKey").value.trim() }; store.set("ai", S.ai); $("#aiMsg").textContent = "Saved on this device."; zeMode(); });
    $("#aiClear").addEventListener("click", function () { S.ai = { provider: "demo", base: "", model: "", key: "" }; store.set("ai", S.ai); sel.value = "demo"; $("#aiKey").value = ""; $("#aiBase").value = ""; $("#aiModel").value = ""; $("#aiMsg").textContent = "Key removed."; zeMode(); });
    zeMode();
  }

  /* ---------- library ---------- */
  function guideProgress() { return store.get("gp", {}); }
  function renderLibrary() {
    var gp = guideProgress(), tw = $("#libTopics"); tw.textContent = "";
    var topics = ["All"]; D.guides.forEach(function (g) { if (topics.indexOf(g.topic) < 0) topics.push(g.topic); });
    topics.forEach(function (t) { tw.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": String(S.libTopic === t), text: t, onclick: function () { S.libTopic = t; renderLibrary(); } })); });
    var q = S.libQ.toLowerCase(), grid = $("#guideGrid"); grid.textContent = "";
    var list = D.guides.filter(function (g) { return (S.libTopic === "All" || g.topic === S.libTopic) && (!q || (g.title + " " + g.topic + " " + g.steps.join(" ")).toLowerCase().indexOf(q) >= 0); });
    if (!list.length) grid.appendChild(h("div", { class: "empty" }, h("b", { text: "No guides match" }), "Try another word, like sleep or exam."));
    list.forEach(function (g) {
      var done = Object.keys(gp[g.id] || {}).filter(function (k) { return gp[g.id][k]; }).length, pct = Math.round(done / g.steps.length * 100);
      var c = h("button", { type: "button", class: "gcard" }, h("span", { class: "tag", style: "--lc:var(--mint)", text: g.topic }), h("h3", { text: g.title }), h("div", { class: "meta" }, h("span", { text: g.min + " min" }), h("span", { text: g.steps.length + " steps" }), h("span", { text: done ? done + " done" : "" })), h("div", { class: "prog" }, h("i", { style: "width:" + pct + "%" })));
      c.addEventListener("click", function () { openGuide(g.id); }); grid.appendChild(c);
    });
  }
  function openGuide(id) {
    var g = D.guides.filter(function (x) { return x.id === id; })[0], gp = guideProgress(), body = $("#guideBody"); body.textContent = "";
    body.appendChild(h("span", { class: "tag", style: "--lc:var(--mint);width:fit-content", text: g.topic }));
    body.appendChild(h("h2", { id: "gdTitle", text: g.title }));
    body.appendChild(h("p", { class: "sub", text: g.min + " min" }));
    var ul = h("ul", { class: "steps" });
    g.steps.forEach(function (s, i) { var on = !!(gp[g.id] && gp[g.id][i]), b = h("button", { type: "button", "aria-pressed": String(on), text: s }); b.addEventListener("click", function () { gp[g.id] = gp[g.id] || {}; gp[g.id][i] = !gp[g.id][i]; store.set("gp", gp); b.setAttribute("aria-pressed", String(!!gp[g.id][i])); renderLibrary(); }); ul.appendChild(h("li", {}, b)); });
    body.appendChild(ul); body.appendChild(h("p", { class: "fine", text: g.note }));
    body.appendChild(h("div", { class: "row" }, h("a", { class: "btn btn-sm", href: "#ze", text: "Talk this through with Ze", onclick: function () { $("#guideDlg").close(); } }), h("button", { type: "button", class: "btn btn-sm btn-ghost", text: "Close", onclick: function () { $("#guideDlg").close(); } })));
    var d = $("#guideDlg"); if (!d.open) d.showModal();
  }
  function buildLibrary() {
    var ul = $("#hotlines"); D.hotlines.forEach(function (x) { ul.appendChild(h("li", {}, h("a", { class: "tel", href: "tel:" + x.n, text: x.n }), h("span", {}, h("b", { text: x.t }), h("small", { text: x.d })))); });
    $("#libSearch").addEventListener("input", function (e) { S.libQ = e.target.value.trim(); renderLibrary(); });
  }

  /* ---------- pulse ---------- */
  function renderPulse() {
    var P = D.pulse, n = P.weeks.length, stats = $("#pulseStats"); stats.textContent = "";
    var total = P.groups.reduce(function (s, g) { return s + g.n; }, 0), worst = P.stress.indexOf(Math.max.apply(null, P.stress));
    [[String(total), "sample check-ins this term"], [f1(P.mood[n - 1]), "latest weekly mood"], [f1(P.stress[n - 1]), "latest weekly stress"], [P.weeks[worst], "highest-stress week"]].forEach(function (p) { stats.appendChild(h("div", { class: "stat" }, h("b", { text: p[0] }), h("span", { text: p[1] }))); });
    var box = $("#pulseChart"); box.textContent = "";
    var W = Math.max(300, Math.floor(box.clientWidth || 700)), L = 40, R = 16, T = 14, B = 36, H = 250, pw = W - L - R, ph = H - T - B;
    var xAt = function (i) { return L + (i + 0.5) * pw / n; }, yAt = function (v) { return T + (5 - v) * ph / 4; };
    var svg = document.createElementNS(svgNS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Weekly average mood and stress with exam weeks shaded");
    P.exam.forEach(function (i) { el(svg, "rect", { x: L + i * pw / n, y: T, width: pw / n, height: ph, fill: "var(--rose)", opacity: ".22", rx: 6 }); });
    [1, 2, 3, 4, 5].forEach(function (v) { el(svg, "line", { class: "grid", x1: L, x2: W - R, y1: yAt(v), y2: yAt(v) }); el(svg, "text", { x: L - 8, y: yAt(v) + 4, "text-anchor": "end" }, String(v)); });
    P.weeks.forEach(function (w, i) { el(svg, "text", { x: xAt(i), y: H - 12, "text-anchor": "middle" }, w); });
    var line = function (arr, stroke, dash) { var d = ""; arr.forEach(function (v, i) { d += (i ? "L" : "M") + xAt(i).toFixed(1) + " " + yAt(v).toFixed(1) + " "; }); el(svg, "path", { d: d, fill: "none", stroke: stroke, "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": dash || "" }); arr.forEach(function (v, i) { var c = el(svg, "circle", { cx: xAt(i), cy: yAt(v), r: 4, fill: stroke }); var t = document.createElementNS(svgNS, "title"); t.textContent = P.weeks[i] + ": " + v; c.appendChild(t); }); };
    line(P.stress, "var(--blue)", "6 6"); line(P.mood, "var(--gold)");
    box.appendChild(svg);
    var bars = $("#pulseBars"); bars.textContent = ""; P.sources.forEach(function (s) { bars.appendChild(h("div", { class: "bar" }, h("span", { text: s[0] }), h("i", { style: "width:" + s[1] / P.sources[0][1] * 100 + "%" }), h("span", { class: "v", text: s[1] + "%" }))); });
    var tb = $("#pulseTable"); tb.textContent = ""; tb.appendChild(h("tr", {}, h("th", { text: "College" }), h("th", { text: "Students" }), h("th", { text: "Mood" }), h("th", { text: "Stress" })));
    P.groups.forEach(function (g) { var hid = g.n < 10; tb.appendChild(h("tr", {}, h("td", { text: g.name }), h("td", { text: String(g.n) }), hid ? h("td", { class: "muted", colspan: "2", text: "Hidden: fewer than 10 students" }) : h("td", { text: f1(g.mood) }), hid ? null : h("td", { text: f1(g.stress) }))); });
    var acts = $("#pulseActs"); acts.textContent = "";
    ["Peak stress in W5 & W10 (exam weeks).", "Sleep is a top-3 stressor.", "Groups under 10 are hidden for anonymity."].forEach(function (t) { acts.appendChild(h("li", { text: t })); });
  }

  /* ---------- about ---------- */
  function renderAbout() {
    var s = $("#sdgs"); s.textContent = "";
    D.sdgs.forEach(function (g) { s.appendChild(h("div", { class: "sdg", style: "background:" + g.color + ";color:" + g.ink }, h("div", { class: "n", text: "SDG " + g.n }), h("h3", { text: g.name }), h("p", { text: g.target }), h("p", { text: g.how }))); });
    var mods = [["Daily check-in and inner weather", 1], ["Sky journal and constellation", 1], ["Anonymous lantern wall", 1], ["Exam quest, timer and breathing", 1], ["Ze companion (demo and optional AI)", 1], ["Quick-guide library and hotlines", 1], ["Campus pulse dashboard (sample data)", 1], ["Shared database and student accounts", 0], ["Admin moderation page", 0]];
    var done = mods.filter(function (m) { return m[1]; }).length; $("#progLine").textContent = done + " / " + mods.length + " modules live (" + Math.round(done / mods.length * 100) + "%)";
    var m = $("#mods"); m.textContent = ""; mods.forEach(function (x) { m.appendChild(h("div", { class: "mod" + (x[1] ? "" : " todo") }, h("i"), document.createTextNode(x[0]), h("small", { text: x[1] ? "working" : "next" }))); });
    var plan = [["Today", ["Greeting + moon phase", "Inner weather check-in form", "Tonight's thought, quests, quick actions"]], ["Sky journal", ["Stats tiles", "Constellation chart", "Five-week sky + insights"]], ["Lanterns", ["Write and release a lantern", "Lantern sky with filters", "Open, light with a hug, report"]], ["Exam quest", ["Daily quests and levels", "Exam countdowns + plan", "Timer, breathing, grounding"]], ["Talk to Ze", ["Chat window", "Crisis card on risk words", "Optional AI key settings"]], ["Library", ["Hotlines", "Search and topics", "Step-by-step guides"]], ["Campus pulse", ["Weekly mood and stress chart", "Topics and colleges", "Privacy rule: hide groups under 10"]], ["About", ["SDG mapping", "Progress and page plan", "Roadmap and safety"]]];
    var p = $("#plan"); p.textContent = ""; plan.forEach(function (x) { var w = h("div", { class: "wire" }, h("b", { text: x[0] })); x[1].forEach(function (t) { w.appendChild(h("div", { class: "blk", text: t })); }); p.appendChild(w); });
    var rm = $("#roadmap"); rm.textContent = ""; [["Server and database.", "Node.js with a real database so lanterns are shared between students."], ["Student accounts.", "Sign-in with a school email, with nicknames kept apart from identities."], ["Moderation.", "An admin page to review reported lanterns."], ["Traditional Chinese interface.", "A language toggle across every page."], ["Real campus pulse.", "Opt-in anonymous data with the hide-small-groups rule."]].forEach(function (x) { rm.appendChild(h("li", {}, h("b", { text: x[0] + " " }), document.createTextNode(x[1]))); });
    var sf = $("#safety"); sf.textContent = ""; ["Risk words open a hotline card on the wall and in chat.", "Ze is clearly labelled as an AI companion, never a therapist.", "No names, no student IDs, no tracking. Data stays on the device in this version.", "Campus numbers are hidden for groups under 10 students.", "Reduced-motion and keyboard friendly."].forEach(function (t) { sf.appendChild(h("li", { text: t })); });
  }

  HL.restoreHorizon = function () { var e = S.checkins[today()]; HL.sky.setHorizon(e ? HORIZON[e.mood] : "#FFA070"); };
  /* ---------- theme + routing ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-sky", t); $("#themeBtn").setAttribute("aria-pressed", String(t === "dawn")); $("#themeLabel").textContent = t === "dawn" ? "Night" : "Dawn";
    HL.sky.refresh();
  }
  var VIEWS = ["home", "today", "sky", "lanterns", "exams", "ze", "library", "pulse", "about"];
  function route() {
    var name = (location.hash || "#home").slice(1); if (name === "main") return; if (VIEWS.indexOf(name) < 0) name = "home";
    $$(".view").forEach(function (v) { v.hidden = v.dataset.view !== name; });
    $$(".tabs a").forEach(function (a) { if (a.dataset.nav === name) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ inline: "center", block: "nearest" }); } else a.removeAttribute("aria-current"); });
    if (HL.scrollToTop) HL.scrollToTop(); else window.scrollTo(0, 0);
    if (name === "sky") renderSky(); if (name === "exams") { renderExams(); renderQuests(); } if (name === "lanterns") renderSea();
    if (name === "pulse") renderPulse(); if (name === "library") renderLibrary();
    if (name === "home") { drawMoon($("#heroMoon"), moonPhase(new Date())); } else HL.restoreHorizon();
    if (HL.reveal) HL.reveal($(".view:not([hidden])"));
    if (HL.storyUpdate) HL.storyUpdate();
    document.title = (name === "today" || name === "home" ? "" : name.charAt(0).toUpperCase() + name.slice(1) + " · ") + "Heart Lantern 心燈";
  }
  function dlgBackdrop(id) { var d = $(id); d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); }

  function boot() {
    paintHello(); buildForm(); paintForm(); buildWall(); buildBreath(); buildTimer(); buildZe(); buildLibrary(); renderAbout();
    buildChecklist("#ground", ["5 things you can see", "4 things you can touch", "3 things you can hear", "2 things you can smell", "1 slow breath, and 1 thing you like about today"], null, "#groundReset");
    buildChecklist("#checklist", ["Student ID card (學生證)", "Pens, pencils and a calculator if allowed", "Water and a light snack", "Know the room and how long it takes to get there", "Phone silenced and stored as the rules say", "Sleep before cramming"], "check", "#checkReset");
    $("#examForm").addEventListener("submit", addExam);
    $("#examLantern").addEventListener("click", function () { S.wallTag = "Exam stress"; paintWallTags(); location.hash = "#lanterns"; });
    $("#exportBtn").addEventListener("click", exportData); $("#wipeBtn").addEventListener("click", wipe);
    $("#themeBtn").addEventListener("click", function () { var t = document.documentElement.getAttribute("data-sky") === "dawn" ? "night" : "dawn"; store.set("theme", t); applyTheme(t); renderSky(); });
    ["#lanternDlg", "#guideDlg", "#breathDlg"].forEach(dlgBackdrop);
    window.addEventListener("hashchange", route);
    var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (!$("#v-sky").hidden) renderSky(); if (!$("#v-pulse").hidden) renderPulse(); }, 150); });
    setInterval(renderExams, 60000);
    applyTheme(store.get("theme", "night"));
    paintTonight(); renderQuests(); renderExams(); hydrateToday();
    if (!S.checkins[today()]) HL.sky.setHorizon("#FFA070");
    mountSyncCard();
    pullStateFromServer();
    route();
  }
  boot();
})();
