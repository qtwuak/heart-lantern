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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Lightweight persistent database with atomic writes
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

app.use(express.json({ limit: "1mb" }));

// Serve static frontend files (index.html, css/, js/)
app.use(express.static(__dirname, {
  extensions: ["html"],
  index: "index.html"
}));

// Health check for Render / Railway
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Get full user state (sleep logs, check-ins, exams, XP, chat history)
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

// Sync user state (merges sleep logs, check-ins, exams, XP, quests)
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

// Save or clear Ze chat history
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

// Shared community lanterns across all visitors
app.get("/api/lanterns", (req, res) => {
  res.json({ lanterns: db.lanterns.slice(0, 100) });
});

app.post("/api/lanterns", (req, res) => {
  const { id, tag, text, handle } = req.body || {};
  if (!text || String(text).trim().length < 3) {
    return res.status(400).json({ error: "Lantern text too short" });
  }
  const lantern = {
    id: id || "srv_" + crypto.randomBytes(5).toString("hex"),
    tag: String(tag || "Venting").slice(0, 32),
    text: String(text).trim().slice(0, 400),
    handle: String(handle || "Quiet Lantern").slice(0, 40),
    ts: Date.now(),
    light: 0
  };
  db.lanterns.unshift(lantern);
  db.lanterns = db.lanterns.slice(0, 150);
  saveDB();
  res.json({ ok: true, lantern });
});

app.post("/api/lanterns/:id/light", (req, res) => {
  const item = db.lanterns.find((l) => l.id === req.params.id);
  if (item) {
    item.light = (item.light || 0) + 1;
    saveDB();
  }
  res.json({ ok: true, light: item ? item.light : 1 });
});

// Fallback to index.html for any unknown GET route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Heart Lantern 心燈 server running at http://localhost:${PORT}`);
});
