

## Performance & Stabilitaets-Analyse

Nach gruendlicher Pruefung des Codes habe ich folgende Optimierungsmoeglichkeiten identifiziert, sortiert nach Impact:

---

### 1. Doppelte Auth-Listener in FormContext (Stabilitaet + Performance)

**Problem:** `FormContext.tsx` erstellt einen **eigenen** `onAuthStateChange` Listener (Zeile 137) und ruft `getSession()` auf (Zeile 117), obwohl `AuthContext` bereits die zentrale Auth-Quelle ist. Das bedeutet:
- 2 parallele Auth-Listener laufen gleichzeitig
- Redundanter `getSession()`-Call bei jeder FormContext-Mount
- Session-State kann zwischen AuthContext und FormContext divergieren

**Loesung:** Session aus `useAuth()` beziehen statt einen eigenen Listener aufzubauen. Die `session`/`sessionLoaded` States und den gesamten `useEffect` (Zeilen 109-151) entfernen. Stattdessen den `userId` aus AuthContext nutzen und bei Bedarf `supabase.auth.getSession()` einmalig fuer den Supabase-Token aufrufen.

---

### 2. useNotifications und useUnreadMessages nutzen useAuthValidation statt useAuth (Performance)

**Problem:** Beide Hooks importieren `useAuthValidation`, das intern `useIdleTimer` mit 6 globalen Event-Listenern startet. Jeder Consumer dieser Hooks erzeugt also einen **zusaetzlichen** Idle-Timer mit Mousemove/Touchstart/Scroll-Listenern — obwohl sie nur `userId` und `isValid` brauchen.

**Loesung:** `useAuthValidation` durch `useAuth` ersetzen in:
- `src/hooks/useNotifications.ts`
- `src/hooks/useUnreadMessages.ts`

Das eliminiert mindestens 12 unnoetige globale Event-Listener.

---

### 3. EnhancedSecurityService startet permanenten Realtime-Channel beim App-Start (Performance)

**Problem:** In `main.tsx` wird `EnhancedSecurityService.applySecurity()` aufgerufen, das `startRealTimeMonitoring()` startet — einen permanenten Supabase Realtime-Channel auf `security_audit_logs`. Das laeuft fuer **jeden User**, auch fuer normale Benutzer die keine Security-Alerts brauchen. Zusaetzlich wird der Channel nie aufgeraeumt (kein Cleanup).

**Loesung:** Den `startRealTimeMonitoring()` Call aus `applySecurity()` entfernen. Security-Monitoring gehoert nur ins Admin-Panel (`useSecurityMonitoring` macht das bereits). Die `applySecurity()` Methode sollte nur die Input-Validation und Header-Logik behalten.

---

### 4. Doppelte Security-Header Initialisierung (Stabilitaet)

**Problem:** `securityHeaders.ts` hat doppelte Initialisierung:
- Zeile 266-271: `DOMContentLoaded` Listener wird immer registriert
- Zeile 274-284: Gleiche Logik nochmal mit `readyState` Check
- Resultat: `applyToDocument()` und `CSRFProtection.initialize()` werden 2x ausgefuehrt

**Loesung:** Die doppelte Registrierung auf eine einzige, saubere Initialisierung reduzieren.

---

### 5. useProfile ruft redundant getUser() auf (Performance)

**Problem:** `useProfile.ts` ruft bei jedem `fetchProfile()` zuerst `supabase.auth.getUser()` auf (Server-Call), obwohl die userId bereits aus `AuthContext` verfuegbar ist. Auch `updateFirstName` und `updateAvatar` machen jeweils eigene `getUser()` Calls.

**Loesung:** `userId` aus `useAuth()` verwenden (ist bereits importiert aber nur fuer `isValid`/`authLoading` genutzt). Die 3 redundanten `getUser()` Calls eliminieren.

---

### 6. Console-Logging in Produktion (Performance)

**Problem:** Hunderte `console.log` Statements laufen in Produktion mit. Besonders problematisch:
- Realtime-Subscriptions loggen bei jedem Event
- FormContext loggt bei jedem Save/Load detailliert
- Auth-Events werden geloggt

**Loesung:** Ein `devLog` Utility existiert bereits in FormContext (Zeile 16) wird aber kaum genutzt. Alle `console.log` in kritischen Pfaden (Realtime-Callbacks, Load/Save-Operationen) durch `devLog` oder Build-time Stripping ersetzen.

---

### 7. useFormDataOperations ist toter Code (Codebase-Hygiene)

**Problem:** `src/contexts/form/useFormDataOperations.tsx` (310 Zeilen) scheint nicht mehr aktiv verwendet zu werden. `FormContext.tsx` implementiert die gleiche Logik direkt (eigenes `loadFormDataFromDatabase`, `loadDocuments`, Session-Handling). Der alte Hook hat zudem eigene Session-Refresh-Logik die vom AuthContext divergiert.

**Loesung:** Verifizieren ob der Hook noch importiert wird. Falls nicht, entfernen.

---

### Zusammenfassung nach Prioritaet

| # | Aenderung | Impact | Risiko | Dateien |
|---|-----------|--------|--------|---------|
| 1 | Auth-Listener in FormContext deduplizieren | Hoch | Mittel | FormContext.tsx |
| 2 | useAuth statt useAuthValidation in Hooks | Hoch | Niedrig | useNotifications.ts, useUnreadMessages.ts |
| 3 | Security Realtime-Channel nur fuer Admins | Mittel | Niedrig | EnhancedSecurityService.ts, main.tsx |
| 4 | Doppelte Security-Header-Init fixen | Niedrig | Niedrig | securityHeaders.ts |
| 5 | Redundante getUser() Calls entfernen | Mittel | Niedrig | useProfile.ts |
| 6 | Console-Logging in Produktion reduzieren | Mittel | Niedrig | Mehrere Dateien |
| 7 | Toten Code entfernen | Niedrig | Niedrig | useFormDataOperations.tsx |

Ich empfehle mit **Punkt 2** (einfachste Aenderung, hoher Impact) und **Punkt 3** (unnoetige Realtime-Verbindung fuer alle User) zu starten, dann **Punkt 1** und **5** anzugehen.

