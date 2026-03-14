

## Plan: Globalen Hintergrund-Gradient setzen

### Was ist der Gradient?
Der aktuelle Hauptseiten-Hintergrund:
```
bg-gradient-to-br from-[hsl(225,60%,97%)] via-[hsl(240,20%,98%)] to-[hsl(270,30%,97%)]
```
Ein dezenter Blau-Lavendel-Verlauf.

### Ansatz
Den Gradient global über CSS auf `body` setzen, statt ihn auf jeder einzelnen Seite zu wiederholen.

### Änderungen

**1. `src/index.css`** – Im `body`-Styling den Gradient als Hintergrund setzen:
- `background-color: white` ersetzen durch `background: linear-gradient(to bottom right, hsl(225,60%,97%), hsl(240,20%,98%), hsl(270,30%,97%))`
- `min-height: 100vh` ist bereits gesetzt → Gradient füllt die ganze Seite

**2. `src/pages/UserTaxReturns.tsx`** – Den lokalen `bg-gradient-to-br from-[...] via-[...] to-[...]` vom Container entfernen (wird jetzt global geerbt).

**3. `src/App.tsx`** – `bg-background` vom Root-Container entfernen, damit der Body-Gradient durchscheint (oder durch `bg-transparent` ersetzen).

### Ergebnis
Jede Seite hat automatisch den sanften Blau-Lavendel-Gradient als Hintergrund – ohne dass einzelne Seiten es explizit setzen müssen.

