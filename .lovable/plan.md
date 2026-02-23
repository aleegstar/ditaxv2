

## Problem

Es gibt zwei zusammenhaengende Probleme:

1. **Admin-Upload setzt kein `tax_filer_id`**: Wenn ein Admin eine fertige Steuererklaerung hochlaedt (`CompletedTaxReturnManager.tsx`), wird die `tax_filer_id` nicht mitgespeichert. Der Datensatz hat daher `tax_filer_id: null`.

2. **User-Dashboard filtert nach `tax_filer_id`**: Der Hook `use-tax-year-data.ts` filtert `completed_tax_returns` mit `.eq('tax_filer_id', taxFilerId)`. Da der Datensatz `null` hat, wird er fuer Leano (und auch Sandro) nicht angezeigt.

Aktueller Zustand in der Datenbank:
- Leanos Upload (Galaxus_Kaufbeleg): `tax_filer_id = null` -- wird nirgends angezeigt
- Sandros Upload (Formularangaben): `tax_filer_id = 598fc1ec...` (Sandro) -- korrekt

## Loesung

### 1. `CompletedTaxReturnManager.tsx` -- `tax_filer_id` beim Upload mitsenden

- Die Komponente erhaelt `selectedTaxFilerId` als neuen Prop (wird bereits in `UserTabs.tsx` verwendet)
- Beim Insert in die `completed_tax_returns`-Tabelle wird `tax_filer_id: selectedTaxFilerId` mitgegeben
- Beim Update der `tax_returns`-Tabelle wird ebenfalls nach `tax_filer_id` gefiltert

### 2. `UserTabs.tsx` -- `selectedTaxFilerId` an `CompletedTaxReturnManager` weitergeben

- Der bestehende Prop `selectedTaxFilerId` wird an die `CompletedTaxReturnManager`-Komponente durchgereicht

### 3. Bestehenden Datensatz korrigieren

- SQL-Update um den vorhandenen Datensatz (`b43964f3...`) mit Leanos `tax_filer_id` (`a1454d06...`) zu aktualisieren

## Technische Details

**Datei: `src/components/user-detail/CompletedTaxReturnManager.tsx`**
- Neuer Prop: `selectedTaxFilerId?: string | null`
- Insert-Statement erweitern um `tax_filer_id: selectedTaxFilerId`
- Update-Query fuer `tax_returns` um `.eq('tax_filer_id', selectedTaxFilerId)` erweitern (falls vorhanden)

**Datei: `src/components/user-detail/UserTabs.tsx`**
- `selectedTaxFilerId` als Prop an `CompletedTaxReturnManager` weitergeben

**SQL-Migration:**
```sql
UPDATE completed_tax_returns 
SET tax_filer_id = 'a1454d06-b958-4e87-905f-bbe628ee53ee'
WHERE id = 'b43964f3-8a67-4a3d-91dd-502800caec6a';
```

Nach dieser Aenderung:
- Wird der Admin beim Upload immer die richtige Person zuordnen
- Wird der User die Steuererklaerung sehen und signieren koennen
- Wird der bestehende Datensatz fuer Leano sofort sichtbar

