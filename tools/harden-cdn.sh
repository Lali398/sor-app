#!/usr/bin/env bash
#
# harden-cdn.sh — Subresource Integrity (SRI) hash-ek generálása a külső
# CDN-ről betöltött könyvtárakhoz.
#
# MIÉRT: az index.html néhány JS könyvtárat CDN-ről tölt. Ha a CDN-t feltörik,
# kártékony kódot szolgálhatnának ki a felhasználóid böngészőjébe. Az "integrity"
# hash-sel a böngésző ellenőrzi, hogy a letöltött fájl byte-pontosan az-e, amit vársz;
# eltérés esetén egyszerűen nem futtatja le.
#
# HASZNÁLAT (olyan gépen, ahol a CDN hostok elérhetők — pl. a saját géped):
#     bash tools/harden-cdn.sh
#
# A kimenetként kapott <script ...> sorokat másold be az index.html-be a régiek helyére.
# (A Google Identity Services – accounts.google.com/gsi/client – kimarad: ott az SRI
#  nem alkalmazható, mert a Google dinamikus, verziózatlan tartalmat szolgál ki.)

set -euo pipefail

# A rögzített verziójú CDN URL-ek. Szükség szerint igazítsd a verziószámokat.
URLS=(
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"
  "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
  "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"
)

command -v openssl >/dev/null || { echo "Hiba: az openssl szükséges."; exit 1; }
dl=""
if command -v curl >/dev/null; then dl="curl -fsSL"; elif command -v wget >/dev/null; then dl="wget -qO-"; else
  echo "Hiba: curl vagy wget szükséges."; exit 1
fi

echo "<!-- Generálva: tools/harden-cdn.sh ($(date +%F)) -->"
for url in "${URLS[@]}"; do
  hash=$($dl "$url" | openssl dgst -sha384 -binary | openssl base64 -A)
  echo "<script src=\"$url\" integrity=\"sha384-${hash}\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\"></script>"
done
