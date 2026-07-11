const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3210;
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const LEGACY_MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const LEGACY_PINNED_FILE = path.join(DATA_DIR, 'pinned.json');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const AVATARS_FILE = path.join(DATA_DIR, 'avatars.json');
const READ_STATE_FILE = path.join(DATA_DIR, 'read-state.json');
const MAX_HISTORY = 500;   // wie viele Nachrichten pro Kanal dauerhaft behalten werden
const MAX_SEND = 200;      // wie viele beim Beitritt/Wechsel an den Client geschickt werden
const DELETE_WINDOW_MS = 5 * 60 * 1000; // Zeitfenster, in dem eigene Nachrichten loeschbar sind

// --- Kanaele -----------------------------------------------------------------
// Um weitere Kanaele hinzuzufuegen, hier einfach ein Objekt ergaenzen.
// "id" wird als Ordnername verwendet: klein geschrieben, keine Leer-/Sonderzeichen.
const ROOMS = [
  { id: 'familie', label: 'Familie' },
  { id: 'technik', label: 'Technik' },
  { id: 'einkaufsliste', label: 'Einkaufsliste' },
];
const DEFAULT_ROOM = ROOMS[0].id;

// --- Ordner sicherstellen ----------------------------------------------------
[DATA_DIR, ROOMS_DIR, UPLOAD_DIR, AVATAR_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(AVATARS_FILE)) fs.writeFileSync(AVATARS_FILE, '{}');
if (!fs.existsSync(READ_STATE_FILE)) fs.writeFileSync(READ_STATE_FILE, '{}');

// --- Profilbilder (persistent pro Name, keine Benutzerkonten noetig) --------
function loadAvatars() {
  try {
    return JSON.parse(fs.readFileSync(AVATARS_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}
function saveAvatars(map) {
  fs.writeFileSync(AVATARS_FILE, JSON.stringify(map, null, 2));
}
let avatarsByName = loadAvatars(); // key: name.toLowerCase() -> Bild-URL

// --- Lesestatus pro Name (fuer Ungelesen-Zaehler an den Kanaelen) -----------
function loadReadState() {
  try {
    return JSON.parse(fs.readFileSync(READ_STATE_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}
function saveReadState(state) {
  fs.writeFileSync(READ_STATE_FILE, JSON.stringify(state));
}
let readState = loadReadState(); // { "<name-lower>": { "<roomId>": lastReadTs } }

function ensureReadStateForName(name) {
  const key = name.toLowerCase();
  if (!readState[key]) {
    // Neuer Name im Lesestatus: gesamten Altbestand als gelesen markieren,
    // damit nicht sofort der komplette bisherige Verlauf als "ungelesen" zaehlt.
    readState[key] = {};
    const now = Date.now();
    ROOMS.forEach((r) => { readState[key][r.id] = now; });
    saveReadState(readState);
  }
}
function getLastRead(name, roomId) {
  const key = name.toLowerCase();
  return (readState[key] && readState[key][roomId]) || 0;
}
function markRead(name, roomId, ts) {
  const key = name.toLowerCase();
  if (!readState[key]) readState[key] = {};
  readState[key][roomId] = ts;
  saveReadState(readState);
}
function computeUnreadCounts(name, activeRoomId) {
  const counts = {};
  ROOMS.forEach((r) => {
    if (r.id === activeRoomId) { counts[r.id] = 0; return; }
    const lastRead = getLastRead(name, r.id);
    const state = roomState.get(r.id);
    counts[r.id] = state.messages.filter((m) => m.ts > lastRead && !m.deleted).length;
  });
  return counts;
}

function roomDir(roomId) {
  return path.join(ROOMS_DIR, roomId);
}
function roomMessagesFile(roomId) {
  return path.join(roomDir(roomId), 'messages.json');
}
function roomPinnedFile(roomId) {
  return path.join(roomDir(roomId), 'pinned.json');
}

// --- Alten (vor Kanaelen bestehenden) Verlauf einmalig in den Standard-Kanal
//     uebernehmen, damit kein bestehender Chat verloren geht. ------------------
function migrateLegacyData() {
  const dir = roomDir(DEFAULT_ROOM);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const newMessagesFile = roomMessagesFile(DEFAULT_ROOM);
  const newPinnedFile = roomPinnedFile(DEFAULT_ROOM);
  if (fs.existsSync(LEGACY_MESSAGES_FILE) && !fs.existsSync(newMessagesFile)) {
    fs.copyFileSync(LEGACY_MESSAGES_FILE, newMessagesFile);
    console.log(`Bestehender Verlauf wurde in den Kanal "${DEFAULT_ROOM}" uebernommen.`);
  }
  if (fs.existsSync(LEGACY_PINNED_FILE) && !fs.existsSync(newPinnedFile)) {
    fs.copyFileSync(LEGACY_PINNED_FILE, newPinnedFile);
  }
}
migrateLegacyData();

// --- Zustand pro Kanal laden/speichern ---------------------------------------
const roomState = new Map(); // roomId -> { messages: [...], pinned: {...}|null }

function loadRoom(roomId) {
  const dir = roomDir(roomId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const mFile = roomMessagesFile(roomId);
  const pFile = roomPinnedFile(roomId);
  if (!fs.existsSync(mFile)) fs.writeFileSync(mFile, '[]');
  if (!fs.existsSync(pFile)) fs.writeFileSync(pFile, 'null');
  let messages = [];
  let pinned = null;
  try { messages = JSON.parse(fs.readFileSync(mFile, 'utf-8')); } catch (err) { messages = []; }
  try { pinned = JSON.parse(fs.readFileSync(pFile, 'utf-8')); } catch (err) { pinned = null; }
  return { messages, pinned };
}

function saveRoomMessages(roomId) {
  const state = roomState.get(roomId);
  state.messages = state.messages.slice(-MAX_HISTORY);
  fs.writeFileSync(roomMessagesFile(roomId), JSON.stringify(state.messages, null, 2));
}
function saveRoomPinned(roomId) {
  const state = roomState.get(roomId);
  fs.writeFileSync(roomPinnedFile(roomId), JSON.stringify(state.pinned));
}

ROOMS.forEach((r) => roomState.set(r.id, loadRoom(r.id)));

async function main() {
  // --- App / Server / Socket.io ---------------------------------------------
  // HTTP nach innen: TLS wird von einem vorgeschalteten Reverse Proxy (Caddy)
  // mit echtem Zertifikat uebernommen. Direkter Aufruf per IP:Port ist damit
  // wieder http:// statt https:// -- siehe README fuer die Caddy-Einrichtung.
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 12 * 1024 * 1024,
  });

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/uploads', express.static(UPLOAD_DIR));

  // --- Bild-Upload -----------------------------------------------------------
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
      cb(null, name);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
      if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
      else cb(new Error('Nur Bilddateien sind erlaubt'));
    },
  });

  app.post('/upload', (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Keine Datei erhalten' });
      res.json({ url: `/uploads/${req.file.filename}` });
    });
  });

  // --- Sprachnachrichten-Upload ------------------------------------------------
  const AUDIO_EXT_BY_MIME = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/aac': '.aac',
  };
  const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = AUDIO_EXT_BY_MIME[file.mimetype] || '.webm';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  });
  const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB reicht fuer kurze Sprachnachrichten
    fileFilter: (req, file, cb) => {
      if (/^audio\//.test(file.mimetype)) cb(null, true);
      else cb(new Error('Nur Audiodateien sind erlaubt'));
    },
  });

  app.post('/upload-audio', (req, res) => {
    uploadAudio.single('audio')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Keine Datei erhalten' });
      res.json({ url: `/uploads/${req.file.filename}` });
    });
  });

  // --- Profilbild-Upload (persistent, an den Namen gebunden) ------------------
  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.jpg';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
      cb(null, name);
    },
  });
  const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
      if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
      else cb(new Error('Nur Bilddateien sind erlaubt'));
    },
  });

  app.post('/upload-avatar', (req, res) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'Keine Datei erhalten' });
      const name = (req.body.name || '').toString().trim().slice(0, 24).toLowerCase();
      if (!name) return res.status(400).json({ error: 'Name fehlt' });
      const url = `/uploads/avatars/${req.file.filename}`;
      avatarsByName[name] = url;
      saveAvatars(avatarsByName);
      io.emit('avatarMap', avatarsByName);
      res.json({ url });
    });
  });

  // --- Online-Nutzer & Farben -------------------------------------------------
  const onlineUsers = new Map(); // socket.id -> { name, color, avatar, room }
  const COLORS = ['#E8A33D', '#3E7C77', '#C9614A', '#6C8EBF', '#9B7EDE', '#5FAE6B', '#D9B24C'];

  function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  }

  function usersInRoom(roomId) {
    return [...onlineUsers.values()].filter((u) => u.room === roomId);
  }
  function broadcastRoomUsers(roomId) {
    io.to(roomId).emit('users', usersInRoom(roomId));
  }
  function broadcastGlobalUsers() {
    io.emit('globalUsers', [...onlineUsers.values()]);
  }

  function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  function sanitizeReplyTo(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = (raw.id || '').toString().slice(0, 60);
    const sender = (raw.sender || '').toString().slice(0, 24);
    const preview = (raw.preview || '').toString().slice(0, 120);
    if (!id || !sender) return null;
    return { id, sender, preview };
  }

  io.on('connection', (socket) => {
    // Sofort Kanalliste + globale Online-Uebersicht schicken, auch wenn noch
    // nicht beigetreten (damit die Startseite bereits zeigen kann, wer aktiv ist).
    socket.emit('rooms', ROOMS);
    socket.emit('globalUsers', [...onlineUsers.values()]);
    socket.emit('avatarMap', avatarsByName);

    socket.on('join', (payload) => {
      const raw = typeof payload === 'string' ? { name: payload } : (payload || {});
      const name = (raw.name || 'Gast').toString().trim().slice(0, 24) || 'Gast';
      const isPhoto = raw.avatarType === 'photo';
      let avatarValue = (raw.avatarValue || '').toString().trim().slice(0, 300) || null;
      if (isPhoto && (!avatarValue || !avatarValue.startsWith('/uploads/avatars/'))) {
        avatarValue = null;
      }
      if (!isPhoto) avatarValue = avatarValue ? avatarValue.slice(0, 8) : null;
      const roomId = DEFAULT_ROOM;

      socket.data.name = name;
      socket.data.color = colorForName(name);
      socket.data.avatar = isPhoto ? null : avatarValue;
      socket.data.photo = isPhoto ? avatarValue : null;
      socket.data.room = roomId;
      socket.join(roomId);
      onlineUsers.set(socket.id, {
        name, color: socket.data.color, avatar: socket.data.avatar, photo: socket.data.photo, room: roomId,
      });

      ensureReadStateForName(name);
      markRead(name, roomId, Date.now());

      const state = roomState.get(roomId);
      socket.emit('roomChanged', roomId);
      socket.emit('history', state.messages.slice(-MAX_SEND));
      socket.emit('pinnedUpdate', state.pinned);
      socket.emit('unreadCounts', computeUnreadCounts(name, roomId));
      broadcastRoomUsers(roomId);
      broadcastGlobalUsers();
      socket.to(roomId).emit('system', `${name} ist beigetreten`);
    });

    socket.on('switchRoom', (payload) => {
      if (!socket.data.name || !payload) return;
      const roomId = payload.roomId;
      if (!ROOMS.some((r) => r.id === roomId)) return;
      const oldRoom = socket.data.room;
      if (oldRoom === roomId) return;

      socket.leave(oldRoom);
      socket.join(roomId);
      socket.data.room = roomId;
      const entry = onlineUsers.get(socket.id);
      if (entry) entry.room = roomId;

      markRead(socket.data.name, roomId, Date.now());

      const state = roomState.get(roomId);
      socket.emit('roomChanged', roomId);
      socket.emit('history', state.messages.slice(-MAX_SEND));
      socket.emit('pinnedUpdate', state.pinned);
      socket.emit('unreadCounts', computeUnreadCounts(socket.data.name, roomId));
      broadcastRoomUsers(oldRoom);
      broadcastRoomUsers(roomId);
    });

    socket.on('message', (payload) => {
      if (!payload || !socket.data.name || !socket.data.room) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      const name = socket.data.name;
      const color = socket.data.color;
      const avatar = socket.data.avatar;
      const photo = socket.data.photo;
      const replyTo = sanitizeReplyTo(payload.replyTo);

      if (payload.type === 'text') {
        const clean = (payload.text || '').toString().slice(0, 2000).trim();
        if (!clean) return;
        const msg = {
          id: makeId(), type: 'text', sender: name, color, avatar, photo, text: clean, ts: Date.now(),
          reactions: {}, replyTo,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
        io.except(roomId).emit('roomActivity', { roomId });
      } else if (payload.type === 'image') {
        if (!payload.url) return;
        const msg = {
          id: makeId(), type: 'image', sender: name, color, avatar, photo, url: payload.url, ts: Date.now(),
          reactions: {}, replyTo,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
        io.except(roomId).emit('roomActivity', { roomId });
      } else if (payload.type === 'audio') {
        if (!payload.url) return;
        const duration = Math.min(Math.max(Number(payload.duration) || 0, 0), 120);
        const msg = {
          id: makeId(), type: 'audio', sender: name, color, avatar, photo, url: payload.url, duration, ts: Date.now(),
          reactions: {}, replyTo,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
        io.except(roomId).emit('roomActivity', { roomId });
      }
    });

    socket.on('reaction', (payload) => {
      if (!socket.data.name || !socket.data.room || !payload) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      const { messageId, emoji } = payload;
      if (!REACTION_EMOJIS.includes(emoji)) return;
      const msg = state.messages.find((m) => m.id === messageId);
      if (!msg || msg.deleted) return;
      if (!msg.reactions) msg.reactions = {};
      const name = socket.data.name;
      const list = msg.reactions[emoji] || [];
      const idx = list.indexOf(name);
      if (idx >= 0) list.splice(idx, 1); else list.push(name);
      if (list.length) msg.reactions[emoji] = list; else delete msg.reactions[emoji];
      saveRoomMessages(roomId);
      io.to(roomId).emit('reactionUpdate', { messageId, reactions: msg.reactions });
    });

    socket.on('deleteMessage', (payload) => {
      if (!socket.data.name || !socket.data.room || !payload) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      const msg = state.messages.find((m) => m.id === payload.messageId);
      if (!msg || msg.deleted) return;
      if (msg.sender !== socket.data.name) return;
      if (Date.now() - msg.ts > DELETE_WINDOW_MS) return;
      msg.deleted = true;
      delete msg.text;
      delete msg.url;
      delete msg.duration;
      msg.reactions = {};
      saveRoomMessages(roomId);
      io.to(roomId).emit('messageDeleted', { messageId: msg.id });
      if (state.pinned && state.pinned.id === msg.id) {
        state.pinned = null;
        saveRoomPinned(roomId);
        io.to(roomId).emit('pinnedUpdate', state.pinned);
      }
    });

    socket.on('pin', (payload) => {
      if (!socket.data.name || !socket.data.room || !payload) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      const msg = state.messages.find((m) => m.id === payload.messageId);
      if (!msg || msg.deleted) return;
      state.pinned = {
        id: msg.id,
        sender: msg.sender,
        type: msg.type,
        text: msg.type === 'text' ? msg.text : null,
        url: msg.type === 'image' || msg.type === 'audio' ? msg.url : null,
        duration: msg.type === 'audio' ? msg.duration : null,
        pinnedBy: socket.data.name,
        ts: msg.ts,
      };
      saveRoomPinned(roomId);
      io.to(roomId).emit('pinnedUpdate', state.pinned);
    });

    socket.on('unpin', () => {
      if (!socket.data.name || !socket.data.room) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      state.pinned = null;
      saveRoomPinned(roomId);
      io.to(roomId).emit('pinnedUpdate', state.pinned);
    });

    socket.on('typing', (isTyping) => {
      if (!socket.data.name || !socket.data.room) return;
      socket.to(socket.data.room).emit('typing', { name: socket.data.name, isTyping: !!isTyping });
    });

    socket.on('disconnect', () => {
      const name = socket.data.name;
      const room = socket.data.room;
      onlineUsers.delete(socket.id);
      if (room) {
        broadcastRoomUsers(room);
        if (name) io.to(room).emit('system', `${name} hat den Kanal verlassen`);
      }
      broadcastGlobalUsers();
    });
  });

  server.listen(PORT, () => {
    console.log(`Hausfunk laeuft (HTTP, TLS uebernimmt der Reverse Proxy) auf Port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Hausfunk konnte nicht gestartet werden:', err);
  process.exit(1);
});
