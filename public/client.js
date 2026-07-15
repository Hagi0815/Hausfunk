const socket = io();

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');
const messagesEl = document.getElementById('messages');
const checklistPanelEl = document.getElementById('checklist-panel');
const checklistGroupsEl = document.getElementById('checklist-groups');
const checklistCountEl = document.getElementById('checklist-count');
const checklistClearDoneBtn = document.getElementById('checklist-clear-done');
const checklistCategoryInput = document.getElementById('checklist-category-input');
const checklistCategoryOptions = document.getElementById('checklist-category-options');
const checklistAddCategoryBtn = document.getElementById('checklist-add-category-btn');
const checklistItemInput = document.getElementById('checklist-item-input');
const checklistAddBtn = document.getElementById('checklist-add-btn');
const userListEl = document.getElementById('user-list');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const imageBtn = document.getElementById('image-btn');
const typingEl = document.getElementById('typing-indicator');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarCloseBtn = document.getElementById('sidebar-close');
const onlineCountEl = document.getElementById('online-count');
const loginUserListEl = document.getElementById('login-user-list');
const loginOnlineEmptyEl = document.getElementById('login-online-empty');
const replyPreview = document.getElementById('reply-preview');
const replyPreviewSender = document.getElementById('reply-preview-sender');
const replyPreviewText = document.getElementById('reply-preview-text');
const replyCancelBtn = document.getElementById('reply-cancel');
const emojiBtn = document.getElementById('emoji-btn');
const pollBtn = document.getElementById('poll-btn');
const pollForm = document.getElementById('poll-form');
const pollQuestionInput = document.getElementById('poll-question-input');
const pollOptionsList = document.getElementById('poll-options-list');
const pollAddOptionBtn = document.getElementById('poll-add-option-btn');
const pollCancelBtn = document.getElementById('poll-cancel-btn');
const pollSubmitBtn = document.getElementById('poll-submit-btn');
const emojiPicker = document.getElementById('emoji-picker');
const mentionDropdown = document.getElementById('mention-dropdown');
const searchToggleBtn = document.getElementById('search-toggle');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchCloseBtn = document.getElementById('search-close');
const pinnedBar = document.getElementById('pinned-bar');
const pinnedTextEl = document.getElementById('pinned-text');
const pinnedUnpinBtn = document.getElementById('pinned-unpin');
const themeToggleBtn = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');
const galleryToggleBtn = document.getElementById('gallery-toggle');
const galleryOverlay = document.getElementById('gallery-overlay');
const avatarLightbox = document.getElementById('avatar-lightbox');
const avatarLightboxImg = document.getElementById('avatar-lightbox-img');
const avatarLightboxClose = document.getElementById('avatar-lightbox-close');
const galleryGrid = document.getElementById('gallery-grid');
const galleryCloseBtn = document.getElementById('gallery-close');
const micBtn = document.getElementById('mic-btn');
const roomListEl = document.getElementById('room-list');
const roomTitleEl = document.getElementById('room-title');
const adminPasswordRow = document.getElementById('auth-password-row');
const adminPasswordInput = document.getElementById('auth-password-input');
const joinInfoEl = document.getElementById('join-info');
const pendingListEl = document.getElementById('pending-list');
const pendingEmptyEl = document.getElementById('pending-empty');
const approvedListEl = document.getElementById('approved-list');
const approvedEmptyEl = document.getElementById('approved-empty');
const adminCurrentNameEl = document.getElementById('admin-current-name');
const adminRenameBtn = document.getElementById('admin-rename-btn');
const joinErrorEl = document.getElementById('join-error');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const pendingResetsListEl = document.getElementById('pending-resets-list');
const pendingResetsEmptyEl = document.getElementById('pending-resets-empty');
const adminPanelToggle = document.getElementById('admin-panel-toggle');
const adminOverlay = document.getElementById('admin-overlay');
const adminOverlayClose = document.getElementById('admin-overlay-close');
const bannedListEl = document.getElementById('banned-list');
const bannedEmptyEl = document.getElementById('banned-empty');

let rooms = [];
let currentRoom = null;
let currentRoomType = 'chat';
let unreadCounts = {}; // roomId -> Anzahl ungelesener Nachrichten
let myRole = 'user';
let hasJoined = false;
let lastJoinPassword = ''; // nur im Speicher (RAM), fuer automatisches Re-Login nach Verbindungsabbruch
let sessionToken = localStorage.getItem('hausfunk-session-token') || '';
let bannedNamesList = [];
let protectedNamesList = []; // [{ name, status: 'pending'|'approved' }]
let pendingRequestsList = [];
let approvedAccountsList = [];
let pendingResetsList = [];
let currentRoomUsersList = [];
let mentionActive = false;
let mentionStart = -1;
let mentionIndex = 0;

const DELETE_WINDOW_MS = 5 * 60 * 1000; // muss zum Server-Wert passen
let currentPinned = null;

let myAvatarType = 'none'; // 'none' | 'photo' -- ohne eigenes Foto gibt's keinen Icon-/Bild-Avatar mehr
let myAvatarValue = null;
let avatarMap = {}; // name (lowercase) -> gespeicherte Foto-URL

const avatarPreviewEl = document.getElementById('avatar-preview');
const avatarUploadBtn = document.getElementById('avatar-upload-btn');
const avatarFileInput = document.getElementById('avatar-file-input');

let myName = '';
let typingTimeout = null;
const typingUsers = new Set();
let replyingTo = null; // { id, sender, preview }

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰',
  '😘','😜','🤪','😎','🤩','🥳','😏','😴','🤗','🤔','🤨','😐','😶','🙄','😬','😢',
  '😭','😤','😡','🤯','🥶','🥵','😱','🤢','🤮','🤒','🤕','🤠','🥺','😳','👍','👎',
  '👏','🙌','🙏','👋','🤝','💪','❤️','🧡','💛','💚','💙','💜','🖤','💔','💯','🔥',
  '✨','🎉','🎂','🍕','🍺','☕','⚽','🎮','🚗','🏠','🌞','🌧️','⭐',
];

// --- Sound bei neuer Nachricht -------------------------------------------------
const SOUND_KEY = 'hausfunk-sound-enabled';
let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
let audioCtx = null;
const soundToggleBtn = document.getElementById('sound-toggle');

function updateSoundToggleLabel() {
  soundToggleBtn.textContent = soundEnabled ? '🔊 Ton an' : '🔇 Ton aus';
}
updateSoundToggleLabel();

function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (err) { /* Web Audio evtl. nicht verfuegbar */ }
}

function playNotificationSound(urgent = false) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const beep = (start, freq, dur) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    };
    if (urgent) {
      beep(0, 1046, 0.14);
      beep(0.16, 1318, 0.18);
    } else {
      beep(0, 880, 0.18);
    }
  } catch (err) { /* Audio evtl. noch nicht freigegeben */ }
}

soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
  updateSoundToggleLabel();
  unlockAudio();
  if (soundEnabled) playNotificationSound(false);
});

logoutBtn.addEventListener('click', () => {
  if (!confirm('Wirklich abmelden? Auf diesem Gerät wird dann erneut Name + Passwort benötigt.')) return;
  socket.emit('logout');
  localStorage.removeItem('hausfunk-session-token');
  localStorage.removeItem('hausfunk-session-name');
  window.location.reload();
});

// --- @Erwähnungen ---------------------------------------------------------------
const MENTION_REGEX = /(@[\p{L}\p{N}_-]+)/gu;

function isMentioned(text, name) {
  if (!name) return false;
  const regex = /@([\p{L}\p{N}_-]+)/gu;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1].toLowerCase() === name.toLowerCase()) return true;
  }
  return false;
}

function renderTextWithMentions(container, text) {
  let lastIndex = 0;
  let match;
  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const token = match[0];
    const nameOnly = token.slice(1);
    const span = document.createElement('span');
    span.className = `mention${myName && nameOnly.toLowerCase() === myName.toLowerCase() ? ' mention-me' : ''}`;
    span.textContent = token;
    container.appendChild(span);
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function notifyMention(msg) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notif = new Notification(`🔔 ${msg.sender} hat dich erwähnt · Hausfunk`, { body: msg.text });
  notif.onclick = () => {
    window.focus();
    notif.close();
  };
}

// --- Tages-Trenner --------------------------------------------------------------
let lastDateKey = null;

function formatDateLabel(ts) {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  if (isSameDay(date, today)) return 'Heute';
  if (isSameDay(date, yesterday)) return 'Gestern';
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function maybeRenderDateDivider(ts) {
  const key = new Date(ts).toDateString();
  if (key === lastDateKey) return;
  lastDateKey = key;
  const divider = document.createElement('div');
  divider.className = 'date-divider';
  const span = document.createElement('span');
  span.textContent = formatDateLabel(ts);
  divider.appendChild(span);
  messagesEl.appendChild(divider);
}

// --- Browser-Benachrichtigungen ---
const notifStatusEl = document.getElementById('notif-status');
const baseTitle = document.title;
let unreadCount = 0;

function updateNotifStatus() {
  if (!('Notification' in window)) {
    notifStatusEl.textContent = '';
    return;
  }
  if (Notification.permission === 'granted') {
    notifStatusEl.textContent = '🔔 Benachrichtigungen aktiv';
  } else if (Notification.permission === 'denied') {
    notifStatusEl.textContent = '🔕 Benachrichtigungen blockiert (Browser-Einstellungen)';
  } else {
    notifStatusEl.textContent = '🔔 Benachrichtigungen noch nicht erlaubt';
  }
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      updateNotifStatus();
      if (permission === 'granted') setupPushSubscription();
    });
  } else {
    updateNotifStatus();
    if (Notification.permission === 'granted') setupPushSubscription();
  }
}

// --- Echte Push-Benachrichtigungen (auch bei geschlossenem Tab/Browser) --------
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function setupPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const res = await fetch('/vapid-public-key');
      const { publicKey } = await res.json();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    socket.emit('subscribePush', { subscription: subscription.toJSON() });
  } catch (err) {
    // Push ist ein Extra-Komfort -- falls es scheitert (z. B. iOS ohne
    // installierte PWA), funktionieren normale In-App-Benachrichtigungen weiter.
    console.warn('Push-Abo konnte nicht eingerichtet werden:', err);
  }
}

function notifyNewMessage(msg) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const body = msg.type === 'image' ? '📷 Bild gesendet' : msg.type === 'audio' ? '🎙️ Sprachnachricht' : msg.text;
  const notif = new Notification(`${msg.sender} · Hausfunk`, { body });
  notif.onclick = () => {
    window.focus();
    notif.close();
  };
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    unreadCount = 0;
    document.title = baseTitle;
  }
});

// --- Light-/Dark-Mode -----------------------------------------------------------
const THEME_KEY = 'hausfunk-theme';
let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleBtn.textContent = theme === 'light' ? '🌙 Dunkel' : '☀️ Hell';
}
applyTheme(currentTheme);

themeToggleBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, currentTheme);
  applyTheme(currentTheme);
});

// --- Avatar-Vorschau auf der Login-Seite (nur eigenes Foto oder gruener Platzhalter) ---
function updateAvatarPreview() {
  avatarPreviewEl.innerHTML = '';
  if (myAvatarType === 'photo' && myAvatarValue) {
    const img = document.createElement('img');
    img.src = myAvatarValue;
    img.alt = '';
    avatarPreviewEl.appendChild(img);
    avatarPreviewEl.classList.remove('avatar-preview-empty');
    avatarPreviewEl.classList.add('avatar-clickable');
    avatarPreviewEl.onclick = () => openAvatarLightbox(myAvatarValue);
  } else {
    avatarPreviewEl.classList.add('avatar-preview-empty');
    avatarPreviewEl.classList.remove('avatar-clickable');
    avatarPreviewEl.onclick = null;
  }
}
updateAvatarPreview();

avatarUploadBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    nameInput.placeholder = 'Erst Namen eingeben...';
    return;
  }
  avatarFileInput.click();
});

avatarFileInput.addEventListener('change', async () => {
  const file = avatarFileInput.files[0];
  avatarFileInput.value = '';
  if (!file) return;
  const name = nameInput.value.trim();
  if (!name) return;
  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('name', name);
  avatarUploadBtn.textContent = '⏳ Lädt...';
  try {
    const res = await fetch('/upload-avatar', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      myAvatarType = 'photo';
      myAvatarValue = data.url;
      updateAvatarPreview();
    }
  } catch (err) {
    // Upload fehlgeschlagen, Auswahl bleibt wie zuvor
  }
  avatarUploadBtn.textContent = '📷 Eigenes Bild';
});

// Passwortfeld/Registrierungs-Option abhaengig vom eingegebenen Namen steuern:
// Kleiner Hinweis, falls fuer den eingegebenen Namen schon eine Anfrage
// offen ist (rein informativ, das Passwortfeld ist jetzt immer sichtbar
// und wird fuer jeden Namen benoetigt -- der Server entscheidet, ob es ein
// Login ist oder eine neue Konto-Anfrage ausloest).
function updateNameFieldUI() {
  const key = nameInput.value.trim().toLowerCase();
  const protectedEntry = protectedNamesList.find((p) => p.name.toLowerCase() === key);
  if (protectedEntry && protectedEntry.status === 'pending') {
    joinInfoEl.textContent = 'Für diesen Namen liegt bereits eine Anfrage vor – warte auf Freigabe durch den Admin.';
    joinInfoEl.classList.remove('hidden');
  } else {
    joinInfoEl.classList.add('hidden');
  }
}

// Falls fuer den eingegebenen Namen schon ein Profilbild gespeichert ist,
// automatisch vorschlagen (aendert nichts, wenn der Name noch nicht bekannt ist).
nameInput.addEventListener('input', updateNameFieldUI);
nameInput.addEventListener('blur', () => {
  const key = nameInput.value.trim().toLowerCase();
  if (key && avatarMap[key]) {
    myAvatarType = 'photo';
    myAvatarValue = avatarMap[key];
    updateAvatarPreview();
  }
});

socket.on('avatarMap', (map) => {
  avatarMap = map || {};
});

socket.on('protectedNames', (list) => {
  protectedNamesList = list || [];
  updateNameFieldUI();
});

function openAvatarLightbox(src) {
  avatarLightboxImg.src = src;
  avatarLightbox.classList.remove('hidden');
}
function closeAvatarLightbox() {
  avatarLightbox.classList.add('hidden');
  avatarLightboxImg.src = '';
}
avatarLightboxClose.addEventListener('click', closeAvatarLightbox);
avatarLightbox.addEventListener('click', (e) => {
  if (e.target === avatarLightbox) closeAvatarLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !avatarLightbox.classList.contains('hidden')) closeAvatarLightbox();
});

function renderAvatar(color, avatar, photo) {
  const el = document.createElement('span');
  el.className = 'avatar';
  if (color) el.style.borderColor = color;
  if (photo) {
    const img = document.createElement('img');
    img.src = photo;
    img.alt = '';
    el.appendChild(img);
    el.classList.add('avatar-clickable');
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openAvatarLightbox(photo);
    });
  } else {
    // Kein eigenes Foto vorhanden -- neutraler gruener Platzhalter statt Icon
    el.classList.add('avatar-placeholder');
  }
  return el;
}

function join() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const password = adminPasswordInput.value;
  if (!password) {
    joinErrorEl.textContent = 'Bitte ein Passwort eingeben (für neue Namen frei wählbar, sonst dein bestehendes).';
    joinErrorEl.classList.remove('hidden');
    adminPasswordInput.focus();
    return;
  }

  joinErrorEl.classList.add('hidden');
  joinInfoEl.classList.add('hidden');

  myName = name;
  lastJoinPassword = password; // nur im Speicher, fuer automatisches Re-Login nach Verbindungsabbruch
  requestNotificationPermission(); // direkt im Klick, nicht erst nach Server-Antwort -- sonst blockt Android Chrome den Prompt
  unlockAudio();
  socket.emit('join', {
    name, avatarType: myAvatarType, avatarValue: myAvatarValue, password,
  });
}

joinBtn.addEventListener('click', join);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
adminPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

// "Angemeldet bleiben": bei jeder (Wieder-)Verbindung -- egal ob erster
// Seitenaufruf nach einem Reload oder stiller Reconnect nach einem kurzen
// Netzwerkaussetzer -- automatisch mit dem gespeicherten Sitzungs-Token
// wiederanmelden. Ohne das wuerde man nach jedem Reload wieder auf der
// Login-Seite landen bzw. nach einem Verbindungsabbruch "geisterhaft" im
// Chat sitzen, ohne neue Ereignisse zu bekommen.
socket.on('connect', () => {
  if (hasJoined && myName) {
    // Verbindung wurde neu aufgebaut (kurzer Netzwerkaussetzer o.ae.) --
    // bevorzugt per Sitzungs-Token neu anmelden, sonst mit dem zuletzt
    // genutzten Passwort.
    if (sessionToken) {
      socket.emit('resumeSession', { token: sessionToken });
    } else {
      socket.emit('join', {
        name: myName, avatarType: myAvatarType, avatarValue: myAvatarValue, password: lastJoinPassword,
      });
    }
  } else if (!hasJoined && sessionToken) {
    // Allererster Verbindungsaufbau nach einem Seiten-Reload: gespeicherte
    // Sitzung versuchen, damit man nicht jedes Mal neu eingeben muss.
    myName = localStorage.getItem('hausfunk-session-name') || '';
    socket.emit('resumeSession', { token: sessionToken });
  }
});

socket.on('sessionToken', (token) => {
  sessionToken = token;
  localStorage.setItem('hausfunk-session-token', token);
  localStorage.setItem('hausfunk-session-name', myName);
});

socket.on('resumeFailed', () => {
  sessionToken = '';
  localStorage.removeItem('hausfunk-session-token');
  localStorage.removeItem('hausfunk-session-name');
});

socket.on('registerPending', (name) => {
  joinInfoEl.textContent = `Anfrage für „${name}" wurde gesendet. Bitte auf Freigabe durch den Admin warten.`;
  joinInfoEl.classList.remove('hidden');
});

forgotPasswordBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const newPassword = prompt(`Neues Passwort für „${name}" (muss vom Admin bestätigt werden, bevor es gilt):`);
  if (newPassword && newPassword.trim()) {
    joinErrorEl.classList.add('hidden');
    socket.emit('requestPasswordReset', { name, newPassword: newPassword.trim() });
  }
});

socket.on('resetPending', (name) => {
  joinInfoEl.textContent = `Passwort-Reset für „${name}" wurde beantragt. Bitte auf Freigabe durch den Admin warten (das alte Passwort funktioniert bis dahin weiter).`;
  joinInfoEl.classList.remove('hidden');
});

socket.on('registerError', (message) => {
  joinErrorEl.textContent = message;
  joinErrorEl.classList.remove('hidden');
});

socket.on('joinError', (message) => {
  joinErrorEl.textContent = message;
  joinErrorEl.classList.remove('hidden');
});

socket.on('kicked', (message) => {
  alert(message || 'Du wurdest aus dem Kanal entfernt.');
  window.location.reload();
});

socket.on('yourRole', (role) => {
  myRole = role;
  document.body.classList.toggle('is-admin', role === 'admin');
  if (role === 'admin') adminCurrentNameEl.textContent = myName;
  renderRoomList();
});

adminRenameBtn.addEventListener('click', () => {
  const newName = prompt('Neuer Admin-Name (Login-Name, mit dem du dich künftig anmeldest):', myName);
  if (newName && newName.trim() && newName.trim() !== myName) {
    socket.emit('admin:renameAdmin', { newName: newName.trim() });
  }
});

socket.on('adminRenamed', (newName) => {
  myName = newName;
  adminCurrentNameEl.textContent = newName;
  alert(`Dein Admin-Name ist jetzt „${newName}". Bitte für die nächste Anmeldung merken!`);
});

socket.on('adminRenameError', (message) => {
  alert(message);
});

sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${sec}s`;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderSystem(text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg system';
  wrap.textContent = text;
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

// --- Antworten (Reply) -------------------------------------------------------
function startReply(msg) {
  const preview = msg.type === 'image' ? '📷 Bild' : msg.type === 'audio' ? '🎙️ Sprachnachricht' : msg.text;
  replyingTo = { id: msg.id, sender: msg.sender, preview: preview.slice(0, 80) };
  replyPreviewSender.textContent = msg.sender;
  replyPreviewText.textContent = preview.slice(0, 80);
  replyPreview.classList.remove('hidden');
  textInput.focus();
}

function cancelReply() {
  replyingTo = null;
  replyPreview.classList.add('hidden');
}

replyCancelBtn.addEventListener('click', cancelReply);

// --- Reaktionen ---------------------------------------------------------------
function renderReactions(container, reactions) {
  container.innerHTML = '';
  Object.entries(reactions || {}).forEach(([emoji, names]) => {
    if (!names || !names.length) return;
    const pill = document.createElement('button');
    pill.className = `reaction-pill${names.includes(myName) ? ' mine' : ''}`;
    pill.textContent = `${emoji} ${names.length}`;
    pill.title = names.join(', ');
    pill.addEventListener('click', () => {
      const msgId = container.closest('.msg').dataset.id;
      socket.emit('reaction', { messageId: msgId, emoji });
    });
    container.appendChild(pill);
  });
}

function buildPollBlock(msg) {
  const block = document.createElement('div');
  block.className = 'poll-block';

  const question = document.createElement('div');
  question.className = 'poll-question';
  question.textContent = msg.question;
  block.appendChild(question);

  msg.options.forEach((optionText, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'poll-option-btn';

    const fill = document.createElement('span');
    fill.className = 'poll-option-fill';
    btn.appendChild(fill);

    const label = document.createElement('span');
    label.className = 'poll-option-label';
    label.textContent = optionText;
    btn.appendChild(label);

    const count = document.createElement('span');
    count.className = 'poll-option-count';
    btn.appendChild(count);

    btn.addEventListener('click', () => {
      socket.emit('pollVote', { messageId: msg.id, optionIndex: index });
    });
    block.appendChild(btn);
  });

  const total = document.createElement('div');
  total.className = 'poll-total';
  block.appendChild(total);

  updatePollDisplay(block, msg.options, msg.votes || {});
  return block;
}

function updatePollDisplay(block, options, votes) {
  const voteValues = Object.values(votes);
  const totalVotes = voteValues.length;
  const myKey = myName.toLowerCase();
  const myVote = Object.prototype.hasOwnProperty.call(votes, myKey) ? votes[myKey] : null;
  const counts = options.map((_, i) => voteValues.filter((v) => v === i).length);

  block.querySelectorAll('.poll-option-btn').forEach((btn, i) => {
    const pct = totalVotes ? Math.round((counts[i] / totalVotes) * 100) : 0;
    btn.querySelector('.poll-option-fill').style.width = `${pct}%`;
    btn.querySelector('.poll-option-count').textContent = totalVotes ? `${counts[i]} · ${pct}%` : '0';
    btn.classList.toggle('voted', myVote === i);
  });
  const totalEl = block.querySelector('.poll-total');
  if (totalEl) totalEl.textContent = `${totalVotes} Stimme${totalVotes === 1 ? '' : 'n'}`;
}

socket.on('pollUpdate', ({ messageId, votes }) => {
  const target = messagesEl.querySelector(`[data-id="${CSS.escape(messageId)}"] .poll-block`);
  if (!target) return;
  const options = [...target.querySelectorAll('.poll-option-label')].map((el) => el.textContent);
  updatePollDisplay(target, options, votes);
});

function renderMessage(msg) {
  maybeRenderDateDivider(msg.ts);

  const own = msg.sender === myName;
  const wrap = document.createElement('div');
  wrap.className = `msg ${own ? 'own' : ''}`;
  wrap.dataset.id = msg.id;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.appendChild(renderAvatar(msg.color, msg.avatar, msg.photo));

  const senderEl = document.createElement('span');
  senderEl.className = 'sender';
  senderEl.textContent = msg.sender;
  meta.appendChild(senderEl);

  if (msg.role === 'admin') {
    const roleBadge = document.createElement('span');
    roleBadge.className = 'role-badge';
    roleBadge.textContent = 'DOM';
    meta.appendChild(roleBadge);
  }

  const timeEl = document.createElement('span');
  timeEl.textContent = formatTime(msg.ts);
  meta.appendChild(timeEl);

  if (msg.edited) {
    const editedTag = document.createElement('span');
    editedTag.className = 'edited-tag';
    editedTag.textContent = '(bearbeitet)';
    meta.appendChild(editedTag);
  }

  wrap.appendChild(meta);

  if (msg.replyTo) {
    const ref = document.createElement('div');
    ref.className = 'reply-ref';
    ref.textContent = `↩ ${msg.replyTo.sender}: ${msg.replyTo.preview}`;
    ref.addEventListener('click', () => {
      const target = messagesEl.querySelector(`[data-id="${CSS.escape(msg.replyTo.id)}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('highlight');
        setTimeout(() => target.classList.remove('highlight'), 1200);
      }
    });
    wrap.appendChild(ref);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (msg.deleted) {
    bubble.classList.add('deleted');
    bubble.textContent = 'Nachricht wurde gelöscht';
  } else if (msg.type === 'text') {
    renderTextWithMentions(bubble, msg.text);
  } else if (msg.type === 'image') {
    const img = document.createElement('img');
    img.src = msg.url;
    img.className = 'chat-image';
    img.loading = 'lazy';
    img.alt = `Bild von ${msg.sender}`;
    img.addEventListener('click', () => window.open(msg.url, '_blank'));
    bubble.appendChild(img);
  } else if (msg.type === 'audio') {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = msg.url;
    audio.className = 'voice-audio';
    bubble.appendChild(audio);
    if (msg.duration) {
      const durLabel = document.createElement('div');
      durLabel.className = 'voice-duration';
      durLabel.textContent = formatDuration(msg.duration);
      bubble.appendChild(durLabel);
    }
  } else if (msg.type === 'poll') {
    bubble.appendChild(buildPollBlock(msg));
  }

  wrap.appendChild(bubble);

  if (msg.deleted) {
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return;
  }

  // Aktionen: Reagieren + Antworten + Anpinnen + (eigene, kurze Zeit) Löschen
  const actions = document.createElement('div');
  actions.className = 'msg-actions';

  const reactBtn = document.createElement('button');
  reactBtn.className = 'action-btn';
  reactBtn.textContent = '🙂+';
  reactBtn.title = 'Reagieren';
  actions.appendChild(reactBtn);

  const replyBtn = document.createElement('button');
  replyBtn.className = 'action-btn';
  replyBtn.textContent = '↩ Antworten';
  replyBtn.title = 'Auf diese Nachricht antworten';
  replyBtn.addEventListener('click', () => startReply(msg));
  actions.appendChild(replyBtn);

  const pinBtn = document.createElement('button');
  pinBtn.className = 'action-btn';
  pinBtn.textContent = '📌';
  pinBtn.title = 'Nachricht anpinnen';
  pinBtn.addEventListener('click', () => socket.emit('pin', { messageId: msg.id }));
  actions.appendChild(pinBtn);

  if (((own && (Date.now() - msg.ts) < DELETE_WINDOW_MS) || myRole === 'admin') && msg.type === 'text') {
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.textContent = '✏️';
    editBtn.title = 'Nachricht bearbeiten';
    editBtn.addEventListener('click', () => startEditMessage(bubble, msg));
    actions.appendChild(editBtn);
  }

  if ((own && (Date.now() - msg.ts) < DELETE_WINDOW_MS) || myRole === 'admin') {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.title = 'Nachricht löschen';
    deleteBtn.addEventListener('click', () => {
      if (confirm('Nachricht wirklich löschen?')) {
        socket.emit('deleteMessage', { messageId: msg.id });
      }
    });
    actions.appendChild(deleteBtn);
  }

  wrap.appendChild(actions);

  const quickRow = document.createElement('div');
  quickRow.className = 'quick-react-row hidden';
  REACTION_EMOJIS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      socket.emit('reaction', { messageId: msg.id, emoji });
      quickRow.classList.add('hidden');
    });
    quickRow.appendChild(btn);
  });
  wrap.appendChild(quickRow);

  reactBtn.addEventListener('click', () => quickRow.classList.toggle('hidden'));

  const reactionsEl = document.createElement('div');
  reactionsEl.className = 'reactions';
  wrap.appendChild(reactionsEl);
  renderReactions(reactionsEl, msg.reactions || {});

  messagesEl.appendChild(wrap);
  scrollToBottom();
}

socket.on('history', (msgs) => {
  messagesEl.innerHTML = '';
  lastDateKey = null;
  msgs.forEach(renderMessage);
});

socket.on('message', (msg) => {
  renderMessage(msg);
  if (msg.sender !== myName) {
    const mentioned = msg.type === 'text' && isMentioned(msg.text, myName);
    if (document.hidden) {
      unreadCount += 1;
      document.title = `(${unreadCount}) ${baseTitle}`;
    }
    if (mentioned) {
      notifyMention(msg); // auch wenn der Tab sichtbar/aktiv ist
    } else {
      notifyNewMessage(msg);
    }
    playNotificationSound(mentioned);
  }
  applySearchFilter(searchInput.value);
});
socket.on('system', renderSystem);

socket.on('reactionUpdate', ({ messageId, reactions }) => {
  const target = messagesEl.querySelector(`[data-id="${CSS.escape(messageId)}"]`);
  if (!target) return;
  const reactionsEl = target.querySelector('.reactions');
  if (reactionsEl) renderReactions(reactionsEl, reactions || {});
});

socket.on('messageDeleted', ({ messageId }) => {
  const target = messagesEl.querySelector(`[data-id="${CSS.escape(messageId)}"]`);
  if (!target) return;
  const bubble = target.querySelector('.bubble');
  if (bubble) {
    bubble.innerHTML = '';
    bubble.classList.add('deleted');
    bubble.textContent = 'Nachricht wurde gelöscht';
  }
  const actions = target.querySelector('.msg-actions');
  if (actions) actions.remove();
  const quickRow = target.querySelector('.quick-react-row');
  if (quickRow) quickRow.remove();
  const reactionsEl = target.querySelector('.reactions');
  if (reactionsEl) reactionsEl.remove();
});

// --- Nachrichten bearbeiten ---------------------------------------------------
function startEditMessage(bubble, msg) {
  bubble.innerHTML = '';
  const textarea = document.createElement('textarea');
  textarea.className = 'edit-textarea';
  textarea.value = msg.text;
  bubble.appendChild(textarea);

  const controls = document.createElement('div');
  controls.className = 'edit-controls';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'unban-btn';
  saveBtn.textContent = 'Speichern';
  saveBtn.addEventListener('click', () => {
    const newText = textarea.value.trim();
    if (newText && newText !== msg.text) {
      socket.emit('editMessage', { messageId: msg.id, newText });
    } else {
      bubble.innerHTML = '';
      renderTextWithMentions(bubble, msg.text);
    }
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'unban-btn';
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.addEventListener('click', () => {
    bubble.innerHTML = '';
    renderTextWithMentions(bubble, msg.text);
  });

  controls.appendChild(saveBtn);
  controls.appendChild(cancelBtn);
  bubble.appendChild(controls);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

socket.on('messageEdited', ({ messageId, text, editedAt }) => {
  const target = messagesEl.querySelector(`[data-id="${CSS.escape(messageId)}"]`);
  if (!target) return;
  const bubble = target.querySelector('.bubble');
  if (bubble) {
    bubble.innerHTML = '';
    renderTextWithMentions(bubble, text);
  }
  const meta = target.querySelector('.msg-meta');
  if (meta && !meta.querySelector('.edited-tag')) {
    const editedTag = document.createElement('span');
    editedTag.className = 'edited-tag';
    editedTag.textContent = '(bearbeitet)';
    meta.appendChild(editedTag);
  }
});

function renderPinned(pinned) {
  currentPinned = pinned;
  if (!pinned) {
    pinnedBar.classList.add('hidden');
    return;
  }
  const preview = pinned.type === 'image' ? '📷 Bild' : pinned.type === 'audio' ? '🎙️ Sprachnachricht' : (pinned.text || '');
  pinnedTextEl.textContent = `${pinned.sender}: ${preview}`;
  pinnedBar.classList.remove('hidden');
}

pinnedUnpinBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  socket.emit('unpin');
});

pinnedBar.addEventListener('click', () => {
  if (!currentPinned) return;
  const target = messagesEl.querySelector(`[data-id="${CSS.escape(currentPinned.id)}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('highlight');
    setTimeout(() => target.classList.remove('highlight'), 1200);
  }
});

socket.on('pinnedUpdate', renderPinned);

// --- Suche im Verlauf ----------------------------------------------------------
function applySearchFilter(query) {
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;
  messagesEl.classList.toggle('searching', hasQuery);
  messagesEl.querySelectorAll('.msg:not(.system)').forEach((el) => {
    if (!hasQuery) { el.classList.remove('search-hidden'); return; }
    const sender = el.querySelector('.sender')?.textContent.toLowerCase() || '';
    const bubbleText = el.querySelector('.bubble')?.textContent.toLowerCase() || '';
    const match = sender.includes(q) || bubbleText.includes(q);
    el.classList.toggle('search-hidden', !match);
  });
}

function toggleSearchBar() {
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    applySearchFilter('');
  }
}

searchToggleBtn.addEventListener('click', toggleSearchBar);
searchCloseBtn.addEventListener('click', () => {
  searchBar.classList.add('hidden');
  searchInput.value = '';
  applySearchFilter('');
});
searchInput.addEventListener('input', () => applySearchFilter(searchInput.value));

function renderUserList(container, list, allowActions, showRoom) {
  container.innerHTML = '';
  list.forEach((u) => {
    const li = document.createElement('li');
    li.appendChild(renderAvatar(u.color, u.avatar, u.photo));

    const nameWrap = document.createElement('span');
    nameWrap.className = 'user-list-name-wrap';
    const label = document.createElement('span');
    label.textContent = u.name;
    nameWrap.appendChild(label);
    if (showRoom && u.room) {
      const room = rooms.find((r) => r.id === u.room);
      const roomLabel = document.createElement('span');
      roomLabel.className = 'user-room-label';
      roomLabel.textContent = `# ${room ? room.label : u.room}`;
      nameWrap.appendChild(roomLabel);
    }
    li.appendChild(nameWrap);

    if (u.role === 'admin') {
      const badge = document.createElement('span');
      badge.className = 'role-badge';
      badge.textContent = 'DOM';
      li.appendChild(badge);
    }
    if (allowActions && myRole === 'admin' && u.name !== myName) {
      const banBtn = document.createElement('button');
      banBtn.className = 'ban-btn';
      banBtn.textContent = '🚫';
      banBtn.title = `${u.name} sperren`;
      banBtn.addEventListener('click', () => {
        if (confirm(`${u.name} wirklich aus dem Kanal entfernen und sperren?`)) {
          socket.emit('admin:banUser', { name: u.name });
        }
      });
      li.appendChild(banBtn);
    }
    container.appendChild(li);
  });
}

// 'users' ist raumbezogen und wird nur noch fuer die @Erwaehnungs-Vorschlaege
// gebraucht (dort ergibt nur der aktuelle Kanal Sinn). Die Sidebar zeigt ueber
// 'globalUsers' immer ALLE Online-Nutzer, jeweils mit ihrem aktuellen Kanal.
socket.on('users', (list) => {
  currentRoomUsersList = list;
});

socket.on('globalUsers', (list) => {
  renderUserList(loginUserListEl, list, false, false);
  if (list.length) {
    loginUserListEl.classList.remove('hidden');
    loginOnlineEmptyEl.classList.add('hidden');
  } else {
    loginUserListEl.classList.add('hidden');
    loginOnlineEmptyEl.classList.remove('hidden');
  }

  if (hasJoined) {
    renderUserList(userListEl, list, true, true);
    onlineCountEl.textContent = list.length;
  }
});

// --- Kanaele -----------------------------------------------------------------
function renderRoomList() {
  roomListEl.innerHTML = '';
  rooms.forEach((r) => {
    const li = document.createElement('li');
    li.className = 'room-list-item';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `room-toggle-btn${r.id === currentRoom ? ' active' : ''}`;

    const label = document.createElement('span');
    label.textContent = r.type === 'checklist' ? `🛒 ${r.label}` : `# ${r.label}`;
    btn.appendChild(label);

    const count = unreadCounts[r.id] || 0;
    if (count > 0 && r.id !== currentRoom) {
      const badge = document.createElement('span');
      badge.className = 'room-badge';
      badge.textContent = count > 99 ? '99+' : String(count);
      btn.appendChild(badge);
    }

    btn.addEventListener('click', () => {
      if (r.id === currentRoom) return;
      socket.emit('switchRoom', { roomId: r.id });
    });
    li.appendChild(btn);

    if (myRole === 'admin') {
      const renameBtn = document.createElement('button');
      renameBtn.className = 'room-admin-btn';
      renameBtn.textContent = '✏️';
      renameBtn.title = 'Kanal umbenennen';
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newLabel = prompt('Neuer Name für den Kanal:', r.label);
        if (newLabel && newLabel.trim()) {
          socket.emit('admin:renameRoom', { roomId: r.id, label: newLabel.trim() });
        }
      });
      li.appendChild(renameBtn);

      const typeBtn = document.createElement('button');
      typeBtn.className = 'room-admin-btn';
      typeBtn.textContent = r.type === 'checklist' ? '💬' : '🛒';
      typeBtn.title = r.type === 'checklist' ? 'Als normalen Chat festlegen' : 'Als Checkliste festlegen';
      typeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newType = r.type === 'checklist' ? 'chat' : 'checklist';
        socket.emit('admin:setRoomType', { roomId: r.id, type: newType });
      });
      li.appendChild(typeBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'room-admin-btn';
      deleteBtn.textContent = '🗑';
      deleteBtn.title = 'Kanal löschen';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (rooms.length <= 1) {
          alert('Der letzte verbleibende Kanal kann nicht gelöscht werden.');
          return;
        }
        if (confirm(`Kanal "${r.label}" wirklich löschen? Der Verlauf bleibt auf dem Server erhalten, ist aber nicht mehr erreichbar.`)) {
          socket.emit('admin:deleteRoom', { roomId: r.id });
        }
      });
      li.appendChild(deleteBtn);
    }

    roomListEl.appendChild(li);
  });

  if (myRole === 'admin') {
    const addLi = document.createElement('li');
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'room-add-btn';
    addBtn.textContent = '+ Kanal';
    addBtn.addEventListener('click', () => {
      const label = prompt('Name des neuen Kanals:');
      if (label && label.trim()) {
        const asChecklist = confirm('Als Checkliste anlegen (z. B. für Einkaufslisten)?\nAbbrechen = normaler Chat-Kanal.');
        socket.emit('admin:createRoom', { label: label.trim(), type: asChecklist ? 'checklist' : 'chat' });
      }
    });
    addLi.appendChild(addBtn);
    roomListEl.appendChild(addLi);
  }
}

socket.on('rooms', (list) => {
  rooms = list;
  renderRoomList();
  const active = rooms.find((r) => r.id === currentRoom);
  const newType = active && active.type === 'checklist' ? 'checklist' : 'chat';
  if (currentRoom && newType !== currentRoomType) {
    currentRoomType = newType;
    updateRoomTypeUI();
  }
});

socket.on('unreadCounts', (counts) => {
  unreadCounts = counts || {};
  renderRoomList();
});

socket.on('roomActivity', ({ roomId }) => {
  if (roomId === currentRoom) return;
  unreadCounts[roomId] = (unreadCounts[roomId] || 0) + 1;
  renderRoomList();
});

socket.on('roomChanged', (roomId) => {
  if (!hasJoined) {
    hasJoined = true;
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    textInput.focus();
    // Falls wir per gespeicherter Sitzung direkt hier gelandet sind (kein Klick
    // auf "Kanal betreten" in dieser Sitzung), Benachrichtigungsstatus trotzdem
    // aktualisieren -- ist die Erlaubnis schon erteilt, ist das gefahrlos, ohne
    // Nutzer-Geste wuerde nur eine ERSTMALIGE Anfrage vom Browser blockiert.
    requestNotificationPermission();
    // Audio braucht dagegen zwingend eine echte Nutzer-Geste zum Freischalten --
    // beim naechsten Klick/Tastendruck/Antippen irgendwo auf der Seite nachholen.
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
  }
  currentRoom = roomId;
  const room = rooms.find((r) => r.id === roomId);
  currentRoomType = room && room.type === 'checklist' ? 'checklist' : 'chat';
  unreadCounts[roomId] = 0;
  roomTitleEl.textContent = `# ${room ? room.label : roomId}`;
  renderRoomList();
  updateRoomTypeUI();
  // Lokalen Zustand fuer den neuen Kanal zuruecksetzen
  lastDateKey = null;
  cancelReply();
  searchInput.value = '';
  searchBar.classList.add('hidden');
  applySearchFilter('');
  closeGallery();
  sidebar.classList.remove('open');
});

function updateRoomTypeUI() {
  const isChecklist = currentRoomType === 'checklist';
  checklistPanelEl.classList.toggle('hidden', !isChecklist);
}

function renderChecklist(items, categories) {
  checklistGroupsEl.innerHTML = '';

  const known = categories && categories.length ? categories : [];
  const itemCategories = items.map((i) => i.category || 'Sonstiges');
  const allCategories = [...new Set([...known, ...itemCategories])];
  const sortedCategories = [...allCategories].sort((a, b) => a.localeCompare(b, 'de'));

  checklistCategoryOptions.innerHTML = '';
  sortedCategories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    checklistCategoryOptions.appendChild(opt);
  });

  const groups = new Map();
  sortedCategories.forEach((cat) => groups.set(cat, [])); // leere Rubriken bleiben sichtbar
  items.forEach((item) => {
    const cat = item.category || 'Sonstiges';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  });

  [...groups.keys()].sort((a, b) => a.localeCompare(b, 'de')).forEach((cat) => {
    const groupItems = groups.get(cat).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.ts - b.ts;
    });

    const groupEl = document.createElement('div');
    groupEl.className = 'checklist-group';

    const heading = document.createElement('div');
    heading.className = 'checklist-group-heading';
    const headingText = document.createElement('span');
    headingText.textContent = cat;
    heading.appendChild(headingText);

    const removeCatBtn = document.createElement('button');
    removeCatBtn.type = 'button';
    removeCatBtn.className = 'checklist-category-remove';
    removeCatBtn.textContent = '✕';
    removeCatBtn.title = 'Rubrik entfernen';
    removeCatBtn.addEventListener('click', () => {
      if (confirm(`Rubrik "${cat}" entfernen? Vorhandene Artikel wandern nach "Sonstiges".`)) {
        socket.emit('checklist:removeCategory', { category: cat });
      }
    });
    heading.appendChild(removeCatBtn);
    groupEl.appendChild(heading);

    if (!groupItems.length) {
      const empty = document.createElement('div');
      empty.className = 'checklist-group-empty';
      empty.textContent = 'Noch keine Artikel';
      groupEl.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'checklist-items';

      groupItems.forEach((item) => {
        const li = document.createElement('li');
        li.className = `checklist-item${item.done ? ' done' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => socket.emit('checklist:toggle', { itemId: item.id }));
        li.appendChild(checkbox);

        const textSpan = document.createElement('span');
        textSpan.className = 'checklist-text';
        textSpan.textContent = item.text;
        li.appendChild(textSpan);

        const meta = document.createElement('span');
        meta.className = 'checklist-meta';
        meta.textContent = item.addedBy;
        li.appendChild(meta);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'checklist-remove-btn';
        removeBtn.type = 'button';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Eintrag entfernen';
        removeBtn.addEventListener('click', () => socket.emit('checklist:remove', { itemId: item.id }));
        li.appendChild(removeBtn);

        list.appendChild(li);
      });

      groupEl.appendChild(list);
    }

    checklistGroupsEl.appendChild(groupEl);
  });

  const doneCount = items.filter((i) => i.done).length;
  checklistCountEl.textContent = items.length
    ? `${items.length - doneCount} offen · ${doneCount} erledigt`
    : 'Noch keine Einträge';
}

socket.on('checklistUpdate', ({ roomId, items, categories }) => {
  if (roomId !== currentRoom) return;
  renderChecklist(items || [], categories || []);
});

checklistClearDoneBtn.addEventListener('click', () => {
  socket.emit('checklist:clearDone');
});

function addChecklistItem() {
  const text = checklistItemInput.value.trim();
  if (!text) { checklistItemInput.focus(); return; }
  const category = checklistCategoryInput.value.trim();
  socket.emit('checklist:add', { text, category });
  checklistItemInput.value = '';
  checklistItemInput.focus();
}
checklistAddBtn.addEventListener('click', addChecklistItem);
checklistItemInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); }
});
checklistCategoryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); checklistItemInput.focus(); }
});

checklistAddCategoryBtn.addEventListener('click', () => {
  const category = checklistCategoryInput.value.trim();
  if (!category) { checklistCategoryInput.focus(); return; }
  socket.emit('checklist:addCategory', { category });
  checklistCategoryInput.value = '';
  checklistCategoryInput.focus();
});

socket.on('typing', ({ name, isTyping }) => {
  if (name === myName) return;
  if (isTyping) typingUsers.add(name); else typingUsers.delete(name);
  typingEl.textContent = typingUsers.size ? `${[...typingUsers].join(', ')} tippt...` : '';
});

function sendText() {
  const text = textInput.value.trim();
  if (!text) return;
  socket.emit('message', { type: 'text', text, replyTo: replyingTo });
  cancelReply();
  textInput.value = '';
  textInput.style.height = 'auto';
  socket.emit('typing', false);
}

sendBtn.addEventListener('click', sendText);
textInput.addEventListener('keydown', (e) => {
  if (mentionActive && !mentionDropdown.classList.contains('hidden')) {
    const items = mentionDropdown.querySelectorAll('.mention-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      mentionIndex = Math.min(mentionIndex + 1, items.length - 1);
      updateMentionHighlight(items);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      mentionIndex = Math.max(mentionIndex - 1, 0);
      updateMentionHighlight(items);
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      items[mentionIndex]?.click();
      return;
    }
    if (e.key === 'Escape') {
      closeMentionDropdown();
      return;
    }
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendText();
  }
});
textInput.addEventListener('input', () => {
  textInput.style.height = 'auto';
  textInput.style.height = `${Math.min(textInput.scrollHeight, 120)}px`;
  socket.emit('typing', true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing', false), 1200);
  handleMentionDetection();
});

// --- @Erwähnung: Autovervollständigung -------------------------------------------
function handleMentionDetection() {
  const value = textInput.value;
  const cursorPos = textInput.selectionStart;
  const uptoCursor = value.slice(0, cursorPos);
  const match = uptoCursor.match(/(^|\s)@([\p{L}\p{N}_-]*)$/u);
  if (!match) {
    closeMentionDropdown();
    return;
  }
  mentionStart = cursorPos - match[2].length - 1;
  const query = match[2].toLowerCase();
  const matches = currentRoomUsersList
    .filter((u) => u.name !== myName && u.name.toLowerCase().startsWith(query))
    .slice(0, 6);
  if (!matches.length) {
    closeMentionDropdown();
    return;
  }
  mentionActive = true;
  mentionIndex = 0;
  renderMentionDropdown(matches);
}

function renderMentionDropdown(matches) {
  mentionDropdown.innerHTML = '';
  matches.forEach((u) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'mention-item';
    item.appendChild(renderAvatar(u.color, u.avatar, u.photo));
    const label = document.createElement('span');
    label.textContent = u.name;
    item.appendChild(label);
    item.addEventListener('click', () => selectMention(u.name));
    mentionDropdown.appendChild(item);
  });
  updateMentionHighlight(mentionDropdown.querySelectorAll('.mention-item'));
  mentionDropdown.classList.remove('hidden');
}

function updateMentionHighlight(items) {
  items.forEach((item, i) => item.classList.toggle('active', i === mentionIndex));
}

function closeMentionDropdown() {
  mentionActive = false;
  mentionDropdown.classList.add('hidden');
}

function selectMention(name) {
  const value = textInput.value;
  const cursorPos = textInput.selectionStart;
  const before = value.slice(0, mentionStart);
  const after = value.slice(cursorPos);
  textInput.value = `${before}@${name} ${after}`;
  const newPos = before.length + name.length + 2;
  textInput.selectionStart = textInput.selectionEnd = newPos;
  closeMentionDropdown();
  textInput.focus();
}

async function uploadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      socket.emit('message', { type: 'image', url: data.url, replyTo: replyingTo });
      cancelReply();
    } else if (data.error) {
      renderSystem(`Fehler beim Senden: ${data.error}`);
    }
  } catch (err) {
    renderSystem('Bild-Upload fehlgeschlagen. Verbindung prüfen.');
  }
}

imageBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) uploadFile(fileInput.files[0]);
  fileInput.value = '';
});

['dragover', 'drop'].forEach((evt) => {
  chatScreen.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
});
chatScreen.addEventListener('dragover', () => chatScreen.classList.add('dragging'));
chatScreen.addEventListener('dragleave', () => chatScreen.classList.remove('dragging'));
chatScreen.addEventListener('drop', (e) => {
  chatScreen.classList.remove('dragging');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

// --- Emoji-Picker zum Einfügen beim Schreiben ---------------------------------
function insertAtCursor(el, text) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const pos = start + text.length;
  el.selectionStart = el.selectionEnd = pos;
  el.dispatchEvent(new Event('input'));
}

EMOJI_LIST.forEach((emoji) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = emoji;
  btn.addEventListener('click', () => {
    insertAtCursor(textInput, emoji);
    textInput.focus();
  });
  emojiPicker.appendChild(btn);
});

emojiBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPicker.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
  if (!emojiPicker.classList.contains('hidden') && !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.classList.add('hidden');
  }
});

// --- Umfragen im Chat --------------------------------------------------------------
function addPollOptionRow(value) {
  if (pollOptionsList.children.length >= 6) return;
  const row = document.createElement('div');
  row.className = 'poll-option-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = `Option ${pollOptionsList.children.length + 1}`;
  input.maxLength = 80;
  input.value = value || '';
  row.appendChild(input);
  if (pollOptionsList.children.length >= 2) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'poll-option-remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => row.remove());
    row.appendChild(removeBtn);
  }
  pollOptionsList.appendChild(row);
}

function resetPollForm() {
  pollQuestionInput.value = '';
  pollOptionsList.innerHTML = '';
  addPollOptionRow();
  addPollOptionRow();
}

function openPollForm() {
  resetPollForm();
  pollForm.classList.remove('hidden');
  pollQuestionInput.focus();
}
function closePollForm() {
  pollForm.classList.add('hidden');
}

pollBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (pollForm.classList.contains('hidden')) openPollForm();
  else closePollForm();
});
pollAddOptionBtn.addEventListener('click', () => addPollOptionRow());
pollCancelBtn.addEventListener('click', closePollForm);
pollSubmitBtn.addEventListener('click', () => {
  const question = pollQuestionInput.value.trim();
  const options = [...pollOptionsList.querySelectorAll('input')]
    .map((inp) => inp.value.trim())
    .filter(Boolean);
  if (!question) { pollQuestionInput.focus(); return; }
  if (options.length < 2) { alert('Bitte mindestens 2 Optionen ausfüllen.'); return; }
  socket.emit('message', { type: 'poll', question, options, replyTo: replyingTo });
  cancelReply();
  closePollForm();
});
document.addEventListener('click', (e) => {
  if (!pollForm.classList.contains('hidden') && !pollForm.contains(e.target) && e.target !== pollBtn) {
    closePollForm();
  }
});

// --- Bilder-Galerie ---------------------------------------------------------------
function openGallery() {
  galleryGrid.innerHTML = '';
  const images = messagesEl.querySelectorAll('.msg:not(.system) .chat-image');
  if (!images.length) {
    const empty = document.createElement('div');
    empty.className = 'gallery-empty';
    empty.textContent = 'Noch keine Bilder geteilt.';
    galleryGrid.appendChild(empty);
  } else {
    images.forEach((img) => {
      const msgEl = img.closest('.msg');
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'gallery-thumb-wrap';

      const thumbBtn = document.createElement('button');
      thumbBtn.className = 'gallery-thumb';
      thumbBtn.type = 'button';
      const thumbImg = document.createElement('img');
      thumbImg.src = img.src;
      thumbImg.loading = 'lazy';
      thumbImg.alt = img.alt || 'Geteiltes Bild';
      thumbBtn.appendChild(thumbImg);
      thumbBtn.addEventListener('click', () => {
        closeGallery();
        if (msgEl) {
          msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          msgEl.classList.add('highlight');
          setTimeout(() => msgEl.classList.remove('highlight'), 1200);
        }
      });
      thumbWrap.appendChild(thumbBtn);

      if (myRole === 'admin' && msgEl && msgEl.dataset.id) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'gallery-delete-btn';
        deleteBtn.type = 'button';
        deleteBtn.title = 'Bild löschen';
        deleteBtn.textContent = '🗑';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Dieses Bild wirklich löschen?')) {
            socket.emit('deleteMessage', { messageId: msgEl.dataset.id });
            thumbWrap.remove();
          }
        });
        thumbWrap.appendChild(deleteBtn);
      }

      galleryGrid.appendChild(thumbWrap);
    });
  }
  galleryOverlay.classList.remove('hidden');
}
function closeGallery() {
  galleryOverlay.classList.add('hidden');
}

galleryToggleBtn.addEventListener('click', openGallery);
galleryCloseBtn.addEventListener('click', closeGallery);
galleryOverlay.addEventListener('click', (e) => {
  if (e.target === galleryOverlay) closeGallery();
});

// --- Sprachnachrichten (Push-to-Talk) -----------------------------------------------
let mediaRecorder = null;
let audioChunks = [];
let recordStartTime = 0;
let recordingStream = null;

async function startRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') return;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    renderSystem('Mikrofon-Zugriff nicht möglich (Berechtigung fehlt oder kein Mikrofon gefunden).');
    return;
  }
  recordingStream = stream;
  audioChunks = [];
  const preferredType = 'audio/webm;codecs=opus';
  const mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported(preferredType)) ? preferredType : '';
  try {
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch (err) {
    renderSystem('Sprachaufnahme wird von diesem Browser nicht unterstützt.');
    stream.getTracks().forEach((t) => t.stop());
    return;
  }
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) audioChunks.push(e.data);
  };
  mediaRecorder.onstop = onRecordingStop;
  recordStartTime = Date.now();
  mediaRecorder.start();
  micBtn.classList.add('recording');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  micBtn.classList.remove('recording');
  if (recordingStream) {
    recordingStream.getTracks().forEach((t) => t.stop());
    recordingStream = null;
  }
}

async function onRecordingStop() {
  const durationSec = Math.round((Date.now() - recordStartTime) / 1000);
  if (durationSec < 1 || !audioChunks.length) return; // zu kurz / versehentliches Antippen
  const mimeType = mediaRecorder.mimeType || 'audio/webm';
  const blob = new Blob(audioChunks, { type: mimeType });
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
  const formData = new FormData();
  formData.append('audio', blob, `voice.${ext}`);
  try {
    const res = await fetch('/upload-audio', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      socket.emit('message', { type: 'audio', url: data.url, duration: durationSec, replyTo: replyingTo });
      cancelReply();
    } else if (data.error) {
      renderSystem(`Fehler bei Sprachnachricht: ${data.error}`);
    }
  } catch (err) {
    renderSystem('Sprachnachricht konnte nicht gesendet werden. Verbindung prüfen.');
  }
}

micBtn.addEventListener('mousedown', (e) => { e.preventDefault(); startRecording(); });
micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); }, { passive: false });
['mouseup', 'mouseleave'].forEach((evt) => micBtn.addEventListener(evt, () => stopRecording()));
micBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });

// --- Admin-Panel: gesperrte Nutzer ------------------------------------------------
function renderBannedList() {
  bannedListEl.innerHTML = '';
  if (!bannedNamesList.length) {
    bannedEmptyEl.classList.remove('hidden');
    return;
  }
  bannedEmptyEl.classList.add('hidden');
  bannedNamesList.forEach((name) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    li.appendChild(label);
    const unbanBtn = document.createElement('button');
    unbanBtn.className = 'unban-btn';
    unbanBtn.textContent = 'Entsperren';
    unbanBtn.addEventListener('click', () => socket.emit('admin:unbanUser', { name }));
    li.appendChild(unbanBtn);
    bannedListEl.appendChild(li);
  });
}

socket.on('bannedList', (list) => {
  bannedNamesList = list || [];
  renderBannedList();
});

// --- Admin-Panel: Konto-Anfragen & geschuetzte Konten ---------------------------
function renderPendingList() {
  pendingListEl.innerHTML = '';
  if (!pendingRequestsList.length) {
    pendingEmptyEl.classList.remove('hidden');
    return;
  }
  pendingEmptyEl.classList.add('hidden');
  pendingRequestsList.forEach(({ name }) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    li.appendChild(label);

    const actions = document.createElement('span');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    const approveBtn = document.createElement('button');
    approveBtn.className = 'unban-btn';
    approveBtn.textContent = '✓ Genehmigen';
    approveBtn.addEventListener('click', () => socket.emit('admin:approveUser', { name }));
    actions.appendChild(approveBtn);

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'unban-btn';
    rejectBtn.textContent = '✗ Ablehnen';
    rejectBtn.addEventListener('click', () => socket.emit('admin:rejectUser', { name }));
    actions.appendChild(rejectBtn);

    li.appendChild(actions);
    pendingListEl.appendChild(li);
  });
}

function renderApprovedList() {
  approvedListEl.innerHTML = '';
  if (!approvedAccountsList.length) {
    approvedEmptyEl.classList.remove('hidden');
    return;
  }
  approvedEmptyEl.classList.add('hidden');
  approvedAccountsList.forEach(({ name }) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    li.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'unban-btn';
    removeBtn.textContent = 'Schutz entfernen';
    removeBtn.addEventListener('click', () => {
      if (confirm(`Passwortschutz für "${name}" wirklich entfernen? Der Name ist danach wieder frei nutzbar.`)) {
        socket.emit('admin:removeAccount', { name });
      }
    });
    li.appendChild(removeBtn);
    approvedListEl.appendChild(li);
  });
}

function renderPendingResetsList() {
  pendingResetsListEl.innerHTML = '';
  if (!pendingResetsList.length) {
    pendingResetsEmptyEl.classList.remove('hidden');
    return;
  }
  pendingResetsEmptyEl.classList.add('hidden');
  pendingResetsList.forEach(({ name }) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = name;
    li.appendChild(label);

    const actions = document.createElement('span');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    const approveBtn = document.createElement('button');
    approveBtn.className = 'unban-btn';
    approveBtn.textContent = '✓ Genehmigen';
    approveBtn.addEventListener('click', () => socket.emit('admin:approveReset', { name }));
    actions.appendChild(approveBtn);

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'unban-btn';
    rejectBtn.textContent = '✗ Ablehnen';
    rejectBtn.addEventListener('click', () => socket.emit('admin:rejectReset', { name }));
    actions.appendChild(rejectBtn);

    li.appendChild(actions);
    pendingResetsListEl.appendChild(li);
  });
}

function updateAdminBadge() {
  const total = pendingRequestsList.length + pendingResetsList.length;
  let badge = adminPanelToggle.querySelector('.admin-badge');
  if (total > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'admin-badge';
      adminPanelToggle.appendChild(badge);
    }
    badge.textContent = total > 9 ? '9+' : String(total);
  } else if (badge) {
    badge.remove();
  }
}

function notifyPendingRequests(count) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notif = new Notification(`🔔 ${count} neue Konto-Anfrage${count > 1 ? 'n' : ''} · Hausfunk`, {
    body: 'Bitte im Admin-Panel prüfen und freigeben.',
  });
  notif.onclick = () => {
    window.focus();
    adminOverlay.classList.remove('hidden');
    notif.close();
  };
}

function notifyPendingResets(count) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notif = new Notification(`🔔 ${count} neue Passwort-Reset-Anfrage${count > 1 ? 'n' : ''} · Hausfunk`, {
    body: 'Bitte im Admin-Panel prüfen und freigeben.',
  });
  notif.onclick = () => {
    window.focus();
    adminOverlay.classList.remove('hidden');
    notif.close();
  };
}

let lastPendingCount = 0;
let lastPendingResetCount = 0;

socket.on('pendingRequests', (list) => {
  const newList = list || [];
  if (myRole === 'admin' && newList.length > lastPendingCount) {
    notifyPendingRequests(newList.length);
  }
  lastPendingCount = newList.length;
  pendingRequestsList = newList;
  renderPendingList();
  updateAdminBadge();
});

socket.on('pendingResets', (list) => {
  const newList = list || [];
  if (myRole === 'admin' && newList.length > lastPendingResetCount) {
    notifyPendingResets(newList.length);
  }
  lastPendingResetCount = newList.length;
  pendingResetsList = newList;
  renderPendingResetsList();
  updateAdminBadge();
});

socket.on('approvedAccounts', (list) => {
  approvedAccountsList = list || [];
  renderApprovedList();
});

adminPanelToggle.addEventListener('click', () => {
  adminOverlay.classList.remove('hidden');
});
adminOverlayClose.addEventListener('click', () => adminOverlay.classList.add('hidden'));
adminOverlay.addEventListener('click', (e) => {
  if (e.target === adminOverlay) adminOverlay.classList.add('hidden');
});
