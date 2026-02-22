

## Problem

Nach dem Import der Kontaktdaten ("Nein, keine Änderungen") navigiert die App zum Dashboard zurueck. Dabei bleibt das unsichtbare Drawer-Overlay (frosted glass Hintergrund) im DOM haengen und blockiert saemtliche Touch-Events. Die App wirkt "eingefroren".

## Ursache

1. Der `ImportWizard` hat zwei Drawer-Komponenten, die ueber Portale gerendert werden (`z-50` Overlay ueber dem gesamten Bildschirm)
2. Bei `handleNoChanges` wird `navigate()` aufgerufen, waehrend die Drawers noch offen sind
3. Die Komponente wird durch `showImportWizard(false)` unmounted, aber auf Android-WebViews wird das Vaul-Drawer-Portal/Overlay nicht zuverlaessig aufgeraeumt
4. Zusaetzlich wird `motion` aus framer-motion importiert (bekanntes Problem auf Android)

## Loesung

### 1. Drawers vor Navigation schliessen

In `handleNoChanges` und `handleWithChanges` werden die Drawers erst geschlossen, bevor navigiert wird. Ein kurzes Timeout gibt dem DOM Zeit, das Overlay zu entfernen.

### 2. Framer-motion Import entfernen

Der `motion`-Import wird nicht verwendet und wird entfernt, um potenzielle Touch-Blockaden auf Android zu vermeiden.

### 3. Sicherheits-Cleanup bei Unmount

Ein `useEffect`-Cleanup wird hinzugefuegt, der beim Unmount sicherstellt, dass keine Drawer-Overlays im DOM zurueckbleiben.

## Technische Details

Aenderungen in `src/components/forms/ImportWizard.tsx`:

- Ungenutzten `motion`-Import von framer-motion entfernen
- Neuen State `drawerOpen` einfuehren, um den Drawer kontrolliert zu schliessen
- In `handleNoChanges`: Erst `drawerOpen = false` setzen, dann mit `setTimeout` (~300ms fuer Animation) navigieren
- In `handleWithChanges`: Gleiche Strategie
- `useEffect` Cleanup: Beim Unmount alle `[data-vaul-overlay]` Elemente im DOM entfernen als Fallback
- `handleSkipImport`: Drawer ebenfalls erst schliessen, dann `onComplete()` aufrufen

