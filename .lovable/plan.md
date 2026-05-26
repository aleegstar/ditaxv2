## Ziel
Der Composer auf `/chat` soll auf Mobile/WebView zuverlässig direkt oberhalb der geöffneten Tastatur bleiben und beim Schließen sauber an seine normale Position zurückkehren.

## Umsetzungsplan
1. `useKeyboardDetection` robuster machen
   - Keyboard-Offset konsequent aus `visualViewport.height` und `visualViewport.offsetTop` ableiten.
   - Einen stabilen `bottomInset`/`safe offset` für feste Bottom-Elemente bereitstellen statt nur `isKeyboardOpen` + `keyboardHeight`.
   - Glättung gegen kurze Resize-/Focus-Sprünge in WebViews beibehalten.

2. `/chat` auf viewport-basierte Positionierung umstellen
   - Den festen Composer nicht mehr nur mit `bottom: keyboardHeight + 8px` platzieren.
   - Stattdessen die Bottom-Position am echten sichtbaren Viewport ausrichten, damit der Input über der Tastatur sitzt.
   - Das Padding der Message-Liste daran koppeln, damit die letzten Nachrichten nicht hinter Composer/Tastatur verschwinden.

3. Mobile/WebView-Sonderfälle absichern
   - Safe-Area und Tastatur-Offset korrekt kombinieren, damit iOS/Android/Despia keine doppelte oder fehlende Bottom-Lücke bekommen.
   - Fokus-/Blur-Übergänge prüfen, damit der Composer nicht springt oder hängen bleibt.

4. Validierung
   - `/chat` mit geöffneter Tastatur im mobilen Viewport prüfen.
   - Sicherstellen, dass Input sichtbar bleibt, Messages scrollbar sind und sich der Zustand nach Keyboard-Close sauber zurücksetzt.

## Technische Details
- Betroffene Dateien voraussichtlich:
  - `src/hooks/useKeyboardDetection.ts`
  - `src/pages/Chat.tsx`
- Kein Scope-Creep: nur die Chat-/Keyboard-Positionierung, keine Design- oder Funktionsänderungen.