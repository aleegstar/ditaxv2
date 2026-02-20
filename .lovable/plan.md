
# Performance-Probleme: Navigation fühlt sich träge an / App-Neustarts nötig

## Diagnose: 4 identifizierte Probleme

### Problem 1 (KRITISCH): `useIdleTimer` re-rendert bei JEDER Mausbewegung
Die `useEffect`-Dependencies in `src/hooks/use-idle-timer.ts` enthalten `isIdle` und `resetTimer`. Das bedeutet: **jede Mausbewegung** → `handleActivity()` → `resetTimer()` → neues `resetTimer`-Objekt (da `isIdle` im Closure) → useEffect läuft neu → Events werden detached + re-attached + neue Timer erstellt. Auf mobil mit Touch-Events ist das ein konstanter Render-Storm.

```
useEffect(..., [resetTimer, stopTimer, isIdle, clearAllTimers]);
//                                     ^^^^^^ PROBLEM: Änderung triggert alles neu
```

### Problem 2 (KRITISCH): `AuthenticatedApp` macht DOPPELTEN `getUser()`-Call
In `src/App.tsx` Zeile 133-141 macht `AuthenticatedApp` einen eigenen `supabase.auth.getUser()` Call — obwohl `AuthContext` bereits serverseitig validiert hat. Das ist ein **redundanter Netzwerkrequest** bei jedem Route-Wechsel in die App.

```typescript
// AuthenticatedApp (App.tsx ~133):
const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser(); // ← unnötiger Call
  if (mounted) setUser(user);
};
```

`AuthContext` gibt bereits `userId` und `email` zurück — `user.id` kann direkt von dort kommen.

### Problem 3 (KRITISCH): `window.location.href` statt `navigate()` verursacht Full-Reload
An mehreren Stellen (App.tsx Zeile 450, AuthSuccess.tsx Zeile 56, 81) wird `window.location.href = '/'` verwendet statt `navigate('/')`. Das verursacht einen kompletten **Browser-Reload** — alle React-States, QueryClient-Cache, und Contexts werden zerstört und von Null aufgebaut. Das ist exakt das "Gefühl als ob man die App neustartet".

```typescript
// App.tsx ~450:
window.location.href = '/'; // ← Full Reload! React stirbt komplett

// AuthSuccess.tsx ~56:
window.location.replace('/'); // ← ebenfalls Full Reload
```

### Problem 4: Doppelte `getSession()` in `TaxFilerContext`
`TaxFilerContext` registriert einen `onAuthStateChange` Listener UND ruft zusätzlich `getSession()` auf — beides parallel. Das sind unnötige Race-Conditions beim Start.

---

## Lösung: 3 gezielte Fixes

### Fix 1: `useIdleTimer` — `isIdle` aus useEffect-Dependencies entfernen
`handleActivity` soll `isIdle` über eine **Ref** lesen, nicht direkt aus State. Damit löst die Dependency nicht mehr bei jeder Mausbewegung aus.

```typescript
// VORHER
const handleActivity = () => {
  if (!isIdle) resetTimer(); // isIdle aus State → re-renders
};
useEffect(..., [resetTimer, stopTimer, isIdle, clearAllTimers]);

// NACHHER
const isIdleRef = useRef(false);
const handleActivity = () => {
  if (!isIdleRef.current) resetTimer(); // ref → kein re-render
};
useEffect(..., [resetTimer, clearAllTimers]); // isIdle entfernt
```

### Fix 2: `AuthenticatedApp` — `useAuth()` statt eigenem `getUser()`-Call
`user.id` kommt direkt aus `AuthContext.userId` — kein extra Supabase-Call nötig.

```typescript
// VORHER (App.tsx ~118)
const [user, setUser] = useState<any>(null);
useEffect(() => {
  supabase.auth.getUser().then(...)
}, []);

// NACHHER
const { userId } = useAuth();
// user.id überall durch userId ersetzen
```

### Fix 3: `window.location.href = '/'` → `navigate('/')` nach Deep-Link-Session
In `App.tsx` nach einem erfolgreichen Deep-Link-Token-Set (`setSession()`): statt `window.location.href = '/'` soll der bereits vorhandene `navigate()` hook verwendet werden. Da `AppRoutes` bereits `useNavigate` nutzt, kann diese Navigation soft erfolgen.

```typescript
// VORHER (App.tsx ~450):
window.location.href = '/';

// NACHHER:
navigate('/', { replace: true });
```

---

## Geänderte Dateien

### 1. `src/hooks/use-idle-timer.ts`
- `isIdleRef` hinzufügen, der mit `isIdle`-State synchron gehalten wird
- `handleActivity` verwendet `isIdleRef.current` statt `isIdle` State
- `isIdle` aus useEffect-Dependencies entfernen → kein Render-Storm mehr bei User-Aktivität

### 2. `src/App.tsx`
- `AuthenticatedApp`: `useAuth()` importieren, `userId` direkt verwenden statt eigenem `getUser()` Call
- `AppRoutes`: Deep-Link nach `setSession()` via `navigate('/', { replace: true })` statt `window.location.href = '/'`

### Ergebnis

```
VORHER:
  Jede Mausbewegung → useEffect re-runs → Timers neu setzen → UI zittert
  Deep-Link Login → window.location.href → Full Reload → App neu aufbauen
  Route-Wechsel → extra getUser() Call → ~200ms extra Latenz

NACHHER:
  Jede Mausbewegung → ref check → kein re-render
  Deep-Link Login → navigate() → SPA Navigation, kein Reload
  Route-Wechsel → kein extra Supabase-Call
```

Die Kombination dieser drei Fixes beseitigt die Hauptursachen für die wahrgenommene Trägheit und die notwendigen App-Neustarts.
