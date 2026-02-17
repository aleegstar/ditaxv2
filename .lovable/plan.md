

# Produkttouren vereinheitlichen und modernisieren

## Aktueller Zustand

Es gibt 3 separate Tour-Komponenten mit leicht unterschiedlichem Design:

| Eigenschaft | OnboardingTour | FormTour | DocumentsTour |
|-------------|---------------|----------|---------------|
| Tooltip-Radius | rounded-xl | rounded-2xl | rounded-2xl |
| Zurueck-Button | Ja (ab Step 2) | Nein | Nein |
| i18n | Ja | Nein (hardcoded DE) | Nein (hardcoded DE) |
| Spotlight-Padding | 10px | 8px | 12px |
| Spotlight-Radius | 12px | 24px | 16px |
| Overlay-Opacity | 0.75 | 0.75 | 0.75 |

## Neues Design-Konzept

Minimalistisch, modern, einheitlich -- passend zur Premium-Fintech-Aesthetik der App.

### Visuelle Aenderungen

- **Overlay**: Weichere Abdunklung (0.6 statt 0.75), leichter Backdrop-Blur (4px) fuer Glassmorphism-Effekt
- **Spotlight**: Einheitlich 16px Radius, 12px Padding, dezenterer Rahmen (1px statt 2px, weichere Glow-Farbe mit opacity 0.15 statt 0.3)
- **Tooltip-Karte**: rounded-2xl, subtilerer Schatten (shadow-xl statt shadow-2xl), 1px border-slate-100
- **Progress-Dots**: Pill-Form statt Kreise (aktiv: w-6 h-1.5, inaktiv: w-1.5 h-1.5) fuer modernen Look
- **Buttons**: Pill-Shape (rounded-xl), primaerer Button ohne Shadow-Glow, sekundaerer Button als Ghost (kein Border)
- **Typografie**: Titel text-base (statt text-lg), Description text-sm mit text-slate-400 (dezenter)
- **Arrows**: Entfernen -- modern wirkt es cleaner ohne Pfeilspitzen
- **Close-Button**: Kleiner (w-8 h-8), ohne Border, nur Icon mit hover-Effekt

### Technische Aenderungen

**Neue Datei: `src/components/ui/tour-overlay.tsx`**
Gemeinsame Basis-Komponente, die von allen 3 Touren genutzt wird:

```typescript
interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  spotlightPosition: SpotlightPosition;
  onNext: () => void;
  onBack?: () => void;
  onSkip: () => void;
  maskId: string; // Unique SVG mask ID per tour
}
```

Enthaelt:
- Overlay mit Backdrop-Blur
- SVG-Spotlight-Mask
- Spotlight-Border
- Progress-Indicator (Pill-Dots)
- Close-Button
- Tooltip mit Positionierung
- Buttons (Weiter/Zurueck/Ueberspringen)

**Angepasste Dateien:**

1. `src/components/OnboardingTour.tsx` -- Refactored: Nutzt `TourOverlay`, behaelt eigene Step-Logik, i18n und User-Name-Laden
2. `src/components/FormTour.tsx` -- Refactored: Nutzt `TourOverlay`, behaelt eigene Steps
3. `src/components/DocumentsTour.tsx` -- Refactored: Nutzt `TourOverlay`, behaelt eigene Steps

Jede Tour behaelt ihre eigene:
- Step-Definition (Texte, Target-Elemente)
- Spotlight-Update-Logik (Retry-Mechanismus)
- Spezial-Logik (z.B. OnboardingTour laedt User-Name, navigiert am Ende)

Die gemeinsame `TourOverlay`-Komponente uebernimmt:
- Rendering von Overlay, Spotlight, Tooltip, Buttons, Progress
- Tooltip-Positionierung
- Animationen

### Zurueck-Button

Alle 3 Touren erhalten einen "Zurueck"-Button ab Step 2 (wie aktuell nur bei OnboardingTour).

### i18n

FormTour und DocumentsTour werden vorerst mit hardcoded deutschen Texten belassen und nutzen die gleiche visuelle Komponente. Die i18n-Integration kann spaeter erfolgen.

## Zusammenfassung

| Aenderung | Dateien |
|-----------|---------|
| Neue shared Komponente | `src/components/ui/tour-overlay.tsx` |
| Refactor OnboardingTour | `src/components/OnboardingTour.tsx` |
| Refactor FormTour | `src/components/FormTour.tsx` |
| Refactor DocumentsTour | `src/components/DocumentsTour.tsx` |

