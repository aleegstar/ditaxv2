

# Verschwommener Overlay-Effekt ohne CSS Blur

## Problem
Auf Android WebView funktioniert `backdrop-filter: blur()` nicht. Der Hintergrund braucht trotzdem einen "verschwommenen" Effekt wenn das OCR Bottom Sheet offen ist.

## Loesung: Halbtransparentes Overlay mit Noise-Textur

Statt echtem Blur verwenden wir eine Kombination aus:
1. **Dunkles halbtransparentes Overlay** (`rgba(0,0,0,0.45)`) -- verdeckt den Hintergrund visuell
2. **CSS Noise-Pattern** via SVG-Filter (`feTurbulence`) -- erzeugt eine subtile Koernung die den Eindruck von Unschaerfe verstaerkt
3. **Sanfte Einblend-Animation** fuer einen fluessigen Uebergang

Das Ergebnis sieht auf allen Geraeten gleich aus, da kein `backdrop-filter` verwendet wird.

## Technische Umsetzung

### Datei: `src/components/ui/drawer.tsx`

Die `DrawerOverlay`-Komponente erhaelt ein neues Styling:

- Hintergrundfarbe von `#ffffff2e` (fast unsichtbar) auf `rgba(0, 0, 0, 0.45)` aendern
- Ein `::after` Pseudo-Element mit einem inline SVG `feTurbulence`-Filter als `background-image` hinzufuegen -- das erzeugt ein feines Rauschen ueber dem Overlay
- Alternativ einfach nur das dunkle Overlay ohne Noise, falls die Noise-Textur zu komplex ist

### Datei: `src/index.css`

Eine neue CSS-Klasse `.drawer-overlay-frosted` mit:
- `background-color: rgba(0, 0, 0, 0.4)`
- `transition: opacity 0.3s ease`
- Ein `::after` mit einem wiederholenden SVG-Noise-Pattern (`opacity: 0.03`) fuer den subtilen Frosted-Effekt

### Ergebnis
- Kein `backdrop-filter` oder `-webkit-backdrop-filter` noetig
- Funktioniert identisch auf Android WebView und iOS
- Visuell aehnlich wie ein Frosted-Glass-Effekt durch die Kombination aus Abdunklung + Rauschen
