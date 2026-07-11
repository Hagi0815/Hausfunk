# Hausfunk

Ein schlanker, selbstgehosteter Chat für mehrere Personen im eigenen Heimnetz –
Text + Bilder, Echtzeit über Socket.io, keine Cloud, keine Anmeldung außer einem Namen.

## Features

- Mehrere Personen gleichzeitig, ein gemeinsamer Kanal
- Text-Chat in Echtzeit (Socket.io)
- Bilder per Klick oder Drag & Drop teilen (PNG/JPG/GIF/WebP, max. 10 MB)
- Online-Liste mit farbigem Kürzel pro Person
- „Tippt gerade …“-Anzeige
- Nachrichtenverlauf wird in `data/messages.json` gespeichert (letzte 500 Nachrichten),
  neue Mitglieder sehen die letzten 200 beim Beitritt
- Kein externes CDN – läuft komplett offline im LAN (Socket.io-Client wird vom
  eigenen Server mitgeliefert)
- Responsives Layout (Sidebar klappt auf Mobilgeräten zu einem Panel zusammen)

## Lokal testen

```bash
npm install
npm start
```

Dann `http://localhost:3210` öffnen. Port lässt sich per `PORT`-Umgebungsvariable ändern:

```bash
PORT=4000 npm start
```

## Kanäle / Räume

Hausfunk hat mehrere Kanäle: **Familie**, **Technik**, **Einkaufsliste** (Standard
beim Betreten ist "Familie"). Jeder Kanal hat seinen eigenen Verlauf, eigene
angepinnte Nachricht und eigene Online-Liste – Nachrichten in einem Kanal sind für
andere Kanäle unsichtbar.

- Wechsel über die Kanal-Liste in der Sidebar
- Daten liegen unter `data/rooms/<kanal-id>/messages.json` und `.../pinned.json`
- **Weitere Kanäle hinzufügen:** in `server.js` das `ROOMS`-Array am Anfang der
  Datei um ein Objekt erweitern, z. B.:
  ```js
  { id: 'garten', label: 'Garten' }
  ```
  `id` wird als Ordnername verwendet: klein geschrieben, keine Leer-/Sonderzeichen.
  Nach `git pull` + `pm2 restart hausfunk` steht der neue Kanal direkt bereit.
- Bestehender Chat-Verlauf aus der Zeit vor den Kanälen wird beim ersten Start
  nach diesem Update automatisch in den Kanal "Familie" übernommen.

## HTTPS (selbstsigniertes Zertifikat)

Hausfunk läuft über **HTTPS** auf Port 3210 (nicht mehr HTTP). Beim allerersten Start
erzeugt der Server automatisch ein selbstsigniertes Zertifikat unter `certs/`
(liegt in `.gitignore`, wird nie versioniert – jede Installation bekommt ihr eigenes).
Das Zertifikat enthält die zu diesem Zeitpunkt aktiven lokalen IPv4-Adressen des
Servers als Subject Alternative Names, ist 10 Jahre gültig und wird bei jedem
weiteren Start wiederverwendet.

- Aufruf jetzt über `https://<server-ip>:3210` (nicht `http://`)
- Der Browser zeigt beim ersten Besuch pro Gerät eine Warnung
  („Verbindung ist nicht privat“ / „Nicht sicher“), weil das Zertifikat
  selbstsigniert und nicht von einer bekannten Stelle beglaubigt ist. Auf
  „Erweitert“ → „Trotzdem fortfahren“ klicken – danach funktioniert die Seite
  normal, inklusive Browser-Benachrichtigungen (die brauchen einen sicheren
  Kontext, also HTTPS).
- Ändert sich die IP des Servers dauerhaft (z. B. nach Wechsel von DHCP auf eine
  andere Adresse), passt das alte Zertifikat evtl. nicht mehr zur neuen IP.
  Einfach den `certs/`-Ordner löschen und `pm2 restart hausfunk` ausführen –
  es wird automatisch ein neues, passendes Zertifikat erzeugt (Browser-Warnung
  erscheint dann erneut einmalig).

## Deployment auf deinem Proxmox-Setup (LXC + pm2)

Passend zu deinem bestehenden Muster (wie beim network-dashboard auf CT 112):

1. Repo/Ordner in einen LXC-Container kopieren, z. B. nach `/opt/hausfunk`
2. Dort:
   ```bash
   cd /opt/hausfunk
   npm install --omit=dev
   pm2 start server.js --name hausfunk
   pm2 save
   ```
3. Firewall/Netzwerk: Der Container muss nur **innerhalb** deines LAN erreichbar sein.
   **Nicht** über Cloudflare Tunnel oder Caddy nach außen freigeben, sonst ist der
   Chat aus dem Internet erreichbar – das widerspricht dem Zweck (nur Heimnetz).
4. Andere Geräte im selben Netz erreichen den Chat über die LAN-IP des Containers,
   z. B. `http://192.168.178.XXX:3210`. Optional kannst du intern per Caddy einen
   sprechenden Namen vergeben (nur lokal auflösbar, kein Tunnel):
   ```
   hausfunk.local.christian-hagedorn.de {
       reverse_proxy 192.168.178.XXX:3210
   }
   ```
   und den Namen per lokalem DNS/Pi-hole/Hosts-Datei auflösen lassen.

## Daten & Speicher

- `data/messages.json` – persistenter Nachrichtenverlauf (Text + Bild-URLs), wird
  automatisch angelegt, letzte 500 Einträge
- `uploads/` – hochgeladene Bilder als Dateien
- Für ein Backup reichen beide Ordner (z. B. ins bestehende Proxmox-Snapshot-Schema
  aufnehmen)
- Löschen/Kürzen von `data/messages.json` (Inhalt auf `[]` setzen) leert den Verlauf

## Grenzen (bewusst einfach gehalten)

- Kein Passwortschutz – jeder im LAN kann sich mit einem beliebigen Namen anmelden.
  Für ein privates Heimnetz meist ausreichend; bei Bedarf lässt sich vor `server.js`
  leicht ein einfacher Zugriffscode ergänzen.
- Ein einzelner gemeinsamer Kanal, keine Gruppen/Direktnachrichten.
- Keine Nachrichten-Bearbeitung/-Löschung durch Nutzer (nur serverseitig über die
  JSON-Datei).

Diese Punkte lassen sich bei Bedarf nachrüsten – einfach sagen, was als Nächstes
dazukommen soll (z. B. mehrere Räume, Zugriffscode, Nachrichten löschen).
