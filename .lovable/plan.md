

## Analyse

Die App hat derzeit mehrere dekorative Elemente, die von einer professionellen Steuer-Plattform ablenken. Im Vergleich zur eigenen Webseite (ditax.ch) -- die clean, weiss und vertrauenswuerdig ist -- wirkt die App in einigen Bereichen zu verspielt.

### Konkrete Problembereiche

1. **Auth-Seite (Desktop):** 4 bunte Gradient-Orbs (lila, pink, gruen, blau) im Hintergrund
2. **Shimmer-Text im Chat:** Regenbogen-Gradient (lila, pink, blau) fuer AI-Research-Texte
3. **Animated Background:** Radial-Gradient Overlay mit Secondary-Farbe
4. **Rainbow-Button Farben:** 5 bunte CSS-Variablen (rot, lila, blau, cyan, gruen)
5. **Diverse Glow/Shine-Effekte** in UI-Komponenten

### Was NICHT geaendert wird

- Das blaue Farbschema (Primaerfarbe) -- passt perfekt
- Die Schriftart Plus Jakarta Sans -- professionell
- Subtile Hover-Effekte und Micro-Interactions -- gehoeren zu guter UX
- Confetti bei Zahlungserfolg -- kurzer Moment, vertretbar
- Die grundlegende Kartenstruktur und Layouts

## Plan

### Schritt 1: Auth-Seite beruhigen

**Datei: `src/pages/Auth.tsx`**
- Die 4 bunten Gradient-Orbs (lila, pink, gruen, blau) entfernen
- Den bunten Hintergrund-Gradient (`linear-gradient(135deg, #e0e7ff ... #e0f2fe)`) ersetzen durch einen cleanen, hellen Hintergrund -- entweder reines Weiss oder ein sehr dezentes Grau (wie ditax.ch)
- Optional: Ein einzelner, subtiler blauer Akzent-Glow beibehalten fuer etwas Tiefe

### Schritt 2: Shimmer-Text professionalisieren

**Datei: `src/index.css`**
- Die `.shimmer-text` Klasse (Zeilen 342-358) von buntem Regenbogen-Gradient zu einem monochromen Blau-Grau-Gradient aendern
- Statt pink/lila/blau nur Abstufungen von Blau und Grau verwenden

### Schritt 3: Animated Background vereinfachen

**Datei: `src/components/ui/animated-background.tsx`**
- Den `radial-gradient` Overlay von `var(--secondary)` (= Blau) zu einem subtileren, fast unsichtbaren Akzent aendern
- Ziel: Kaum wahrnehmbar, aber gibt der Seite trotzdem etwas Tiefe

### Schritt 4: Rainbow-Farben neutralisieren

**Datei: `src/index.css`**
- Die 5 Rainbow CSS-Variablen (`--color-1` bis `--color-5`) von bunt (rot, lila, blau, cyan, gruen) auf monochrome Blau-Toene umstellen
- So behalten Rainbow-Buttons und Shine-Borders ihren Effekt, wirken aber professioneller

### Zusammenfassung der Aenderungen

| Bereich | Vorher | Nachher |
|---------|--------|---------|
| Auth-Hintergrund | 4 bunte Gradient-Orbs | Cleaner, heller Hintergrund |
| Shimmer-Text | Regenbogen (lila/pink/blau) | Monochrom (blau/grau) |
| Animated Background | Blauer Radial-Gradient | Dezenter, fast neutraler Gradient |
| Rainbow-Variablen | 5 bunte Farben | Monochrome Blau-Toene |

### Technische Details

- 4 Dateien werden geaendert
- Reine CSS/Style-Aenderungen, keine Logik-Aenderungen
- Kein Risiko fuer funktionale Regression
- Ergebnis: Visuell naeher an ditax.ch -- professionell, vertrauenswuerdig, clean

