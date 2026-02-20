
# Ursache: TourOverlay blockiert Formular nach Klick auf "Kontaktangaben"

## Präzise Diagnose

Wenn die Tour auf dem `/form`-Dashboard aktiv ist und der User auf "Kontaktangaben" klickt:

1. Der User klickt auf die "Kontaktangaben"-Karte im Dashboard
2. React-Router navigiert zu `/form?section=kontakt`
3. `isOnFormDashboard` wird `false` → `useEffect` ruft `setShowTour(false)` auf
4. `showTour` ändert sich → `{showTour && <FormTour />}` wird `false`
5. `AnimatePresence` startet die **Exit-Animation** (200ms)
6. **Während dieser 200ms** liegt der `TourOverlay` noch mit `pointerEvents: 'auto'` über dem gesamten Screen — inklusive dem gerade gerenderten Formular
7. Der User sieht das Formular, tippt Daten ein, klickt "Weiter" — **die Klicks landen aber im Overlay, nicht im Formular**

**Warum geht es nach Seiten-Reload?**
Nach einem Reload wird die Tour nicht gezeigt (`tourCompleted = true` im Supabase-Metadata) → kein Overlay → Weiter-Knopf funktioniert sofort.

**Warum geht es nach "Zurück zum Dashboard → erneut auf Steuerjahr"?**
Selber Grund: `tourCompleted` wurde beim ersten Durchlauf auf `true` gesetzt → Tour erscheint nicht mehr.

## Das strukturelle Problem

```
Tour aktiv auf /form
  → User klickt "Kontaktangaben"  
  → Navigation zu /form?section=kontakt
  → showTour = false (durch useEffect)
  → FormTour beginnt Exit-Animation (200ms, pointerEvents NOCH 'auto')
  → Formular wird gerendert (darunter)
  → User klickt "Weiter" → trifft den Overlay ← BUG
```

`pointerEvents: 'none'` wird erst beim **Start** der Exit-Animation gesetzt (per Framer Motion `exit` prop). Das Problem ist der **render-Zyklus-Versatz**: `showTour = false` → React rendert → `AnimatePresence` erkennt das Exit → Framer Motion beginnt Animation mit `exit`-Wert — aber das geschieht nicht synchron im gleichen Frame. Es gibt 1-2 Frames Verzögerung wo `pointerEvents: 'auto'` noch gilt.

Zusätzlich: `FormTour.tsx` setzt `document.body.setAttribute('data-form-tour-open', 'true')` im mount-Effekt. Der cleanup (removeAttribute) läuft ebenfalls asynchron nach dem Unmount — also nach der 200ms Animation.

## Lösung: 2 gezielte Fixes

### Fix 1 (Haupt-Fix): Tour sofort beenden wenn User aktiv navigiert

Statt `showTour(false)` passiv über `useEffect` zu setzen, soll die Tour **aktiv beendet** werden, bevor der User zu einem Section-Formular navigiert.

In `src/pages/Index.tsx` in der `renderContent()`-Funktion: Wenn `section` gesetzt ist (User ist im Formular), soll die Tour sofort per `completeTour()` beendet werden — oder noch besser: Der `TaxYearDashboard` soll beim Klick auf eine Sektion zuerst `skipTour()` aufrufen, dann navigieren.

**Konkret**: In `FormTourContext.tsx` soll ein `useEffect` hinzugefügt werden, der bei Navigation weg vom Dashboard (`isOnFormDashboard === false`) `showTour` synchron auf `false` setzt UND zusätzlich `tourCompleted = true` speichert (via `skipTour()`). Damit wird die Tour sauber abgeschlossen und nicht nur ausgeblendet.

Aber das reicht nicht — wegen dem Framer-Motion-Versatz. Deshalb Fix 2:

### Fix 2 (Kern-Fix): `pointer-events: none` sofort auf Exit setzen — ohne Animation-Versatz

Das Problem ist, dass `pointerEvents: 'none'` im `exit`-Prop von Framer Motion **verzögert** angewendet wird (erst wenn React den Exit-State committed hat). 

Die sauberste Lösung: **Wenn `showTour` false wird, soll der Container sofort im selben Render-Zyklus `pointer-events: none` bekommen** — durch ein zustandsgesteuertes CSS-Attribut statt durch Framer-Motion-Animation-Props.

In `TourOverlay.tsx`:
```tsx
// NEU: Wrapper mit sofortigem pointer-events: none wenn nicht sichtbar
<div style={{ pointerEvents: isVisible ? 'auto' : 'none' }}>
  <AnimatePresence>
    ...
  </AnimatePresence>
</div>
```

Dabei muss `isVisible` direkt aus dem `showTour`-State kommen (via Prop), nicht aus dem Framer-Motion-Animationszustand.

**Aber**: `TourOverlay` kennt `showTour` nicht. Besser ist es, das Problem in `Index.tsx` bzw. `FormTour.tsx` zu lösen.

### Gewählte Lösung: Sofortiges Deaktivieren via CSS-Wrapper

**`src/pages/Index.tsx`** — Der `<FormTour>`-Wrapper bekommt einen `div` mit `pointer-events: none` sobald `showTour` false ist, aber `AnimatePresence` noch rendert:

```tsx
{/* Form Tour — wrapper ensures immediate pointer-events removal */}
<div style={{ pointerEvents: showTour ? 'auto' : 'none' }}>
  <AnimatePresence>
    {showTour && <FormTour onComplete={completeTour} onSkip={skipTour} />}
  </AnimatePresence>
</div>
```

Das ist einfach und präzise: Sobald `showTour = false`, blockiert der Wrapper-`div` keine Events mehr — der innere animierte Div kann trotzdem noch seine Exit-Animation abspielen (sieht schön aus), aber Events gehen sofort durch.

**`src/contexts/FormTourContext.tsx`** — Bei Navigation weg vom Dashboard soll `completeTour()` statt nur `setShowTour(false)` aufgerufen werden. Das verhindert auch, dass die Tour beim nächsten Besuch des Dashboards wieder erscheint (da `tourCompleted: true` gespeichert wird):

```tsx
// Wenn User weg navigiert während Tour aktiv, Tour als abgeschlossen markieren
useEffect(() => {
  if (!isOnFormDashboard && showTour) {
    completeTour(); // Speichert in Supabase + setzt showTour=false
  }
}, [isOnFormDashboard]);
```

Aber Achtung: Das würde die Tour vorzeitig abschliessen wenn der User versehentlich weg navigiert. Besser: Nur `setShowTour(false)` (ohne in Supabase zu speichern) — der User kann die Tour beim nächsten Besuch des Dashboards nochmal sehen.

### Finale Entscheidung: Minimal-invasiver Fix

**Nur `src/pages/Index.tsx` ändern** — ein Wrapper-`div` mit sofortigem `pointer-events: none` wenn Tour nicht aktiv:

```tsx
{/* Wrapper ensures pointer-events are cleared immediately when tour hides */}
<div style={{ pointerEvents: showTour ? 'auto' : 'none' }}>
  {showTour && <FormTour onComplete={completeTour} onSkip={skipTour} />}
</div>
```

Für `AnimatePresence` (um die Exit-Animation zu behalten) muss `FormTour` intern das handhaben. Da das aber `AnimatePresence` ist, brauchen wir es aussen:

```tsx
<div style={{ pointerEvents: showTour ? 'auto' : 'none' }}>
  <AnimatePresence>
    {showTour && <FormTour key="form-tour" onComplete={completeTour} onSkip={skipTour} />}
  </AnimatePresence>
</div>
```

## Geänderte Dateien

### 1. `src/pages/Index.tsx`
- `FormTour` in einen `<div style={{ pointerEvents: showTour ? 'auto' : 'none' }}>` + `<AnimatePresence>` wrappen
- Damit werden Events sofort freigegeben wenn `showTour = false` — unabhängig von Framer Motion's Animation-Timing

### 2. `src/components/FormTour.tsx`
- `FormTour` muss als `motion.div`-Root gerendert werden damit `AnimatePresence` darauf reagieren kann
- Das Root-Element bekommt `initial/animate/exit` Props

## Ergebnis

```
VORHER:
  Tour aktiv → User klickt "Kontaktangaben" → Route wechselt →
  showTour = false → AnimatePresence Exit → 200ms Framer-Versatz →
  Overlay blockiert Formular → Weiter-Knopf reagiert nicht

NACHHER:
  Tour aktiv → User klickt "Kontaktangaben" → Route wechselt →
  showTour = false → Wrapper-div: pointerEvents='none' SOFORT →
  Formular voll klickbar → AnimatePresence Exit-Animation läuft (sieht gut aus)
  → nach 200ms Overlay vollständig weg
```
