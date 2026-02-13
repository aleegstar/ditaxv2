

## Problem

Nach dem Onboarding (`/welcome` -> `/`) startet die Tour nicht, weil das Navigations-Tracking den Start blockiert.

Die `OnboardingTourProvider` umschliesst die gesamte App. Wenn der User auf `/welcome` startet, wird `/welcome` als initiale Route gespeichert. Beim Navigieren zu `/` nach dem Onboarding wird `hasNavigatedRef = true` gesetzt, und die automatische Tour-Startlogik bricht ab mit "User has navigated, skipping auto-start".

## Loesung

Die Navigation von `/welcome` nach `/` als erlaubte Transition behandeln. Die Tour soll trotzdem starten, wenn der User von `/welcome` kommt.

## Technische Details

**Datei: `src/contexts/OnboardingTourContext.tsx`**

In der `checkTourConditions`-Funktion (Zeile 182) die Navigation-Pruefung anpassen:

- Wenn `initialRouteRef.current` gleich `/welcome` ist, soll `hasNavigatedRef` die Tour nicht blockieren
- Dies ist der einzige Fall, wo eine Navigation zum Dashboard die Tour starten soll (der User hat gerade das Onboarding abgeschlossen)

```text
// Aenderung in checkTourConditions:
if (hasNavigatedRef.current && initialRouteRef.current !== '/welcome') {
  debug.log('Tour: User has navigated, skipping auto-start');
  return;
}
```

Zusaetzlich in der Navigations-Tracking-Logik (`useEffect` fuer `location.pathname`): Die Route `/welcome` nicht als Navigation zaehlen, wenn der User danach auf `/` geht.

