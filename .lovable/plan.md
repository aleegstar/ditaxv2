
# Plan: Steuererklärung-Erstellung nach Tax Filer filtern

## Problem
Beim Erstellen einer neuen Steuererklärung für eine zweite Person erscheint die Fehlermeldung "Steuererklärung für 2024 existiert bereits", obwohl die erste Person die Steuererklärung besitzt, nicht die zweite.

## Ursache
In der `createNewTaxReturn` Funktion in `src/pages/UserTaxReturns.tsx`:

1. **Duplikat-Prüfung** (Zeile 209): Prüft nur `user_id` und `tax_year` - die `tax_filer_id` fehlt
2. **INSERT-Statement** (Zeilen 219-225): Enthält keine `tax_filer_id`

---

## Lösung

### Datei: `src/pages/UserTaxReturns.tsx`

#### 1. Duplikat-Prüfung erweitern
```text
// Vorher (Zeile 209)
.eq('user_id', userId).eq('tax_year', year)

// Nachher
.eq('user_id', userId).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId)
```

#### 2. INSERT mit tax_filer_id
```text
// Vorher (Zeilen 219-225)
.insert({
  user_id: userId,
  tax_year: year,
  status: 'pending',
  payment_status: 'pending',
  workflow_step: 'data_collection'
})

// Nachher
.insert({
  user_id: userId,
  tax_filer_id: activeTaxFilerId,
  tax_year: year,
  status: 'pending',
  payment_status: 'pending',
  workflow_step: 'data_collection'
})
```

---

## Betroffene Datei
| Datei | Änderung |
|-------|----------|
| `src/pages/UserTaxReturns.tsx` | `tax_filer_id` bei Duplikat-Check und INSERT hinzufügen |

---

## Ergebnis
Nach dieser Änderung:
- Jede Person kann ihre eigene Steuererklärung für dasselbe Jahr haben
- Die Duplikat-Prüfung berücksichtigt die ausgewählte Person
- Neue Steuererklärungen werden korrekt der ausgewählten Person zugeordnet
