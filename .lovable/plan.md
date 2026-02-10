

## Problem: Steuerjahr wird nicht an die Zahlungsseite übergeben

### Ursache

Alle Navigationen zur `/payment`-Seite übergeben den `year`-Parameter **nicht** in der URL. Die Payment-Seite hat als Fallback `(new Date().getFullYear() - 1)` = **2025**. Wenn du also für 2029 bezahlst, wird trotzdem 2025 verwendet.

Betroffene Stellen:

| Datei | Zeile | Aktuell | Problem |
|-------|-------|---------|---------|
| `DocumentChecklist.tsx` | 102 | `navigate('/payment')` | Kein year |
| `DocumentChecklist.tsx` | 721 | `navigate('/payment')` | Kein year |
| `TaxYearDashboard.tsx` | 183 | `navigate('/payment')` | Kein year |
| `OrderHeader.tsx` | 37 | `navigate('/payment')` | Kein year |

Alle diese Komponenten haben `taxYear` bereits verfügbar.

### Lösung

Jede Navigation zur Payment-Seite mit `?year=${taxYear}` ergänzen:

**1. `src/components/DocumentChecklist.tsx`**
- Zeile 102: `navigate('/payment')` -> `navigate(`/payment?year=${taxYear}`)`
- Zeile 721: `navigate('/payment')` -> `navigate(`/payment?year=${taxYear}`)`

**2. `src/components/TaxYearDashboard.tsx`**
- Zeile 183: `navigate('/payment')` -> `navigate(`/payment?year=${taxYear}`)`

**3. `src/components/tax-tracking/OrderHeader.tsx`**
- Zeile 37: `navigate('/payment')` -> mit dem korrekten `taxYear` aus Props oder Context ergänzen

Damit wird das korrekte Steuerjahr durch den gesamten Zahlungsfluss weitergegeben: Navigation -> Payment-Seite -> Edge Function -> Success-URL.
