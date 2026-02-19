

## Button-Standardisierung: Auth-Style als globaler Standard

### Ziel
Der blaue "Liquid Glass"-Button von `/auth` wird zum einheitlichen Primary-Button in der gesamten App. Helle/sekundäre Buttons erhalten das gleiche Design in Weiss.

### Der Auth-Button-Style (Referenz)
```text
+------------------------------------------+
|  Blauer Glasgradient, rounded-2xl, py-4  |
|  tracking-widest, uppercase, weisse Font  |
|  Shadow: blue glow, inset highlight       |
|  Hover: -translate-y-0.5                  |
|  Active: scale-[0.98]                     |
+------------------------------------------+
```

### Schritt 1: Button-Komponente aktualisieren (`src/components/ui/button.tsx`)

Die `default`-Variante des `Button`-Komponents bekommt den Auth-Style:

- **`default` (Primary)**: Blauer Glasgradient mit `linear-gradient(180deg, rgba(59,130,246,0.9), rgba(37,99,235,0.85))`, weisser Text, `rounded-2xl`, `py-4`, `tracking-widest uppercase`, blauer Glow-Shadow, `hover:-translate-y-0.5`, `active:scale-[0.98]`
- **`outline` / `secondary` (Helle Buttons)**: Gleiche Form (`rounded-2xl`, `py-4`), aber mit weissem/transparentem Glasgradient (`rgba(255,255,255,0.45)`), `border-white/40`, `backdrop-blur(20px)`, `text-slate-700`, gleiche hover/active Effekte
- Bestehende `destructive`, `ghost`, `link` Varianten bleiben erhalten
- `login` und `dark` Varianten werden entfernt (durch `default` und `outline` ersetzt)
- Standard-`size` auf die neue Grösse angepasst

### Schritt 2: Veraltete Button-Komponenten bereinigen

Folgende Dateien werden nicht mehr benötigt und entfernt:
- `src/components/ui/new-button.tsx` (wird nirgends aktiv genutzt)
- `src/components/ui/framer-button-dark.tsx` (wird nirgends importiert)  
- `src/components/ui/framer-button-v4.tsx` (wird nirgends importiert)

`src/components/ui/framer-button.tsx` bleibt vorerst, da es in 4 Dateien importiert wird, wird aber auf den neuen Standard umgestellt.

### Schritt 3: Inline-Buttons auf die Komponente umstellen

Alle Stellen mit inline-gestylten Buttons im Auth-Style (ca. 28 Vorkommen mit `bg-gradient-to-b from-[hsl(217...`) werden auf `<Button>` umgestellt:

- `DocumentChecklist.tsx` - "Jetzt einreichen" Button
- `DocumentUploadSheet.tsx` - Bestätigungs/Upload Buttons
- `DocumentCheckScreen.tsx` - Primary Actions
- `ImportWizard.tsx` - "Keine Änderungen" Button
- `Auth.tsx` - Login-Code senden, Weiter-Button (bleiben vorerst inline wegen des speziellen `style`-Attributs mit backdrop-filter)

### Schritt 4: FramerButton-Nutzungen migrieren

Die 4 Dateien, die `FramerButton` importieren, werden auf `<Button>` umgestellt:
- `tax-year-card.tsx`
- `FormNavigation.tsx`
- `ContactForm.tsx`
- `Auth.tsx` (FramerButton import entfernen, wird dort nicht direkt als Button genutzt)

### Schritt 5: Variant-Migrationen

- `variant="login"` (2 Stellen: `EdgeFunctionTester.tsx`, `FormSummary.tsx`) wird zu `variant="default"`
- `variant="dark"` Nutzungen werden zu `variant="outline"` oder `variant="default"`

### Betroffene Dateien (Zusammenfassung)

| Datei | Aktion |
|-------|--------|
| `button.tsx` | Varianten neu definieren |
| `new-button.tsx` | Löschen |
| `framer-button-dark.tsx` | Löschen |
| `framer-button-v4.tsx` | Löschen |
| `framer-button.tsx` | Anpassen oder entfernen |
| `DocumentChecklist.tsx` | Inline-Buttons migrieren |
| `DocumentUploadSheet.tsx` | Inline-Buttons migrieren |
| `DocumentCheckScreen.tsx` | Inline-Buttons migrieren |
| `ImportWizard.tsx` | Bereits teilweise migriert |
| `FormNavigation.tsx` | FramerButton ersetzen |
| `tax-year-card.tsx` | FramerButton ersetzen |
| `ContactForm.tsx` | FramerButton ersetzen |
| `EdgeFunctionTester.tsx` | `variant="login"` entfernen |
| `FormSummary.tsx` | `variant="login"` entfernen |

