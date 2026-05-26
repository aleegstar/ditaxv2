# Plan: Chat-Input auf Mobile/WebView robust neu aufbauen

## Ziel
Das Chat-Input auf `/chat` soll auf iPhone, Android und WebView zuverlässig sichtbar bleiben, sobald die Tastatur aufgeht. Wenn der bestehende Composer dafür zu fragil ist, ersetze ich ihn durch ein neues, isoliertes Input-Feld.

## Umsetzung
1. **Composer neu kapseln**
   - Das aktuelle Input-Feld aus `src/pages/Chat.tsx` in eine eigene Composer-Komponente auslagern.
   - Diese neue Komponente bekommt eine klare, eigenständige Positionierungslogik statt von der gesamten Page-Struktur abzuhängen.

2. **Viewport-basierte Positionierung korrigieren**
   - Die Composer-Position direkt an `visualViewport` koppeln, inklusive `offsetTop`, sichtbarer Höhe und Safe-Area.
   - Nicht nur `bottomInset` verwenden, sondern die sichtbare Unterkante des echten Viewports als Quelle für die Platzierung.

3. **Scrollbereich sauber daran anpassen**
   - Die Nachrichtenliste bekommt dynamisches Bottom-Spacing basierend auf der echten Composer-Höhe plus Keyboard-Abstand.
   - Dadurch bleibt die letzte Nachricht immer sichtbar und wird nicht vom Input oder der Tastatur verdeckt.

4. **Fallback für problematische WebViews**
   - Falls `visualViewport` unzuverlässig meldet, nutze ich einen defensiven Fallback über Fokusstatus + Fensterhöhe.
   - Ziel ist: lieber minimal höher positioniert als unter der Tastatur versteckt.

5. **Validierung der kritischen Fälle**
   - Prüfen: Fokus auf Textarea, Öffnen/Schließen der Tastatur, mehrzeilige Eingabe, Anhänge, Escalation-Banner, Scroll-to-bottom.
   - Speziell sicherstellen, dass die neue Lösung nicht `/auth` oder andere mobile Layouts beeinflusst.

## Betroffene Dateien
- `src/pages/Chat.tsx`
- `src/hooks/useKeyboardDetection.ts`
- ggf. neue Komponente unter `src/components/chat/...`

## Technische Details
- Ich ersetze keinen Chat-Flow und keine Business-Logik, nur die Darstellung und Verankerung des Eingabefelds.
- Wenn nötig, setze ich den Composer als eigenständiges `fixed`/portalartiges Bottom-Layer mit gemessener Höhe um, statt das bestehende Inline-Konstrukt weiter zu flicken.
- Styling bleibt im Ditax-Designsystem; keine funktionalen Nebenänderungen.

## Ergebnis
Ein neues bzw. neu aufgebautes Chat-Input, das auch dann oberhalb der Tastatur bleibt, wenn die bisherige Footer-Logik im WebView versagt.