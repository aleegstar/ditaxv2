
# Plan: Admin-Ansicht für Multi-Person-Steuererklärungen korrigieren

## Problem

Wenn Leano (Kind) eine Steuererklärung einreicht, zeigt der Admin unter `/admin/user/:id` die Daten von Sandro (Hauptbenutzer) statt Leano's Daten.

## Ursache

Die Admin-Komponenten berücksichtigen `tax_filer_id` nicht:

1. **`TaxReturnCreation.tsx`** (Zeile 434): Verlinkt nur mit `user_id` und `year`:
   ```tsx
   <Link to={`/admin/user/${taxReturn.user_id}?year=${taxReturn.tax_year}`}>
   ```

2. **`UserDetail.tsx`** (Zeile 212-215): Filtert `form_data` nur nach `user_id`:
   ```tsx
   const { data: formDataResponse } = await supabase
     .from('form_data')
     .select('*')
     .eq('user_id', userId);
   ```

3. **`transformFormDataArray`** (Zeile 432-455): Filtert nur nach `tax_year`, nicht nach `tax_filer_id`:
   ```tsx
   const yearFilteredData = formDataArray.filter(item => {
     return item.tax_year === selectedYear;
   });
   ```

## Datenstruktur im aktuellen Fall

- Benutzer `604af39e-...` hat 2 Steuerpflichtige:
  - Sandro (`598fc1ec-...`) - primary
  - Leano (`a1454d06-...`) - Kind
  
- Leano's Tax Return (`6c853f7d-...`) hat `tax_filer_id: a1454d06-...`
- Leano's `form_data` hat `tax_filer_id: a1454d06-...`
- Aber Admin sieht Sandro's Daten, weil kein `tax_filer_id`-Filter aktiv ist

## Lösung

### 1. TaxReturnCreation.tsx anpassen

`tax_filer_id` zur URL hinzufügen:

```tsx
// Vorher (Zeile 434)
<Link to={`/admin/user/${taxReturn.user_id}?year=${taxReturn.tax_year}`}>

// Nachher
<Link to={`/admin/user/${taxReturn.user_id}?year=${taxReturn.tax_year}&filer=${taxReturn.tax_filer_id}`}>
```

### 2. UserDetail.tsx anpassen

**a) URL-Parameter auslesen:**
```tsx
const urlYear = searchParams.get('year');
const urlTaxFilerId = searchParams.get('filer');  // NEU
```

**b) State für ausgewählten Tax Filer:**
```tsx
const [selectedTaxFilerId, setSelectedTaxFilerId] = useState<string | null>(urlTaxFilerId);
const [taxFilers, setTaxFilers] = useState<any[]>([]);
```

**c) Tax Filers laden:**
```tsx
const { data: taxFilersData } = await supabase
  .from('tax_filers')
  .select('id, first_name, last_name, is_primary, relationship')
  .eq('user_id', userId);

setTaxFilers(taxFilersData || []);

// Falls kein filer-Parameter: primären Tax Filer auswählen
if (!urlTaxFilerId && taxFilersData?.length > 0) {
  const primary = taxFilersData.find(f => f.is_primary);
  setSelectedTaxFilerId(primary?.id || taxFilersData[0].id);
} else if (urlTaxFilerId) {
  setSelectedTaxFilerId(urlTaxFilerId);
}
```

**d) transformFormDataArray mit tax_filer_id filtern:**
```tsx
const transformFormDataArray = (formDataArray: any[]) => {
  const merged = { ...defaultFormData };
  if (formDataArray?.length > 0) {
    // Filter nach Jahr UND tax_filer_id
    const filteredData = formDataArray.filter(item => {
      const yearMatch = item.tax_year === selectedYear;
      const filerMatch = !selectedTaxFilerId || item.tax_filer_id === selectedTaxFilerId;
      return yearMatch && filerMatch;
    });
    // ... Rest bleibt gleich
  }
  return merged;
};
```

### 3. Header mit Tax Filer Selector erweitern

Im Header-Bereich einen Dropdown für den Tax Filer hinzufügen:

```tsx
{taxFilers.length > 1 && (
  <div className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-50/80 border border-slate-200/80">
    <select
      value={selectedTaxFilerId || ''}
      onChange={(e) => setSelectedTaxFilerId(e.target.value)}
      className="text-xs font-medium bg-transparent border-none outline-none cursor-pointer"
    >
      {taxFilers.map(filer => (
        <option key={filer.id} value={filer.id}>
          {filer.first_name} {filer.last_name} 
          {filer.is_primary ? ' (Hauptperson)' : ''}
        </option>
      ))}
    </select>
  </div>
)}
```

### 4. Dokumente ebenfalls nach tax_filer_id filtern

In `transformDocuments`:
```tsx
const transformDocuments = (docs: Document[]) => {
  const yearFilteredDocs = docs.filter(doc => {
    if (!doc.tax_year) return false;
    const yearMatch = doc.tax_year === selectedYear;
    const filerMatch = !selectedTaxFilerId || doc.tax_filer_id === selectedTaxFilerId;
    return yearMatch && filerMatch;
  });
  // ... Rest
};
```

### 5. TaxReturnCreation.tsx: Tax Filer Name anzeigen

Den Namen des Tax Filers in der Karte anzeigen:

```tsx
interface PaidTaxReturn {
  // ... bestehende Felder
  tax_filer_id: string;
  tax_filer_name: string;  // NEU
}

// Beim Laden:
const { data: taxFilerData } = await supabase
  .from('tax_filers')
  .select('first_name, last_name')
  .eq('id', taxReturn.tax_filer_id)
  .single();

return {
  ...taxReturn,
  tax_filer_name: taxFilerData 
    ? `${taxFilerData.first_name} ${taxFilerData.last_name}`
    : 'Unbekannt'
};
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/admin/TaxReturnCreation.tsx` | Tax Filer ID zur URL hinzufügen, Tax Filer Name laden/anzeigen |
| `src/pages/UserDetail.tsx` | URL-Parameter auslesen, Tax Filer State, Filter anpassen, Tax Filer Selector im Header |

## Erwartetes Ergebnis

Nach der Implementierung:
1. Admin klickt auf Leano's Steuererklärung
2. URL enthält `?year=2024&filer=a1454d06-...`
3. UserDetail lädt und zeigt Leano's Daten korrekt
4. Admin kann zwischen Sandro und Leano wechseln via Dropdown
5. Formulardaten und Dokumente werden korrekt nach Tax Filer gefiltert
