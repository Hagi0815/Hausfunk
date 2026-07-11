const socket = io();

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');
const messagesEl = document.getElementById('messages');
const userListEl = document.getElementById('user-list');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const imageBtn = document.getElementById('image-btn');
const typingEl = document.getElementById('typing-indicator');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const onlineCountEl = document.getElementById('online-count');
const onlineCountMobileEl = document.getElementById('online-count-mobile');
const loginUserListEl = document.getElementById('login-user-list');
const loginOnlineEmptyEl = document.getElementById('login-online-empty');
const replyPreview = document.getElementById('reply-preview');
const replyPreviewSender = document.getElementById('reply-preview-sender');
const replyPreviewText = document.getElementById('reply-preview-text');
const replyCancelBtn = document.getElementById('reply-cancel');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const searchToggleBtn = document.getElementById('search-toggle');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchCloseBtn = document.getElementById('search-close');
const pinnedBar = document.getElementById('pinned-bar');
const pinnedTextEl = document.getElementById('pinned-text');
const pinnedUnpinBtn = document.getElementById('pinned-unpin');

const DELETE_WINDOW_MS = 5 * 60 * 1000; // muss zum Server-Wert passen
let currentPinned = null;

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
    Notification.requestPermission().then(updateNotifStatus);
  }
  updateNotifStatus();
}

function notifyNewMessage(msg) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  const body = msg.type === 'image' ? '📷 Bild gesendet' : msg.text;
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

function join() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  myName = name;
  socket.emit('join', name);
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  textInput.focus();
  requestNotificationPermission(); // Klick auf "Kanal betreten" zählt als Nutzer-Geste
  unlockAudio();
}

joinBtn.addEventListener('click', join);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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
  const preview = msg.type === 'image' ? '📷 Bild' : msg.text;
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

function renderMessage(msg) {
  maybeRenderDateDivider(msg.ts);

  const own = msg.sender === myName;
  const wrap = document.createElement('div');
  wrap.className = `msg ${own ? 'own' : ''}`;
  wrap.dataset.id = msg.id;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = msg.color;
  meta.appendChild(dot);

  const senderEl = document.createElement('span');
  senderEl.className = 'sender';
  senderEl.textContent = msg.sender;
  meta.appendChild(senderEl);

  const timeEl = document.createElement('span');
  timeEl.textContent = formatTime(msg.ts);
  meta.appendChild(timeEl);

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

  if (own && (Date.now() - msg.ts) < DELETE_WINDOW_MS) {
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

function renderPinned(pinned) {
  currentPinned = pinned;
  if (!pinned) {
    pinnedBar.classList.add('hidden');
    return;
  }
  const preview = pinned.type === 'image' ? '📷 Bild' : (pinned.text || '');
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

searchToggleBtn.addEventListener('click', () => {
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    applySearchFilter('');
  }
});
searchCloseBtn.addEventListener('click', () => {
  searchBar.classList.add('hidden');
  searchInput.value = '';
  applySearchFilter('');
});
searchInput.addEventListener('input', () => applySearchFilter(searchInput.value));

function renderUserList(container, list) {
  container.innerHTML = '';
  list.forEach((u) => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = u.color;
    const label = document.createElement('span');
    label.textContent = u.name;
    li.appendChild(dot);
    li.appendChild(label);
    container.appendChild(li);
  });
}

socket.on('users', (list) => {
  renderUserList(userListEl, list);
  onlineCountEl.textContent = list.length;
  onlineCountMobileEl.textContent = list.length;

  renderUserList(loginUserListEl, list);
  if (list.length) {
    loginUserListEl.classList.remove('hidden');
    loginOnlineEmptyEl.classList.add('hidden');
  } else {
    loginUserListEl.classList.add('hidden');
    loginOnlineEmptyEl.classList.remove('hidden');
  }
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
  textInput.value = '';
  textInput.style.height = 'auto';
  socket.emit('typing', false);
  cancelReply();
}

sendBtn.addEventListener('click', sendText);
textInput.addEventListener('keydown', (e) => {
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
});

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
