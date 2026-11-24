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
        text: "Delete my lantern",
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
          toast("Hidden and reported for review");
        }
      }));
    }

    // Developer Admin Delete button
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
          toast("Deleted from server by Admin");
        }).catch(function () {
          toast("Could not connect to server");
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
      msg.textContent = "Please remove student IDs, phone numbers, or offensive words before releasing.";
      return;
    }
    if (!force && CRISIS.test(text)) {
      var box = $("#wallCrisis"); box.textContent = "";
      box.appendChild(crisisCard(h("div", { class: "row" }, h("a", { class: "btn btn-primary", href: "#ze", text: "Talk to Ze now" }), h("button", { type: "button", class: "btn", text: "Release it anyway", onclick: function () { submitPost(true); } })))); box.hidden = false; return;
    }
    var id = "m" + Date.now().toString(36), o = { id: id, tag: S.wallTag, text: text.slice(0, 400), ts: Date.now(), light: 0, handle: pick(ADJ) + " " + pick(NOUN) };
    S.mine.unshift(o); store.set("mine", S.mine);
    apiFetch("/api/lanterns", { method: "POST", body: JSON.stringify(o) }).catch(function () {});
    ta.value = ""; $("#wallCount").textContent = "0/400"; $("#wallCrisis").hidden = true; msg.textContent = "";
    var l = h("div", { class: "lantern " + (TAGCLS[o.tag] || "glow") + " launch" }, h("span", { class: "cap t" }), h("span", { class: "paper" }, h("span", { class: "snip", text: o.text })), h("span", { class: "cap b" }), h("span", { class: "tassel" }));
    document.body.appendChild(l); setTimeout(function () { l.remove(); }, 3100);
    toast("Your lantern is rising"); award("lantern"); setTimeout(renderSea, 350);
  }