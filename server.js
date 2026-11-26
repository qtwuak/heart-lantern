/* Heart Lantern 心燈 — Full-Stack Node.js + Express Backend */
"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const ADMIN_SECRET = process.env.ADMIN_SECRET || "yzu-nomin-2026";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Failed to read DB, initializing fresh store:", err);
  }
  return { users: {}, lanterns: [] };
}

let db = loadDB();
let saveTimeout = null;

function saveDB() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const tmp = DB_FILE + ".tmp";
    fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8", (err) => {
      if (!err) fs.rename(tmp, DB_FILE, () => {});
    });
  }, 150);
}

function getUserBucket(syncKey) {
  const cleanKey = String(syncKey || "default").trim().slice(0, 80);
  if (!db.users[cleanKey]) {
    db.users[cleanKey] = {
      checkins: {},
      exams: [],
      quests: {},
      xp: 0,
      pomo: {},
      chat: [],
      updatedAt: Date.now()
    };
    saveDB();
  }
  return db.users[cleanKey];
}

// Server-side safety check against student IDs, phone numbers & slurs
const PII_OR_ABUSE = /\b([sS]?1[0-4]\d{5,6}|09\d{2}[-\s]?\d{3}[-\s]?\d{3})\b|(fuck|bitch|slut|whore|kys|幹你娘|靠北|去死|白痴|智障)/i;

app.use(express.json({ limit: "1mb" }));

app.use(express.static(__dirname, {
  extensions: ["html"],
  index: "index.html"
}));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/state", (req, res) => {
  const key = req.headers["x-sync-key"] || req.query.key;
  if (!key) return res.status(400).json({ error: "Missing sync key" });
  const user = getUserBucket(key);
  res.json({
    checkins: user.checkins,
    exams: user.exams,
    quests: user.quests,
    xp: user.xp,
    pomo: user.pomo,
    chat: user.chat
  });
});

app.post("/api/state", (req, res) => {
  const key = req.headers["x-sync-key"] || req.body.key;
  if (!key) return res.status(400).json({ error: "Missing sync key" });
  const user = getUserBucket(key);
  const body = req.body || {};

  if (body.checkins && typeof body.checkins === "object") {
    user.checkins = Object.assign({}, user.checkins, body.checkins);
  }
  if (Array.isArray(body.exams)) {
    user.exams = body.exams.slice(0, 50);
  }
  if (body.quests && typeof body.quests === "object") {
    user.quests = Object.assign({}, user.quests, body.quests);
  }
  if (typeof body.xp === "number") {
    user.xp = Math.max(user.xp || 0, body.xp);
  }
  if (body.pomo && typeof body.pomo === "object") {
    user.pomo = Object.assign({}, user.pomo, body.pomo);
  }
  user.updatedAt = Date.now();
  saveDB();
  res.json({ ok: true, updatedAt: user.updatedAt });
});

app.post("/api/chat", (req, res) => {
  const key = req.headers["x-sync-key"] || req.body.key;
  if (!key) return res.status(400).json({ error: "Missing sync key" });
  const user = getUserBucket(key);

  if (req.body && req.body.reset) {
    user.chat = [];
  } else if (Array.isArray(req.body.chat)) {
    user.chat = req.body.chat.slice(-60);
  }
  user.updatedAt = Date.now();
  saveDB();
  res.json({ ok: true, count: user.chat.length });
});

// Get shared community lanterns (excluding hidden ones)
app.get("/api/lanterns", (req, res) => {
  const visible = db.lanterns.filter((l) => !l.hidden).slice(0, 100);
  res.json({ lanterns: visible });
});

// Create new lantern with privacy/safety validation
app.post("/api/lanterns", (req, res) => {
  const { id, tag, text, handle } = req.body || {};
  const cleanText = String(text || "").trim();
  if (cleanText.length < 3) {
    return res.status(400).json({ error: "Lantern text too short" });
  }
  if (PII_OR_ABUSE.test(cleanText)) {
    return res.status(400).json({ error: "Contains personal ID, phone number, or inappropriate language." });
  }
  const lantern = {
    id: id || "srv_" + crypto.randomBytes(5).toString("hex"),
    tag: String(tag || "Venting").slice(0, 32),
    text: cleanText.slice(0, 400),
    handle: String(handle || "Quiet Lantern").slice(0, 40),
    ts: Date.now(),
    light: 0,
    reports: 0,
    hidden: false
  };
  db.lanterns.unshift(lantern);
  db.lanterns = db.lanterns.slice(0, 150);
  saveDB();
  res.json({ ok: true, lantern });
});

// Light a lantern with a hug
app.post("/api/lanterns/:id/light", (req, res) => {
  const item = db.lanterns.find((l) => l.id === req.params.id);
  if (item) {
    item.light = (item.light || 0) + 1;
    saveDB();
  }
  res.json({ ok: true, light: item ? item.light : 1 });
});

// Report inappropriate lantern (auto-hides after 3 reports)
app.post("/api/lanterns/:id/report", (req, res) => {
  const item = db.lanterns.find((l) => l.id === req.params.id);
  if (item) {
    item.reports = (item.reports || 0) + 1;
    if (item.reports >= 3) {
      item.hidden = true;
    }
    saveDB();
  }
  res.json({ ok: true });
});

// Developer / Admin permanent delete endpoint
app.delete("/api/admin/lanterns/:id", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Invalid developer password" });
  }
  const before = db.lanterns.length;
  db.lanterns = db.lanterns.filter((l) => l.id !== req.params.id);
  saveDB();
  res.json({ ok: true, deleted: before !== db.lanterns.length });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Heart Lantern 心燈 server running at http://localhost:${PORT}`);
});