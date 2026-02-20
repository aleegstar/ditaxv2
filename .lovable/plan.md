
# Fix: Produkttour startet nach /select-person-Navigation fälschlicherweise

## Problem-Analyse

### Ablauf bei eingeloggten Benutzern mit mehreren Tax Filern

```text
Login → / (Dashboard) → TaxFilerGate erkennt mehrere Filer, keine Auswahl
     → Redirect zu /select-person (automatisch)
     → User wählt Person aus
     → navigate('/', { state: { personSelected: true } })
     → OnboardingTourContext: initialRouteRef = '/select-person'
     → location.pathname wechselt zu '/'
     → hasNavigatedRef.current = true (wegen Wechsel von /select-person zu /)
     → ABER: Ausnahme-Check erlaubt nur '/welcome' und '/auth'
     → Tour startet trotzdem! ❌
```

### Ursache im Code

In `src/contexts/OnboardingTourContext.tsx` (Zeile 191):

```typescript
if (hasNavigatedRef.current 
    && initialRouteRef.current !== '/welcome' 
    && initialRouteRef.current !== '/auth') {
  debug.log('❌ Tour: User has navigated, skipping auto-start');
  return;
}
```

Diese Prüfung soll verhindern, dass die Tour startet, wenn der User bereits navigiert hat. Aber es gibt zwei Fehler:

1. **`/select-person` fehlt in der Ausnahmeliste**: `/select-person` ist eine automatische System-Weiterleitung (durch `TaxFilerGate`), keine bewusste User-Navigation. Es sollte wie `/welcome` behandelt werden — d.h. eine Tour-Auslösung von `/select-person` → `/` ist erlaubt.

2. **Logik-Fehler**: Die Bedingung ist invertiert. Der Code sagt "wenn navigiert UND initialRoute war NICHT /welcome UND nicht /auth → Tour blockieren". Das bedeutet: Wenn `initialRoute = '/select-person'`, ist die Ausnahme NICHT erfüllt → Tour wird blockiert. Aber in der Praxis startet die Tour trotzdem, weil `hasNavigatedRef.current` zu diesem Zeitpunkt noch `false` sein kann (Race Condition zwischen dem Timeout von 800ms und der Navigation).

### Zweites Problem: Race Condition

Der `checkTourConditions`-Effect hat einen 800ms Delay. Wenn der User sehr schnell von `/select-person` zu `/` navigiert und das Timeout noch nicht abgelaufen ist, wird der `hasNavigatedRef` möglicherweise noch nicht korrekt gesetzt. Das führt dazu, dass die Tour auch auf Unterseiten startet, wenn der Delay-Timer noch nicht ausgelöst wurde.

### Drittes Problem: Tour startet auf falscher Seite

Wenn der User auf einer Unterseite wie `/documents`, `/tickets` etc. ist (nach direktem Login ohne /welcome-Flow), und `tourCompleted = false` ist, startet die Tour wegen des `location.pathname !== '/'`-Checks eigentlich nicht. Aber wenn der User dann zur `/` navigiert, wird die Tour gestartet — obwohl der User das nur durch eine bewusste Navigation gemacht hat, nicht durch einen Onboarding-Flow.

## Lösung

### Fix 1: `/select-person` zur Ausnahmeliste hinzufügen

`/select-person` ist eine automatische System-Weiterleitung — kein bewusster User-Entscheid. Deswegen soll eine Transition von `/select-person` → `/` die Tour auslösen dürfen.

```typescript
// OnboardingTourContext.tsx — Zeile 191
// VORHER:
if (hasNavigatedRef.current && initialRouteRef.current !== '/welcome' && initialRouteRef.current !== '/auth') {

// NACHHER:
if (hasNavigatedRef.current && initialRouteRef.current !== '/welcome' && initialRouteRef.current !== '/auth' && initialRouteRef.current !== '/select-person') {
```

### Fix 2: Tour nur starten wenn Route von Anfang an `/` war ODER von erlaubten Quellen kommt

Robusterer Ansatz: Statt nur `initialRouteRef` zu tracken, die `location.state` von `SelectPerson` prüfen. Wenn `navigate('/', { state: { personSelected: true } })` aufgerufen wurde, ist das eine erlaubte Navigation.

Zusätzlich: Die `hasNavigatedRef`-Logik so anpassen, dass sie Übergänge von System-Seiten (`/select-person`) zur Tour-Route `/` nicht blockiert.

### Fix 3: `hasNavigatedRef` erst nach dem ersten Render setzen (Race Condition)

Den `initialRouteRef`-Tracking-Effect so anpassen, dass er den echten initialen Pfad (vor dem `TaxFilerGate`-Redirect) korrekt erfasst. Da `TaxFilerGate` sehr schnell von `/` zu `/select-person` weiterleitet, wird `/select-person` als `initialRoute` gesetzt — nicht `/`.

**Lösung**: Im `OnboardingTourContext` die `location.state` von React Router auslesen, um zu erkennen ob der User von `/select-person` (mit `personSelected: true`) kam:

```typescript
// Im checkTourConditions-Effect:
const locationState = location.state as { personSelected?: boolean } | null;
const cameFromSelectPerson = locationState?.personSelected === true;

if (hasNavigatedRef.current 
    && !cameFromSelectPerson
    && initialRouteRef.current !== '/welcome' 
    && initialRouteRef.current !== '/auth'
    && initialRouteRef.current !== '/select-person') {
  debug.log('❌ Tour: User has navigated (not via select-person), skipping auto-start');
  return;
}
```

## Dateien die geändert werden

| Datei | Änderung |
|---|---|
| `src/contexts/OnboardingTourContext.tsx` | `/select-person` zur Ausnahmeliste hinzufügen + `location.state.personSelected` als zusätzliche Bedingung prüfen |

## Verhalten nach dem Fix

| Situation | Vorher | Nachher |
|---|---|---|
| Login → TaxFilerGate → /select-person → / | Tour startet (Bug!) | Tour startet korrekt auf Dashboard ✅ |
| Login → /welcome → / (neue User) | Tour startet | Tour startet ✅ |
| Login → direkt zu / (kein Gate) | Tour startet | Tour startet ✅ |
| User navigiert manuell zu / (von /documents) | Tour startet manchmal (Bug!) | Tour startet nicht ✅ |
| Tour bereits abgeschlossen | Tour startet nicht | Tour startet nicht ✅ |

## Technische Details

Die Änderung ist minimal und chirurgisch — nur `OnboardingTourContext.tsx` wird angepasst. Keine Änderungen an Routing, Guards oder anderen Contexts nötig.
