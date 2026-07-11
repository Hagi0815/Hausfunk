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

## Profilbilder

Beim Betreten kann entweder ein Emoji-Symbol gewählt oder über „📷 Eigenes Bild“
ein echtes Foto hochgeladen werden (JPG/PNG/WebP, max. 5 MB). Da es keine
Benutzerkonten gibt, wird das Bild an den eingegebenen Namen gebunden: tippt man
später denselben Namen erneut ein, wird das gespeicherte Bild automatisch
vorgeschlagen (Vorschau aktualisiert sich, sobald man aus dem Namensfeld
heraus-tabbt).

- Zuordnung liegt in `data/avatars.json` (Name → Bild-URL), Bilder selbst unter
  `uploads/avatars/`
- Kein Zuschneiden/Verkleinern serverseitig – die Bilder werden nur in der
  Chat-Oberfläche klein dargestellt; im LAN spielt die Dateigröße performance-
  mäßig keine Rolle
- Da es sich um ein vertrauenswürdiges Heimnetz ohne Zugriffsschutz handelt,
  kann grundsätzlich jeder ein Bild unter einem beliebigen Namen hochladen –
  für den Familiengebrauch unkritisch, aber gut zu wissen

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

## HTTPS über Caddy (echtes Let's-Encrypt-Zertifikat)

Hausfunk selbst läuft wieder auf **normalem HTTP** (Port 3210) – TLS übernimmt ein
vorgeschalteter **Caddy** mit einem echten, öffentlich vertrauenswürdigen
Zertifikat. Der Trick: die Subdomain zeigt per DNS auf die **private LAN-IP**
des Containers, läuft aber **nicht** über Cloudflare Tunnel – der Zertifikats-
Nachweis läuft rein über eine DNS-Challenge, der eigentliche Traffic bleibt im
Heimnetz.

**1. Cloudflare API-Token anlegen**
Ein Token mit `Zone → DNS → Edit`-Recht, beschränkt auf die Zone
`christian-hagedorn.de`.

**2. DNS-Eintrag anlegen**
A-Record `hausfunk.christian-hagedorn.de` → LAN-IP des Hausfunk-Containers
(z. B. `192.168.178.49`), Status **"DNS only"** (graue Wolke, nicht orange/
proxied) – sonst versucht Cloudflare, eine private IP über sein Netz zu routen,
was nicht funktioniert.

**3. Prüfen, ob Caddy das Cloudflare-DNS-Modul hat**
```bash
caddy list-modules | grep cloudflare
```
Kommt nichts zurück, muss Caddy einmalig mit dem Modul neu gebaut werden (z. B.
via [xcaddy](https://github.com/caddyserver/xcaddy)):
```bash
xcaddy build --with github.com/caddy-dns/cloudflare
```
und die bestehende Caddy-Binary durch die neu gebaute ersetzen.

**4. Caddyfile-Eintrag ergänzen**
```
hausfunk.christian-hagedorn.de {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    reverse_proxy 192.168.178.49:3210
}
```
Den API-Token als Umgebungsvariable `CLOUDFLARE_API_TOKEN` dort setzen, wo der
Caddy-Dienst gestartet wird (z. B. systemd-Unit oder `.env`), danach:
```bash
caddy reload
```

**5. Testen**
`https://hausfunk.christian-hagedorn.de` aufrufen – echtes Zertifikat, keine
Browser-Warnung mehr, Benachrichtigungen und Mikrofonzugriff funktionieren wie
gewohnt (der Browser sieht HTTPS, unabhängig davon, dass Caddy intern per HTTP
mit Hausfunk spricht).

Ein direkter Aufruf über `http://<container-ip>:3210` funktioniert weiterhin
(z. B. zum Debuggen), dann aber ohne HTTPS.

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
   Für HTTPS mit echtem Zertifikat siehe den Abschnitt "HTTPS über Caddy" oben –
   dabei bleibt der eigentliche Traffic weiterhin nur im Heimnetz, nur die
   Zertifikatsprüfung läuft über Cloudflares DNS-API.
4. Ohne Caddy erreichen andere Geräte im selben Netz den Chat direkt über die
   LAN-IP des Containers, z. B. `http://192.168.178.XXX:3210` (dann ohne HTTPS,
   also ohne Benachrichtigungen/Mikrofon – dafür siehe HTTPS-Abschnitt oben).

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
