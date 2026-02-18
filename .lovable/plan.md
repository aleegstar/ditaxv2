
# Auth Race Condition Fix

## Problem
Es gibt eine Race Condition in `App.tsx`, die dazu fuehrt, dass du manchmal unauthentifiziert landest und das Onboarding siehst, obwohl du eingeloggt bist. Das passiert so:

1. `initAuth()` startet (async) -- prueft OAuth-Tokens
2. Gleichzeitig wird `checkAuth()` aufgerufen (async)
3. Der `onAuthStateChange`-Listener wird parallel eingerichtet
4. Wenn der Listener ein `INITIAL_SESSION`-Event ohne Session feuert, BEVOR `initAuth` die Session setzen konnte, wird `isAuthenticated = false` gesetzt und du wirst auf `/auth` umgeleitet
5. Danach setzt `initAuth` die Session korrekt -- aber du bist schon auf der Auth-Seite

Ein weiteres Problem: Der `onAuthStateChange`-Listener wird NACH `getSession()` eingerichtet, obwohl Supabase empfiehlt, den Listener ZUERST aufzusetzen.

## Loesung

### 1. Auth-Listener VOR getSession einrichten (`App.tsx`)
- Den `onAuthStateChange`-Listener als erstes aufsetzen
- `initAuth()` und `checkAuth()` erst DANACH starten
- Eine Flag einfuehren, die verhindert, dass der auth state waehrend `initAuth` (Token-Handling) ueberschrieben wird

### 2. Race Condition verhindern
- Waehrend `initAuth` laeuft (OAuth/Deeplink Token-Handling), soll der `onAuthStateChange`-Listener den State nicht auf `false` setzen
- Erst nach Abschluss von `initAuth` darf der Listener den State aktualisieren
- Das verhindert das kurze Aufblitzen der Auth-Seite

### Technische Details

```text
VORHER (problematisch):
  initAuth() ──async──> setzt Session
  checkAuth() ──async──> setzt isAuthenticated
  onAuthStateChange ──> kann isAuthenticated=false setzen BEVOR initAuth fertig ist

NACHHER (korrekt):
  onAuthStateChange aufsetzen (listener ready)
  initAuth() ──async──> setzt Session (listener blockiert waehrend dessen)
  checkAuth() ──async──> setzt isAuthenticated
  listener wird aktiviert
```

### Aenderungen
- **`src/App.tsx`**: Auth-Initialisierung umstrukturieren:
  - `isInitializing` Ref einfuehren
  - Listener zuerst aufsetzen, aber waehrend Init-Phase ignorieren
  - `initAuth` + `checkAuth` sequentiell ausfuehren
  - Erst danach Listener-Updates zulassen
