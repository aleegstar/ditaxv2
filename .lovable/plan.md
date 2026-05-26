## Problem

Im Chrome-Browser wird `window.visualViewport` zuverlässig kleiner, sobald die Tastatur aufgeht — der Chat-Input (positioniert via `viewportBottom`) bleibt sauber über dem Keyboard. In der Despia-WebView (besonders iOS, teils Android) verändert die native Schicht aber den WebView-Frame selbst (iOS `contentInsetAdjustmentBehavior=.automatic`, Android `SOFT_INPUT_ADJUST_RESIZE`). Dadurch:

- `visualViewport.height` und `window.innerHeight` melden keinen oder einen inkonsistenten Inset.
- Die native Schicht scrollt zusätzlich, sodass unser fixed-positionierter Composer hinter der Tastatur verschwindet bzw. die berechnete `viewportBottom` falsch ist.

Despia-Doku empfiehlt für Apps, die Keyboard-Avoidance in JS selbst regeln, explizit `preventdefault://autoscroll?enabled=false` zu setzen. Dann verhält sich `visualViewport` in beiden Plattformen konsistent (wie im Browser) und unser bestehender Hook kann sauber rechnen.

## Lösung

### 1. Despia-Autoscroll global einmalig deaktivieren

Neue Datei `src/lib/despiaKeyboard.ts`:
- Funktion `initDespiaKeyboardHandling()` die per `isDespiaNative()` prüft und dann genau einmal `despia('preventdefault://autoscroll?enabled=false')` sendet.
- Idempotent (Modul-Level Flag).

Aufruf in `src/main.tsx` direkt nach dem Mount (oder in `src/App.tsx` in einem Top-Level `useEffect`), sodass die native Schicht ab dem ersten Render nicht mehr eigenmächtig scrollt.

### 2. `useKeyboardDetection` für Despia-WebView härten

In `src/hooks/useKeyboardDetection.ts`:
- Despia-Flag importieren (`isDespiaNative`, `isDespiaIOS`).
- Wenn `isDespiaNative()` true ist UND Autoscroll deaktiviert wurde, ist `visualViewport.height` autoritativ → keine `baselineInnerHeightRef`-Fallback-Logik, weil sie in Despia falsche Werte liefern kann (innerHeight bleibt konstant).
- `bottomInset` exklusiv aus `window.innerHeight - (visualViewport.offsetTop + visualViewport.height)` ableiten.
- Zusätzlich auf `visualViewport.scroll`/`resize` weiterhin lauschen, plus ein `setTimeout(compute, 250)` nach `focusin`, da iOS-WebView den Inset verzögert meldet.
- Threshold für `isKeyboardOpen` auf 80 px senken (native Bottom-Safe-Areas können bis ~50 px gehen).

### 3. `ChatComposer` Positionierung absichern

In `src/components/chat/ChatComposer.tsx`:
- `composerTop` Berechnung beibehalten (`viewportBottom - resolvedHeight`), aber bei `isDespiaNative()` zusätzlich `Math.min(composerTop, window.innerHeight - resolvedHeight - effectiveBottomInset)` als Clamp, damit der Composer nie unter den sichtbaren Bereich rutscht, selbst wenn `visualViewport` kurz inkonsistente Werte meldet.
- Sicherstellen, dass der portalisierte Container weiterhin `position: fixed; top: 0` plus `transform: translate3d(...)` nutzt (kein Wechsel zu `bottom`, das in Despia mit deaktiviertem Autoscroll problematisch wird).

### 4. Verifikation

- Chrome Mobile-Viewport (390×844): Tastatur-Verhalten unverändert.
- Despia iOS + Android: Nach Deploy testen, dass der Composer beim Fokussieren des Textareas direkt über der Tastatur erscheint und beim Blur wieder ans Safe-Area-Bottom rastet.
- Kein „White-Gap" mehr unter der Tastatur (typischer Indikator, dass Autoscroll korrekt deaktiviert wurde).

## Geänderte / neue Dateien

```text
NEU   src/lib/despiaKeyboard.ts
EDIT  src/main.tsx                          (Init-Aufruf)
EDIT  src/hooks/useKeyboardDetection.ts     (Despia-Pfad)
EDIT  src/components/chat/ChatComposer.tsx  (Clamp + Doku-Kommentar)
```

## Nicht enthalten

- Keine Änderung am visuellen Design des Composers (das wurde gerade neu gestaltet).
- Keine Anpassung anderer Inputs (Auth, Forms) — `preventdefault://autoscroll=false` gilt aber global. Falls dort später Probleme auftreten, kann selektiv per `enabled=true` reaktiviert werden.
