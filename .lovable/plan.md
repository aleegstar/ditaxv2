

## Analyse

Die bisherigen Fixes (`touch-action: manipulation`, Handler-Reihenfolge) haben das Problem nicht gelöst. Die Ursache ist tiefer: **Vaul's Spring-Animation** verschiebt den gesamten Drawer-Inhalt während des Öffnens. Auf iOS werden Touch-Koordinaten zum Zeitpunkt des Taps ausgewertet, aber der Inhalt hat sich durch die Animation verschoben — deshalb wird das falsche Jahr getroffen.

`touch-action: manipulation` verhindert nur den 300ms-Delay, löst aber nicht das Layout-Shift-Problem der Spring-Animation.

## Lösung

Den Vaul-Drawer in `AddTaxYearDropdown` durch ein **eigenes Bottom Sheet mit CSS-Transition** ersetzen (kein Spring-Bouncing). Das ist derselbe Ansatz, der laut Memory für Android-WebViews bereits bewährt ist: keine framer-motion/AnimatePresence, stattdessen einfache CSS-Transitions.

### Konkret

**Datei: `src/components/ui/add-tax-year-dropdown.tsx`**

- Vaul `Drawer`/`DrawerContent`/`DrawerTrigger` komplett entfernen
- Eigenes Bottom Sheet bauen mit:
  - `position: fixed` + `inset-x-0 bottom-0`
  - CSS `transition: transform 300ms ease-out` (kein Spring)
  - State `isOpen` → `translate-y-0` (offen) vs `translate-y-full` (geschlossen)
  - Frosted-glass Backdrop mit `onClick` zum Schließen
- Alle Year-Buttons behalten `touch-action: manipulation`
- Handler bleibt: `onYearSelect(year)` sofort, dann `setIsOpen(false)` nach 150ms
- Trigger-Button bleibt optisch identisch (beide Varianten)

### Warum das funktioniert

- Kein Spring-Bounce = Inhalt ist sofort an finaler Position
- Touch-Targets stimmen exakt mit der visuellen Position überein
- Bewährtes Muster im Projekt (siehe DocumentUploadSheet, Repeater-Pattern)

### Technische Details

```text
Vorher (Vaul):
  Drawer öffnet → Spring-Animation → Content bounct hoch/runter
  → Touch registriert auf falschem Element

Nachher (CSS):
  Sheet öffnet → translateY(0) in 300ms ease-out → kein Bouncing
  → Touch registriert korrekt
```

Dateien:
- `src/components/ui/add-tax-year-dropdown.tsx` — Vaul durch eigenes CSS-Bottom-Sheet ersetzen

