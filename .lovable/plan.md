
# Fix: Session-Problem — Falscher Redirect zum Consent-Screen

## Problem-Analyse

Das Kernproblem ist eine **Race Condition** zwischen drei asynchronen Datenquellen in `UserTaxReturns.tsx`:

1. **`useProfile`** — ladt das Benutzerprofil (inkl. `first_name`)
2. **`useTaxFiler`** — ladt die `activeTaxFilerId`
3. **`useTaxYearData`** — ladt Steuererklarungen basierend auf `userId` + `activeTaxFilerId`

### Ablauf des Bugs

```text
Frame 1: activeTaxFilerId = null
         -> useTaxYearData setzt loading=false, taxReturns=[]
         (Zeile 57-59 in use-tax-year-data.ts)

Frame 2: activeTaxFilerId wird gesetzt
         -> Neuer loadTaxYearData Callback, useEffect plant Ausfuhrung

ZWISCHEN Frame 1 und Frame 2:
  loading=false, taxReturns=[], profileLoading=false
  -> Zeile 282 evaluiert zu TRUE
  -> TaxYearSelector ("Schon das du da bist") wird angezeigt!
```

Das Reset-Logic in `use-tax-year-data.ts` (Zeile 36-54) fangt diesen Fall nicht ab, weil die Bedingung `previousTaxFilerIdRef.current !== null` bei null-zu-Wert-Ubergangen `false` ergibt — kein Reset auf `loading: true` erfolgt.

## Losung (3 Massnahmen)

### 1. `use-tax-year-data.ts` — Loading-State bei fehlendem taxFilerId nicht auf false setzen

Wenn `taxFilerId` noch `null` ist, soll `loading: true` bleiben, damit der Skeleton-Screen weiter angezeigt wird.

### 2. `use-tax-year-data.ts` — Reset auch bei null-zu-Wert-Ubergang auslosen

Die Bedingung andern, sodass auch der Wechsel von `null` zu einem echten Wert den Reset auf `loading: true` triggert.

### 3. `UserTaxReturns.tsx` — Zusatzliche Guards fur TaxYearSelector

Zwei weitere Absicherungen:
- **Guard A**: Wenn `activeTaxFilerId` noch nicht verfugbar ist, Skeleton zeigen (nicht TaxYearSelector)
- **Guard B**: Prufung auf `terms_accepted_at` im Profil — wenn bereits vorhanden, ist der User kein Neuer und der Consent-Screen wird ubersprungen, auch wenn `first_name` leer sein sollte

Die Zeile 282 wird zu:
```
if (!loading && !profileLoading && activeTaxFilerId && taxReturns.length === 0 
    && !userProfile?.first_name && !userProfile?.terms_accepted_at) {
```

Dazu muss `useProfile` auch `terms_accepted_at` aus der Datenbank laden.

### 4. `useProfile.ts` — `terms_accepted_at` zum Profil-Interface hinzufugen

Das Feld `terms_accepted_at` wird aus der DB geladen und im Profile-Interface bereitgestellt.

## Technische Details

| Datei | Anderung |
|-------|----------|
| `src/hooks/use-tax-year-data.ts` | Loading bleibt `true` bei `taxFilerId=null`; Reset bei null-zu-Wert |
| `src/hooks/useProfile.ts` | `terms_accepted_at` ins Interface + Query aufnehmen |
| `src/pages/UserTaxReturns.tsx` | Guards: `activeTaxFilerId`-Check + `terms_accepted_at`-Check |

## Erwartetes Ergebnis

- Bestehende Benutzer sehen **nie** den Consent-Screen beim normalen Laden
- Neue Benutzer (ohne `first_name` UND ohne `terms_accepted_at`) sehen den Consent-Screen korrekt
- Der Skeleton-Screen bleibt sichtbar, bis alle Daten geladen sind
