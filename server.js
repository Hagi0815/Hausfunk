const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const webPush = require('web-push');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3210;
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const LEGACY_MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const LEGACY_PINNED_FILE = path.join(DATA_DIR, 'pinned.json');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const ROOM_BG_DIR = path.join(UPLOAD_DIR, 'room-backgrounds');
const ROOM_ICON_DIR = path.join(UPLOAD_DIR, 'room-icons');
const AVATARS_FILE = path.join(DATA_DIR, 'avatars.json');
const READ_STATE_FILE = path.join(DATA_DIR, 'read-state.json');
const ROOMS_CONFIG_FILE = path.join(DATA_DIR, 'rooms-config.json');
const SHOPPING_LIST_FILE = path.join(DATA_DIR, 'shopping-list.json');
const SHOPPING_CATEGORIES_FILE = path.join(DATA_DIR, 'shopping-list-categories.json');
const BIRTHDAYS_FILE = path.join(DATA_DIR, 'birthdays.json');
const BANNED_FILE = path.join(DATA_DIR, 'banned.json');
const PROTECTED_USERS_FILE = path.join(DATA_DIR, 'protected-users.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin-config.json');
const VAPID_FILE = path.join(DATA_DIR, 'vapid-keys.json');
const PUSH_SUBS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const PRESENCE_LOG_FILE = path.join(DATA_DIR, 'presence-log.json');
const PRESENCE_LOG_MAX = 300; // wie viele Ereignisse dauerhaft aufgehoben werden

// --- Wetter (Open-Meteo, kein API-Key noetig) -------------------------------
// Koordinaten des Serverstandorts -- bei Bedarf hier anpassen.
const WEATHER_LAT = process.env.HAUSFUNK_WEATHER_LAT || '51.31';
const WEATHER_LON = process.env.HAUSFUNK_WEATHER_LON || '8.06';
const WEATHER_REFRESH_MS = 30 * 60 * 1000; // alle 30 Minuten neu abrufen

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage "angemeldet bleiben"
const MAX_HISTORY = 500;   // wie viele Nachrichten pro Kanal dauerhaft behalten werden
const MAX_SEND = 200;      // wie viele beim Beitritt/Wechsel an den Client geschickt werden
const DELETE_WINDOW_MS = 5 * 60 * 1000; // Zeitfenster, in dem eigene Nachrichten loeschbar sind (nicht fuer Admins)
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 Minuten Sperre nach zu vielen Fehlversuchen

// --- Admin-Zugang (Name "DOM" + Passwort) -----------------------------------
// Passwort wird NICHT im Code hinterlegt, sondern als Umgebungsvariable gesetzt
// (siehe ecosystem.config.js). Ist sie nicht gesetzt, ist der Admin-Zugang aus.
// Der Admin-NAME selbst ist aenderbar (siehe admin-config.json) -- "DOM" ist
// nur der Ausgangspunkt, der Admin kann sich im Panel umbenennen.
const ADMIN_PASSWORD = process.env.HAUSFUNK_ADMIN_PASSWORD || null;
const DEFAULT_ADMIN_NAME = 'DOM';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// --- Kanaele (jetzt per Admin verwaltbar, siehe rooms-config.json) ----------
// Beim allerersten Start werden diese drei als Ausgangspunkt angelegt, damit
// bestehende Installationen ihre bisherigen Kanaele unveraendert behalten.
const DEFAULT_ROOMS = [
  { id: 'familie', label: 'Familie' },
  { id: 'technik', label: 'Technik' },
  { id: 'einkaufsliste', label: 'Einkaufsliste' },
];

// --- Ordner sicherstellen ----------------------------------------------------
[DATA_DIR, ROOMS_DIR, UPLOAD_DIR, AVATAR_DIR, ROOM_BG_DIR, ROOM_ICON_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(AVATARS_FILE)) fs.writeFileSync(AVATARS_FILE, '{}');
if (!fs.existsSync(READ_STATE_FILE)) fs.writeFileSync(READ_STATE_FILE, '{}');
if (!fs.existsSync(BANNED_FILE)) fs.writeFileSync(BANNED_FILE, '[]');
if (!fs.existsSync(ADMIN_CONFIG_FILE)) {
  fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify({ displayName: DEFAULT_ADMIN_NAME }));
}
if (!fs.existsSync(PUSH_SUBS_FILE)) fs.writeFileSync(PUSH_SUBS_FILE, '{}');
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '{}');
if (!fs.existsSync(BIRTHDAYS_FILE)) fs.writeFileSync(BIRTHDAYS_FILE, '[]');
if (!fs.existsSync(PRESENCE_LOG_FILE)) fs.writeFileSync(PRESENCE_LOG_FILE, '[]');
if (!fs.existsSync(PROTECTED_USERS_FILE)) fs.writeFileSync(PROTECTED_USERS_FILE, '{}');

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

// --- Kanal-Konfiguration (jetzt per Admin aenderbar, in Datei persistiert) --
function loadRoomsConfig() {
  if (!fs.existsSync(ROOMS_CONFIG_FILE)) {
    fs.writeFileSync(ROOMS_CONFIG_FILE, JSON.stringify(DEFAULT_ROOMS, null, 2));
    return DEFAULT_ROOMS.map((r) => ({ ...r }));
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(ROOMS_CONFIG_FILE, 'utf-8'));
    if (Array.isArray(parsed) && parsed.length) {
      // "type" stammt evtl. noch aus einer frueheren Version -- wird nicht mehr genutzt
      return parsed.map(({ type, ...rest }) => rest);
    }
  } catch (err) {
    // fällt durch auf Default
  }
  return DEFAULT_ROOMS.map((r) => ({ ...r }));
}
function saveRoomsConfig() {
  fs.writeFileSync(ROOMS_CONFIG_FILE, JSON.stringify(ROOMS, null, 2));
}
let ROOMS = loadRoomsConfig();
const DEFAULT_ROOM = ROOMS[0].id;

function slugifyRoomId(label) {
  const base = label.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const root = base || 'kanal';
  const existingIds = new Set(ROOMS.map((r) => r.id));
  let candidate = root;
  let suffix = 1;
  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}

// --- Gesperrte Namen (persistent) --------------------------------------------
function loadBanned() {
  try {
    return JSON.parse(fs.readFileSync(BANNED_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function saveBanned(list) {
  fs.writeFileSync(BANNED_FILE, JSON.stringify(list, null, 2));
}
let bannedNames = loadBanned(); // Array von name.toLowerCase()

// --- Admin-Name (aenderbar, Ausgangspunkt "DOM") ----------------------------
function loadAdminConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8'));
    if (parsed && parsed.displayName) return parsed;
  } catch (err) {
    // fällt durch auf Default
  }
  return { displayName: DEFAULT_ADMIN_NAME };
}
function saveAdminConfig() {
  fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify({ displayName: adminDisplayName }));
}
let adminDisplayName = loadAdminConfig().displayName;

// --- Web-Push: VAPID-Schluessel (einmalig automatisch erzeugt, wie das
//     selbstsignierte Zertifikat frueher -- kein manuelles Setup noetig) ----
function ensureVapidKeys() {
  if (fs.existsSync(VAPID_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
      if (parsed.publicKey && parsed.privateKey) return parsed;
    } catch (err) {
      // fällt durch auf Neuerzeugung
    }
  }
  const keys = webPush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  console.log('Neue VAPID-Schluessel fuer Push-Benachrichtigungen erzeugt.');
  return keys;
}
const vapidKeys = ensureVapidKeys();
webPush.setVapidDetails('mailto:admin@localhost', vapidKeys.publicKey, vapidKeys.privateKey);

// --- Push-Abos (pro Name, mehrere Geraete moeglich) -------------------------
function loadPushSubs() {
  try {
    return JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}
function savePushSubs() {
  fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(pushSubs, null, 2));
}
let pushSubs = loadPushSubs(); // { "<name-lower>": [subscriptionObjekt, ...] }

function addPushSub(nameKey, subscription) {
  if (!pushSubs[nameKey]) pushSubs[nameKey] = [];
  const exists = pushSubs[nameKey].some((s) => s.endpoint === subscription.endpoint);
  if (!exists) {
    pushSubs[nameKey].push(subscription);
    savePushSubs();
  }
}
function removePushSubByEndpoint(endpoint) {
  let changed = false;
  for (const key of Object.keys(pushSubs)) {
    const before = pushSubs[key].length;
    pushSubs[key] = pushSubs[key].filter((s) => s.endpoint !== endpoint);
    if (pushSubs[key].length !== before) changed = true;
    if (pushSubs[key].length === 0) delete pushSubs[key];
  }
  if (changed) savePushSubs();
}

async function sendPushToName(nameKey, payload) {
  const subs = pushSubs[nameKey];
  if (!subs || !subs.length) return;
  const body = JSON.stringify(payload);
  for (const sub of subs.slice()) {
    try {
      await webPush.sendNotification(sub, body);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        removePushSubByEndpoint(sub.endpoint); // Abo ist abgelaufen/ungueltig
      }
    }
  }
}

// --- Login-Rate-Limit (Schutz gegen wiederholtes Passwort-Raten) -----------
const loginAttempts = new Map(); // nameKey -> { count, lockedUntil }

function isLockedOut(nameKey) {
  const entry = loginAttempts.get(nameKey);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(nameKey);
    return false;
  }
  return true;
}
function remainingLockoutSeconds(nameKey) {
  const entry = loginAttempts.get(nameKey);
  if (!entry || !entry.lockedUntil) return 0;
  return Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 1000));
}
function registerFailedAttempt(nameKey) {
  const entry = loginAttempts.get(nameKey) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= LOGIN_ATTEMPT_LIMIT) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  loginAttempts.set(nameKey, entry);
}
function clearFailedAttempts(nameKey) {
  loginAttempts.delete(nameKey);
}

// --- Sitzungen ("angemeldet bleiben" ueber Reloads hinweg) ------------------
function loadSessions() {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}
function saveSessions() {
  const now = Date.now();
  Object.keys(sessions).forEach((token) => {
    if (sessions[token].expiresAt < now) delete sessions[token];
  });
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}
let sessions = loadSessions(); // token -> { name, role, expiresAt }

function createSession(name, role) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions[token] = { name, role, expiresAt: Date.now() + SESSION_DURATION_MS };
  saveSessions();
  return token;
}

// --- Online-Verlauf (fuer den Admin: wer war wann online/offline) ----------
function loadPresenceLog() {
  try {
    return JSON.parse(fs.readFileSync(PRESENCE_LOG_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function savePresenceLog() {
  fs.writeFileSync(PRESENCE_LOG_FILE, JSON.stringify(presenceLog, null, 2));
}
let presenceLog = loadPresenceLog();
// { "<name-lower>": { displayName, passwordHash, status: 'pending'|'approved' } }
function loadProtectedUsers() {
  try {
    return JSON.parse(fs.readFileSync(PROTECTED_USERS_FILE, 'utf-8'));
  } catch (err) {
    return {};
  }
}
function saveProtectedUsers() {
  fs.writeFileSync(PROTECTED_USERS_FILE, JSON.stringify(protectedUsers, null, 2));
}
let protectedUsers = loadProtectedUsers();

function getProtectedNamesPublic() {
  // Nur Name + Status nach aussen geben, NIE das Passwort/den Hash
  return Object.values(protectedUsers).map((u) => ({ name: u.displayName, status: u.status }));
}
function getPendingList() {
  return Object.values(protectedUsers)
    .filter((u) => u.status === 'pending')
    .map((u) => ({ name: u.displayName }));
}
function getApprovedList() {
  return Object.values(protectedUsers)
    .filter((u) => u.status === 'approved')
    .map((u) => ({ name: u.displayName }));
}
function getPendingResetsList() {
  return Object.values(protectedUsers)
    .filter((u) => u.status === 'approved' && u.pendingResetHash)
    .map((u) => ({ name: u.displayName }));
}

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

// --- Einkaufsliste: eigenstaendig, an KEINEN Kanal gebunden -----------------
// Falls von einer frueheren Version noch eine kanalgebundene Einkaufsliste
// existiert (data/rooms/einkaufsliste/checklist*.json), einmalig uebernehmen.
function migrateLegacyShoppingList() {
  const legacyItemsFile = path.join(ROOMS_DIR, 'einkaufsliste', 'checklist.json');
  const legacyCatsFile = path.join(ROOMS_DIR, 'einkaufsliste', 'checklist-categories.json');
  if (fs.existsSync(legacyItemsFile) && !fs.existsSync(SHOPPING_LIST_FILE)) {
    fs.copyFileSync(legacyItemsFile, SHOPPING_LIST_FILE);
    console.log('Bestehende Einkaufsliste aus dem alten Kanal-System uebernommen.');
  }
  if (fs.existsSync(legacyCatsFile) && !fs.existsSync(SHOPPING_CATEGORIES_FILE)) {
    fs.copyFileSync(legacyCatsFile, SHOPPING_CATEGORIES_FILE);
  }
}
migrateLegacyShoppingList();

function loadShoppingList() {
  try {
    return JSON.parse(fs.readFileSync(SHOPPING_LIST_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function saveShoppingList() {
  fs.writeFileSync(SHOPPING_LIST_FILE, JSON.stringify(shoppingItems, null, 2));
}
function loadShoppingCategories() {
  try {
    return JSON.parse(fs.readFileSync(SHOPPING_CATEGORIES_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function saveShoppingCategories() {
  fs.writeFileSync(SHOPPING_CATEGORIES_FILE, JSON.stringify(shoppingCategories, null, 2));
}
let shoppingItems = loadShoppingList();
let shoppingCategories = loadShoppingCategories();

// --- Geburtstage (eigenstaendig, jeder kann eintragen) ----------------------
function loadBirthdays() {
  try {
    return JSON.parse(fs.readFileSync(BIRTHDAYS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function saveBirthdays() {
  fs.writeFileSync(BIRTHDAYS_FILE, JSON.stringify(birthdays, null, 2));
}
let birthdays = loadBirthdays(); // { id, name, day, month, year, addedBy, lastCongratulatedYear }

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

  // --- Web-Push: oeffentlicher Schluessel fuer den Client ---------------------
  app.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  // --- Online-Nutzer & Farben -------------------------------------------------
  const onlineUsers = new Map(); // socket.id -> { name, color, avatar, photo, role, room }

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
  function broadcastToAdmins(event, data) {
    for (const [socketId, entry] of onlineUsers.entries()) {
      if (entry.role === 'admin') {
        const s = io.sockets.sockets.get(socketId);
        if (s) s.emit(event, data);
      }
    }
  }

  function logPresenceEvent(name, event) {
    presenceLog.push({ name, event, ts: Date.now() });
    if (presenceLog.length > PRESENCE_LOG_MAX) {
      presenceLog = presenceLog.slice(-PRESENCE_LOG_MAX);
    }
    savePresenceLog();
    broadcastToAdmins('presenceLog', presenceLog);
  }

  // --- Wetter fuer den Serverstandort abrufen und an alle verteilen -----------
  let weatherCache = null;

  async function fetchWeather() {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}`
        + '&current=temperature_2m,weather_code'
        + '&hourly=temperature_2m,weather_code'
        + '&daily=temperature_2m_max,temperature_2m_min,weather_code'
        + '&timezone=Europe%2FBerlin&forecast_days=2';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo Status ${res.status}`);
      const data = await res.json();

      const now = new Date();
      const hourlyTimes = (data.hourly && data.hourly.time) || [];
      const hourly = hourlyTimes
        .map((time, i) => ({
          time,
          temp: data.hourly.temperature_2m[i],
          code: data.hourly.weather_code[i],
        }))
        .filter((h) => new Date(h.time) >= now)
        .filter((_, i) => i % 3 === 0)
        .slice(0, 6);

      weatherCache = {
        current: {
          temp: data.current ? data.current.temperature_2m : null,
          code: data.current ? data.current.weather_code : null,
        },
        daily: {
          max: data.daily ? data.daily.temperature_2m_max[0] : null,
          min: data.daily ? data.daily.temperature_2m_min[0] : null,
          code: data.daily ? data.daily.weather_code[0] : null,
        },
        hourly,
        updatedAt: Date.now(),
      };
      io.emit('weatherUpdate', weatherCache);
    } catch (err) {
      console.error('Wetter konnte nicht abgerufen werden:', err.message);
    }
  }
  fetchWeather();
  setInterval(fetchWeather, WEATHER_REFRESH_MS);

  // --- Geburtstage: einmal pro Stunde pruefen und ggf. gratulieren -----------
  function checkBirthdaysToday() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    let changed = false;

    birthdays.forEach((b) => {
      if (b.month !== month || b.day !== day || b.lastCongratulatedYear === year) return;
      const roomId = ROOMS.some((r) => r.id === DEFAULT_ROOM) ? DEFAULT_ROOM : ROOMS[0].id;
      const state = roomState.get(roomId);
      if (state) {
        const age = b.year && b.year > 1900 ? year - b.year : null;
        const ageText = age ? ` Heute wird ${b.name} ${age} Jahre alt!` : '';
        const msg = {
          id: makeId(),
          type: 'text',
          sender: 'Hausfunk',
          color: '#E8A33D',
          avatar: null,
          photo: null,
          role: 'user',
          text: `🎉🎂 Alles Gute zum Geburtstag, ${b.name}!${ageText} 🎂🎉`,
          ts: Date.now(),
          reactions: {},
          replyTo: null,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
      }
      b.lastCongratulatedYear = year;
      changed = true;
    });

    if (changed) saveBirthdays();
  }
  checkBirthdaysToday();
  setInterval(checkBirthdaysToday, 60 * 60 * 1000); // stuendlich pruefen

  function notifyPushForMessage(roomId, msg) {
    const connectedNames = new Set([...onlineUsers.values()].map((u) => u.name.toLowerCase()));
    const room = ROOMS.find((r) => r.id === roomId);
    const roomLabel = room ? room.label : roomId;
    const bodyText = msg.type === 'image' ? '📷 Bild' : msg.type === 'audio' ? '🎙️ Sprachnachricht' : msg.text;
    Object.keys(pushSubs).forEach((nameKey) => {
      if (nameKey === msg.sender.toLowerCase()) return; // nicht an sich selbst
      if (connectedNames.has(nameKey)) return; // ist gerade aktiv, braucht kein Push
      sendPushToName(nameKey, {
        title: `${msg.sender} in #${roomLabel} · Hausfunk`,
        body: bodyText,
      });
    });
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

  // Gemeinsamer Erfolgspfad fuer normalen Login (Name+Passwort) und
  // Sitzungs-Wiederaufnahme (Token) -- beide enden hier gleich.
  function completeJoin(socket, { name, role, avatarType, avatarValue }) {
    const isPhoto = avatarType === 'photo';
    let avatar = (avatarValue || '').toString().trim().slice(0, 300) || null;
    const isValidPhotoPath = avatar && avatar.startsWith('/uploads/avatars/');
    if (isPhoto && !isValidPhotoPath) avatar = null;
    if (!isPhoto) avatar = avatar ? avatar.slice(0, 8) : null;
    const roomId = DEFAULT_ROOM;

    // Gewaehltes Bild (Preset oder eigener Upload) fuer den naechsten Login
    // unter diesem Namen merken, damit es automatisch vorgeschlagen wird.
    if (isPhoto && avatar) {
      const nameKey = name.toLowerCase();
      if (avatarsByName[nameKey] !== avatar) {
        avatarsByName[nameKey] = avatar;
        saveAvatars(avatarsByName);
        io.emit('avatarMap', avatarsByName);
      }
    }

    socket.data.name = name;
    socket.data.color = colorForName(name);
    socket.data.avatar = isPhoto ? null : avatar;
    socket.data.photo = isPhoto ? avatar : null;
    socket.data.role = role;
    socket.data.room = roomId;
    socket.join(roomId);
    onlineUsers.set(socket.id, {
      name, color: socket.data.color, avatar: socket.data.avatar, photo: socket.data.photo, role, room: roomId,
    });

    ensureReadStateForName(name);
    markRead(name, roomId, Date.now());

    const state = roomState.get(roomId);
    socket.emit('yourRole', role);
    socket.emit('roomChanged', roomId);
    socket.emit('history', state.messages.slice(-MAX_SEND));
    socket.emit('pinnedUpdate', state.pinned);
    socket.emit('unreadCounts', computeUnreadCounts(name, roomId));
    if (role === 'admin') {
      socket.emit('bannedList', bannedNames);
      socket.emit('pendingRequests', getPendingList());
      socket.emit('approvedAccounts', getApprovedList());
      socket.emit('pendingResets', getPendingResetsList());
      socket.emit('presenceLog', presenceLog);
    }
    broadcastRoomUsers(roomId);
    broadcastGlobalUsers();
    socket.to(roomId).emit('system', `${name} ist beigetreten`);
    logPresenceEvent(name, 'online');

    const token = createSession(name, role);
    socket.data.sessionToken = token;
    socket.emit('sessionToken', token);
  }

  io.on('connection', (socket) => {
    // Sofort Kanalliste + globale Online-Uebersicht schicken, auch wenn noch
    // nicht beigetreten (damit die Startseite bereits zeigen kann, wer aktiv ist).
    socket.emit('rooms', ROOMS);
    socket.emit('globalUsers', [...onlineUsers.values()]);
    socket.emit('avatarMap', avatarsByName);
    socket.emit('protectedNames', getProtectedNamesPublic());
    if (weatherCache) socket.emit('weatherUpdate', weatherCache);
    socket.emit('shoppingListUpdate', { items: shoppingItems, categories: shoppingCategories });
    socket.emit('birthdaysUpdate', birthdays);

    socket.on('join', (payload) => {
      const raw = typeof payload === 'string' ? { name: payload } : (payload || {});
      const name = (raw.name || '').toString().trim().slice(0, 24);
      if (!name) {
        socket.emit('joinError', 'Bitte einen Namen eingeben.');
        return;
      }
      const nameKey = name.toLowerCase();
      const providedPassword = (raw.password || '').toString();

      if (bannedNames.includes(nameKey)) {
        socket.emit('joinError', 'Dieser Name wurde gesperrt.');
        return;
      }

      let role = 'user';
      const isPasswordProtected = nameKey === adminDisplayName.toLowerCase()
        || (protectedUsers[nameKey] && protectedUsers[nameKey].status === 'approved');

      if (isPasswordProtected && isLockedOut(nameKey)) {
        socket.emit('joinError', `Zu viele Fehlversuche. Bitte in ${remainingLockoutSeconds(nameKey)} Sekunden erneut versuchen.`);
        return;
      }

      if (nameKey === adminDisplayName.toLowerCase()) {
        if (!ADMIN_PASSWORD) {
          socket.emit('joinError', 'Admin-Zugang ist auf diesem Server nicht eingerichtet.');
          return;
        }
        if (providedPassword !== ADMIN_PASSWORD) {
          registerFailedAttempt(nameKey);
          socket.emit('joinError', 'Falsches Admin-Passwort.');
          return;
        }
        clearFailedAttempts(nameKey);
        role = 'admin';
      } else if (protectedUsers[nameKey]) {
        const account = protectedUsers[nameKey];
        if (account.status === 'pending') {
          socket.emit('joinError', 'Dein Konto wartet noch auf Freigabe durch den Admin.');
          return;
        }
        if (!providedPassword || hashPassword(providedPassword) !== account.passwordHash) {
          registerFailedAttempt(nameKey);
          socket.emit('joinError', 'Falsches Passwort.');
          return;
        }
        clearFailedAttempts(nameKey);
      } else {
        // Komplett neuer Name: Passwort ist Pflicht, wird automatisch als
        // Konto-Anfrage angelegt und muss vom Admin freigegeben werden.
        if (!providedPassword) {
          socket.emit('joinError', 'Bitte ein Passwort für deinen neuen Namen vergeben.');
          return;
        }
        protectedUsers[nameKey] = {
          displayName: name,
          passwordHash: hashPassword(providedPassword),
          status: 'pending',
        };
        saveProtectedUsers();
        socket.emit('registerPending', name);
        io.emit('protectedNames', getProtectedNamesPublic());
        broadcastToAdmins('pendingRequests', getPendingList());
        return;
      }

      completeJoin(socket, { name, role, avatarType: raw.avatarType, avatarValue: raw.avatarValue });
    });

    // --- Sitzung wiederaufnehmen (angemeldet bleiben nach Reload) ---------------
    socket.on('resumeSession', (payload) => {
      const token = ((payload && payload.token) || '').toString();
      const session = sessions[token];
      if (!session || session.expiresAt < Date.now()) {
        delete sessions[token];
        socket.emit('resumeFailed');
        return;
      }
      const nameKey = session.name.toLowerCase();
      if (bannedNames.includes(nameKey)) {
        delete sessions[token];
        saveSessions();
        socket.emit('resumeFailed');
        return;
      }
      if (session.role === 'admin' && nameKey !== adminDisplayName.toLowerCase()) {
        // Admin-Name wurde inzwischen geaendert -- alte Sitzung ist nicht mehr gueltig
        delete sessions[token];
        saveSessions();
        socket.emit('resumeFailed');
        return;
      }
      if (session.role === 'user' && protectedUsers[nameKey] && protectedUsers[nameKey].status !== 'approved') {
        // Konto wurde entfernt oder wartet neu auf Freigabe
        delete sessions[token];
        saveSessions();
        socket.emit('resumeFailed');
        return;
      }
      delete sessions[token]; // wird gleich durch einen frischen Token in completeJoin ersetzt
      const avatarUrl = avatarsByName[nameKey];
      completeJoin(socket, {
        name: session.name,
        role: session.role,
        avatarType: avatarUrl ? 'photo' : 'none',
        avatarValue: avatarUrl || null,
      });
    });

    socket.on('logout', () => {
      if (socket.data.sessionToken) {
        delete sessions[socket.data.sessionToken];
        saveSessions();
        socket.data.sessionToken = null;
      }
    });

    // --- Passwort vergessen: Reset-Anfrage (wartet auf Admin-Freigabe) ----------
    socket.on('requestPasswordReset', (payload) => {
      const name = ((payload && payload.name) || '').toString().trim().slice(0, 24);
      const newPassword = ((payload && payload.newPassword) || '').toString();
      if (!name || !newPassword) {
        socket.emit('joinError', 'Name und neues Passwort werden benötigt.');
        return;
      }
      const key = name.toLowerCase();
      if (key === adminDisplayName.toLowerCase()) {
        socket.emit('joinError', 'Für den Admin-Namen gibt es keinen Passwort-Reset über den Chat -- das Passwort steht in der Server-Konfiguration.');
        return;
      }
      const account = protectedUsers[key];
      if (!account || account.status !== 'approved') {
        socket.emit('joinError', 'Für diesen Namen gibt es kein geschütztes Konto.');
        return;
      }
      account.pendingResetHash = hashPassword(newPassword);
      account.pendingResetAt = Date.now();
      saveProtectedUsers();
      socket.emit('resetPending', name);
      broadcastToAdmins('pendingResets', getPendingResetsList());
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
      broadcastGlobalUsers();
    });

    socket.on('message', (payload) => {
      if (!payload || !socket.data.name || !socket.data.room) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      const name = socket.data.name;
      const color = socket.data.color;
      const avatar = socket.data.avatar;
      const photo = socket.data.photo;
      const role = socket.data.role;
      const replyTo = sanitizeReplyTo(payload.replyTo);

      if (payload.type === 'text') {
        const clean = (payload.text || '').toString().slice(0, 2000).trim();
        if (!clean) return;
        const msg = {
          id: makeId(), type: 'text', sender: name, color, avatar, photo, role, text: clean, ts: Date.now(),
          reactions: {}, replyTo,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
        io.except(roomId).emit('roomActivity', { roomId });
        notifyPushForMessage(roomId, msg);
      } else if (payload.type === 'image') {
        if (!payload.url) return;
        const msg = {
          id: makeId(), type: 'image', sender: name, color, avatar, photo, role, url: payload.url, ts: Date.now(),
          reactions: {}, replyTo,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
        io.except(roomId).emit('roomActivity', { roomId });
        notifyPushForMessage(roomId, msg);
      } else if (payload.type === 'audio') {
        if (!payload.url) return;
        const duration = Math.min(Math.max(Number(payload.duration) || 0, 0), 120);
        const msg = {
          id: makeId(), type: 'audio', sender: name, color, avatar, photo, role, url: payload.url, duration, ts: Date.now(),
          reactions: {}, replyTo,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
        io.except(roomId).emit('roomActivity', { roomId });
        notifyPushForMessage(roomId, msg);
      } else if (payload.type === 'poll') {
        const question = (payload.question || '').toString().slice(0, 200).trim();
        const options = Array.isArray(payload.options)
          ? payload.options.map((o) => (o || '').toString().slice(0, 80).trim()).filter(Boolean).slice(0, 6)
          : [];
        if (!question || options.length < 2) return;
        const msg = {
          id: makeId(), type: 'poll', sender: name, color, avatar, photo, role, ts: Date.now(),
          question, options, votes: {}, reactions: {}, replyTo,
        };
        state.messages.push(msg);
        saveRoomMessages(roomId);
        io.to(roomId).emit('message', msg);
        io.except(roomId).emit('roomActivity', { roomId });
        notifyPushForMessage(roomId, msg);
      }
    });

    socket.on('pollVote', (payload) => {
      if (!socket.data.name || !socket.data.room || !payload) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      const msg = state.messages.find((m) => m.id === payload.messageId);
      if (!msg || msg.deleted || msg.type !== 'poll') return;
      const optionIndex = Number(payload.optionIndex);
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= msg.options.length) return;
      msg.votes[socket.data.name.toLowerCase()] = { optionIndex, name: socket.data.name };
      saveRoomMessages(roomId);
      io.to(roomId).emit('pollUpdate', { messageId: msg.id, votes: msg.votes });
    });

    socket.on('subscribePush', (payload) => {
      if (!socket.data.name || !payload || !payload.subscription) return;
      addPushSub(socket.data.name.toLowerCase(), payload.subscription);
    });

    // --- Standort-Freigabe (freiwillig, nur DOM sieht das) -----------------------
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
      const isOwn = msg.sender === socket.data.name;
      const isAdmin = socket.data.role === 'admin';
      if (!isOwn && !isAdmin) return;
      if (isOwn && !isAdmin && Date.now() - msg.ts > DELETE_WINDOW_MS) return;
      msg.deleted = true;
      delete msg.text;
      delete msg.url;
      delete msg.duration;
      delete msg.question;
      delete msg.options;
      delete msg.votes;
      msg.reactions = {};
      saveRoomMessages(roomId);
      io.to(roomId).emit('messageDeleted', { messageId: msg.id });
      if (state.pinned && state.pinned.id === msg.id) {
        state.pinned = null;
        saveRoomPinned(roomId);
        io.to(roomId).emit('pinnedUpdate', state.pinned);
      }
    });

    socket.on('editMessage', (payload) => {
      if (!socket.data.name || !socket.data.room || !payload) return;
      const roomId = socket.data.room;
      const state = roomState.get(roomId);
      const msg = state.messages.find((m) => m.id === payload.messageId);
      if (!msg || msg.deleted || msg.type !== 'text') return;
      const isOwn = msg.sender === socket.data.name;
      const isAdmin = socket.data.role === 'admin';
      if (!isOwn && !isAdmin) return;
      if (isOwn && !isAdmin && Date.now() - msg.ts > DELETE_WINDOW_MS) return;
      const newText = (payload.newText || '').toString().slice(0, 2000).trim();
      if (!newText) return;
      msg.text = newText;
      msg.edited = true;
      msg.editedAt = Date.now();
      saveRoomMessages(roomId);
      io.to(roomId).emit('messageEdited', { messageId: msg.id, text: msg.text, editedAt: msg.editedAt });
      if (state.pinned && state.pinned.id === msg.id) {
        state.pinned.text = msg.text;
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

    // --- Admin: Kanalverwaltung --------------------------------------------------
    socket.on('admin:createRoom', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const label = (payload.label || '').toString().trim().slice(0, 40);
      if (!label) return;
      const id = slugifyRoomId(label);
      ROOMS.push({ id, label });
      saveRoomsConfig();
      roomState.set(id, loadRoom(id));
      io.emit('rooms', ROOMS);
    });

    socket.on('admin:renameRoom', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const room = ROOMS.find((r) => r.id === payload.roomId);
      if (!room) return;
      const label = (payload.label || '').toString().trim().slice(0, 40);
      if (!label) return;
      room.label = label;
      saveRoomsConfig();
      io.emit('rooms', ROOMS);
    });

    socket.on('admin:setRoomIcon', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const room = ROOMS.find((r) => r.id === payload.roomId);
      if (!room) return;
      const icon = (payload.icon || '').toString().trim().slice(0, 8);
      room.icon = icon || null;
      saveRoomsConfig();
      io.emit('rooms', ROOMS);
    });

    socket.on('admin:uploadRoomIcon', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const room = ROOMS.find((r) => r.id === payload.roomId);
      if (!room) return;
      const dataUrl = (payload.dataUrl || '').toString();
      const match = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        socket.emit('adminActionError', 'Nur Bilddateien (JPG/PNG/WebP/GIF) sind als Kanal-Icon erlaubt.');
        return;
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 2 * 1024 * 1024) {
        socket.emit('adminActionError', 'Das Icon-Bild ist zu groß (max. 2 MB).');
        return;
      }
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(ROOM_ICON_DIR, filename), buffer);
      room.iconImage = `/uploads/room-icons/${filename}`;
      saveRoomsConfig();
      io.emit('rooms', ROOMS);
    });

    socket.on('admin:removeRoomIcon', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const room = ROOMS.find((r) => r.id === payload.roomId);
      if (!room) return;
      room.iconImage = null;
      saveRoomsConfig();
      io.emit('rooms', ROOMS);
    });

    socket.on('admin:uploadRoomBackground', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const room = ROOMS.find((r) => r.id === payload.roomId);
      if (!room) return;
      const dataUrl = (payload.dataUrl || '').toString();
      const match = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        socket.emit('adminActionError', 'Nur Bilddateien (JPG/PNG/WebP/GIF) sind als Kanal-Hintergrund erlaubt.');
        return;
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 6 * 1024 * 1024) {
        socket.emit('adminActionError', 'Das Bild ist zu groß (max. 6 MB).');
        return;
      }
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(ROOM_BG_DIR, filename), buffer);
      room.background = `/uploads/room-backgrounds/${filename}`;
      saveRoomsConfig();
      io.emit('rooms', ROOMS);
    });

    socket.on('admin:removeRoomBackground', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const room = ROOMS.find((r) => r.id === payload.roomId);
      if (!room) return;
      room.background = null;
      saveRoomsConfig();
      io.emit('rooms', ROOMS);
    });

    socket.on('admin:deleteRoom', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      if (ROOMS.length <= 1) return; // mindestens ein Kanal muss erhalten bleiben
      const idx = ROOMS.findIndex((r) => r.id === payload.roomId);
      if (idx === -1) return;
      const [removed] = ROOMS.splice(idx, 1);
      saveRoomsConfig();
      roomState.delete(removed.id); // Daten bleiben auf der Platte, nur aus der aktiven Liste entfernt
      const fallbackRoom = ROOMS[0].id;

      for (const [socketId, entry] of onlineUsers.entries()) {
        if (entry.room !== removed.id) continue;
        const s = io.sockets.sockets.get(socketId);
        if (!s) continue;
        s.leave(removed.id);
        s.join(fallbackRoom);
        s.data.room = fallbackRoom;
        entry.room = fallbackRoom;
        const state = roomState.get(fallbackRoom);
        s.emit('roomChanged', fallbackRoom);
        s.emit('history', state.messages.slice(-MAX_SEND));
        s.emit('pinnedUpdate', state.pinned);
        s.emit('unreadCounts', computeUnreadCounts(entry.name, fallbackRoom));
      }
      broadcastRoomUsers(fallbackRoom);
      broadcastGlobalUsers();
      io.emit('rooms', ROOMS);
    });

    // --- Einkaufsliste (eigenstaendig, an keinen Kanal gebunden) ----------------
    function broadcastShoppingList() {
      io.emit('shoppingListUpdate', { items: shoppingItems, categories: shoppingCategories });
    }

    socket.on('checklist:add', (payload) => {
      if (!socket.data.name || !payload) return;
      const text = (payload.text || '').toString().slice(0, 200).trim();
      if (!text) return;
      const category = (payload.category || '').toString().slice(0, 60).trim() || 'Sonstiges';
      const amount = (payload.amount || '').toString().slice(0, 20).trim();
      const unit = (payload.unit || '').toString().slice(0, 20).trim();
      const item = {
        id: makeId(), text, category, amount, unit, done: false, addedBy: socket.data.name, ts: Date.now(),
      };
      shoppingItems.push(item);
      saveShoppingList();
      if (!shoppingCategories.some((c) => c.toLowerCase() === category.toLowerCase())) {
        shoppingCategories.push(category);
        saveShoppingCategories();
      }
      broadcastShoppingList();
    });

    socket.on('checklist:addCategory', (payload) => {
      if (!socket.data.name || !payload) return;
      const category = (payload.category || '').toString().slice(0, 60).trim();
      if (!category) return;
      if (shoppingCategories.some((c) => c.toLowerCase() === category.toLowerCase())) return;
      shoppingCategories.push(category);
      saveShoppingCategories();
      broadcastShoppingList();
    });

    socket.on('checklist:removeCategory', (payload) => {
      if (!socket.data.name || !payload) return;
      const category = (payload.category || '').toString();
      const before = shoppingCategories.length;
      shoppingCategories = shoppingCategories.filter((c) => c.toLowerCase() !== category.toLowerCase());
      if (shoppingCategories.length === before) return;
      // Vorhandene Eintraege dieser Rubrik nach "Sonstiges" verschieben statt zu loeschen
      shoppingItems.forEach((it) => {
        if (it.category && it.category.toLowerCase() === category.toLowerCase()) it.category = 'Sonstiges';
      });
      if (!shoppingCategories.some((c) => c.toLowerCase() === 'sonstiges') && shoppingItems.some((it) => it.category === 'Sonstiges')) {
        shoppingCategories.push('Sonstiges');
      }
      saveShoppingCategories();
      saveShoppingList();
      broadcastShoppingList();
    });

    socket.on('checklist:edit', (payload) => {
      if (!socket.data.name || !payload) return;
      const item = shoppingItems.find((it) => it.id === payload.itemId);
      if (!item) return;
      const text = (payload.text || '').toString().slice(0, 200).trim();
      if (!text) return;
      item.text = text;
      item.amount = (payload.amount || '').toString().slice(0, 20).trim();
      item.unit = (payload.unit || '').toString().slice(0, 20).trim();
      saveShoppingList();
      broadcastShoppingList();
    });

    socket.on('checklist:toggle', (payload) => {
      if (!socket.data.name || !payload) return;
      const item = shoppingItems.find((it) => it.id === payload.itemId);
      if (!item) return;
      item.done = !item.done;
      saveShoppingList();
      broadcastShoppingList();
    });

    socket.on('checklist:remove', (payload) => {
      if (!socket.data.name || !payload) return;
      const before = shoppingItems.length;
      shoppingItems = shoppingItems.filter((it) => it.id !== payload.itemId);
      if (shoppingItems.length === before) return;
      saveShoppingList();
      broadcastShoppingList();
    });

    socket.on('checklist:clearDone', () => {
      if (!socket.data.name) return;
      const before = shoppingItems.length;
      shoppingItems = shoppingItems.filter((it) => !it.done);
      if (shoppingItems.length === before) return;
      saveShoppingList();
      broadcastShoppingList();
    });

    // --- Geburtstage (eigenstaendig, jeder kann eintragen/entfernen) -----------
    socket.on('birthday:add', (payload) => {
      if (!socket.data.name || !payload) return;
      const name = (payload.name || '').toString().slice(0, 40).trim();
      const day = Number(payload.day);
      const month = Number(payload.month);
      const year = payload.year ? Number(payload.year) : null;
      if (!name) return;
      if (!Number.isInteger(day) || day < 1 || day > 31) return;
      if (!Number.isInteger(month) || month < 1 || month > 12) return;
      const entry = {
        id: makeId(), name, day, month, year: year && year > 1900 ? year : null,
        addedBy: socket.data.name, lastCongratulatedYear: null,
      };
      birthdays.push(entry);
      saveBirthdays();
      io.emit('birthdaysUpdate', birthdays);
    });

    socket.on('birthday:remove', (payload) => {
      if (!socket.data.name || !payload) return;
      const before = birthdays.length;
      birthdays = birthdays.filter((b) => b.id !== payload.id);
      if (birthdays.length === before) return;
      saveBirthdays();
      io.emit('birthdaysUpdate', birthdays);
    });

    // --- Admin: Nutzer sperren/entsperren ----------------------------------------
    socket.on('admin:banUser', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const targetName = (payload.name || '').toString().trim();
      if (!targetName) return;
      const key = targetName.toLowerCase();
      if (key === adminDisplayName.toLowerCase()) return; // Admin kann sich nicht selbst sperren

      if (!bannedNames.includes(key)) {
        bannedNames.push(key);
        saveBanned(bannedNames);
      }
      for (const [socketId, entry] of onlineUsers.entries()) {
        if (entry.name.toLowerCase() !== key) continue;
        const s = io.sockets.sockets.get(socketId);
        if (s) {
          s.emit('kicked', 'Ein Administrator hat dich aus dem Kanal entfernt.');
          s.disconnect(true);
        }
      }
      broadcastToAdmins('bannedList', bannedNames);
    });

    socket.on('admin:unbanUser', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const key = (payload.name || '').toString().trim().toLowerCase();
      bannedNames = bannedNames.filter((n) => n !== key);
      saveBanned(bannedNames);
      broadcastToAdmins('bannedList', bannedNames);
    });

    // --- Admin: Konto-Anfragen genehmigen/ablehnen/entfernen ---------------------
    socket.on('admin:approveUser', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const key = (payload.name || '').toString().trim().toLowerCase();
      const entry = protectedUsers[key];
      if (!entry || entry.status !== 'pending') return;
      entry.status = 'approved';
      saveProtectedUsers();
      io.emit('protectedNames', getProtectedNamesPublic());
      broadcastToAdmins('pendingRequests', getPendingList());
      broadcastToAdmins('approvedAccounts', getApprovedList());
    });

    socket.on('admin:rejectUser', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const key = (payload.name || '').toString().trim().toLowerCase();
      if (protectedUsers[key] && protectedUsers[key].status === 'pending') {
        delete protectedUsers[key];
        saveProtectedUsers();
        io.emit('protectedNames', getProtectedNamesPublic());
        broadcastToAdmins('pendingRequests', getPendingList());
      }
    });

    socket.on('admin:removeAccount', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const key = (payload.name || '').toString().trim().toLowerCase();
      if (protectedUsers[key]) {
        delete protectedUsers[key];
        saveProtectedUsers();
        io.emit('protectedNames', getProtectedNamesPublic());
        broadcastToAdmins('pendingRequests', getPendingList());
        broadcastToAdmins('approvedAccounts', getApprovedList());
      }
    });

    // --- Admin: eigenen Login-Namen aendern --------------------------------------
    socket.on('admin:renameAdmin', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const newName = (payload.newName || '').toString().trim().slice(0, 24);
      if (!newName) return;
      const newKey = newName.toLowerCase();
      if (newKey === adminDisplayName.toLowerCase()) return;
      if (bannedNames.includes(newKey)) {
        socket.emit('adminRenameError', 'Dieser Name ist gesperrt.');
        return;
      }
      if (protectedUsers[newKey]) {
        socket.emit('adminRenameError', 'Dieser Name ist bereits als geschütztes Konto vergeben.');
        return;
      }

      adminDisplayName = newName;
      saveAdminConfig();

      // Laufende eigene Sitzung sofort mit umbenennen, kein Neu-Login noetig
      socket.data.name = newName;
      socket.data.color = colorForName(newName);
      const entry = onlineUsers.get(socket.id);
      if (entry) {
        entry.name = newName;
        entry.color = socket.data.color;
      }
      broadcastRoomUsers(socket.data.room);
      broadcastGlobalUsers();

      // Alten Sitzungs-Token (mit dem alten Namen) ungueltig machen, neuen ausstellen
      if (socket.data.sessionToken) delete sessions[socket.data.sessionToken];
      const newToken = createSession(newName, 'admin');
      socket.data.sessionToken = newToken;
      socket.emit('sessionToken', newToken);
      socket.emit('adminRenamed', newName);
    });

    // --- Admin: Passwort-Reset-Anfragen genehmigen/ablehnen ---------------------
    socket.on('admin:approveReset', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const key = (payload.name || '').toString().trim().toLowerCase();
      const account = protectedUsers[key];
      if (!account || !account.pendingResetHash) return;
      account.passwordHash = account.pendingResetHash;
      delete account.pendingResetHash;
      delete account.pendingResetAt;
      saveProtectedUsers();
      broadcastToAdmins('pendingResets', getPendingResetsList());
    });

    socket.on('admin:rejectReset', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const key = (payload.name || '').toString().trim().toLowerCase();
      const account = protectedUsers[key];
      if (account) {
        delete account.pendingResetHash;
        delete account.pendingResetAt;
        saveProtectedUsers();
      }
      broadcastToAdmins('pendingResets', getPendingResetsList());
    });

    socket.on('typing', (isTyping) => {
      if (!socket.data.name || !socket.data.room) return;
      socket.to(socket.data.room).emit('typing', { name: socket.data.name, isTyping: !!isTyping });
    });

    socket.on('disconnect', () => {
      const name = socket.data.name;
      const room = socket.data.room;
      onlineUsers.delete(socket.id);
      if (name) logPresenceEvent(name, 'offline');
      if (room) {
        broadcastRoomUsers(room);
        if (name) io.to(room).emit('system', `${name} hat den Kanal verlassen`);
      }
      broadcastGlobalUsers();
    });
  });

  server.listen(PORT, () => {
    console.log(`Hausfunk laeuft (HTTP, TLS uebernimmt der Reverse Proxy) auf Port ${PORT}`);
    if (!ADMIN_PASSWORD) {
      console.log('Hinweis: HAUSFUNK_ADMIN_PASSWORD ist nicht gesetzt -- der Admin-Zugang (Name "DOM") ist deaktiviert.');
    }
  });
}

main().catch((err) => {
  console.error('Hausfunk konnte nicht gestartet werden:', err);
  process.exit(1);
});
