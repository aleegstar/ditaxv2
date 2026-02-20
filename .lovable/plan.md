
# Problem: Tour blockiert Formular-Eingaben nach dem Schliessen

## Ursache (technisch präzise)

Das `TourOverlay` in `src/components/ui/tour-overlay.tsx` hat auf seinem Root-Element:

```tsx
className="fixed inset-0 z-[10000] pointer-events-auto"
```

Das führt zu zwei verknüpften Problemen:

### Problem 1: Exit-Animation blockiert Inputs (400ms)
Wenn der Nutzer die Tour abschliesst, setzt React `showTour = false`. `AnimatePresence` lässt das Overlay aber noch **400ms** mit der Exit-Animation (`opacity: 0 → 0`) im DOM — und weil `pointer-events-auto` gesetzt ist, blockiert das unsichtbare Overlay in dieser Zeit alle Klicks und Tastatureingaben im Formular.

### Problem 2: `pointer-events-auto` auf dem ganzen Container
Der äussere Container fängt alle Events ab — auch im Spotlight-Bereich. Das SVG hat `pointer-events-none`, aber weil der übergeordnete `div` `pointer-events-auto` hat, werden Events trotzdem vom Container abgefangen. Nur die Buttons im Tooltip-Bereich sind korrekt klickbar, weil sie explizit im DOM weiter oben sind.

### Problem 3: `AnimatePresence mode="wait"` in Kombination
Mit `mode="wait"` wartet `AnimatePresence` darauf, dass das exitierende Element seine Animation beendet, bevor das nächste Element gemountet wird. Das macht die 400ms Blockade noch länger und zuverlässiger reproduzierbar.

## Lösung: Drei gezielte Korrekturen

### Fix 1: `pointer-events-none` auf Exit (wichtigster Fix)
Während der Exit-Animation soll der Container keine Events mehr blockieren. Das lässt sich über den `animate`/`exit` prop lösen: Der Container bekommt `pointerEvents: 'auto'` nur wenn er sichtbar ist, und `pointerEvents: 'none'` sobald er schliesst.

```tsx
// VORHER
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-[10000] pointer-events-auto"
>

// NACHHER
<motion.div
  initial={{ opacity: 0, pointerEvents: 'none' }}
  animate={{ opacity: 1, pointerEvents: 'auto' }}
  exit={{ opacity: 0, pointerEvents: 'none' }}
  className="fixed inset-0 z-[10000]"
>
```

So werden Events sofort beim Starten der Exit-Animation (nicht erst nach 400ms) freigegeben.

### Fix 2: SVG-Overlay erhält ebenfalls explizit `pointer-events-none`
Das dunkle Overlay-Rechteck im SVG soll keine Events abfangen — nur die Buttons im Tooltip sollen klickbar sein. Das ist jetzt teilweise schon korrekt (SVG hat `pointer-events-none`), aber der Container-Div dahinter blockiert trotzdem. Mit Fix 1 wird das behoben.

Zusätzlich: Das nicht-SVG Overlay (wenn kein Target vorhanden) bekommt `pointer-events-none`:

```tsx
// VORHER
<div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />

// NACHHER
<div className="absolute inset-0 bg-black/60 backdrop-blur-[4px] pointer-events-none" />
```

### Fix 3: Exit-Dauer verkürzen
400ms Exit-Animation ist zu lang wenn Inputs dahinter blockiert werden. Auf 200ms reduzieren:

```tsx
// VORHER
transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}

// NACHHER
transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
```

## Geänderte Datei

### `src/components/ui/tour-overlay.tsx`
1. Root `motion.div`: `pointer-events-auto` Klasse entfernen, stattdessen `pointerEvents` in `initial`/`animate`/`exit` props setzen
2. Fallback-Overlay ohne Spotlight: `pointer-events-none` hinzufügen
3. Exit-Transition-Dauer: `0.4 → 0.2`

## Warum das Session-Problem behebt

```text
VORHER:
  Tour endet → showTour=false → AnimatePresence Exit startet
  → 400ms: fixed inset-0 pointer-events-auto blockiert ALLES
  → User tippt in Formular: kein Input registriert
  → Wirkt wie "Session-Problem" (ist aber UI-Blockade)

NACHHER:
  Tour endet → showTour=false → AnimatePresence Exit startet
  → 0ms: pointerEvents='none' sofort gesetzt
  → User tippt in Formular: funktioniert sofort
  → 200ms: Overlay verschwindet komplett
```

Das Problem ist kein Session-Problem — die Session ist korrekt. Es ist ein UI-Event-Blocking durch den Tour-Overlay während der Exit-Animation.
