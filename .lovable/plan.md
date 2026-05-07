## Problem

Die 5 Section-Bilder sind je ~1.1 MB große PNGs (insgesamt ~5.5 MB), werden aber nur als ~80×80 px Icons angezeigt. Das verursacht die Ladeverzögerung.

## Lösung

Bilder auf passende Größe verkleinern und in das moderne WebP-Format konvertieren. Erwartete Reduktion: von ~1.1 MB → ~5–15 KB pro Bild (über 99 % kleiner).

## Schritte

1. **Bilder optimieren** mit `sharp` / `imagemagick`:
   - Auf 320×320 px verkleinern (4× Display-Größe für Retina/HiDPI)
   - In WebP konvertieren mit Qualität ~85
   - Dateien: `section-contact`, `section-income`, `section-deductions`, `section-assets`, `document-check`

2. **Imports aktualisieren** in:
   - `src/pages/PersonalInfo.tsx` (4 Section-Bilder)
   - `src/components/ui/ai-document-validation.tsx` (`document-check`)
   
   `.png` → `.webp`

3. **Lazy Loading** auf den `<img>` Tags hinzufügen:
   - `loading="lazy"` und `decoding="async"`
   - `width`/`height` Attribute setzen für CLS-Vermeidung

4. **Alte PNGs löschen** nach erfolgreicher Konvertierung.

## Ergebnis

- Gesamtgröße: ~5.5 MB → ~50 KB
- Bilder erscheinen praktisch sofort
- Keine visuellen Änderungen
