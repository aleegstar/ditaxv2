## Änderungen auf der Unterlagen-Seite

**1. Globe-Bild auf jeder offenen Dokumenten-Karte entfernen**
- Datei: `src/components/DocumentChecklist.tsx`, Zeile 499
- Das `<img src={uploadEmptyImg} … />` (die kleine Erdkugel-Illustration) wird gelöscht. Karte rückt enger zusammen, Titel + Status-Badge stehen oben.
- Der Import `uploadEmptyImg` wird ebenfalls entfernt, da nicht mehr verwendet.

**2. Hintergrund der Unterlagen-Seite auf reines Weiss**
- Datei: `src/pages/Documents.tsx`, Zeile 350
- Aktuell: `bg-transparent` (zeigt den globalen warm-off-white Fintech-Hintergrund durch).
- Neu: `bg-white`, damit die Seite einen sauberen weissen Untergrund hat (wie im Screenshot gewünscht).
- Header bleibt unverändert (bereits `bg-white/90`).

Keine weiteren Änderungen an Karten-Padding, Buttons oder dem oberen „Alle Unterlagen auf einmal hochladen"-Block.