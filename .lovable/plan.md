
# Plan: Steuerdaten nach ausgewählter Person filtern

## Problem
Wenn du die Person wechselst, werden weiterhin dieselben Steuererklärungen (2029, 2028) mit demselben Fortschritt (25%) angezeigt. Das liegt daran, dass die Datenabfrage nur nach Benutzer-ID filtert, nicht nach der ausgewählten Person.

## Lösung
Die `useTaxYearData`-Hook muss die `activeTaxFilerId` aus dem `TaxFilerContext` verwenden, um alle Abfragen nach der ausgewählten Person zu filtern.

---

## Technische Änderungen

### 1. Hook erweitern: `useTaxYearData`
**Datei:** `src/hooks/use-tax-year-data.ts`

Die Hook erhält einen zusätzlichen Parameter `taxFilerId` und filtert alle Datenbankabfragen danach:

```text
// Vorher
export const useTaxYearData = (userId: string | null)

// Nachher
export const useTaxYearData = (userId: string | null, taxFilerId: string | null)
```

Betroffene Abfragen:
| Tabelle | Änderung |
|---------|----------|
| `tax_returns` | `.eq('tax_filer_id', taxFilerId)` hinzufügen |
| `form_progress` | `.eq('tax_filer_id', taxFilerId)` hinzufügen |
| `form_data` | `.eq('tax_filer_id', taxFilerId)` hinzufügen |
| `uploaded_documents` | `.eq('tax_filer_id', taxFilerId)` hinzufügen |
| `completed_tax_returns` | `.eq('tax_filer_id', taxFilerId)` hinzufügen |

### 2. UserTaxReturns anpassen
**Datei:** `src/pages/UserTaxReturns.tsx`

Die Seite muss die `activeTaxFilerId` aus dem Context an die Hook übergeben:

```text
// Vorher
const { taxReturns, ... } = useTaxYearData(userId);

// Nachher
const { activeTaxFilerId } = useTaxFiler();
const { taxReturns, ... } = useTaxYearData(userId, activeTaxFilerId);
```

### 3. Reaktive Aktualisierung
Wenn der Benutzer die Person wechselt:
1. `activeTaxFilerId` ändert sich im Context
2. Die Hook erkennt die Änderung und lädt die Daten neu
3. Die UI zeigt die korrekten Steuererklärungen und Fortschritte für diese Person

---

## Betroffene Dateien
| Datei | Änderung |
|-------|----------|
| `src/hooks/use-tax-year-data.ts` | `taxFilerId` Parameter hinzufügen, alle Queries filtern |
| `src/pages/UserTaxReturns.tsx` | `activeTaxFilerId` an Hook übergeben |

---

## Ergebnis
Nach dieser Änderung:
- Jede Person hat ihre eigenen Steuererklärungen
- Der Fortschritt wird pro Person separat berechnet
- Beim Wechsel der Person werden die korrekten Daten geladen
