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

let myName = '';
let typingTimeout = null;
const typingUsers = new Set();

function join() {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  myName = name;
  socket.emit('join', name);
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  textInput.focus();
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

function renderMessage(msg) {
  const own = msg.sender === myName;
  const wrap = document.createElement('div');
  wrap.className = `msg ${own ? 'own' : ''}`;

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
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

socket.on('history', (msgs) => {
  messagesEl.innerHTML = '';
  msgs.forEach(renderMessage);
});

socket.on('message', renderMessage);
socket.on('system', renderSystem);

socket.on('users', (list) => {
  userListEl.innerHTML = '';
  list.forEach((u) => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = u.color;
    const label = document.createElement('span');
    label.textContent = u.name;
    li.appendChild(dot);
    li.appendChild(label);
    userListEl.appendChild(li);
  });
  onlineCountEl.textContent = list.length;
  onlineCountMobileEl.textContent = list.length;
});

socket.on('typing', ({ name, isTyping }) => {
  if (name === myName) return;
  if (isTyping) typingUsers.add(name); else typingUsers.delete(name);
  typingEl.textContent = typingUsers.size ? `${[...typingUsers].join(', ')} tippt...` : '';
});

function sendText() {
  const text = textInput.value.trim();
  if (!text) return;
  socket.emit('message', { type: 'text', text });
  textInput.value = '';
  textInput.style.height = 'auto';
  socket.emit('typing', false);
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
      socket.emit('message', { type: 'image', url: data.url });
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
