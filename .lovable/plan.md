
# Plan: Steuererklärungen und Definitive Rechnungen nach Tax Filer filtern

## Problem

Im Admin-Bereich bei `/admin/user/:id?year=2024&filer=...` werden für Leano (Kind):
- Steuererklärungen von Sandro (Hauptperson) angezeigt
- Definitive Rechnungen von Sandro angezeigt

Die Filterung nach `selectedTaxFilerId` fehlt in beiden Bereichen.

## Betroffene Code-Stellen

### 1. UserTabs.tsx - Steuererklärungen (tax-returns Tab)

**Zeile 482**: `taxReturns` wird nur nach Jahr gefiltert:
```tsx
taxReturns.filter(taxReturn => String(taxReturn.taxYear) === String(selectedYear))
```

**Zeile 521-527**: `completedTaxReturns` wird nur nach Jahr gefiltert:
```tsx
completedTaxReturns.filter(ctr => String(ctr.tax_year) === String(selectedYear))
```

### 2. UserDefinitiveTaxBill.tsx - Definitive Rechnungen

**Zeile 57-63**: Lädt alle Rechnungen nur nach `user_id`:
```tsx
const { data, error } = await supabase
  .from('definitive_tax_bills')
  .select('*')
  .eq('user_id', userId)
  .order('tax_year', { ascending: false });
```

Die Komponente kennt kein `selectedTaxFilerId`.

## Lösung

### Schritt 1: UserTabs.tsx - taxReturns und completedTaxReturns filtern

Zwei neue `useMemo` Hooks für gefilterte Daten:

```tsx
// Filter tax returns by year AND tax_filer_id
const taxReturnsForSelectedYear = useMemo(() => {
  return taxReturns.filter(tr => {
    const yearMatch = String(tr.taxYear) === String(selectedYear);
    const filerMatch = !selectedTaxFilerId || tr.tax_filer_id === selectedTaxFilerId;
    return yearMatch && filerMatch;
  });
}, [taxReturns, selectedYear, selectedTaxFilerId]);

// Filter completed tax returns by year AND tax_filer_id  
const completedReturnsForSelectedYear = useMemo(() => {
  return completedTaxReturns.filter(ctr => {
    const yearMatch = String(ctr.tax_year) === String(selectedYear);
    const filerMatch = !selectedTaxFilerId || ctr.tax_filer_id === selectedTaxFilerId;
    return yearMatch && filerMatch;
  });
}, [completedTaxReturns, selectedYear, selectedTaxFilerId]);
```

Diese werden dann überall im Tax-Returns Tab verwendet.

### Schritt 2: UserDefinitiveTaxBill.tsx - Props erweitern

```tsx
interface UserDefinitiveTaxBillProps {
  userId: string;
  isAdmin?: boolean;
  selectedTaxFilerId?: string | null;  // NEU
  selectedYear?: string;  // NEU für Konsistenz
}
```

### Schritt 3: UserDefinitiveTaxBill.tsx - Filterung hinzufügen

```tsx
// Gefilterte Rechnungen basierend auf selectedTaxFilerId
const filteredBills = useMemo(() => {
  if (!selectedTaxFilerId) return bills;
  // Hinweis: definitive_tax_bills hat aktuell kein tax_filer_id Feld
  // Falls das Feld nicht existiert, zeigen wir alle an
  return bills.filter(bill => {
    // Falls tax_filer_id existiert, filtern
    if ((bill as any).tax_filer_id) {
      return (bill as any).tax_filer_id === selectedTaxFilerId;
    }
    // Sonst alle anzeigen (Rückwärtskompatibilität)
    return true;
  });
}, [bills, selectedTaxFilerId]);
```

### Schritt 4: UserTabs.tsx - Props an UserDefinitiveTaxBill übergeben

```tsx
<UserDefinitiveTaxBill 
  userId={userId} 
  isAdmin={true}
  selectedTaxFilerId={selectedTaxFilerId}
  selectedYear={selectedYear}
/>
```

### Schritt 5: Datenbank-Feld prüfen

Die `definitive_tax_bills` Tabelle hat laut Schema kein `tax_filer_id` Feld. Falls Multi-Person-Support benötigt wird, müsste dieses Feld hinzugefügt werden. Für jetzt:

- Falls `tax_filer_id` in `definitive_tax_bills` fehlt: Alle Rechnungen werden für alle Tax Filers angezeigt (mit Hinweis)
- Falls vorhanden: Filterung wie geplant

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/user-detail/UserTabs.tsx` | Neue useMemo Hooks für gefilterte taxReturns/completedTaxReturns, Props an UserDefinitiveTaxBill übergeben |
| `src/components/user-detail/UserDefinitiveTaxBill.tsx` | Props erweitern, Filterlogik hinzufügen |

## Technische Details

| Bereich | Vorher | Nachher |
|---------|--------|---------|
| taxReturns Filter | nur `tax_year` | `tax_year` + `tax_filer_id` |
| completedTaxReturns Filter | nur `tax_year` | `tax_year` + `tax_filer_id` |
| UserDefinitiveTaxBill Props | `userId`, `isAdmin` | + `selectedTaxFilerId`, `selectedYear` |

## Erwartetes Ergebnis

1. Admin wählt Leano aus dem Dropdown
2. Im Tab "Steuererklärung": Nur Leano's Steuererklärungen werden angezeigt
3. Im Tab "Definitive Rechnungen": Nur Leano's Rechnungen (falls `tax_filer_id` vorhanden)
4. Wechsel zu Sandro zeigt entsprechend nur Sandro's Daten
