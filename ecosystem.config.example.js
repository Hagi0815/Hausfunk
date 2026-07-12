// Vorlage fuer pm2. Auf dem Server kopieren nach "ecosystem.config.js" und
// das Passwort anpassen. Diese Beispieldatei wird versioniert, die echte
// ecosystem.config.js NICHT (siehe .gitignore) -- damit landet das Passwort
// nie im Git-Repo.
//
// Einrichtung auf dem Server:
//   cp ecosystem.config.example.js ecosystem.config.js
//   nano ecosystem.config.js   (Passwort eintragen)
//   pm2 delete hausfunk        (falls schon per "pm2 start server.js" gestartet)
//   pm2 start ecosystem.config.js
//   pm2 save

module.exports = {
  apps: [
    {
      name: 'hausfunk',
      script: 'server.js',
      env: {
        HAUSFUNK_ADMIN_PASSWORD: 'bitte-hier-ein-sicheres-passwort-eintragen',
      },
    },
  ],
};
