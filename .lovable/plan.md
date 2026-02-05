
# Plan: Schnellerer Tour-Start mit weicherem Übergang

## Übersicht
Die Onboarding-Tour wird optimiert, um schneller zu starten und fliessendere Übergänge zu haben. Die Änderungen betreffen sowohl den Context (Timing) als auch die UI-Komponente (Animationen).

## Änderungen

### 1. Schnellerer Start (OnboardingTourContext.tsx)

**Aktuelle Verzögerungen:**
- 2000ms initiale Wartezeit vor dem Check
- 500ms pro Element-Such-Versuch (bis zu 30 Versuche = 15 Sekunden worst case)

**Neue Werte:**
- Initiale Wartezeit: **800ms** (von 2000ms)
- Element-Such-Intervall: **200ms** (von 500ms)
- Maximale Versuche: **15** (von 30) = max. 3 Sekunden statt 15 Sekunden

### 2. Weichere Animationen (OnboardingTour.tsx)

**Overlay-Einblendung:**
- Aktuelle Duration: 600ms
- Neue Duration: **400ms** mit sanfterem Ease

**Spotlight-Bewegung:**
- Aktuelle Duration: 700ms
- Neue Duration: **500ms** mit verbessertem Easing `[0.25, 0.1, 0.25, 1]`

**Tooltip-Animation:**
- Spring-Parameter optimieren: `damping: 28`, `stiffness: 200`
- Schnellere, aber weichere Bewegung

**Content-Übergänge:**
- Aktuelle Duration für Text-Wechsel: 200ms
- Neue Duration: **250ms** mit weicherem Ease für natürlicheren Flow

### 3. Initiale Element-Suche optimieren

- Spotlight-Update-Delay von **100ms auf 50ms** reduzieren
- Element-Retry-Interval von **150ms auf 100ms** reduzieren

## Visuelle Verbesserungen

```text
Vorher:                          Nachher:
┌─────────────────────┐         ┌─────────────────────┐
│ Start: ~2-3 Sek.    │         │ Start: ~0.8-1 Sek.  │
│ Spotlight: träge    │   →     │ Spotlight: fliessend│
│ Tooltip: abgehackt  │         │ Tooltip: butterweich│
└─────────────────────┘         └─────────────────────┘
```

## Technische Details

### OnboardingTourContext.tsx
- Zeile 70: `maxAttempts = isManualStart ? 4 : 15` (von 30)
- Zeile 130: `setTimeout(..., 200)` (von 500)
- Zeile 229: `setTimeout(checkTourConditions, 800)` (von 2000)

### OnboardingTour.tsx
- Zeile 216-219: Delay von 100ms auf 50ms
- Zeile 198: Element-Retry von 150ms auf 100ms
- Zeile 436: Overlay fade von 600ms auf 400ms
- Zeilen 453-456, 475-478: Spotlight von 700ms auf 500ms
- Zeilen 514-518: Spring `damping: 28`, `stiffness: 200`
- Zeile 525: Layout-Transition von 400ms auf 300ms
- Zeilen 551-554: Content-Wechsel auf 250ms mit `ease: [0.4, 0, 0.2, 1]`

## Erwartetes Ergebnis
- **~60% schnellerer Tour-Start** (von ~2-3 Sek. auf ~0.8-1 Sek.)
- **Fliessendere Spotlight-Bewegung** zwischen Steps
- **Weichere Tooltip-Animationen** ohne abrupte Stops
- **Natürlicherer Content-Übergang** beim Step-Wechsel
