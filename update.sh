#!/bin/bash

echo ""
echo "╔══════════════════════════════════════╗"
echo "║           Hausfunk Update             ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Pfad ggf. anpassen, falls das Repo woanders liegt
cd /opt/hausfunk || { echo "✗ Verzeichnis /opt/hausfunk nicht gefunden."; exit 1; }

echo "▶ Änderungen von GitHub holen..."
git pull origin main

echo ""
echo "▶ Abhängigkeiten aktualisieren..."
npm install --omit=dev

echo ""
echo "▶ Dienst neu starten..."
pm2 restart hausfunk
sleep 2

echo ""
if pm2 describe hausfunk 2>/dev/null | grep -q "online"; then
  echo "✓ Update erfolgreich – Hausfunk läuft!"
else
  echo "✗ Möglicherweise ein Problem – Logs prüfen:"
  echo "  pm2 logs hausfunk --lines 30"
fi
echo ""
