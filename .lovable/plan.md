
# Fix: Consent-Screen erscheint faelschlicherweise bei Navigation

## Problem
Die "Schoen das du da bist"-Seite (TaxYearSelector mit Consent-Flow) wird faelschlicherweise angezeigt, obwohl der Benutzer bereits registriert und eingeloggt ist. Das passiert durch mehrere zusammenwirkende Race Conditions:

1. **Safety Timeout umgeht Loading-Guard**: Nach 8 Sekunden erzwingt der Safety Timeout das Rendering, auch wenn `profileLoading` noch `true` ist. Wenn das Profil noch nicht geladen wurde, ist `userProfile` noch `null`, und `!userProfile?.first_name` ergibt `true`.

2. **Tax Returns temporaer leer**: Beim Wechsel von Tax Filern oder bei Navigation wird `taxReturns` kurzzeitig zu einem leeren Array, waehrend die neuen Daten geladen werden.

3. **Kombination fuehrt zum Consent-Screen**: `taxReturns.length === 0` + `!userProfile?.first_name` (weil Profil noch laedt) = TaxYearSelector wird angezeigt.

## Loesung

### Aenderung in `src/pages/UserTaxReturns.tsx`

**1. Profile-Loading in die TaxYearSelector-Guard einbeziehen**

Die Bedingung fuer den TaxYearSelector darf nur greifen, wenn das Profil tatsaechlich fertig geladen wurde:

```
// VORHER (Zeile 276):
if (!loading && taxReturns.length === 0 && !userProfile?.first_name) {
  return <TaxYearSelector ... />;
}

// NACHHER:
if (!loading && !profileLoading && taxReturns.length === 0 && !userProfile?.first_name) {
  return <TaxYearSelector ... />;
}
```

**2. Safety Timeout darf Profile-Loading nicht ueberspringen**

Der Safety Timeout auf Zeile 262 laesst aktuell das Rendering zu, selbst wenn `profileLoading` noch `true` ist. Das muss angepasst werden, damit der TaxYearSelector-Guard nicht mit unvollstaendigen Daten evaluiert wird:

```
// VORHER (Zeile 262):
if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading) && !safetyTimeout) {
  return <UserTaxReturnsSkeleton />;
}

// NACHHER - Profil-Loading separat behandeln:
// Skeleton zeigen waehrend Daten laden
if ((authLoading || loading || profileLoading || !isReady || taxFilerLoading) && !safetyTimeout) {
  return <UserTaxReturnsSkeleton />;
}

// Wenn Safety Timeout aktiv aber Profil noch laedt: Skeleton weiter zeigen
// (nur fuer die TaxYearSelector-Entscheidung relevant)
if (safetyTimeout && profileLoading && taxReturns.length === 0) {
  return <UserTaxReturnsSkeleton />;
}
```

### Zusammenfassung
- Zwei Zeilen werden angepasst in `src/pages/UserTaxReturns.tsx`
- Die TaxYearSelector-Guard prueft jetzt explizit, ob das Profil geladen ist
- Der Safety Timeout kann die Consent-Seite nicht mehr faelschlicherweise ausloesen
- Benutzer sehen schlimmstenfalls einen laengeren Skeleton-Screen statt der falschen Consent-Seite
