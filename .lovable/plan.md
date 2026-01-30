
# Plan: UserTabs mit tax_filer_id Filter erweitern

## Problem

Die `UserTabs`-Komponente filtert die Formulardaten und Dokumente nur nach `selectedYear`, aber ignoriert `selectedTaxFilerId`. Dadurch werden bei Leano's Steuererklärung auch Sandro's Daten angezeigt.

## Ursache

In `src/components/user-detail/UserTabs.tsx`:
- **Zeile 120-139**: `formDataForSelectedYear` filtert nur nach `tax_year`
- **Zeile 142+**: `documentsForSelectedYear` filtert nur nach `tax_year`

Die Komponente erhält zwar `allFormData`, aber keinen `selectedTaxFilerId` Parameter.

## Lösung

### 1. UserTabs-Props erweitern

```tsx
interface UserTabsProps {
  user: User;
  taxReturns: TaxReturn[];
  onTaxReturnClick: (taxReturn: TaxReturn) => void;
  onUploadClick: () => void;
  userId: string;
  allFormData: any[];
  onYearChange: (year: string) => void;
  initialNotes: string;
  selectedYear: string;
  selectedTaxFilerId: string | null;  // NEU
  completedTaxReturns?: any[];
  onCompletedTaxReturnsRefresh?: () => void;
}
```

### 2. formDataForSelectedYear mit tax_filer_id filtern

```tsx
const formDataForSelectedYear = useMemo(() => {
  // Filter form data by selected year AND tax_filer_id
  const filteredData = allFormData.filter(item => {
    const yearMatch = String(item.tax_year) === String(selectedYear);
    const filerMatch = !selectedTaxFilerId || item.tax_filer_id === selectedTaxFilerId;
    return yearMatch && filerMatch;
  });

  // Transform array into structured FormData object
  const transformedData = { ...defaultFormData };
  filteredData.forEach(item => {
    if (item.form_type && item.data) {
      transformedData[item.form_type as keyof typeof transformedData] = {
        ...transformedData[item.form_type as keyof typeof transformedData],
        ...item.data
      };
    }
  });
  return transformedData;
}, [allFormData, selectedYear, selectedTaxFilerId]);
```

### 3. documentsForSelectedYear mit tax_filer_id filtern

```tsx
const documentsForSelectedYear = useMemo(() => {
  if (!user.documents) return [];

  return user.documents.filter(doc => {
    const yearMatch = (doc as any).tax_year 
      ? String((doc as any).tax_year) === String(selectedYear)
      : true;
    const filerMatch = !selectedTaxFilerId || (doc as any).tax_filer_id === selectedTaxFilerId;
    return yearMatch && filerMatch;
  });
}, [user.documents, selectedYear, selectedTaxFilerId]);
```

### 4. UserDetail.tsx: selectedTaxFilerId an UserTabs übergeben

```tsx
<UserTabs
  user={transformedUser}
  taxReturns={taxReturns}
  onTaxReturnClick={handleTaxReturnClick}
  onUploadClick={handleUploadClick}
  userId={user.id}
  allFormData={formData}
  onYearChange={handleYearChange}
  initialNotes={user.admin_notes || ''}
  selectedYear={selectedYear}
  selectedTaxFilerId={selectedTaxFilerId}  // NEU
  completedTaxReturns={completedTaxReturns}
  onCompletedTaxReturnsRefresh={fetchUserData}
/>
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/user-detail/UserTabs.tsx` | Props erweitern, Filter für formData und documents anpassen |
| `src/pages/UserDetail.tsx` | `selectedTaxFilerId` an UserTabs übergeben |

## Technische Details

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| formDataForSelectedYear Filter | nur `tax_year` | `tax_year` + `tax_filer_id` |
| documentsForSelectedYear Filter | nur `tax_year` | `tax_year` + `tax_filer_id` |
| UserTabs Props | kein `selectedTaxFilerId` | `selectedTaxFilerId: string \| null` |

## Erwartetes Ergebnis

Nach der Implementierung:
1. Admin wählt Leano aus dem Dropdown
2. `selectedTaxFilerId` wird an UserTabs übergeben
3. `formDataForSelectedYear` filtert nach Leano's `tax_filer_id`
4. Admin sieht nur Leano's Kontaktinformationen, Abzüge, etc.
5. Wechsel zu Sandro zeigt nur Sandro's Daten
