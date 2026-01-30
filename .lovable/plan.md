
# Plan: Dokumentenanzeige für Multi-Person Tax Filers korrigieren

## Problem

Im Admin-Bereich werden Leano's hochgeladene Dokumente nicht angezeigt, obwohl sie in der Datenbank existieren.

## Ursachenanalyse

### Datensituation
| Datentyp | Leano's tax_year |
|----------|------------------|
| tax_returns | 2024 |
| uploaded_documents | 2026, 2033 |

Leano's Dokumente wurden mit `tax_year: 2026` hochgeladen, aber die URL zeigt `year=2024`.

### Code-Probleme

**Problem 1: `transformDocuments()` in UserDetail.tsx (Zeile 506-514)**
```tsx
// Filtert Dokumente BEVOR sie zu UserTabs kommen
const filteredDocs = docs.filter(doc => {
  const yearMatch = doc.tax_year === selectedYear;
  const filerMatch = !selectedTaxFilerId || doc.tax_filer_id === selectedTaxFilerId;
  return yearMatch && filerMatch;
});
```
Wenn `selectedYear = 2024` und Dokumente `tax_year = 2026` haben, werden sie aussortiert.

**Problem 2: `tax_filer_id` fehlt im transformierten Dokument (Zeile 518-527)**
```tsx
return filteredDocs.map(doc => ({
  id: doc.id,
  checklistItemId: doc.checklist_item_id,
  fileName: doc.file_name,
  fileType: doc.file_type,
  url: doc.file_path,
  uploadDate: new Date(doc.upload_date),
  metadata: (doc as any).metadata || {},
  tax_year: doc.tax_year
  // tax_filer_id FEHLT!
}));
```

**Problem 3: Doppelte Filterung**
- `UserDetail.tsx` filtert die Dokumente
- `UserTabs.tsx` filtert nochmals (Zeile 150-156)

## Lösung

### Schritt 1: UserDetail.tsx - transformDocuments anpassen

Die Filterung aus `transformDocuments()` entfernen und alle Dokumente ungefiltert übergeben. Die Filterung erfolgt dann nur in `UserTabs.tsx`:

```tsx
const transformDocuments = (docs: Document[]) => {
  // KEINE Filterung hier - alle Dokumente durchreichen
  // Filterung erfolgt in UserTabs.tsx
  return docs.map(doc => ({
    id: doc.id,
    checklistItemId: doc.checklist_item_id,
    fileName: doc.file_name,
    fileType: doc.file_type,
    url: doc.file_path,
    uploadDate: new Date(doc.upload_date),
    metadata: (doc as any).metadata || {},
    tax_year: doc.tax_year,
    tax_filer_id: doc.tax_filer_id  // NEU: tax_filer_id mitgeben
  }));
};
```

### Schritt 2: UserTabs.tsx - availableYears erweitern

Dokument-Jahre zur Jahresauswahl hinzufügen:

```tsx
const availableYears = useMemo(() => {
  const years = new Set<string>();

  // ... bestehender Code für taxReturns, allFormData, completedTaxReturns ...

  // NEU: Jahre aus Dokumenten hinzufügen
  if (user.documents) {
    user.documents.forEach(doc => {
      if ((doc as any).tax_year) {
        years.add(String((doc as any).tax_year));
      }
    });
  }

  // ... Rest bleibt gleich ...
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
}, [taxReturns, allFormData, completedTaxReturns, user.documents]);
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/pages/UserDetail.tsx` | Filterung aus `transformDocuments` entfernen, `tax_filer_id` hinzufügen |
| `src/components/user-detail/UserTabs.tsx` | `availableYears` mit Dokument-Jahren erweitern |

## Technische Details

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Dokument-Filterung Ort | Doppelt (UserDetail + UserTabs) | Nur in UserTabs |
| tax_filer_id in Dokumenten | Fehlt | Vorhanden |
| availableYears inkl. Dokumente | Nein | Ja |

## Erwartetes Ergebnis

1. Admin wählt Leano aus dem Dropdown
2. Alle verfügbaren Jahre (inkl. 2026 aus Dokumenten) sind im Dropdown sichtbar
3. Admin wechselt zu Jahr 2026
4. Leano's Dokumente (Zins- und Saldobescheinigung, Deckblatt) werden angezeigt
5. Bei Jahr 2024 werden keine Dokumente angezeigt (weil keine für 2024 existieren)
