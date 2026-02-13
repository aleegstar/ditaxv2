
# Fix: App haengt sich auf und zeigt nur Skeleton-Loading

## Problem
Die App bleibt in einem permanenten Skeleton-Ladezustand haengen, weil mehrere asynchrone Ladezustaende (`authLoading`, `loading`, `profileLoading`, `taxFilerLoading`, `isReady`) ALLE fertig sein muessen, damit der Inhalt angezeigt wird. Wenn auch nur einer davon haengen bleibt (z.B. durch Netzwerk-Timeout, langsame Verbindung), zeigt die App endlos Skeletons.

## Ursachen

1. **Kein Safety-Timeout in `UserTaxReturns`**: Im Gegensatz zu `Index.tsx` und `TaxFilerGate` (jeweils 8s Timeout) hat `UserTaxReturns` keinen Schutzmechanismus gegen endloses Laden.

2. **`useTaxYearData` setzt `loading` nie auf `false` wenn `taxFilerId` null ist**: Wenn `activeTaxFilerId` noch nicht gesetzt ist, gibt die Funktion `loadTaxYearData` sofort zurueck ohne `loading: false` zu setzen. Waehrend der kurzen Zeitspanne zwischen Auth und TaxFiler-Laden bleibt `loading: true`.

3. **`useProfile` hat keinen Safety-Timeout**: Wenn `supabase.auth.getUser()` oder die Profil-Abfrage haengt, bleibt `loading: true` fuer immer.

4. **`isReady` Logik ist fragil**: `isReady` wird erst `true` wenn alle 3 Loading-States gleichzeitig `false` sind. Durch die verschiedenen Timing-Windows kann es passieren, dass sie nie gleichzeitig false werden.

## Loesung

### 1. Safety-Timeout in `UserTaxReturns` (Hauptfix)
Einen 8-Sekunden Safety-Timeout hinzufuegen, der das Skeleton nach Ablauf erzwingt aufzuloesen -- konsistent mit den bestehenden Timeouts in `Index.tsx` und `TaxFilerGate`.

### 2. `useTaxYearData` frueh-Exit korrigieren
Wenn `userId` oder `taxFilerId` null sind, `loading: false` setzen, damit der State nicht haengen bleibt.

### 3. `useProfile` Safety-Timeout
Einen 5-Sekunden Timeout hinzufuegen, der `loading: false` setzt, falls `fetchProfile` haengt.

## Technische Details

### Datei: `src/pages/UserTaxReturns.tsx`
- Safety-Timeout-State und Effect hinzufuegen (identisches Pattern wie `Index.tsx`)
- Loading-Bedingung (Zeile 245) um `&& !safetyTimeout` erweitern

```typescript
const [safetyTimeout, setSafetyTimeout] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    console.warn('UserTaxReturns: Safety timeout after 8s');
    setSafetyTimeout(true);
  }, 8000);
  return () => clearTimeout(timer);
}, []);

// Reset when loading resolves normally
useEffect(() => {
  if (!authLoading && !loading && !profileLoading && !taxFilerLoading) {
    setSafetyTimeout(false);
  }
}, [authLoading, loading, profileLoading, taxFilerLoading]);

// Zeile 245 aendern:
if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading) && !safetyTimeout) {
  return <UserTaxReturnsSkeleton />;
}
```

### Datei: `src/hooks/use-tax-year-data.ts`
- Im `loadTaxYearData` Callback: Wenn `userId` oder `taxFilerId` fehlt, `loading: false` setzen

```typescript
const loadTaxYearData = useCallback(async () => {
  if (!userId || !taxFilerId) {
    setData(prev => ({ ...prev, loading: false }));
    return;
  }
  // ... rest
}, [userId, taxFilerId]);
```

### Datei: `src/hooks/useProfile.ts`
- Safety-Timeout von 5s im `useEffect` hinzufuegen

```typescript
useEffect(() => {
  fetchProfile();
  const timer = setTimeout(() => {
    setLoading(false);
  }, 5000);
  return () => clearTimeout(timer);
}, []);
```

## Umfang
- 3 Dateien
- Konsistentes Pattern mit bestehenden Safety-Timeouts
- Keine Aenderung am normalen Lade-Verhalten, nur Absicherung gegen Haenger
