const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const selfsigned = require('selfsigned');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3210;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CERT_DIR = path.join(__dirname, 'certs');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MAX_HISTORY = 500;   // wie viele Nachrichten dauerhaft behalten werden
const MAX_SEND = 200;      // wie viele beim Beitritt an den Client geschickt werden

// --- Ordner & Datendatei sicherstellen -------------------------------------
[DATA_DIR, UPLOAD_DIR, CERT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, '[]');

// --- Selbstsigniertes Zertifikat sicherstellen -----------------------------
// Wird beim allerersten Start einmalig erzeugt und danach wiederverwendet.
// certs/ steht in .gitignore, jede Installation bekommt ihr eigenes Zertifikat.
function getLocalIPv4Addresses() {
  const addresses = new Set(['127.0.0.1']);
  const ifaces = os.networkInterfaces();
  Object.values(ifaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (entry.family === 'IPv4' && !entry.internal) addresses.add(entry.address);
    });
  });
  return [...addresses];
}

async function ensureCertificate() {
  if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
    return { key: fs.readFileSync(KEY_FILE), cert: fs.readFileSync(CERT_FILE) };
  }
  const ips = getLocalIPv4Addresses();
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 2, value: os.hostname() },
    ...ips.map((ip) => ({ type: 7, ip })),
  ];
  const notBefore = new Date();
  const notAfter = new Date(notBefore);
  notAfter.setFullYear(notAfter.getFullYear() + 10);

  const pems = await selfsigned.generate(
    [{ name: 'commonName', value: os.hostname() || 'hausfunk' }],
    {
      notBeforeDate: notBefore,
      notAfterDate: notAfter,
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        { name: 'basicConstraints', cA: false },
        {
          name: 'keyUsage',
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true,
        },
        { name: 'subjectAltName', altNames },
      ],
    },
  );
  fs.writeFileSync(KEY_FILE, pems.private, { mode: 0o600 });
  fs.writeFileSync(CERT_FILE, pems.cert);
  console.log(`Neues selbstsigniertes Zertifikat erzeugt fuer: ${ips.join(', ')}`);
  return { key: pems.private, cert: pems.cert };
}

function loadMessages() {
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
  } catch (err) {
    console.error('Konnte messages.json nicht lesen, starte leer:', err.message);
    return [];
  }
}
function saveMessages(msgs) {
  const trimmed = msgs.slice(-MAX_HISTORY);
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(trimmed, null, 2));
  return trimmed;
}

let messages = loadMessages();

async function main() {
  // --- App / Server / Socket.io ---------------------------------------------
  const app = express();
  const { key, cert } = await ensureCertificate();
  const server = https.createServer({ key, cert }, app);
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

  // --- Online-Nutzer & Farben -------------------------------------------------
  const onlineUsers = new Map(); // socket.id -> { name, color }
  const COLORS = ['#E8A33D', '#3E7C77', '#C9614A', '#6C8EBF', '#9B7EDE', '#5FAE6B', '#D9B24C'];

  function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  }

  function broadcastUsers() {
    io.emit('users', [...onlineUsers.values()]);
  }

  function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  io.on('connection', (socket) => {
    socket.on('join', (rawName) => {
      const name = (rawName || 'Gast').toString().trim().slice(0, 24) || 'Gast';
      socket.data.name = name;
      socket.data.color = colorForName(name);
      onlineUsers.set(socket.id, { name, color: socket.data.color });

      socket.emit('history', messages.slice(-MAX_SEND));
      broadcastUsers();
      socket.broadcast.emit('system', `${name} ist beigetreten`);
    });

    socket.on('message', (payload) => {
      if (!payload || !socket.data.name) return;
      const name = socket.data.name;
      const color = socket.data.color;

      if (payload.type === 'text') {
        const clean = (payload.text || '').toString().slice(0, 2000).trim();
        if (!clean) return;
        const msg = { id: makeId(), type: 'text', sender: name, color, text: clean, ts: Date.now() };
        messages.push(msg);
        messages = saveMessages(messages);
        io.emit('message', msg);
      } else if (payload.type === 'image') {
        if (!payload.url) return;
        const msg = { id: makeId(), type: 'image', sender: name, color, url: payload.url, ts: Date.now() };
        messages.push(msg);
        messages = saveMessages(messages);
        io.emit('message', msg);
      }
    });

    socket.on('typing', (isTyping) => {
      if (!socket.data.name) return;
      socket.broadcast.emit('typing', { name: socket.data.name, isTyping: !!isTyping });
    });

    socket.on('disconnect', () => {
      const name = socket.data.name;
      onlineUsers.delete(socket.id);
      broadcastUsers();
      if (name) socket.broadcast.emit('system', `${name} hat den Kanal verlassen`);
    });
  });

  server.listen(PORT, () => {
    console.log(`Hausfunk laeuft (HTTPS, selbstsigniert) auf Port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Hausfunk konnte nicht gestartet werden:', err);
  process.exit(1);
});
