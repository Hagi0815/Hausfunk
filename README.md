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

Es gibt nur eine Möglichkeit für ein Profilbild: über „📷 Eigenes Bild“ ein
echtes Foto hochladen (JPG/PNG/WebP, max. 5 MB) – keine vorgefertigten
Icons/Bilder zur Auswahl. Ohne eigenes Foto wird ein neutraler grüner
Kreis angezeigt, kein Platzhalter-Icon. Jede Person kann ihr Bild jederzeit
ändern, einfach beim nächsten Betreten ein neues hochladen. Da es keine
Benutzerkonten gibt, wird das Bild an den eingegebenen Namen gebunden: tippt
man später denselben Namen erneut ein, wird das zuletzt hochgeladene Bild
automatisch vorgeschlagen (Vorschau aktualisiert sich, sobald man aus dem
Namensfeld heraus-tabbt).

- Zuordnung liegt in `data/avatars.json` (Name → Bild-URL), Bilder selbst unter
  `uploads/avatars/`
- Kein Zuschneiden/Verkleinern serverseitig – die Bilder werden nur in der
  Chat-Oberfläche klein dargestellt; im LAN spielt die Dateigröße performance-
  mäßig keine Rolle
- Da es sich um ein vertrauenswürdiges Heimnetz ohne Zugriffsschutz handelt,
  kann grundsätzlich jeder ein Bild unter einem beliebigen Namen hochladen –
  für den Familiengebrauch unkritisch, aber gut zu wissen

## Zugang (verpflichtende Konto-Freigabe für neue Namen)

Es gibt **keinen anonymen Zugang mehr**. Beim Betreten müssen immer ein Name
**und** ein Passwort eingegeben werden:

- **Bekannter, bereits genehmigter Name:** das zugehörige Passwort muss
  stimmen, sonst „Falsches Passwort".
- **Komplett neuer Name:** das selbst gewählte Passwort wird automatisch als
  **Konto-Anfrage** hinterlegt (Status „wartet auf Freigabe") – kein Beitritt,
  bis DOM das im Admin-Panel (🛡 → „Ausstehende Konto-Anfragen") genehmigt hat.
  Ein erneuter Versuch mit demselben Namen zeigt so lange „Dein Konto wartet
  noch auf Freigabe durch den Admin."
- Nach der Genehmigung braucht dieser Name ab sofort **immer** das Passwort,
  um sich anzumelden – ganz wie bei DOM, nur ohne die Admin-Rechte.
- Im Admin-Panel unter „Geschützte Konten" kann DOM den Schutz jederzeit
  wieder entfernen (der Name ist dann wieder komplett frei – wer ihn zuerst
  mit einem neuen Passwort verwendet, startet automatisch eine neue Anfrage).

Passwörter werden **gehasht** (SHA-256) in `data/protected-users.json`
gespeichert, nie im Klartext.

## Admin-Rolle (DOM)

Es gibt eine Admin-Rolle, die zu Beginn den Namen **„DOM"** trägt. Wer sich
mit diesem Namen anmeldet, braucht zusätzlich ein Passwort – ohne korrektes
Passwort wird der Beitritt komplett abgelehnt.

**Admin-Namen ändern:** Im Admin-Panel (🛡) unter „Dein Admin-Name" auf
„Ändern" klicken und einen neuen Namen eingeben. Die Umstellung gilt sofort
(auch für die laufende Sitzung, kein erneutes Anmelden nötig) – ab dann muss
mit dem **neuen** Namen + demselben Passwort angemeldet werden. Der alte Name
verliert alle Sonderrechte und wird zu einem ganz normalen Namen (der wie
jeder neue Name künftig eine eigene Konto-Anfrage auslöst).

**Was der Admin kann, was andere nicht können:**
- Jede Nachricht löschen, unabhängig davon wer sie geschrieben hat und wie
  lange sie schon her ist (normale Nutzer: nur eigene, nur 5 Minuten)
- Kanäle verwalten: neue anlegen, umbenennen, löschen – direkt in der Sidebar
  (✏️/🗑 neben jedem Kanal, „+ Kanal" ganz unten in der Liste)
- Nutzer sperren/entsperren: 🚫-Symbol neben jedem Namen in der Online-Liste
  entfernt die Person sofort aus dem Kanal und verhindert, dass sie sich unter
  diesem Namen erneut anmeldet, bis sie über das Admin-Panel (🛡-Symbol oben in
  der Sidebar) wieder entsperrt wird
- Konto-Anfragen genehmigen/ablehnen, geschützte Konten wieder freigeben
- Den eigenen Admin-Namen ändern

Alle Admin-Aktionen werden **serverseitig** geprüft (nicht nur im UI
versteckt) – ein normaler Nutzer kann diese Funktionen also nicht über die
Browser-Konsole erzwingen.

**Einrichtung des Passworts** (das Passwort steht nirgends im Code oder Git-Repo):
```bash
cp ecosystem.config.example.js ecosystem.config.js
nano ecosystem.config.js   # Passwort eintragen
pm2 delete hausfunk        # falls bisher per "pm2 start server.js" gestartet
pm2 start ecosystem.config.js
pm2 save
```
Ist kein Passwort gesetzt, ist der Admin-Zugang komplett deaktiviert (Beitritt
mit dem Namen „DOM" schlägt dann mit einer entsprechenden Meldung fehl).

**Kanäle selbst verwalten:** Das `ROOMS`-Array in `server.js` wird nicht mehr
verwendet – die Kanalliste liegt jetzt in `data/rooms-config.json` und lässt
sich komplett über das Admin-Panel im Chat bearbeiten, ganz ohne Server-Neustart.

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

## Als App installieren (PWA) & echte Push-Benachrichtigungen

Hausfunk lässt sich wie eine echte App installieren:

- **Android/Desktop-Chrome:** Browser-Menü → „App installieren" bzw. „Hausfunk installieren"
- **iPhone/iPad (Safari):** Teilen-Symbol → „Zum Home-Bildschirm"

Nach der Installation und einmaliger Erlaubnis für Benachrichtigungen kommen
**echte Push-Benachrichtigungen** an – auch wenn der Tab oder sogar der ganze
Browser geschlossen ist. Das funktioniert über einen Service Worker
(`public/sw.js`) und die Push-API des Browsers:

- Ein Push wird nur an Namen geschickt, die gerade **nicht** mit einem
  laufenden Chat-Fenster verbunden sind (wer aktiv im Chat ist, bekommt die
  Nachricht ohnehin sofort live, kein doppeltes Piepsen)
- Die dafür nötigen VAPID-Schlüssel erzeugt der Server beim allerersten Start
  automatisch selbst (`data/vapid-keys.json`, wie das Zertifikat frueher) –
  kein manuelles Setup nötig
- Abos liegen in `data/push-subscriptions.json`, ungültig gewordene (z. B.
  Browser-Daten gelöscht) werden automatisch beim nächsten Zustellversuch
  entfernt

## Nachrichten bearbeiten

Eigene Text-Nachrichten lassen sich innerhalb der 5-Minuten-Frist bearbeiten
(✏️-Symbol, wie beim Löschen) – DOM kann jede Text-Nachricht jederzeit
bearbeiten. Bearbeitete Nachrichten zeigen einen kleinen „(bearbeitet)"-Hinweis.
Bilder und Sprachnachrichten lassen sich nicht bearbeiten, nur löschen.

## @Erwähnung mit Autovervollständigung

Tippt man `@` gefolgt von ein paar Buchstaben, erscheint eine Dropdown-Liste
mit passenden Namen aus dem aktuellen Kanal (Pfeiltasten zum Navigieren,
Enter/Tab zum Übernehmen, Escape zum Schließen).

## Angemeldet bleiben (Sitzungen)

Nach dem Anmelden merkt sich der Browser die Sitzung (ein Token in
`localStorage`, 30 Tage gültig) – ein Reload oder ein kurzer Verbindungsabbruch
(WLAN-Wechsel, Handy kurz offline) führt **nicht** mehr zurück zur Login-Seite,
sondern man ist automatisch wieder im Kanal.

- Token liegen serverseitig in `data/sessions.json`, nie das Passwort selbst
- **Abmelden**-Button unten in der Sidebar löscht die Sitzung sowohl im
  Browser als auch auf dem Server – wichtig für gemeinsam genutzte Geräte
  (z. B. ein Familien-Tablet), damit dort nicht dauerhaft ein fremder Name
  eingeloggt bleibt
- Wird DOM umbenannt, wird die bisherige Sitzung automatisch ungültig und
  durch eine neue mit dem neuen Namen ersetzt – kein erneutes Passwort nötig
- Wird ein Name gesperrt oder ein geschütztes Konto entfernt, wird eine
  bestehende Sitzung dafür beim nächsten Verbindungsversuch ebenfalls
  ungültig

## Login-Absicherung & Passwort-Reset

- **Rate-Limiting:** Nach 5 falschen Passwort-Versuchen für denselben Namen
  (egal ob DOM oder ein geschütztes Konto) ist dieser Name 5 Minuten lang
  gesperrt, auch für den richtigen Nutzer – Schutz gegen automatisiertes
  Passwort-Raten. Der Zähler lebt nur im Arbeitsspeicher und setzt sich bei
  einem Server-Neustart zurück.
- **Passwort vergessen:** Link unterhalb des Passwortfelds auf der
  Login-Seite. Das alte Passwort funktioniert weiter, bis DOM die
  Reset-Anfrage im Admin-Panel (🛡 → „Passwort-Reset-Anfragen") genehmigt hat
  – so kann niemand durch eine bloße Reset-Anfrage ein fremdes Konto
  übernehmen.

## Checklisten-Kanäle

Kanäle können zusätzlich eine **Einkaufsliste als Seitenpanel** bekommen –
„Einkaufsliste" ist das direkt so eingerichtet. In so einem Kanal:

- teilt sich das Fenster: links weiterhin der ganz normale Chat (Bilder,
  Sprachnachrichten, Umfragen – alles wie gewohnt nutzbar), rechts ein festes
  Panel mit der Liste
- Einträge werden im Panel über ein eigenes kleines Formular hinzugefügt
  (Rubrik + Menge + Einheit + Artikel + „+"), nicht über das Chat-Textfeld
- **Menge und Einheit sind optional** – z. B. „2" + „kg" + „Bananen" ergibt
  „2 kg Bananen" in der Liste; Einheit hat eine Vorschlagsliste (Stk, kg, g,
  l, ml, Packung, Dose, Flasche, Bund, Becher), es kann aber auch frei
  eingetippt werden. Ohne Angabe erscheint einfach nur der Artikelname.
- Jeder Artikel bekommt automatisch ein passendes Icon anhand des Namens
  (z. B. „Bananen" → 🍌, „Milch" → 🥛, „Käse" → 🧀) – über eine feste
  Stichwortliste, kein KI-Aufruf. Unbekannte Artikel bekommen ein
  Einkaufswagen-Symbol 🛒.
- **Rubriken sind frei wählbar und bleiben dauerhaft bestehen** – einfach einen
  Namen eintippen (z. B. „Obst & Gemüse", „Getränke") und einen Artikel dazu
  hinzufügen, oder über „+ Rubrik" eine leere Rubrik direkt anlegen. Einmal
  angelegte Rubriken bleiben auch sichtbar, wenn gerade kein Artikel drin ist
  (ähnlich wie bei Bring) – bereits verwendete Rubriken werden beim Tippen als
  Vorschlag angeboten. Über das ✕ neben einer Rubrik-Überschrift lässt sie
  sich entfernen (vorhandene Artikel wandern dann nach „Sonstiges", nichts
  geht verloren)
- jeder kann Punkte abhaken (☑), **bearbeiten (✏️, ändert Artikelname/Menge/
  Einheit nachträglich)**, wieder entfernen (✕), oder mit „Erledigte löschen"
  aufräumen – erledigte Punkte bleiben durchgestrichen sichtbar, bis sie
  gelöscht werden
- auf schmalen Bildschirmen (Handy) rutscht das Panel unter den Chat statt
  daneben

DOM kann jeden Kanal per 🛒/💬-Symbol neben dem Kanalnamen das Panel dazu-
oder wegschalten (auch nachträglich, nichts geht dabei verloren), und beim
Anlegen eines neuen Kanals gleich mit Panel anlegen.

## Umfragen im Chat

Über das 📊-Symbol in der Nachrichtenleiste (nur in normalen Chat-Kanälen,
nicht in Checklisten) lässt sich eine Umfrage mit 2–6 Optionen erstellen.
Jeder kann durch Klick auf eine Option abstimmen – die Balken aktualisieren
sich live für alle im Kanal, und unter jeder Option stehen die Namen derer,
die dafür gestimmt haben. Eine Stimme lässt sich jederzeit ändern (die
vorherige wird automatisch ersetzt, keine Doppelabstimmung möglich).

## Online-Verlauf (nur für DOM)

Im Admin-Panel (🛡) zeigt „Online-Verlauf" für jeden Namen die einzelnen
Sitzungen mit Ein- und Ausloggzeit, neueste zuerst:

- abgeschlossene Sitzung: z. B. „⚪ Tina · 14:32–15:10 · 38 Min."
- noch laufende Sitzung: z. B. „🟢 DOM · seit 16:02 · online"
- beim Draufhalten (Tooltip) steht das volle Datum dabei

Es werden die letzten 300 Ein-/Ausloggereignisse dauerhaft in
`data/presence-log.json` gespeichert (daraus werden die Sitzungen live
zusammengesetzt). Kurze Verbindungsaussetzer (z. B. kurzzeitig schlechtes
WLAN) erzeugen dabei eine kurze, eigene Sitzung, auch wenn die Person
gefühlt durchgehend in der App war.

## Wetter im Header

Rechts im Header (neben der Lupe) zeigt ein kleines Symbol das aktuelle
Wetter am Serverstandort (Standard: Freienohl-Koordinaten, über
`HAUSFUNK_WEATHER_LAT`/`HAUSFUNK_WEATHER_LON` in `ecosystem.config.js`
anpassbar). Ein Klick öffnet ein kleines Popover mit:

- Wetterlage in Worten + aktueller Temperatur
- Tages-Höchst-/Tiefstwert
- Vorhersage für die kommenden Stunden (alle 3 Stunden)

Die Daten kommen von [Open-Meteo](https://open-meteo.com/) (kostenlos, kein
API-Key nötig – dieselbe Quelle wie im Network-Dashboard), werden alle 30
Minuten serverseitig abgerufen und an alle verbundenen Geräte verteilt.
Schlägt der Abruf mal fehl (z. B. kein Internetzugang gerade), bleibt einfach
der letzte bekannte Stand stehen bzw. „…", bis der nächste Versuch klappt.

## Grenzen (bewusst einfach gehalten)

- Keine Zwei-Faktor-Authentifizierung.
- **Push-Benachrichtigungen unter iOS:** funktionieren nur, wenn Hausfunk
  vorher per „Zum Home-Bildschirm" installiert wurde (Safaris Einschränkung,
  nicht Hausfunks) – reines Browser-Tab-Nutzen auf dem iPhone reicht dafür
  nicht aus. Auf Android/Desktop reicht die normale Website.
- Direktnachrichten zwischen einzelnen Personen gibt es nicht, nur die
  gemeinsamen Kanäle.
- Passwörter sind gehasht (SHA-256, ungesalzen) – für den Familiengebrauch im
  eigenen Heimnetz ausreichend, aber kein Ersatz für ein Hochsicherheitssystem.

Weitere Ideen sind jederzeit möglich – einfach sagen, was als Nächstes
dazukommen soll.
