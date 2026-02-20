
# Fix: Produkttour startet auf falscher Seite (Race Condition + zu späte Prüfung)

## Präzise Fehleranalyse

### Das eigentliche Problem: Closure-Race-Condition im 800ms-Timer

Der `checkTourConditions`-Effect wird bei jedem `location.pathname`-Wechsel neu ausgelöst. Der Effect erstellt einen 800ms-Timer. Das Problem liegt im JavaScript-Closure-Verhalten:

```text
Schritt 1: User ist auf /welcome
         → location.pathname = '/welcome'
         → Effect läuft, Timer startet (800ms), Timer-Closure hat pathname = '/welcome'

Schritt 2: navigate('/', { replace: true }) wird aufgerufen
         → location.pathname = '/'
         → Effect wird erneut ausgelöst, neuer Timer startet (800ms)
         → Alter Timer (/welcome) wird gecancelt ✅ (cleanup)
         → Neuer Timer-Closure hat pathname = '/'

Schritt 3: User navigiert sofort zu /form (< 800ms)
         → location.pathname = '/form/...'
         → Effect wird erneut ausgelöst, neuer Timer startet (800ms)
         → Alter Timer (/) wird gecancelt ✅ (cleanup)
         → Neuer Timer-Closure hat pathname = '/form/...'
         → Nach 800ms: location.pathname.startsWith('/form') → Tour-Start blockiert ✅

Das sollte funktionieren... ABER:
```

### Wann funktioniert die Cleanup NICHT?

Das `clearTimeout` im Return der `useEffect` wird aufgerufen **wenn der Effect erneut ausgelöst wird**. React garantiert, dass der Cleanup vor dem neuen Effect läuft. Das bedeutet: Wenn der User schnell navigiert, wird der alte Timer korrekt gecancelt.

**ABER:** Es gibt eine kritische Ausnahme: Wenn zwischen dem Zeitpunkt des Timer-Starts und dem 800ms-Ablauf **keine weitere Navigation** stattfindet, läuft `checkTourConditions` mit dem `location.pathname` der Closure. Da `location` aus dem React Router Hook kommt und **Teil der Closure ist**, ist es der Wert zum Zeitpunkt der Effect-Ausführung — nicht der aktuelle Wert nach 800ms.

### Der wahre Bug: `location` in der Closure ist eingefroren

```typescript
useEffect(() => {
  const checkTourConditions = async () => {
    // location.pathname hier ist der Wert aus der Effect-Closure
    // = der Wert BEIM AUSLÖSEN des Effects, nicht nach 800ms
    if (location.pathname !== '/') { ... }
  };
  
  const timer = setTimeout(checkTourConditions, 800); // ← 800ms später läuft die alte Closure!
  return () => clearTimeout(timer);
}, [..., location.pathname, ...]); // location.pathname ist Dependency
```

**Konkretes Szenario:**
```
500ms nach /welcome → / Navigation:
  - Timer läuft mit pathname = '/'
  - User navigiert zu /form

→ Effect feuert erneut (pathname = '/form')
  - Alter Timer (pathname = '/') wird gecancelt ← NUR wenn React schnell genug ist
  
→ RACE: Wenn der alte setTimeout bereits ausgeführt wurde bevor React den Cleanup macht...
  - checkTourConditions läuft mit pathname = '/'
  - Bedingung pathname !== '/' ist false → Tour startet!
```

Das Timing ist eng: React-Batch-Updates, Event Loop, async setState — all das kann dazu führen, dass der alte Timer abläuft bevor der neue Effect-Cleanup greift.

### Zweites Problem: `hasNavigatedRef` wird zu früh gesetzt

```typescript
// Navigation-Tracking Effect:
useEffect(() => {
  if (initialRouteRef.current === null) {
    initialRouteRef.current = location.pathname; // = '/welcome'
  } else if (location.pathname !== initialRouteRef.current) {
    hasNavigatedRef.current = true; // ← wird bei JEDER Navigation gesetzt
  }
}, [location.pathname]);
```

Wenn der User bei Neuregistrierung von `/welcome` zu `/` navigiert: `hasNavigatedRef.current = true`. Dann prüft `checkTourConditions`:
```typescript
if (hasNavigatedRef.current && initialRouteRef.current !== '/welcome' && initialRouteRef.current !== '/auth') {
  return; // ← würde blockieren, ABER initialRouteRef = '/welcome' → Ausnahme greift ✅
}
```

Wenn der User danach zu `/form` navigiert: `hasNavigatedRef.current` bleibt `true`. Wenn er zurück zu `/` navigiert: Die Tour könnte starten (weil `initialRouteRef = '/welcome'` die Ausnahme auslöst).

Das bedeutet: **Ein neuer User der nach dem WelcomeFlow zu `/form` geht und dann zurück zu `/` kommt, könnte die Tour sehen** — weil `initialRouteRef = '/welcome'` immer als Ausnahme gilt.

## Lösung: Robuste Einmal-Prüfung mit `ref` statt Race-Condition-anfälligem Timer

### Fix 1: `location.pathname` zum Zeitpunkt der Timer-Ausführung prüfen, nicht beim Effect-Start

Statt `location.pathname` aus der Closure zu verwenden, eine `ref` nutzen die immer den **aktuellen** Pfad widerspiegelt:

```typescript
// Neuer ref der immer aktuell ist:
const currentPathRef = useRef(location.pathname);

useEffect(() => {
  currentPathRef.current = location.pathname;
}, [location.pathname]);

// Im Timer dann currentPathRef.current statt location.pathname:
const checkTourConditions = async () => {
  const currentPath = currentPathRef.current; // ← aktueller Wert, nicht eingefroren
  if (currentPath !== '/') {
    debug.log('❌ Tour: Not on dashboard page at timer execution time');
    return;
  }
  // ...
};
```

### Fix 2: Tour nur genau einmal starten dürfen (einmalige Aktivierung)

Eine `tourStartAttemptedRef` hinzufügen die verhindert, dass die Tour mehrfach versucht wird zu starten:

```typescript
const tourStartAttemptedRef = useRef(false);

// In checkTourConditions:
if (tourStartAttemptedRef.current) return; // bereits versucht

// Vor dem Start:
tourStartAttemptedRef.current = true;
setShowTour(true);
```

### Fix 3: Navigation-Tracking für System-Routen anpassen

`/welcome`, `/auth`, `/select-person` sollen `hasNavigatedRef` nicht auf `true` setzen — sie sind System-Routen keine Benutzer-Navigation:

```typescript
const systemRoutes = ['/welcome', '/auth', '/select-person'];

useEffect(() => {
  if (initialRouteRef.current === null) {
    initialRouteRef.current = location.pathname;
  } else if (location.pathname !== initialRouteRef.current) {
    // Nur als "navigiert" markieren wenn die neue Route KEINE System-Route ist
    // UND die alte Route auch keine System-Route war
    const fromSystemRoute = systemRoutes.some(r => initialRouteRef.current?.startsWith(r));
    const toSystemRoute = systemRoutes.some(r => location.pathname.startsWith(r));
    if (!fromSystemRoute && !toSystemRoute) {
      hasNavigatedRef.current = true;
    }
  }
}, [location.pathname]);
```

Und den Ausnahme-Check vereinfachen:
```typescript
// Klar und eindeutig: Tour nur starten wenn explizit auf Dashboard
// hasNavigatedRef kümmert sich jetzt korrekt um System-Route-Ausnahmen
if (hasNavigatedRef.current) {
  debug.log('❌ Tour: User has navigated manually, skipping auto-start');
  return;
}
```

## Zusammenfassung der Änderungen

**Datei:** `src/contexts/OnboardingTourContext.tsx`

| Was | Vorher | Nachher |
|---|---|---|
| Pfad-Check im Timer | `location.pathname` (eingefroren) | `currentPathRef.current` (aktuell) |
| Einmaligkeits-Schutz | Keiner | `tourStartAttemptedRef` |
| System-Route-Tracking | Nur in Ausnahme-Check | Im Navigation-Tracking selbst |
| Ausnahme-Check | `/welcome` und `/auth` hartkodiert | Sauber durch `systemRoutes`-Array |

## Verhalten nach dem Fix

| Situation | Vorher | Nachher |
|---|---|---|
| Neuregistrierung → /welcome → / (direkt) | Tour startet ✅ | Tour startet ✅ |
| Neuregistrierung → /welcome → / → /form (schnell) | Tour könnte starten auf /form (Bug!) | Tour startet nicht ✅ |
| Login → / (tour noch nicht gemacht) | Tour startet ✅ | Tour startet ✅ |
| User navigiert manuell von /form zurück zu / | Tour kann starten (Bug!) | Tour startet nicht ✅ |
| Tour bereits abgeschlossen | Tour startet nicht ✅ | Tour startet nicht ✅ |
| Manueller Tour-Start (forceTour) | Funktioniert ✅ | Funktioniert ✅ |
