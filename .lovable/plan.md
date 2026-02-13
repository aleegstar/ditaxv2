

## Fix: Onboarding-Tour startet nicht nach Neu-Registrierung

### Ursache

Die Navigation-Tracking-Logik in `OnboardingTourContext.tsx` blockiert die Tour faelschlicherweise:

```text
Ablauf:
1. User auf /auth → initialRouteRef = "/auth"
2. User navigiert zu /welcome → hasNavigatedRef = true
3. User schliesst WelcomeFlow ab → navigiert zu /
4. Tour-Check Zeile 191: 
   hasNavigatedRef.current = true 
   UND initialRouteRef.current = "/auth" (NICHT "/welcome")
   → Ausnahme greift NICHT → Tour wird blockiert
```

Die Ausnahme `initialRouteRef.current !== '/welcome'` funktioniert nur, wenn der Provider auf `/welcome` gemountet wird. Da er aber in `App.tsx` lebt und auf `/auth` zuerst rendert, ist die initiale Route `/auth`.

### Loesung

Die Navigation-Guard-Bedingung in `OnboardingTourContext.tsx` (Zeile 191) erweitern, damit auch der Pfad `/auth` als erlaubter Startpunkt gilt:

```text
// Vorher (Zeile 191):
if (hasNavigatedRef.current && initialRouteRef.current !== '/welcome') {

// Nachher:
if (hasNavigatedRef.current && initialRouteRef.current !== '/welcome' && initialRouteRef.current !== '/auth') {
```

Alternativ (robuster): Statt einzelne Pfade auszunehmen, die Logik umdrehen und nur pruefen ob der User bereits auf einer "normalen" Seite war und dann wegnavigiert ist. Der einfachste und sicherste Fix ist aber die Erweiterung der Ausnahmeliste.

### Betroffene Datei

- `src/contexts/OnboardingTourContext.tsx` -- Zeile 191: Ausnahme fuer `/auth` hinzufuegen

### Risiko

Minimal. Die Aenderung betrifft nur die Bedingung, unter der die Tour NICHT automatisch gestartet wird. Bestehende Logik bleibt unberuehrt.

