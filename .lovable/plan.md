
# Root Cause: "Benutzer" Flash trotz korrekter Session

## Eigentliche Ursachen (drei verknüpfte Probleme)

### Problem 1: `isReady` ignoriert `activeTaxFilerId`
In `UserTaxReturns.tsx` (Zeile 196-200) wird `isReady = true` gesetzt, sobald `loading`, `authLoading` und `profileLoading` alle `false` sind — aber OHNE zu warten, bis `activeTaxFilerId` aus dem `TaxFilerContext` gesetzt wurde. Das führt dazu, dass der Skeleton verschwindet, obwohl die Steuerdaten noch nicht mit dem richtigen Filer geladen werden können.

### Problem 2: Zwei unabhängige Auth-Initialisierungen
`AuthContext` und `TaxFilerContext` führen beide eigene `getSession()` Aufrufe durch. Sie sind nicht synchronisiert. Wenn `AuthContext` bereits `isValid=true` hat, kann `TaxFilerContext` noch im `sessionLoaded=false`-Zustand sein und `activeTaxFilerId=null` melden — was zu einem kurzen Zeitfenster mit leerem Dashboard führt.

### Problem 3: Leerer `first_name` → "Benutzer" Fallback
`useProfile` konvertiert `profileData?.first_name || null` — bei leerem String `""` gibt das `null` zurück. `getUserDisplayName()` zeigt dann den Fallback "Benutzer". Wenn eine kurze Race-Condition dazu führt, dass das Profil nochmal gerendert wird bevor die Daten vollständig sind, sieht der Nutzer kurz "Benutzer".

## Lösung: Drei gezielte Korrekturen

### Fix 1: `isReady` wartet auch auf `activeTaxFilerId`
In `UserTaxReturns.tsx` die `isReady`-Bedingung erweitern:

```typescript
// VORHER
useEffect(() => {
  if (!loading && !authLoading && !profileLoading && !isReady) {
    setIsReady(true);
  }
}, [loading, authLoading, profileLoading, isReady]);

// NACHHER
useEffect(() => {
  if (!loading && !authLoading && !profileLoading && !taxFilerLoading && activeTaxFilerId && !isReady) {
    setIsReady(true);
  }
}, [loading, authLoading, profileLoading, taxFilerLoading, activeTaxFilerId, isReady]);
```

Dies stellt sicher, dass die Seite erst rendert, wenn wirklich alle Datenquellen bereit sind — inklusive der aktiven Steuerperson.

### Fix 2: Skeleton-Guard um `activeTaxFilerId` ergänzen
In `UserTaxReturns.tsx` die primäre Skeleton-Bedingung erweitern:

```typescript
// VORHER
if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading) && !safetyTimeout) {
  return <UserTaxReturnsSkeleton />;
}

// NACHHER
if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading || !activeTaxFilerId) && !safetyTimeout) {
  return <UserTaxReturnsSkeleton />;
}
```

### Fix 3: `getUserDisplayName()` zeigt Skeleton statt Fallback
Anstatt "Benutzer" anzuzeigen wenn `first_name` fehlt, wird ein Inline-Skeleton-Platzhalter gerendert — eine gepulste Ladeanimation, die den Nutzer nicht irreführt:

```typescript
const getUserDisplayName = () => {
  if (userProfile?.first_name) {
    return userProfile.first_name;
  }
  // Zeige niemals "Benutzer" — wenn kein Name verfügbar, nichts anzeigen
  return null;
};
```

Und im JSX:
```tsx
<h1 className="text-2xl font-bold text-black">
  {getUserDisplayName() ?? (
    <span className="inline-block bg-gray-200 rounded animate-pulse w-28 h-7" />
  )}
</h1>
```

So sieht der Nutzer einen neutralen Ladeindikator statt eines falschen Namens.

## Dateien die geändert werden

### `src/pages/UserTaxReturns.tsx`
1. `isReady`-useEffect: `activeTaxFilerId` als zusätzliche Bedingung hinzufügen
2. Skeleton-Guard: `!activeTaxFilerId` in die Hauptbedingung aufnehmen
3. `getUserDisplayName()`: statt "Benutzer"-Fallback `null` zurückgeben
4. Begrüßungszeile: Statt des Fallback-Texts einen Skeleton-Platzhalter anzeigen

## Warum das die User Experience verbessert

```text
VORHER (fehlerhaft):
  AuthContext: isValid=true ✓
  TaxFilerContext: isLoading=false ✓, activeTaxFilerId=null ✗
  isReady: true (setzt sich zu früh)
  → Dashboard rendert mit "Benutzer" und keinen Steuerdaten

NACHHER (korrekt):
  AuthContext: isValid=true ✓
  TaxFilerContext: isLoading=false ✓, activeTaxFilerId=null → Skeleton bleibt
  TaxFilerContext: activeTaxFilerId="xyz" ✓
  isReady: true (setzt sich erst jetzt)
  → Dashboard rendert mit echtem Namen und echten Steuerdaten

  Falls activeTaxFilerId nie kommt:
  → Safety-Timeout nach 8s entsperrt trotzdem (Absicherung gegen Endlos-Skeleton)
```

Die Änderungen sind minimal, direkt und lösen alle drei Ursachen gleichzeitig.
