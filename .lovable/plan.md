

## Problem-Analyse

Das Dashboard zeigt "Benutzer" statt des echten Namens, weil eine Race Condition im AuthContext existiert:

1. `onAuthStateChange` feuert sofort mit dem gecachten (aber abgelaufenen) Session-Token
2. Setzt `isValid: true` und `isLoading: false` - Dashboard wird gerendert
3. `getUser()` stellt erst danach fest, dass die Session ungueltig ist
4. Bis dahin hat `useProfile` bereits versucht, das Profil zu laden - und ist gescheitert
5. Ergebnis: Dashboard zeigt "Benutzer" fuer einen kurzen Moment (oder dauerhaft falls kein Redirect)

## Loesung

### 1. AuthContext: Initiales Laden absichern (src/contexts/AuthContext.tsx)

- Einen `initialCheckDone`-Ref einfuehren
- `onAuthStateChange` darf `isLoading: false` NICHT setzen, solange der initiale `getUser()`-Check laeuft
- Nur der `getSession()` + `getUser()`-Flow darf den initialen Loading-State aufloesen
- Danach arbeitet `onAuthStateChange` normal weiter

```text
Ablauf VORHER:
onAuthStateChange(session) --> isValid=true, isLoading=false  (SOFORT, aus Cache)
getSession() + getUser()  --> Session ungueltig --> signOut()  (ZU SPAET)

Ablauf NACHHER:
onAuthStateChange(session) --> ignoriert waehrend initialem Check
getSession() + getUser()  --> Session ungueltig --> signOut(), isLoading=false
                           --> Session gueltig  --> isValid=true, isLoading=false
onAuthStateChange          --> ab jetzt normal aktiv
```

### 2. useProfile: Fallback-Verhalten verbessern (src/hooks/useProfile.ts)

- Bei `getUser()`-Fehler nicht still scheitern, sondern `profile` explizit auf `null` belassen (bereits der Fall)
- Optional: Retry-Logik wenn AuthContext bereit ist

## Technische Aenderungen

### Datei: src/contexts/AuthContext.tsx

- `initialCheckDoneRef = useRef(false)` hinzufuegen
- Im `onAuthStateChange`-Callback: Wenn `initialCheckDoneRef.current === false`, State-Update ueberspringen (nur merken fuer spaeter)
- Im `getSession().then()`-Block: Nach Abschluss `initialCheckDoneRef.current = true` setzen
- Dadurch wird der Loading-State erst aufgeloest, wenn die Server-Validierung abgeschlossen ist

### Datei: src/hooks/useProfile.ts (optional, defensiv)

- `fetchProfile` an den Auth-State koppeln: Erst ausfuehren wenn AuthContext `isValid === true` meldet
- Dafuer `useAuth()` importieren und als Dependency nutzen

## Auswirkungen

- Kein "Benutzer"-Flash mehr bei abgelaufenen Sessions
- Der LoadingSpinner bleibt sichtbar bis die Session tatsaechlich validiert ist
- Bei gueltiger Session: Kein merkbarer Unterschied im Verhalten
- Bei ungueltiger Session: Sofortiger Redirect zu /auth ohne Dashboard-Flash

