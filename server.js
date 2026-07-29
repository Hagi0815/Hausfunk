const express = require('express');
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');
const ical = require('node-ical');
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
const CALENDAR_CONFIG_FILE = path.join(DATA_DIR, 'calendar-config.json');
const RADIO_STATIONS_FILE = path.join(DATA_DIR, 'radio-stations.json');
const CAMERAS_FILE = path.join(DATA_DIR, 'cameras.json');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlist.json');
const MUSIC_DIR = path.join(UPLOAD_DIR, 'music');
const NETWORK_MUSIC_CONFIG_FILE = path.join(DATA_DIR, 'network-music-folder.json');
const AUDIO_FILE_EXTENSIONS = new Set(['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.aac']);
const CALENDAR_REFRESH_MS = 30 * 60 * 1000; // alle 30 Minuten neu abrufen
const CALENDAR_LOOKAHEAD_DAYS = 60;
const CALENDAR_LOOKBACK_DAYS = 60;
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
const CAMERA_ALERT_SECRET = process.env.HAUSFUNK_CAMERA_ALERT_SECRET || null;
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
[DATA_DIR, ROOMS_DIR, UPLOAD_DIR, AVATAR_DIR, ROOM_BG_DIR, ROOM_ICON_DIR, MUSIC_DIR].forEach((dir) => {
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
if (!fs.existsSync(CALENDAR_CONFIG_FILE)) fs.writeFileSync(CALENDAR_CONFIG_FILE, JSON.stringify({ url: null }));
const DEFAULT_RADIO_STATIONS = [
  { name: 'Deutschlandfunk', url: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3' },
  { name: 'Deutschlandfunk Kultur', url: 'https://st02.sslstream.dlf.de/dlf/02/128/mp3/stream.mp3' },
  { name: 'Deutschlandfunk Nova', url: 'https://st03.sslstream.dlf.de/dlf/03/128/mp3/stream.mp3' },
  { name: '1LIVE', url: 'https://wdr-1live-live.icecastssl.wdr.de/wdr/1live/live/mp3/128/stream.mp3' },
  { name: '1LIVE Diggi', url: 'https://wdr-1live-diggi.icecastssl.wdr.de/wdr/1live/diggi/mp3/128/stream.mp3' },
  { name: 'WDR 2', url: 'https://wdr-wdr2-rheinland.icecastssl.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3' },
  { name: 'WDR 4', url: 'https://wdr-wdr4-live.icecastssl.wdr.de/wdr/wdr4/live/mp3/128/stream.mp3' },
  { name: 'WDR 5', url: 'https://wdr-wdr5-live.icecastssl.wdr.de/wdr/wdr5/live/mp3/128/stream.mp3' },
  { name: 'NDR 2', url: 'https://icecast.ndr.de/ndr/ndr2/niedersachsen/mp3/128/stream.mp3' },
  { name: 'NDR Kultur', url: 'https://icecast.ndr.de/ndr/ndrkultur/live/mp3/128/stream.mp3' },
  { name: 'N-JOY', url: 'https://icecast.ndr.de/ndr/njoy/live/mp3/128/stream.mp3' },
  { name: 'Bayern 3', url: 'https://dispatcher.rndfnk.com/br/br3/live/mp3/mid' },
  { name: 'Bayern 1', url: 'https://dispatcher.rndfnk.com/br/br1/obb/mp3/mid' },
  { name: 'SWR1', url: 'https://liveradio.swr.de/sw282p3/swr1bw/play.mp3' },
  { name: 'SWR3', url: 'https://liveradio.swr.de/sw282p3/swr3/play.mp3' },
  { name: 'SWR4', url: 'https://liveradio.swr.de/sw282p3/swr4bw/play.mp3' },
  { name: 'hr1', url: 'https://hr-hr1-live.cast.addradio.de/hr/hr1/live/mp3/128/stream.mp3' },
  { name: 'hr3', url: 'https://hr-hr3-live.cast.addradio.de/hr/hr3/live/mp3/128/stream.mp3' },
  { name: 'hr4', url: 'https://hr-hr4-live.cast.addradio.de/hr/hr4/live/mp3/128/stream.mp3' },
  { name: 'YOU FM', url: 'https://hr-youfm-live.cast.addradio.de/hr/youfm/live/mp3/128/stream.mp3' },
  { name: 'MDR Jump', url: 'https://mdr-jump-live.cast.addradio.de/mdr/jump/live/mp3/128/stream.mp3' },
  { name: 'MDR Sachsen', url: 'https://mdr-sachsen-live.cast.addradio.de/mdr/sachsen/live/mp3/128/stream.mp3' },
  { name: 'MDR Kultur', url: 'https://mdr-mdrkultur-live.cast.addradio.de/mdr/mdrkultur/live/mp3/128/stream.mp3' },
  { name: 'rbb 88.8', url: 'https://d.rbb-online.de/rbb888/rbb888_2.mp3' },
  { name: 'Fritz', url: 'https://d.rbb-online.de/fritz/fritz_2.mp3' },
  { name: 'Antenne Bayern', url: 'https://stream.antenne.de/antenne' },
  { name: 'radio ffn', url: 'https://stream.ffn.de/ffn/mp3-192/stream.mp3' },
  { name: 'bigFM', url: 'https://streams.bigfm.de/bigfm-deutschland-128-mp3' },
  { name: 'Rock Antenne', url: 'https://stream.rockantenne.de/rockantenne/stream/mp3' },
  { name: 'Klassik Radio', url: 'https://stream.klassikradio.de/klassikradio/stream/mp3' },
  { name: 'sunshine live', url: 'https://stream.sunshine-live.de/live/mp3-192/stream.mp3' },
];
function shouldSeedOrUpgradeRadioStations() {
  if (!fs.existsSync(RADIO_STATIONS_FILE)) return true;
  try {
    const content = JSON.parse(fs.readFileSync(RADIO_STATIONS_FILE, 'utf-8'));
    if (!Array.isArray(content) || content.length === 0) return true;
    // Nur ersetzen/erweitern, wenn AUSSCHLIESSLICH automatisch vorbefuellte
    // Sender vorhanden sind (niemand hat eigene hinzugefuegt) -- so bleiben
    // eigene Ergaenzungen/Aenderungen garantiert immer unangetastet.
    return content.every((s) => s.addedBy === 'Standard');
  } catch (err) {
    return true;
  }
}
if (shouldSeedOrUpgradeRadioStations()) {
  const seeded = DEFAULT_RADIO_STATIONS.map((s) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: s.name, url: s.url, addedBy: 'Standard',
  }));
  fs.writeFileSync(RADIO_STATIONS_FILE, JSON.stringify(seeded, null, 2));
}
if (!fs.existsSync(PLAYLIST_FILE)) fs.writeFileSync(PLAYLIST_FILE, '[]');
if (!fs.existsSync(CAMERAS_FILE)) fs.writeFileSync(CAMERAS_FILE, '[]');
if (!fs.existsSync(NETWORK_MUSIC_CONFIG_FILE)) fs.writeFileSync(NETWORK_MUSIC_CONFIG_FILE, JSON.stringify({ path: null }));
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

// --- Ordnergroesse rekursiv berechnen (fuer den Server-Status im Admin-Panel) ---
function getDirSize(dirPath) {
  let total = 0;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    return 0;
  }
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(fullPath);
    } else if (entry.isFile()) {
      try {
        total += fs.statSync(fullPath).size;
      } catch (err) {
        // Datei evtl. zwischenzeitlich geloescht -- ignorieren
      }
    }
  });
  return total;
}

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

function slugifyCameraStreamName(label, existingNames) {
  const base = label.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const root = base || 'kamera';
  let candidate = root;
  let suffix = 1;
  while (existingNames.has(candidate)) {
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

// --- Kalender (iCal-Adresse, von DOM eingegeben) -----------------------------
function loadCalendarConfig() {
  try {
    return JSON.parse(fs.readFileSync(CALENDAR_CONFIG_FILE, 'utf-8'));
  } catch (err) {
    return { url: null };
  }
}
function saveCalendarConfig() {
  fs.writeFileSync(CALENDAR_CONFIG_FILE, JSON.stringify({ url: calendarUrl }, null, 2));
}
let calendarUrl = loadCalendarConfig().url || null;

// --- Internetradio-Sender (offen fuer alle, laeuft naturgemaess synchron,
//     da es ein Live-Stream ist -- keine Positions-Synchronisierung noetig) -
function loadRadioStations() {
  try {
    return JSON.parse(fs.readFileSync(RADIO_STATIONS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function saveRadioStations() {
  fs.writeFileSync(RADIO_STATIONS_FILE, JSON.stringify(radioStations, null, 2));
}
let radioStations = loadRadioStations(); // { id, name, url, addedBy, logoUrl }

// Sender-Logo bei radio-browser.info suchen (offene, kostenlose
// Radiosender-Datenbank) -- liefert null, wenn nichts Passendes gefunden
// wird oder der Dienst nicht erreichbar ist; UI faellt dann auf ein
// farbiges Monogramm zurueck.
function fetchRadioLogo(stationName) {
  return new Promise((resolve) => {
    const req = https.get({
      hostname: 'de1.api.radio-browser.info',
      path: `/json/stations/search?name=${encodeURIComponent(stationName.trim())}&limit=30&hidebroken=true`,
      headers: { 'User-Agent': 'Hausfunk/1.0' },
      timeout: 6000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const results = JSON.parse(body);
          if (!Array.isArray(results) || results.length === 0) {
            resolve(null);
            return;
          }
          const withFavicon = results.filter((s) => s.favicon && s.favicon.trim());
          if (withFavicon.length === 0) {
            resolve(null);
            return;
          }
          // Zuerst eine exakte Namensuebereinstimmung mit Favicon bevorzugen
          // (die Suche selbst ist ein unscharfer Substring-Treffer und liefert
          // sonst z.B. bei "hr3" auch viele thematisch unpassende Ergebnisse
          // zuerst zurueck), sonst einfach den ersten Treffer mit Favicon.
          const targetLower = stationName.trim().toLowerCase();
          const exact = withFavicon.find((s) => (s.name || '').trim().toLowerCase() === targetLower);
          resolve((exact || withFavicon[0]).favicon.trim());
        } catch (err) {
          resolve(null);
        }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}

// Beim Start: fuer alle Sender ohne Logo (auch aeltere, schon gespeicherte)
// im Hintergrund eins nachladen -- mit kleiner Pause zwischen den Anfragen,
// um den externen Dienst nicht zu ueberlasten. Blockiert den Start nicht.
let radioLogoBackfillRunning = false;
async function backfillRadioLogos(io) {
  if (radioLogoBackfillRunning) return 0;
  radioLogoBackfillRunning = true;
  let foundCount = 0;
  try {
    const missing = radioStations.filter((s) => !s.logoUrl);
    // eslint-disable-next-line no-restricted-syntax
    for (const station of missing) {
      // eslint-disable-next-line no-await-in-loop
      const logoUrl = await fetchRadioLogo(station.name);
      if (logoUrl) {
        station.logoUrl = logoUrl;
        saveRadioStations();
        io.emit('radioStations', radioStations);
        foundCount += 1;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => { setTimeout(resolve, 400); });
    }
  } finally {
    radioLogoBackfillRunning = false;
  }
  return foundCount;
}

// --- Geteilte Musik-Playlist (echte Synchronisierung: Position/Play-Status
//     fuer alle gleich) -------------------------------------------------------
function loadPlaylist() {
  try {
    return JSON.parse(fs.readFileSync(PLAYLIST_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function savePlaylist() {
  fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(playlist, null, 2));
}
let playlist = loadPlaylist(); // { id, title, url, addedBy } -- hochgeladene Titel
let playerState = {
  trackId: null, isPlaying: false, positionSeconds: 0, lastUpdateTs: Date.now(),
};

// --- Netzwerkkameras (MJPEG, per Server durchgeleitet) -----------------------
function loadCameras() {
  try {
    return JSON.parse(fs.readFileSync(CAMERAS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function saveCameras() {
  fs.writeFileSync(CAMERAS_FILE, JSON.stringify(cameras, null, 2));
}
let cameras = loadCameras(); // { id, name, url, addedBy } -- "url" ist der go2rtc-Stream-Name

// go2rtc-eigene API anfragen (Sender direkt hinzufuegen/entfernen, ohne die
// go2rtc.yaml von Hand bearbeiten zu muessen -- go2rtc speichert Aenderungen
// ueber diese API selbststaendig in seiner Konfigurationsdatei).
function go2rtcApiRequest(method, apiPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: Number(process.env.HAUSFUNK_GO2RTC_PORT) || 1984,
      path: `/go2rtc${apiPath}`,
      method,
      timeout: 8000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('timeout', () => req.destroy(new Error('Zeitüberschreitung')));
    req.on('error', reject);
    req.end();
  });
}

function getCurrentPosition() {
  if (!playerState.isPlaying) return playerState.positionSeconds;
  return playerState.positionSeconds + (Date.now() - playerState.lastUpdateTs) / 1000;
}

// --- Netzwerkordner mit Musikdateien (z.B. ein gemountetes NAS-Verzeichnis) --
function loadNetworkMusicConfig() {
  try {
    return JSON.parse(fs.readFileSync(NETWORK_MUSIC_CONFIG_FILE, 'utf-8'));
  } catch (err) {
    return { path: null };
  }
}
function saveNetworkMusicConfig() {
  fs.writeFileSync(NETWORK_MUSIC_CONFIG_FILE, JSON.stringify({ path: networkMusicFolder }, null, 2));
}
let networkMusicFolder = loadNetworkMusicConfig().path || null;
let networkTracks = []; // { id, title, relativePath }

async function scanNetworkMusicFolder() {
  const collected = [];
  if (networkMusicFolder) {
    async function walk(dir, relBase) {
      let entries;
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (err) {
        return; // Ordner (temporaer) nicht erreichbar -- z.B. Netzlaufwerk getrennt
      }
      // Nacheinander abarbeiten (nicht Promise.all), damit bei sehr grossen
      // Sammlungen der Server zwischendurch immer wieder Luft hat, andere
      // Anfragen zu bedienen, statt in einem Rutsch durchzurauschen.
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          // eslint-disable-next-line no-await-in-loop
          await walk(fullPath, relPath);
        } else if (entry.isFile() && AUDIO_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          collected.push({
            id: `net-${crypto.createHash('md5').update(relPath).digest('hex')}`,
            title: path.basename(entry.name, path.extname(entry.name)),
            relativePath: relPath,
          });
        }
      }
    }
    await walk(networkMusicFolder, '');
    collected.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  }
  networkTracks = collected;
}
scanNetworkMusicFolder();

// Kombinierte Liste (Netzwerkordner + hochgeladene Titel) -- Grundlage fuer
// Anzeige UND fuer alle Wiedergabe-Befehle (play/skip etc.), damit beide
// Quellen gleichermassen synchron abspielbar sind.
function getFullPlaylist() {
  const networkAsDisplay = networkTracks.map((t) => {
    const parts = t.relativePath.split('/');
    const folder = parts.length > 1 ? parts[0] : null;
    return {
      id: t.id,
      title: t.title,
      url: `/network-music/${encodeURIComponent(t.relativePath)}`,
      source: 'network',
      folder,
    };
  });
  const uploadedAsDisplay = playlist.map((t) => ({ ...t, source: 'upload', folder: null }));
  return [...networkAsDisplay, ...uploadedAsDisplay];
}
function playerStatePayload() {
  return {
    trackId: playerState.trackId,
    isPlaying: playerState.isPlaying,
    positionSeconds: getCurrentPosition(),
    serverTime: Date.now(),
  };
}
let calendarEvents = [];

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
    maxHttpBufferSize: 22 * 1024 * 1024,
  });

  // --- Kamera-Streams: robuster Proxy zu go2rtc via http-proxy ----------------
  // go2rtc nutzt fuer WebRTC/MSE-Signalisierung WebSockets, nicht nur normale
  // HTTP-Anfragen. Statt das WebSocket-Handshake-Protokoll selbst nachzubauen
  // (fehleranfaellig), nutzen wir die bewaehrte "http-proxy"-Bibliothek, die
  // sowohl normale Anfragen als auch WebSocket-Upgrades zuverlaessig durchreicht.
  const GO2RTC_PORT = Number(process.env.HAUSFUNK_GO2RTC_PORT) || 1984;
  const go2rtcProxy = httpProxy.createProxyServer({
    target: `http://localhost:${GO2RTC_PORT}`,
    ws: true,
  });
  go2rtcProxy.on('error', (err, req, res) => {
    if (res && res.writeHead && !res.headersSent) {
      res.writeHead(502);
      res.end();
    }
  });
  server.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/go2rtc/')) return; // Socket.IO uebernimmt den Rest
    go2rtcProxy.ws(req, socket, head);
  });

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/uploads', express.static(UPLOAD_DIR));

  // --- Musikdateien aus dem konfigurierten Netzwerkordner ausliefern -----------
  // (dynamisch, da der Ordnerpfad sich zur Laufzeit aendern kann -- daher kein
  //  fester express.static-Mount, sondern eine eigene Route mit Pfadpruefung)
  app.get('/network-music/:encodedPath', (req, res) => {
    if (!networkMusicFolder) return res.status(404).end();
    let relPath;
    try {
      relPath = decodeURIComponent(req.params.encodedPath);
    } catch (err) {
      return res.status(400).end();
    }
    const resolvedBase = path.resolve(networkMusicFolder);
    const resolvedTarget = path.resolve(resolvedBase, relPath);
    // Pfad-Traversal verhindern: das Ziel muss innerhalb des konfigurierten Ordners liegen.
    if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(resolvedBase + path.sep)) {
      return res.status(403).end();
    }
    return res.sendFile(resolvedTarget, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });

  // --- Kamera-Streams: internen Proxy zu go2rtc (selber Server, Port 1984) ----
  // RTSP-Kameras liefern kein browserfaehiges Format, daher wandelt go2rtc sie
  // in HLS um. Da go2rtc auf demselben Server laeuft wie Hausfunk selbst,
  // reicht Hausfunk das hier intern durch -- dadurch muss an Caddy ueberhaupt
  // nichts geaendert werden, alles laeuft ueber die bestehende Hausfunk-Domain.
  app.use('/go2rtc', (req, res) => {
    // Express entfernt bei app.use('/go2rtc', ...) den Praefix bereits aus
    // req.url, bevor der Handler laeuft -- http-proxy nutzt aber req.url
    // (nicht req.originalUrl) zum Aufbau des weitergeleiteten Pfads. Praefix
    // hier wiederherstellen, damit go2rtc (dank base_path) ihn auch bekommt.
    req.url = req.originalUrl;
    go2rtcProxy.web(req, res);
  });

  // --- Kamera-Alarm (Bewegung/Klingeln) -> Push-Benachrichtigung --------------
  // Viele IP-Kameras (u.a. Hikvision-kompatible) koennen bei einem Ereignis
  // selbst eine HTTP-Anfrage an eine konfigurierbare Adresse schicken ("HTTP
  // Listening"/Alarm-Server). Diese Route ist bewusst einfach gehalten (GET
  // oder POST, Antwortkoerper der Kamera wird ignoriert), damit sie mit
  // moeglichst vielen Kamera-/NVR-Modellen kompatibel ist.
  const lastCameraAlertAt = new Map(); // Kamera-ID -> Zeitstempel (Ratenbegrenzung)
  const CAMERA_ALERT_COOLDOWN_MS = 2 * 60 * 1000; // 2 Minuten zwischen Meldungen je Kamera
  // Rohen Anfragekoerper einlesen (kein Body-Parser-Middleware noetig) --
  // Hikvision-Kameras schicken bei einem Ereignis meist XML-Metadaten
  // (teils in multipart/form-data verpackt, ggf. mit angehaengtem Bild).
  // Ein einfacher Regex reicht, um den Ereignistyp darin zu finden, egal
  // ob als reines XML oder innerhalb von multipart-Grenzen.
  // Binaersicher als Buffer einlesen (nicht direkt in einen String wandeln --
  // das wuerde ein mitgeschicktes JPEG-Bild unwiderruflich kaputt machen).
  function readRawBodyBuffer(req) {
    return new Promise((resolve) => {
      const chunks = [];
      let received = 0;
      const MAX_BODY = 3 * 1024 * 1024; // 3 MB reichen fuer XML-Metadaten + ein Alarmbild
      req.on('data', (chunk) => {
        received += chunk.length;
        if (received <= MAX_BODY) chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', () => resolve(Buffer.concat(chunks)));
    });
  }

  // Kameras (u.a. Hikvision) schicken bei einem Ereignis oft ein
  // "multipart"-Paket: ein Teil mit den XML-Metadaten, ein weiterer Teil mit
  // einem JPEG-Schnappschuss. Diese Funktion zerlegt beide Teile anhand der
  // im Content-Type-Header angegebenen Grenze ("boundary"), ohne dabei die
  // Bilddaten durch eine Text-Umwandlung zu beschaedigen.
  function parseMultipartBody(buffer, contentTypeHeader) {
    const boundaryMatch = (contentTypeHeader || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) return null;
    const boundary = (boundaryMatch[1] || boundaryMatch[2]).trim();
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const parts = [];
    let searchFrom = 0;
    let start = buffer.indexOf(boundaryBuf, searchFrom);
    while (start !== -1) {
      const nextStart = buffer.indexOf(boundaryBuf, start + boundaryBuf.length);
      if (nextStart === -1) break;
      parts.push(buffer.slice(start + boundaryBuf.length, nextStart));
      searchFrom = nextStart;
      start = nextStart;
    }
    return parts.map((partBuf) => {
      const headerEndIdx = partBuf.indexOf('\r\n\r\n');
      if (headerEndIdx === -1) return null;
      const headerStr = partBuf.slice(0, headerEndIdx).toString('utf-8');
      let content = partBuf.slice(headerEndIdx + 4);
      if (content.slice(-2).toString('latin1') === '\r\n') content = content.slice(0, -2);
      const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n;]+)/i);
      return { contentType: typeMatch ? typeMatch[1].trim().toLowerCase() : '', content };
    }).filter(Boolean);
  }

  const CAMERA_EVENT_LABELS = {
    vmd: 'Bewegung erkannt',
    linedetection: 'Linie überschritten',
    fielddetection: 'Bereich betreten',
    shelteralarm: 'Sabotage/Verdeckung erkannt',
    videoloss: 'Videosignal verloren',
    facedetection: 'Gesicht erkannt',
    regionentrance: 'Bereich betreten',
    regionexiting: 'Bereich verlassen',
    io: 'Klingel/Kontakt ausgelöst',
  };
  function describeCameraEvent(explicitEvent, rawBody) {
    if (explicitEvent) return explicitEvent;
    const match = rawBody.match(/<eventType>\s*([^<\s]+)\s*<\/eventType>/i);
    if (!match) return null;
    const code = match[1].toLowerCase();
    return CAMERA_EVENT_LABELS[code] || code;
  }

  async function handleCameraAlert(req, res) {
    if (!CAMERA_ALERT_SECRET) {
      return res.status(503).send('HAUSFUNK_CAMERA_ALERT_SECRET ist auf dem Server nicht gesetzt.');
    }
    const providedSecret = (req.query.secret || '').toString();
    if (providedSecret !== CAMERA_ALERT_SECRET) {
      return res.status(403).send('Ungueltiges Geheimnis.');
    }
    const cameraQuery = (req.query.camera || '').toString().trim();
    if (!cameraQuery) {
      return res.status(400).send('Fehlender Parameter "camera".');
    }
    const camera = cameras.find(
      (c) => c.id === cameraQuery || c.url === cameraQuery || c.name.toLowerCase() === cameraQuery.toLowerCase(),
    );
    const cameraLabel = camera ? camera.name : cameraQuery;
    const cameraKey = camera ? camera.id : cameraQuery;

    const now = Date.now();
    const last = lastCameraAlertAt.get(cameraKey) || 0;
    if (now - last < CAMERA_ALERT_COOLDOWN_MS) {
      return res.status(200).send('OK (innerhalb der Ruhezeit, keine erneute Meldung)');
    }
    lastCameraAlertAt.set(cameraKey, now);

    // Explizites "event="-Feld hat Vorrang (falls die Kamera mehrere
    // Alarmserver-Eintraege pro Ereignistyp mit eigener URL unterstuetzt);
    // sonst Bestes-Verhalten-Versuch, den Typ aus dem Anfragekoerper zu lesen.
    const explicitEvent = (req.query.event || '').toString().trim();
    const rawBodyBuffer = await readRawBodyBuffer(req);
    const contentTypeHeader = req.headers['content-type'] || '';

    // Bei multipart (XML-Metadaten + JPEG-Schnappschuss getrennt) beide Teile
    // auseinanderhalten; sonst den kompletten Koerper als Text behandeln
    // (kein Bild vorhanden, z.B. bei einer einfachen Test-Anfrage per curl).
    let rawBodyText = '';
    let imageBuffer = null;
    if (contentTypeHeader.toLowerCase().includes('multipart')) {
      const parts = parseMultipartBody(rawBodyBuffer, contentTypeHeader) || [];
      const xmlPart = parts.find((p) => p.contentType.includes('xml') || p.contentType.includes('text'));
      const imagePart = parts.find((p) => p.contentType.includes('image'));
      if (xmlPart) rawBodyText = xmlPart.content.toString('utf-8');
      if (imagePart && imagePart.content.length > 0) imageBuffer = imagePart.content;
    } else {
      rawBodyText = rawBodyBuffer.toString('utf-8');
    }

    const eventDescription = describeCameraEvent(explicitEvent, rawBodyText);
    const eventLabel = eventDescription || 'Bewegung erkannt';

    // Mitgeschicktes Alarmbild speichern (wie ein normaler Bild-Upload) --
    // faellt beim Speichern etwas aus, wird einfach ohne Bild weitergemacht.
    let imageUrl = null;
    if (imageBuffer) {
      try {
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), imageBuffer);
        imageUrl = `/uploads/${filename}`;
      } catch (err) {
        imageUrl = null;
      }
    }

    const title = `📹 ${eventLabel} · ${cameraLabel}`;
    Object.keys(pushSubs).forEach((nameKey) => {
      sendPushToName(nameKey, { title, body: 'Kamera hat ein Ereignis gemeldet.' });
    });

    // Zusaetzlich als echte, dauerhafte Nachricht im Familie-Kanal ablegen --
    // nicht nur ein fluechtiger Hinweis, der nur sichtbar ist, wenn man genau
    // in diesem Moment im Chat schaut. So sieht man es auch nachtraeglich
    // beim Durchscrollen, und der Ungelesen-Zaehler greift ebenfalls.
    const alertRoomId = 'familie';
    const alertState = roomState.get(alertRoomId);
    if (alertState) {
      const alertText = `${eventLabel} an „${cameraLabel}"`;
      const msg = {
        id: makeId(),
        type: imageUrl ? 'image' : 'text',
        sender: '📹 Kamera',
        color: '#e8a33d',
        avatar: null,
        photo: null,
        role: 'system',
        text: alertText,
        ts: Date.now(),
        reactions: {},
        replyTo: null,
        cameraLinkId: camera ? camera.id : null,
      };
      if (imageUrl) {
        msg.url = imageUrl;
        msg.caption = alertText;
      }
      alertState.messages.push(msg);
      saveRoomMessages(alertRoomId);
      io.to(alertRoomId).emit('message', msg);
      io.except(alertRoomId).emit('roomActivity', { roomId: alertRoomId });
    }

    return res.status(200).send('OK');
  }
  app.get('/api/camera-alert', handleCameraAlert);
  app.post('/api/camera-alert', handleCameraAlert);

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

  // --- Kalender (iCal) abrufen und an alle verteilen --------------------------
  function broadcastCalendarUpdate(error) {
    io.emit('calendarUpdate', { events: calendarEvents, updatedAt: Date.now(), error: error || null });
  }

  async function fetchCalendar() {
    if (!calendarUrl) {
      calendarEvents = [];
      broadcastCalendarUpdate();
      return;
    }
    try {
      const data = await ical.async.fromURL(calendarUrl);
      const now = new Date();
      const rangeStart = new Date(now.getTime() - CALENDAR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const future = new Date(now.getTime() + CALENDAR_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
      const events = [];

      Object.values(data).forEach((item) => {
        if (!item || item.type !== 'VEVENT' || !item.start) return;
        const allDay = Boolean(item.start.dateOnly);
        const durationMs = item.end ? item.end.getTime() - item.start.getTime() : 0;
        const summary = (item.summary || '(Ohne Titel)').toString().slice(0, 200);
        const location = item.location ? item.location.toString().slice(0, 200) : null;

        if (item.rrule) {
          let occurrences = [];
          try {
            occurrences = item.rrule.between(rangeStart, future, true);
          } catch (err) {
            occurrences = [];
          }
          occurrences.forEach((occStart) => {
            const occEnd = new Date(occStart.getTime() + durationMs);
            events.push({
              summary,
              location,
              start: occStart.toISOString(),
              end: occEnd.toISOString(),
              allDay,
            });
          });
        } else {
          // Vergangene und zukuenftige Termine gleichermassen im Zeitfenster
          // beruecksichtigen, nicht nur ab "jetzt".
          const effectiveEnd = item.end || item.start;
          if (effectiveEnd >= rangeStart && item.start <= future) {
            events.push({
              summary,
              location,
              start: item.start.toISOString(),
              end: item.end ? item.end.toISOString() : null,
              allDay,
            });
          }
        }
      });

      events.sort((a, b) => new Date(a.start) - new Date(b.start));
      calendarEvents = events.slice(0, 600);
      broadcastCalendarUpdate();
    } catch (err) {
      console.error('Kalender konnte nicht abgerufen werden:', err.message);
      broadcastCalendarUpdate('Kalender konnte nicht abgerufen werden. Ist die Adresse korrekt?');
    }
  }
  fetchCalendar();
  setInterval(fetchCalendar, CALENDAR_REFRESH_MS);

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

    const nameKey = name.toLowerCase();
    let finalIsPhoto = Boolean(isPhoto && avatar);
    let finalAvatar = avatar;

    // Ist fuer diesen Namen bereits ein Profilbild hinterlegt, hat es Vorrang --
    // verhindert, dass ein zwischenzeitlich ohne Foto gesendeter Zustand (z.B.
    // bei einem kurzen Verbindungsaussetzer und automatischem Re-Join) das
    // gespeicherte Bild fuer die laufende Sitzung verschwinden laesst.
    if (!finalIsPhoto && avatarsByName[nameKey]) {
      finalIsPhoto = true;
      finalAvatar = avatarsByName[nameKey];
    }

    const roomId = DEFAULT_ROOM;

    // Gewaehltes Bild fuer den naechsten Login unter diesem Namen merken,
    // damit es automatisch vorgeschlagen wird.
    if (finalIsPhoto && finalAvatar && avatarsByName[nameKey] !== finalAvatar) {
      avatarsByName[nameKey] = finalAvatar;
      saveAvatars(avatarsByName);
      io.emit('avatarMap', avatarsByName);
    }

    socket.data.name = name;
    socket.data.color = colorForName(name);
    socket.data.avatar = finalIsPhoto ? null : finalAvatar;
    socket.data.photo = finalIsPhoto ? finalAvatar : null;
    socket.data.role = role;
    socket.data.room = roomId;
    socket.data.lastActivityAt = Date.now();
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
      socket.emit('calendarUrl', calendarUrl);
      socket.emit('networkMusicFolder', networkMusicFolder);
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
    socket.emit('calendarUpdate', { events: calendarEvents, updatedAt: Date.now(), error: null });
    socket.emit('radioStations', radioStations);
    socket.emit('playlistUpdate', getFullPlaylist());
    socket.emit('playerState', playerStatePayload());
    socket.emit('camerasUpdate', cameras);

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

    // --- Eigenes Profilbild aendern (nur die eigene Sitzung, nach dem Login) ---
    socket.on('updateMyAvatar', (payload) => {
      if (!socket.data.name || !payload) return;
      const dataUrl = (payload.dataUrl || '').toString();
      const match = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        socket.emit('avatarActionError', 'Nur Bilddateien (JPG/PNG/WebP/GIF) sind als Profilbild erlaubt.');
        return;
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        socket.emit('avatarActionError', 'Das Bild ist zu groß (max. 5 MB).');
        return;
      }
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(AVATAR_DIR, filename), buffer);
      const url = `/uploads/avatars/${filename}`;
      const nameKey = socket.data.name.toLowerCase();

      avatarsByName[nameKey] = url;
      saveAvatars(avatarsByName);

      // Sofort fuer die laufende Sitzung uebernehmen, damit neue Nachrichten
      // gleich das neue Bild zeigen, nicht erst beim naechsten Login.
      socket.data.photo = url;
      socket.data.avatar = null;
      const entry = onlineUsers.get(socket.id);
      if (entry) {
        entry.photo = url;
        entry.avatar = null;
      }

      io.emit('avatarMap', avatarsByName);
      if (socket.data.room) broadcastRoomUsers(socket.data.room);
      broadcastGlobalUsers();
      socket.emit('myAvatarUpdated', url);
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

    // --- Kalender-Adresse (iCal) festlegen, nur DOM -----------------------------
    socket.on('admin:setCalendarUrl', (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const url = (payload.url || '').toString().trim().slice(0, 500);
      calendarUrl = url || null;
      saveCalendarConfig();
      socket.emit('calendarUrl', calendarUrl);
      fetchCalendar();
    });

    // --- Netzwerkordner mit Musikdateien festlegen/neu einlesen (nur DOM) -------
    socket.on('admin:setNetworkMusicFolder', async (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const folderPath = (payload.path || '').toString().trim();
      if (!folderPath) {
        networkMusicFolder = null;
        networkTracks = [];
        saveNetworkMusicConfig();
        socket.emit('networkMusicFolder', networkMusicFolder);
        io.emit('playlistUpdate', getFullPlaylist());
        return;
      }
      // Windows-Freigabepfade (\\server\freigabe\...) kann Node.js unter Linux
      // nicht direkt lesen -- die Freigabe muss zuerst im Dateisystem des
      // Servers eingebunden (gemountet) werden. Klare Fehlermeldung statt
      // eines generischen "existiert nicht".
      if (/^\\\\/.test(folderPath) || /^\/\/[^/]+\//.test(folderPath)) {
        socket.emit('musicActionError', 'Das ist ein Windows-Freigabepfad (\\\\server\\freigabe\\...). Node.js auf dem Server kann darauf nicht direkt zugreifen -- die Freigabe muss zuerst auf dem Server selbst eingebunden (gemountet) werden, z.B. mit "mount -t cifs //SERVER/Freigabe /mnt/musik". Trag danach den lokalen Einhängepunkt ein (z.B. /mnt/musik), nicht den \\\\-Pfad.');
        return;
      }
      let stat;
      try {
        stat = await fs.promises.stat(folderPath);
      } catch (err) {
        socket.emit('musicActionError', 'Der angegebene Ordner existiert nicht oder ist auf dem Server nicht lesbar.');
        return;
      }
      if (!stat.isDirectory()) {
        socket.emit('musicActionError', 'Der angegebene Pfad ist kein Ordner.');
        return;
      }
      networkMusicFolder = folderPath;
      saveNetworkMusicConfig();
      socket.emit('networkMusicFolder', networkMusicFolder);
      await scanNetworkMusicFolder();
      io.emit('playlistUpdate', getFullPlaylist());
    });

    socket.on('admin:rescanNetworkMusicFolder', async () => {
      if (socket.data.role !== 'admin') return;
      await scanNetworkMusicFolder();
      io.emit('playlistUpdate', getFullPlaylist());
    });

    // --- Server-Status (nur DOM) -------------------------------------------------
    // --- Aktivitaets-Meldung (letzte Maus-/Tastatur-Interaktion), fuer den
    //     Server-Status im Admin-Panel ------------------------------------------
    socket.on('activityPing', (payload) => {
      if (!socket.data.name || !payload) return;
      const ts = Number(payload.lastActivityAt);
      if (!Number.isFinite(ts)) return;
      // Nie in der Zukunft liegend uebernehmen (Sicherheitsnetz gegen falsch
      // eingestellte Client-Uhren).
      socket.data.lastActivityAt = Math.min(ts, Date.now());
    });

    // --- LED-Laufschrift: einmalige Ankuendigung an alle, wird nirgends
    //     gespeichert -- nur eine kurze Live-Anzeige. ---------------------------
    socket.on('ledMessage:send', (payload) => {
      if (!socket.data.name || !payload) return;
      const text = (payload.text || '').toString().slice(0, 200).trim();
      if (!text) return;
      io.emit('ledMessage', { text, sender: socket.data.name, ts: Date.now() });
    });

    // --- Internetradio: Sender verwalten (offen fuer alle) ----------------------
    socket.on('radio:addStation', (payload) => {
      if (!socket.data.name || !payload) return;
      const name = (payload.name || '').toString().slice(0, 60).trim();
      const url = (payload.url || '').toString().slice(0, 500).trim();
      if (!name || !url || !/^https?:\/\//i.test(url)) return;
      const newStation = {
        id: makeId(), name, url, addedBy: socket.data.name, logoUrl: null,
      };
      radioStations.push(newStation);
      saveRadioStations();
      io.emit('radioStations', radioStations);
      // Logo im Hintergrund suchen, damit das Hinzufuegen nicht auf den
      // externen Dienst warten muss -- Sender erscheint sofort mit
      // Monogramm, Logo kommt nach, sobald gefunden.
      fetchRadioLogo(name).then((logoUrl) => {
        if (!logoUrl) return;
        newStation.logoUrl = logoUrl;
        saveRadioStations();
        io.emit('radioStations', radioStations);
      }).catch(() => {});
    });

    socket.on('radio:removeStation', (payload) => {
      if (!socket.data.name || !payload) return;
      const before = radioStations.length;
      radioStations = radioStations.filter((s) => s.id !== payload.id);
      if (radioStations.length === before) return;
      saveRadioStations();
      io.emit('radioStations', radioStations);
    });

    socket.on('admin:refreshRadioLogos', async () => {
      if (socket.data.role !== 'admin') return;
      if (radioLogoBackfillRunning) {
        socket.emit('radioLogoRefreshStatus', { running: true, message: 'Logo-Suche läuft bereits …' });
        return;
      }
      const missingCount = radioStations.filter((s) => !s.logoUrl).length;
      if (missingCount === 0) {
        socket.emit('radioLogoRefreshStatus', { running: false, message: 'Alle Sender haben bereits ein Logo (oder keins gefunden).' });
        return;
      }
      socket.emit('radioLogoRefreshStatus', { running: true, message: `Suche Logos für ${missingCount} Sender …` });
      const foundCount = await backfillRadioLogos(io);
      socket.emit('radioLogoRefreshStatus', { running: false, message: `Fertig: ${foundCount} von ${missingCount} Logo(s) gefunden.` });
    });

    // --- Netzwerkkameras verwalten (nur DOM) -------------------------------------
    socket.on('camera:add', async (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const name = (payload.name || '').toString().slice(0, 60).trim();
      const rtspUrl = (payload.url || '').toString().slice(0, 500).trim();
      if (!name) {
        socket.emit('cameraActionError', 'Bitte einen Kameranamen eingeben.');
        return;
      }
      if (!rtspUrl || !/^rtsp:\/\//i.test(rtspUrl)) {
        socket.emit('cameraActionError', 'Bitte eine gültige RTSP-Adresse eingeben (beginnt mit rtsp://).');
        return;
      }

      const existingStreamNames = new Set(cameras.map((c) => c.url));
      const streamName = slugifyCameraStreamName(name, existingStreamNames);

      try {
        const res = await go2rtcApiRequest(
          'PUT',
          `/api/streams?name=${encodeURIComponent(streamName)}&src=${encodeURIComponent(rtspUrl)}`,
        );
        if (res.statusCode >= 300) {
          socket.emit('cameraActionError', `go2rtc hat die Kamera abgelehnt (Status ${res.statusCode}). Ist die RTSP-Adresse korrekt?`);
          return;
        }
      } catch (err) {
        socket.emit('cameraActionError', 'go2rtc ist auf diesem Server nicht erreichbar (Port 1984). Läuft der Dienst?');
        return;
      }

      cameras.push({
        id: makeId(), name, url: streamName, addedBy: socket.data.name,
      });
      saveCameras();
      io.emit('camerasUpdate', cameras);
    });

    socket.on('camera:remove', async (payload) => {
      if (socket.data.role !== 'admin' || !payload) return;
      const camera = cameras.find((c) => c.id === payload.id);
      if (!camera) return;
      cameras = cameras.filter((c) => c.id !== payload.id);
      saveCameras();
      io.emit('camerasUpdate', cameras);
      // Den zugehoerigen go2rtc-Sender ebenfalls entfernen (bestmoeglich --
      // falls go2rtc gerade nicht erreichbar ist, bleibt die Hausfunk-Liste
      // trotzdem bereinigt, das darf das Entfernen nicht blockieren).
      try {
        await go2rtcApiRequest('DELETE', `/api/streams?src=${encodeURIComponent(camera.url)}`);
      } catch (err) {
        // ignorieren
      }
    });

    // --- Geteilte Musik-Playlist: Titel hochladen/entfernen, Wiedergabe steuern -
    socket.on('music:addTrack', (payload) => {
      if (!socket.data.name || !payload) return;
      const title = (payload.title || '').toString().slice(0, 150).trim();
      const dataUrl = (payload.dataUrl || '').toString();
      const match = /^data:audio\/(mpeg|mp3|wav|ogg|webm|m4a|x-m4a|mp4);base64,(.+)$/.exec(dataUrl);
      if (!title || !match) {
        socket.emit('musicActionError', 'Nur Audiodateien (MP3/WAV/OGG/M4A) sind erlaubt.');
        return;
      }
      const extMap = {
        mpeg: 'mp3', mp3: 'mp3', wav: 'wav', ogg: 'ogg', webm: 'webm', m4a: 'm4a', 'x-m4a': 'm4a', mp4: 'm4a',
      };
      const ext = extMap[match[1]] || 'mp3';
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 15 * 1024 * 1024) {
        socket.emit('musicActionError', 'Die Datei ist zu groß (max. 15 MB).');
        return;
      }
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(MUSIC_DIR, filename), buffer);
      playlist.push({
        id: makeId(), title, url: `/uploads/music/${filename}`, addedBy: socket.data.name,
      });
      savePlaylist();
      io.emit('playlistUpdate', getFullPlaylist());
    });

    socket.on('music:removeTrack', (payload) => {
      if (!socket.data.name || !payload) return;
      const before = playlist.length;
      playlist = playlist.filter((t) => t.id !== payload.id);
      if (playlist.length === before) return;
      savePlaylist();
      io.emit('playlistUpdate', getFullPlaylist());
      if (playerState.trackId === payload.id) {
        playerState = {
          trackId: null, isPlaying: false, positionSeconds: 0, lastUpdateTs: Date.now(),
        };
        io.emit('playerState', playerStatePayload());
      }
    });

    socket.on('music:play', (payload) => {
      if (!socket.data.name || !payload) return;
      const track = getFullPlaylist().find((t) => t.id === payload.trackId);
      if (!track) return;
      playerState = {
        trackId: track.id,
        isPlaying: true,
        positionSeconds: Number(payload.positionSeconds) || 0,
        lastUpdateTs: Date.now(),
      };
      io.emit('playerState', playerStatePayload());
    });

    socket.on('music:pause', () => {
      if (!socket.data.name) return;
      playerState.positionSeconds = getCurrentPosition();
      playerState.isPlaying = false;
      playerState.lastUpdateTs = Date.now();
      io.emit('playerState', playerStatePayload());
    });

    socket.on('music:resume', () => {
      if (!socket.data.name || !playerState.trackId) return;
      playerState.isPlaying = true;
      playerState.lastUpdateTs = Date.now();
      io.emit('playerState', playerStatePayload());
    });

    socket.on('music:seek', (payload) => {
      if (!socket.data.name || !playerState.trackId) return;
      const pos = Number(payload.positionSeconds);
      if (!Number.isFinite(pos) || pos < 0) return;
      playerState.positionSeconds = pos;
      playerState.lastUpdateTs = Date.now();
      io.emit('playerState', playerStatePayload());
    });

    socket.on('music:skip', (payload) => {
      if (!socket.data.name) return;
      const fullList = getFullPlaylist();
      if (!fullList.length) return;
      const direction = payload && payload.direction === 'prev' ? -1 : 1;
      const currentIdx = fullList.findIndex((t) => t.id === playerState.trackId);
      const nextIdx = (((currentIdx === -1 ? 0 : currentIdx) + direction) + fullList.length) % fullList.length;
      const nextTrack = fullList[nextIdx];
      playerState = {
        trackId: nextTrack.id, isPlaying: true, positionSeconds: 0, lastUpdateTs: Date.now(),
      };
      io.emit('playerState', playerStatePayload());
    });

    socket.on('admin:getServerStatus', () => {
      if (socket.data.role !== 'admin') return;
      let totalMessages = 0;
      roomState.forEach((state) => {
        totalMessages += state.messages.length;
      });

      let diskFree = null;
      let diskTotal = null;
      try {
        const stats = fs.statfsSync(__dirname);
        diskFree = stats.bavail * stats.bsize;
        diskTotal = stats.blocks * stats.bsize;
      } catch (err) {
        // statfsSync evtl. nicht verfuegbar (aeltere Node-Version) -- einfach weglassen
      }

      const now = Date.now();
      const userActivity = [];
      for (const [socketId, entry] of onlineUsers.entries()) {
        const s = io.sockets.sockets.get(socketId);
        const lastActivityAt = (s && s.data.lastActivityAt) || null;
        userActivity.push({
          name: entry.name,
          idleSeconds: lastActivityAt ? Math.max(0, Math.round((now - lastActivityAt) / 1000)) : null,
        });
      }
      userActivity.sort((a, b) => (a.idleSeconds ?? 0) - (b.idleSeconds ?? 0));

      socket.emit('serverStatus', {
        uptimeSeconds: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: `${os.platform()} ${os.release()}`,
        connectedSockets: onlineUsers.size,
        roomCount: ROOMS.length,
        totalMessages,
        dataSize: getDirSize(DATA_DIR),
        uploadsSize: getDirSize(UPLOAD_DIR),
        diskFree,
        diskTotal,
        userActivity,
      });
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

  // Fehlende Sender-Logos im Hintergrund nachladen (blockiert den Start nicht).
  backfillRadioLogos(io).catch(() => {});
}

main().catch((err) => {
  console.error('Hausfunk konnte nicht gestartet werden:', err);
  process.exit(1);
});
