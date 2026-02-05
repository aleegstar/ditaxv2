

# Premium AI-Research Shimmer-Effekt für Dokumentenvalidierung

## Zusammenfassung
Die Dokumentenvalidierung soll visuell wie ein moderner AI-Chatbot wirken, der "nachdenkt" und "recherchiert". Der aktuelle Shimmer-Effekt ist zu subtil. Er wird durch einen auffälligeren, mehrfarbigen Gradient-Shimmer ersetzt - genau wie in den Referenzbildern zu sehen.

---

## Was geändert wird

### 1. Neuer Premium Shimmer-Effekt (CSS)

Der aktuelle blaue Shimmer wird durch einen **Multi-Color-Gradient** ersetzt:
- Farben: Blau → Violett → Rosa → Blau (wie bei AI-Assistenten)
- Schnellere Animation (1.5s statt 2.5s)
- Stärkerer Kontrast zwischen den Farben
- Text erscheint "lebendig" und aktiv

```text
Vorher:  Blau → Hellblau → Blau (kaum sichtbar)
Nachher: Blau → Violett → Rosa → Orange → Blau (deutlich sichtbar)
```

### 2. Verbesserter Animationsflow

| Eigenschaft | Vorher | Nachher |
|-------------|--------|---------|
| Farbpalette | Mono-Blau | Multi-Color-Gradient |
| Animation-Dauer | 2.5s | 1.8s (schneller, dynamischer) |
| Gradient-Stops | 5 | 7-8 (flüssiger) |
| Background-Size | 200% | 300% (mehr "Laufweg") |

### 3. Visuelle Darstellung

```text
┌─────────────────────────────────────────┐
│                                         │
│              [Ditax Logo]               │
│                                         │
│     Ditax prüft Säule 3a Bescheinigung  │
│                                         │
│   ✨ Anbieter wird erkannt… ✨           │
│      ↑                                  │
│   Multi-Color-Gradient bewegt sich      │
│   durch den Text (Blau→Violett→Rosa)    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Technische Umsetzung

### Datei: `src/index.css`

Die bestehende `.shimmer-text` Klasse wird durch einen Premium-Gradient ersetzt:

```css
.shimmer-text {
  background: linear-gradient(
    90deg,
    #6B7280 0%,      /* Neutral grau (Basis) */
    #3B82F6 20%,     /* Blau */
    #8B5CF6 40%,     /* Violett */
    #EC4899 60%,     /* Pink */
    #3B82F6 80%,     /* Blau */
    #6B7280 100%     /* Neutral grau (Basis) */
  );
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer 1.8s infinite linear;
}
```

**Alternativ (subtilere Variante für Light Mode):**
```css
.shimmer-text {
  background: linear-gradient(
    90deg,
    hsl(var(--muted-foreground)) 0%,
    hsl(var(--primary)) 25%,
    hsl(280 70% 50%) 50%,  /* Violett */
    hsl(var(--primary)) 75%,
    hsl(var(--muted-foreground)) 100%
  );
  /* ... */
}
```

### Datei: `src/components/ui/ai-document-validation.tsx`

Die `RotatingStatusText`-Komponente wird leicht angepasst für bessere Lesbarkeit:
- Etwas größere Schrift (`text-sm` → `text-base` oder `text-[15px]`)
- Mehr vertikaler Abstand
- Optional: Emoji/Sparkle-Icon neben dem Text

---

## Optionale Erweiterungen

### A. Sparkle-Icon neben dem Text
Wie in den Referenzbildern könnte ein kleines animiertes Icon (✨) den Text begleiten:
```tsx
<span className="inline-flex items-center gap-1.5">
  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
  {messages[currentIndex]}
</span>
```

### B. Fallback für Dark Mode
Hellere Gradient-Farben für bessere Sichtbarkeit im Dark Mode.

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/index.css` | Neuer Premium-Shimmer-Gradient |
| `src/components/ui/ai-document-validation.tsx` | Leichte Anpassungen an Typografie |

---

## Accessibility

- `prefers-reduced-motion`: Animation wird deaktiviert, Text bleibt lesbar
- Fallback-Farbe für Browser ohne Gradient-Unterstützung
- Ausreichender Kontrast auch ohne Animation

