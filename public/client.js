const socket = io();

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');
const messagesEl = document.getElementById('messages');
const messagesBgEl = document.getElementById('messages-bg');
const chatColumnEl = document.getElementById('chat-column');
const shoppingNavBtn = document.getElementById('shopping-nav-btn');
const checklistPanelEl = document.getElementById('checklist-panel');
const calendarNavBtn = document.getElementById('calendar-nav-btn');
const calendarPanelEl = document.getElementById('calendar-panel');
const calendarAdminForm = document.getElementById('calendar-admin-form');
const calendarUrlInput = document.getElementById('calendar-url-input');
const calendarUrlSaveBtn = document.getElementById('calendar-url-save-btn');
const calendarErrorEl = document.getElementById('calendar-error');
const calendarListEl = document.getElementById('calendar-list');
const calendarEmptyEl = document.getElementById('calendar-empty');
const checklistGroupsEl = document.getElementById('checklist-groups');
const checklistCountEl = document.getElementById('checklist-count');
const checklistClearDoneBtn = document.getElementById('checklist-clear-done');
const checklistCategoryInput = document.getElementById('checklist-category-input');
const checklistCategoryOptions = document.getElementById('checklist-category-options');
const checklistAddCategoryBtn = document.getElementById('checklist-add-category-btn');
const checklistAmountInput = document.getElementById('checklist-amount-input');
const checklistUnitInput = document.getElementById('checklist-unit-input');
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
const weatherToggleBtn = document.getElementById('weather-toggle');
const weatherCurrentEl = document.getElementById('weather-current');
const weatherPopover = document.getElementById('weather-popover');
const weatherPopoverCurrentEl = document.getElementById('weather-popover-current');
const weatherPopoverHourlyEl = document.getElementById('weather-popover-hourly');
const weatherPopoverUpdatedEl = document.getElementById('weather-popover-updated');
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
const birthdaysToggleBtn = document.getElementById('birthdays-toggle');
const birthdaysOverlay = document.getElementById('birthdays-overlay');
const birthdaysCloseBtn = document.getElementById('birthdays-close');
const birthdaysListEl = document.getElementById('birthdays-list');
const birthdaysEmptyEl = document.getElementById('birthdays-empty');
const birthdayNameInput = document.getElementById('birthday-name-input');
const birthdayDateInput = document.getElementById('birthday-date-input');
const birthdayAddBtn = document.getElementById('birthday-add-btn');
const roomCustomizeOverlay = document.getElementById('room-customize-overlay');
const roomCustomizeTitleEl = document.getElementById('room-customize-title');
const roomCustomizeClose = document.getElementById('room-customize-close');
const roomIconInput = document.getElementById('room-icon-input');
const roomIconSaveBtn = document.getElementById('room-icon-save-btn');
const roomIconUploadBtn = document.getElementById('room-icon-upload-btn');
const roomIconFileInput = document.getElementById('room-icon-file-input');
const roomIconRemoveBtn = document.getElementById('room-icon-remove-btn');
const roomBgUploadBtn = document.getElementById('room-bg-upload-btn');
const roomBgFileInput = document.getElementById('room-bg-file-input');
const roomBgRemoveBtn = document.getElementById('room-bg-remove-btn');
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
const presenceLogListEl = document.getElementById('presence-log-list');
const presenceLogEmptyEl = document.getElementById('presence-log-empty');
const adminPanelToggle = document.getElementById('admin-panel-toggle');
const adminOverlay = document.getElementById('admin-overlay');
const adminOverlayClose = document.getElementById('admin-overlay-close');
const bannedListEl = document.getElementById('banned-list');
const bannedEmptyEl = document.getElementById('banned-empty');

let rooms = [];
let currentRoom = null;
let viewMode = 'chat'; // 'chat' | 'shopping' -- Einkaufsliste ist ein eigener Bereich, kein Kanaltyp
let lastChecklistItems = [];
let lastChecklistCategories = [];
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

const myAvatarOverlay = document.getElementById('my-avatar-overlay');
const myAvatarPreviewEl = document.getElementById('my-avatar-preview');
const myAvatarCloseBtn = document.getElementById('my-avatar-close');
const myAvatarUploadBtn = document.getElementById('my-avatar-upload-btn');
const myAvatarFileInput = document.getElementById('my-avatar-file-input');
const myAvatarErrorEl = document.getElementById('my-avatar-error');

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

// --- Konfetti-Überraschung ---------------------------------------------------
const CONFETTI_TRIGGERS = [
  'geburtstag', 'jubiläum', 'jubilaeum', 'bestanden', 'geschafft', 'gewonnen',
  'verlobung', 'verlobt', 'hochzeit', 'schwanger', 'glückwunsch', 'gluckwunsch',
  '🎉', '🎊', '🥳', '🎂',
];
const CONFETTI_COLORS = ['#E8A33D', '#3E7C77', '#C9614A', '#6C8EBF', '#9B7EDE', '#5FAE6B', '#D9B24C'];

function shouldTriggerConfetti(text) {
  const lower = text.toLowerCase();
  return CONFETTI_TRIGGERS.some((word) => lower.includes(word));
}

let lastConfettiAt = 0;
function launchConfetti() {
  // Nicht mehrfach innerhalb kurzer Zeit ausloesen (z.B. mehrere Nachrichten mit Trigger-Wort kurz hintereinander)
  const now = Date.now();
  if (now - lastConfettiAt < 2000) return;
  lastConfettiAt = now;

  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const pieceCount = 60;
  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.animationDuration = `${2.2 + Math.random() * 1.2}s`;
    const size = 6 + Math.random() * 6;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (Math.random() > 0.5 ? 1 : 2.2)}px`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3800);
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

// --- Eigenes Profilbild aendern (Modal nach dem Login, per Klick auf den
//     eigenen Namen in der Nutzerliste -- nicht mehr beim Einloggen) --------
function renderMyAvatarPreview() {
  myAvatarPreviewEl.innerHTML = '';
  if (myAvatarType === 'photo' && myAvatarValue) {
    const img = document.createElement('img');
    img.src = myAvatarValue;
    img.alt = '';
    myAvatarPreviewEl.appendChild(img);
    myAvatarPreviewEl.classList.remove('avatar-preview-empty');
  } else {
    myAvatarPreviewEl.classList.add('avatar-preview-empty');
  }
}

function openMyAvatarModal() {
  renderMyAvatarPreview();
  myAvatarErrorEl.classList.add('hidden');
  myAvatarOverlay.classList.remove('hidden');
}
function closeMyAvatarModal() {
  myAvatarOverlay.classList.add('hidden');
}
myAvatarCloseBtn.addEventListener('click', closeMyAvatarModal);
myAvatarOverlay.addEventListener('click', (e) => {
  if (e.target === myAvatarOverlay) closeMyAvatarModal();
});

myAvatarUploadBtn.addEventListener('click', () => myAvatarFileInput.click());
myAvatarFileInput.addEventListener('change', () => {
  const file = myAvatarFileInput.files[0];
  myAvatarFileInput.value = '';
  if (!file) return;
  myAvatarErrorEl.classList.add('hidden');
  myAvatarUploadBtn.textContent = '⏳ Lädt...';
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit('updateMyAvatar', { dataUrl: reader.result });
  };
  reader.onerror = () => {
    myAvatarErrorEl.textContent = 'Bild konnte nicht gelesen werden. Bitte nochmal versuchen.';
    myAvatarErrorEl.classList.remove('hidden');
    myAvatarUploadBtn.textContent = '📷 Neues Bild hochladen';
  };
  reader.readAsDataURL(file);
});

socket.on('myAvatarUpdated', (url) => {
  myAvatarType = 'photo';
  myAvatarValue = url;
  renderMyAvatarPreview();
  myAvatarUploadBtn.textContent = '📷 Neues Bild hochladen';
});
socket.on('avatarActionError', (msg) => {
  myAvatarErrorEl.textContent = msg;
  myAvatarErrorEl.classList.remove('hidden');
  myAvatarUploadBtn.textContent = '📷 Neues Bild hochladen';
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
nameInput.addEventListener('input', updateNameFieldUI);

socket.on('avatarMap', (map) => {
  avatarMap = map || {};
});

socket.on('protectedNames', (list) => {
  protectedNamesList = list || [];
  updateNameFieldUI();
});

function openAvatarLightbox(src, isHoverPreview) {
  avatarLightboxImg.src = src;
  avatarLightbox.classList.toggle('avatar-lightbox-hover-preview', Boolean(isHoverPreview));
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
      openAvatarLightbox(photo, false);
    });
    el.addEventListener('mouseenter', () => openAvatarLightbox(photo, true));
    el.addEventListener('mouseleave', () => closeAvatarLightbox());
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
    const optionWrap = document.createElement('div');
    optionWrap.className = 'poll-option-wrap';

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
    optionWrap.appendChild(btn);

    const voters = document.createElement('div');
    voters.className = 'poll-option-voters';
    optionWrap.appendChild(voters);

    block.appendChild(optionWrap);
  });

  const total = document.createElement('div');
  total.className = 'poll-total';
  block.appendChild(total);

  updatePollDisplay(block, msg.options, msg.votes || {});
  return block;
}

function updatePollDisplay(block, options, votes) {
  const voteEntries = Object.values(votes || {});
  const totalVotes = voteEntries.length;
  const myKey = myName.toLowerCase();
  const myVote = Object.prototype.hasOwnProperty.call(votes || {}, myKey) ? votes[myKey].optionIndex : null;
  const counts = options.map((_, i) => voteEntries.filter((v) => v.optionIndex === i).length);
  const votersByOption = options.map((_, i) => voteEntries.filter((v) => v.optionIndex === i).map((v) => v.name));

  block.querySelectorAll('.poll-option-wrap').forEach((wrap, i) => {
    const btn = wrap.querySelector('.poll-option-btn');
    const pct = totalVotes ? Math.round((counts[i] / totalVotes) * 100) : 0;
    btn.querySelector('.poll-option-fill').style.width = `${pct}%`;
    btn.querySelector('.poll-option-count').textContent = totalVotes ? `${counts[i]} · ${pct}%` : '0';
    btn.classList.toggle('voted', myVote === i);

    const votersEl = wrap.querySelector('.poll-option-voters');
    votersEl.textContent = votersByOption[i].join(', ');
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
  if (msg.type === 'text' && shouldTriggerConfetti(msg.text)) {
    launchConfetti();
  }
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
    const isMe = hasJoined && u.name === myName;
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

    if (isMe) {
      li.classList.add('user-list-item-me');
      li.title = 'Klicken, um dein Profilbild zu ändern';
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        openMyAvatarModal();
      });
    }

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
      banBtn.addEventListener('click', (e) => {
        e.stopPropagation();
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
    btn.className = `room-toggle-btn${r.id === currentRoom && viewMode === 'chat' ? ' active' : ''}`;

    const label = document.createElement('span');
    if (r.iconImage) {
      const iconImg = document.createElement('img');
      iconImg.src = r.iconImage;
      iconImg.alt = '';
      iconImg.className = 'room-icon-img';
      label.appendChild(iconImg);
      label.appendChild(document.createTextNode(` ${r.label}`));
    } else {
      label.textContent = `${r.icon || '#'} ${r.label}`;
    }
    btn.appendChild(label);

    const count = unreadCounts[r.id] || 0;
    if (count > 0 && !(r.id === currentRoom && viewMode === 'chat')) {
      const badge = document.createElement('span');
      badge.className = 'room-badge';
      badge.textContent = count > 99 ? '99+' : String(count);
      btn.appendChild(badge);
    }

    btn.addEventListener('click', () => {
      if (r.id === currentRoom && viewMode === 'chat') return;
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

      const customizeBtn = document.createElement('button');
      customizeBtn.className = 'room-admin-btn';
      customizeBtn.textContent = '🎨';
      customizeBtn.title = 'Icon & Hintergrundbild anpassen';
      customizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRoomCustomize(r);
      });
      li.appendChild(customizeBtn);

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
        socket.emit('admin:createRoom', { label: label.trim() });
      }
    });
    addLi.appendChild(addBtn);
    roomListEl.appendChild(addLi);
  }

  shoppingNavBtn.classList.toggle('active', viewMode === 'shopping');
  calendarNavBtn.classList.toggle('active', viewMode === 'calendar');
}

socket.on('rooms', (list) => {
  rooms = list;
  renderRoomList();
  applyRoomBackground();
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
  viewMode = 'chat'; // ein Kanal-Klick zeigt immer den Chat, nie die Einkaufsliste
  const room = rooms.find((r) => r.id === roomId);
  unreadCounts[roomId] = 0;
  roomTitleEl.textContent = `# ${room ? room.label : roomId}`;
  renderRoomList();
  updateViewModeUI();
  // Lokalen Zustand fuer den neuen Kanal zuruecksetzen
  lastDateKey = null;
  cancelReply();
  searchInput.value = '';
  searchBar.classList.add('hidden');
  applySearchFilter('');
  closeGallery();
  sidebar.classList.remove('open');
});

function updateViewModeUI() {
  const isShopping = viewMode === 'shopping';
  const isCalendar = viewMode === 'calendar';
  const isChat = !isShopping && !isCalendar;
  chatColumnEl.classList.toggle('hidden', !isChat);
  checklistPanelEl.classList.toggle('hidden', !isShopping);
  calendarPanelEl.classList.toggle('hidden', !isCalendar);
  calendarAdminForm.classList.toggle('hidden', myRole !== 'admin');
  if (isShopping) {
    roomTitleEl.textContent = '🛒 Einkaufsliste';
  } else if (isCalendar) {
    roomTitleEl.textContent = '📅 Kalender';
  } else {
    const room = rooms.find((r) => r.id === currentRoom);
    roomTitleEl.innerHTML = '';
    if (room && room.iconImage) {
      const img = document.createElement('img');
      img.src = room.iconImage;
      img.alt = '';
      img.className = 'room-title-icon-img';
      roomTitleEl.appendChild(img);
      roomTitleEl.appendChild(document.createTextNode(` ${room.label}`));
    } else {
      roomTitleEl.textContent = `${room && room.icon ? room.icon : '#'} ${room ? room.label : currentRoom}`;
    }
  }
  document.body.classList.toggle('theme-fun', isChat && currentRoom === 'fun');
  applyRoomBackground();
}

shoppingNavBtn.addEventListener('click', () => {
  viewMode = 'shopping';
  renderRoomList();
  updateViewModeUI();
  sidebar.classList.remove('open');
});

calendarNavBtn.addEventListener('click', () => {
  viewMode = 'calendar';
  renderRoomList();
  updateViewModeUI();
  sidebar.classList.remove('open');
});

// --- Passendes Icon zum Artikel (einfache Stichwort-Erkennung) --------------
const ITEM_ICON_MAP = [
  ['banane', '🍌'], ['apfel', '🍎'], ['orange', '🍊'], ['mandarine', '🍊'],
  ['traube', '🍇'], ['erdbeere', '🍓'], ['himbeere', '🍓'], ['zitrone', '🍋'],
  ['limette', '🍋'], ['birne', '🍐'], ['ananas', '🍍'], ['wassermelone', '🍉'],
  ['melone', '🍈'], ['kirsche', '🍒'], ['pfirsich', '🍑'], ['avocado', '🥑'],
  ['kiwi', '🥝'], ['mango', '🥭'], ['kokosnuss', '🥥'], ['kokos', '🥥'],
  ['tomate', '🍅'], ['karotte', '🥕'], ['möhre', '🥕'], ['moehre', '🥕'],
  ['kartoffel', '🥔'], ['zwiebel', '🧅'], ['knoblauch', '🧄'], ['paprika', '🫑'],
  ['salat', '🥬'], ['brokkoli', '🥦'], ['blumenkohl', '🥦'], ['mais', '🌽'],
  ['gurke', '🥒'], ['pilz', '🍄'], ['champignon', '🍄'], ['aubergine', '🍆'],
  ['erdnuss', '🥜'], ['nuss', '🥜'], ['milch', '🥛'], ['käse', '🧀'],
  ['kaese', '🧀'], ['butter', '🧈'], ['joghurt', '🥣'], ['jogurt', '🥣'],
  ['sahne', '🥛'], ['quark', '🥣'], ['ei', '🥚'], ['brot', '🍞'],
  ['brötchen', '🥐'], ['broetchen', '🥐'], ['croissant', '🥐'], ['kuchen', '🍰'],
  ['torte', '🎂'], ['waffel', '🧇'], ['pfannkuchen', '🥞'], ['wasser', '💧'],
  ['saft', '🧃'], ['bier', '🍺'], ['wein', '🍷'], ['sekt', '🍾'],
  ['kaffee', '☕'], ['tee', '🍵'], ['cola', '🥤'], ['limo', '🥤'],
  ['fleisch', '🥩'], ['steak', '🥩'], ['hähnchen', '🍗'], ['haehnchen', '🍗'],
  ['hühnchen', '🍗'], ['huehnchen', '🍗'], ['huhn', '🍗'], ['wurst', '🌭'],
  ['schinken', '🥓'], ['speck', '🥓'], ['fisch', '🐟'], ['lachs', '🐟'],
  ['garnele', '🦐'], ['schokolade', '🍫'], ['bonbon', '🍬'], ['lolli', '🍭'],
  ['keks', '🍪'], ['chips', '🍟'], ['pommes', '🍟'], ['eis', '🍦'],
  ['popcorn', '🍿'], ['nudel', '🍝'], ['spaghetti', '🍝'], ['pasta', '🍝'],
  ['reis', '🍚'], ['pizza', '🍕'], ['burger', '🍔'], ['döner', '🌯'],
  ['doener', '🌯'], ['honig', '🍯'], ['marmelade', '🍯'], ['salz', '🧂'],
  ['pfeffer', '🧂'], ['zucker', '🧂'], ['gewürz', '🧂'], ['gewuerz', '🧂'],
  ['mehl', '🌾'], ['müsli', '🥣'], ['muesli', '🥣'], ['cerealien', '🥣'],
  ['toilettenpapier', '🧻'], ['klopapier', '🧻'], ['küchenrolle', '🧻'],
  ['seife', '🧼'], ['waschmittel', '🧴'], ['shampoo', '🧴'], ['zahnpasta', '🪥'],
  ['kerze', '🕯️'], ['batterie', '🔋'], ['blume', '💐'], ['tulpe', '🌷'],
];
const SORTED_ITEM_ICON_MAP = [...ITEM_ICON_MAP].sort((a, b) => b[0].length - a[0].length);

function getItemIcon(text) {
  const lower = text.toLowerCase();
  const match = SORTED_ITEM_ICON_MAP.find(([keyword]) => lower.includes(keyword));
  return match ? match[1] : '🛒';
}

// --- Wetter im Header (Open-Meteo, Serverstandort) --------------------------
// WMO-Wettercodes -> Icon + kurze Beschreibung
const WEATHER_CODE_MAP = {
  0: ['☀️', 'Klarer Himmel'],
  1: ['🌤️', 'Überwiegend klar'],
  2: ['⛅', 'Teilweise bewölkt'],
  3: ['☁️', 'Bedeckt'],
  45: ['🌫️', 'Nebel'],
  48: ['🌫️', 'Reifnebel'],
  51: ['🌦️', 'Leichter Nieselregen'],
  53: ['🌦️', 'Nieselregen'],
  55: ['🌧️', 'Starker Nieselregen'],
  56: ['🌧️', 'Gefrierender Niesel'],
  57: ['🌧️', 'Gefrierender Niesel'],
  61: ['🌦️', 'Leichter Regen'],
  63: ['🌧️', 'Regen'],
  65: ['🌧️', 'Starker Regen'],
  66: ['🌧️', 'Gefrierender Regen'],
  67: ['🌧️', 'Gefrierender Regen'],
  71: ['🌨️', 'Leichter Schneefall'],
  73: ['❄️', 'Schneefall'],
  75: ['❄️', 'Starker Schneefall'],
  77: ['🌨️', 'Schneekörner'],
  80: ['🌦️', 'Regenschauer'],
  81: ['🌧️', 'Regenschauer'],
  82: ['⛈️', 'Heftiger Regenschauer'],
  85: ['🌨️', 'Schneeschauer'],
  86: ['❄️', 'Schneeschauer'],
  95: ['⛈️', 'Gewitter'],
  96: ['⛈️', 'Gewitter mit Hagel'],
  99: ['⛈️', 'Gewitter mit Hagel'],
};
function weatherIcon(code) {
  return (WEATHER_CODE_MAP[code] || ['🌡️', 'Unbekannt'])[0];
}
function weatherLabel(code) {
  return (WEATHER_CODE_MAP[code] || ['🌡️', 'Unbekannt'])[1];
}
function formatTemp(t) {
  return t === null || t === undefined ? '–' : `${Math.round(t)}°`;
}

let lastWeatherData = null;

function renderWeather(data) {
  lastWeatherData = data;
  weatherCurrentEl.textContent = `${weatherIcon(data.current.code)} ${formatTemp(data.current.temp)}`;
  weatherToggleBtn.title = weatherLabel(data.current.code);

  weatherPopoverCurrentEl.textContent =
    `${weatherIcon(data.current.code)} ${weatherLabel(data.current.code)}, ${formatTemp(data.current.temp)} `
    + `· Heute ${formatTemp(data.daily.max)} / ${formatTemp(data.daily.min)}`;

  weatherPopoverHourlyEl.innerHTML = '';
  data.hourly.forEach((h) => {
    const hourEl = document.createElement('div');
    hourEl.className = 'weather-hour';
    const time = document.createElement('span');
    time.textContent = new Date(h.time).toLocaleTimeString('de-DE', { hour: '2-digit' });
    hourEl.appendChild(time);
    const icon = document.createElement('span');
    icon.className = 'weather-hour-icon';
    icon.textContent = weatherIcon(h.code);
    hourEl.appendChild(icon);
    const temp = document.createElement('span');
    temp.className = 'weather-hour-temp';
    temp.textContent = formatTemp(h.temp);
    hourEl.appendChild(temp);
    weatherPopoverHourlyEl.appendChild(hourEl);
  });

  weatherPopoverUpdatedEl.textContent = `Aktualisiert ${formatTime(data.updatedAt)}`;
}

socket.on('weatherUpdate', renderWeather);

weatherToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!lastWeatherData) return;
  weatherPopover.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
  if (!weatherPopover.classList.contains('hidden') && !weatherPopover.contains(e.target) && e.target !== weatherToggleBtn) {
    weatherPopover.classList.add('hidden');
  }
});

function startEditChecklistItem(li, item) {
  li.innerHTML = '';
  li.classList.add('checklist-item-editing');

  const row1 = document.createElement('div');
  row1.className = 'checklist-edit-row';

  const amountInput = document.createElement('input');
  amountInput.type = 'text';
  amountInput.value = item.amount || '';
  amountInput.placeholder = 'Menge';
  amountInput.className = 'checklist-edit-amount';
  row1.appendChild(amountInput);

  const unitInput = document.createElement('input');
  unitInput.type = 'text';
  unitInput.value = item.unit || '';
  unitInput.placeholder = 'Einheit';
  unitInput.className = 'checklist-edit-unit';
  row1.appendChild(unitInput);

  const row2 = document.createElement('div');
  row2.className = 'checklist-edit-row';

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.value = item.text;
  textInput.className = 'checklist-edit-text';
  row2.appendChild(textInput);

  const actions = document.createElement('div');
  actions.className = 'checklist-edit-row';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'unban-btn';
  saveBtn.textContent = 'Speichern';
  saveBtn.addEventListener('click', () => {
    const newText = textInput.value.trim();
    if (!newText) { textInput.focus(); return; }
    socket.emit('checklist:edit', {
      itemId: item.id,
      text: newText,
      amount: amountInput.value.trim(),
      unit: unitInput.value.trim(),
    });
  });
  actions.appendChild(saveBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'unban-btn';
  cancelBtn.textContent = 'Abbrechen';
  cancelBtn.addEventListener('click', () => renderChecklist(lastChecklistItems, lastChecklistCategories));
  actions.appendChild(cancelBtn);

  li.appendChild(row1);
  li.appendChild(row2);
  li.appendChild(actions);
  textInput.focus();
}

function renderChecklist(items, categories) {
  lastChecklistItems = items;
  lastChecklistCategories = categories;
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
        const iconTag = document.createElement('span');
        iconTag.className = 'checklist-icon';
        iconTag.textContent = getItemIcon(item.text);
        textSpan.appendChild(iconTag);
        const qty = [item.amount, item.unit].filter(Boolean).join(' ');
        if (qty) {
          const qtyTag = document.createElement('span');
          qtyTag.className = 'checklist-qty';
          qtyTag.textContent = qty;
          textSpan.appendChild(qtyTag);
        }
        textSpan.appendChild(document.createTextNode(item.text));
        li.appendChild(textSpan);

        const meta = document.createElement('span');
        meta.className = 'checklist-meta';
        meta.textContent = item.addedBy;
        li.appendChild(meta);

        const editBtn = document.createElement('button');
        editBtn.className = 'checklist-remove-btn';
        editBtn.type = 'button';
        editBtn.textContent = '✏️';
        editBtn.title = 'Eintrag bearbeiten';
        editBtn.addEventListener('click', () => startEditChecklistItem(li, item));
        li.appendChild(editBtn);

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

socket.on('shoppingListUpdate', ({ items, categories }) => {
  renderChecklist(items || [], categories || []);
});

checklistClearDoneBtn.addEventListener('click', () => {
  socket.emit('checklist:clearDone');
});

function addChecklistItem() {
  const text = checklistItemInput.value.trim();
  if (!text) { checklistItemInput.focus(); return; }
  const category = checklistCategoryInput.value.trim();
  const amount = checklistAmountInput.value.trim();
  const unit = checklistUnitInput.value.trim();
  socket.emit('checklist:add', { text, category, amount, unit });
  checklistItemInput.value = '';
  checklistAmountInput.value = '';
  checklistUnitInput.value = '';
  checklistItemInput.focus();
}
checklistAddBtn.addEventListener('click', addChecklistItem);
checklistItemInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); }
});
checklistCategoryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); checklistAmountInput.focus(); }
});
checklistAmountInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); checklistUnitInput.focus(); }
});
checklistUnitInput.addEventListener('keydown', (e) => {
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

// --- Geburtstage ---------------------------------------------------------------
let birthdaysList = [];

function nextOccurrence(b) {
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), b.month - 1, b.day);
  if (thisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return new Date(now.getFullYear() + 1, b.month - 1, b.day);
  }
  return thisYear;
}

function renderBirthdaysList() {
  birthdaysListEl.innerHTML = '';
  if (!birthdaysList.length) {
    birthdaysEmptyEl.classList.remove('hidden');
    return;
  }
  birthdaysEmptyEl.classList.add('hidden');

  const sorted = [...birthdaysList].sort((a, b) => nextOccurrence(a) - nextOccurrence(b));
  sorted.forEach((b) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    const dateStr = `${String(b.day).padStart(2, '0')}.${String(b.month).padStart(2, '0')}.${b.year ? b.year : ''}`.replace(/\.$/, '');
    label.textContent = `${b.name} — ${dateStr}`;
    li.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'unban-btn';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Entfernen';
    removeBtn.addEventListener('click', () => {
      if (confirm(`Geburtstag von "${b.name}" wirklich entfernen?`)) {
        socket.emit('birthday:remove', { id: b.id });
      }
    });
    li.appendChild(removeBtn);
    birthdaysListEl.appendChild(li);
  });
}

socket.on('birthdaysUpdate', (list) => {
  birthdaysList = list || [];
  renderBirthdaysList();
});

function openBirthdays() {
  birthdaysOverlay.classList.remove('hidden');
}
function closeBirthdays() {
  birthdaysOverlay.classList.add('hidden');
}
birthdaysToggleBtn.addEventListener('click', openBirthdays);
birthdaysCloseBtn.addEventListener('click', closeBirthdays);
birthdaysOverlay.addEventListener('click', (e) => {
  if (e.target === birthdaysOverlay) closeBirthdays();
});

birthdayAddBtn.addEventListener('click', () => {
  const name = birthdayNameInput.value.trim();
  const dateVal = birthdayDateInput.value; // Format: YYYY-MM-DD
  if (!name) { birthdayNameInput.focus(); return; }
  if (!dateVal) { birthdayDateInput.focus(); return; }
  const [year, month, day] = dateVal.split('-').map(Number);
  socket.emit('birthday:add', { name, day, month, year });
  birthdayNameInput.value = '';
  birthdayDateInput.value = '';
  birthdayNameInput.focus();
});

// --- Kalender (iCal) -----------------------------------------------------------
function formatEventTime(ev) {
  if (ev.allDay) return 'Ganztägig';
  return new Date(ev.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDayHeading(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  if (diffDays === 0) return `Heute · ${dateStr}`;
  if (diffDays === 1) return `Morgen · ${dateStr}`;
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
  return `${weekday} · ${dateStr}`;
}

function renderCalendar(events) {
  calendarListEl.innerHTML = '';
  if (!events.length) {
    calendarEmptyEl.classList.remove('hidden');
    return;
  }
  calendarEmptyEl.classList.add('hidden');

  const groups = new Map(); // dayKey -> { date, items }
  events.forEach((ev) => {
    const d = new Date(ev.start);
    const dayKey = d.toDateString();
    if (!groups.has(dayKey)) groups.set(dayKey, { date: d, items: [] });
    groups.get(dayKey).items.push(ev);
  });

  [...groups.values()].forEach((group) => {
    const dayEl = document.createElement('div');

    const heading = document.createElement('div');
    heading.className = 'calendar-day-heading';
    heading.textContent = formatDayHeading(group.date);
    dayEl.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'calendar-events';
    group.items.forEach((ev) => {
      const li = document.createElement('li');
      li.className = 'calendar-event';

      const time = document.createElement('span');
      time.className = 'calendar-event-time';
      time.textContent = formatEventTime(ev);
      li.appendChild(time);

      const body = document.createElement('div');
      body.className = 'calendar-event-body';
      const summary = document.createElement('div');
      summary.className = 'calendar-event-summary';
      summary.textContent = ev.summary;
      body.appendChild(summary);
      if (ev.location) {
        const loc = document.createElement('div');
        loc.className = 'calendar-event-location';
        loc.textContent = `📍 ${ev.location}`;
        body.appendChild(loc);
      }
      li.appendChild(body);
      list.appendChild(li);
    });
    dayEl.appendChild(list);
    calendarListEl.appendChild(dayEl);
  });
}

socket.on('calendarUpdate', ({ events, error }) => {
  if (error) {
    calendarErrorEl.textContent = error;
    calendarErrorEl.classList.remove('hidden');
  } else {
    calendarErrorEl.classList.add('hidden');
  }
  renderCalendar(events || []);
});

socket.on('calendarUrl', (url) => {
  calendarUrlInput.value = url || '';
});

calendarUrlSaveBtn.addEventListener('click', () => {
  socket.emit('admin:setCalendarUrl', { url: calendarUrlInput.value.trim() });
});

// --- Kanal anpassen (Icon + Hintergrundbild, nur Admin) -----------------------
let customizingRoomId = null;

function openRoomCustomize(room) {
  customizingRoomId = room.id;
  roomCustomizeTitleEl.textContent = `🎨 "${room.label}" anpassen`;
  roomIconInput.value = room.icon || '';
  roomCustomizeOverlay.classList.remove('hidden');
}
function closeRoomCustomize() {
  roomCustomizeOverlay.classList.add('hidden');
  customizingRoomId = null;
}
roomCustomizeClose.addEventListener('click', closeRoomCustomize);
roomCustomizeOverlay.addEventListener('click', (e) => {
  if (e.target === roomCustomizeOverlay) closeRoomCustomize();
});

roomIconSaveBtn.addEventListener('click', () => {
  if (!customizingRoomId) return;
  socket.emit('admin:setRoomIcon', { roomId: customizingRoomId, icon: roomIconInput.value.trim() });
});

roomIconUploadBtn.addEventListener('click', () => roomIconFileInput.click());
roomIconFileInput.addEventListener('change', () => {
  const file = roomIconFileInput.files[0];
  roomIconFileInput.value = '';
  if (!file || !customizingRoomId) return;
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit('admin:uploadRoomIcon', { roomId: customizingRoomId, dataUrl: reader.result });
  };
  reader.readAsDataURL(file);
});

roomIconRemoveBtn.addEventListener('click', () => {
  if (!customizingRoomId) return;
  socket.emit('admin:removeRoomIcon', { roomId: customizingRoomId });
});

roomBgUploadBtn.addEventListener('click', () => roomBgFileInput.click());
roomBgFileInput.addEventListener('change', () => {
  const file = roomBgFileInput.files[0];
  roomBgFileInput.value = '';
  if (!file || !customizingRoomId) return;
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit('admin:uploadRoomBackground', { roomId: customizingRoomId, dataUrl: reader.result });
  };
  reader.readAsDataURL(file);
});

roomBgRemoveBtn.addEventListener('click', () => {
  if (!customizingRoomId) return;
  if (confirm('Hintergrundbild für diesen Kanal wirklich entfernen?')) {
    socket.emit('admin:removeRoomBackground', { roomId: customizingRoomId });
  }
});

socket.on('adminActionError', (msg) => {
  alert(msg);
});

function applyRoomBackground() {
  const room = rooms.find((r) => r.id === currentRoom);
  messagesBgEl.style.backgroundImage = room && room.background ? `url("${room.background}")` : 'none';
}

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

function timeAgo(ts) {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'gerade eben';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  return `vor ${diffD} Tag${diffD === 1 ? '' : 'en'}`;
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function pairPresenceSessions(list) {
  const sorted = [...list].sort((a, b) => a.ts - b.ts);
  const openByName = new Map(); // name -> Zeitpunkt des letzten "online" ohne bekanntes "offline"
  const sessions = [];

  sorted.forEach((entry) => {
    if (entry.event === 'online') {
      openByName.set(entry.name, entry.ts);
    } else if (entry.event === 'offline') {
      const startTs = openByName.get(entry.name);
      sessions.push({ name: entry.name, start: startTs ?? null, end: entry.ts });
      openByName.delete(entry.name);
    }
  });
  // Wer noch online ist (kein passendes "offline" bisher) als laufende Sitzung ergaenzen
  openByName.forEach((ts, name) => {
    sessions.push({ name, start: ts, end: null });
  });

  return sessions.sort((a, b) => (b.end ?? b.start) - (a.end ?? a.start));
}

function renderPresenceLog(list) {
  presenceLogListEl.innerHTML = '';
  const sessions = pairPresenceSessions(list);
  if (!sessions.length) {
    presenceLogEmptyEl.classList.remove('hidden');
    return;
  }
  presenceLogEmptyEl.classList.add('hidden');
  sessions.slice(0, 100).forEach((session) => {
    const li = document.createElement('li');
    li.className = 'presence-log-item';

    const isOngoing = session.end === null;
    const label = document.createElement('span');
    label.className = 'presence-log-name';
    label.textContent = `${isOngoing ? '🟢' : '⚪'} ${session.name}`;
    li.appendChild(label);

    const detail = document.createElement('span');
    detail.className = 'presence-log-time';
    if (session.start && session.end) {
      const durationMin = Math.max(1, Math.round((session.end - session.start) / 60000));
      detail.title = `${formatDateTime(session.start)} – ${formatDateTime(session.end)}`;
      detail.textContent = `${formatTime(session.start)}–${formatTime(session.end)} · ${durationMin} Min.`;
    } else if (isOngoing) {
      detail.title = `Seit ${formatDateTime(session.start)}`;
      detail.textContent = `seit ${formatTime(session.start)} · online`;
    } else {
      detail.title = formatDateTime(session.end);
      detail.textContent = `bis ${formatTime(session.end)}`;
    }
    li.appendChild(detail);

    presenceLogListEl.appendChild(li);
  });
}

socket.on('presenceLog', (list) => {
  renderPresenceLog(list || []);
});

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
