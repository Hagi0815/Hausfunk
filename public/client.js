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

  if (msg.type === 'text') {
    bubble.textContent = msg.text;
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

  // Aktionen: Reagieren + Antworten
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
  msgs.forEach(renderMessage);
});

socket.on('message', (msg) => {
  renderMessage(msg);
  if (msg.sender !== myName) {
    if (document.hidden) {
      unreadCount += 1;
      document.title = `(${unreadCount}) ${baseTitle}`;
    }
    notifyNewMessage(msg);
  }
});
socket.on('system', renderSystem);

socket.on('reactionUpdate', ({ messageId, reactions }) => {
  const target = messagesEl.querySelector(`[data-id="${CSS.escape(messageId)}"]`);
  if (!target) return;
  const reactionsEl = target.querySelector('.reactions');
  if (reactionsEl) renderReactions(reactionsEl, reactions || {});
});

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
