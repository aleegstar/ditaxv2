

# Plan: Vollständige tax_filer_id Trennung für /documents Route

## Problemursache

Die `/documents`-Route zeigt Dokumente aller Personen, weil:

1. **useCallback dependency fehlt**: `loadDocuments` nutzt `activeTaxFilerId` intern, aber es fehlt in der dependency-Liste
2. **useEffect reagiert nicht auf Personenwechsel**: Der Effect läuft nur bei Jahr-Änderung, nicht bei Person-Änderung
3. **Mehrere Komponenten ohne tax_filer_id Filterung**

---

## Betroffene Dateien

| Datei | Problem |
|-------|---------|
| `src/pages/Documents.tsx` | useCallback dependencies + useEffect |
| `src/components/documents/YearReassignmentModal.tsx` | SELECT ohne tax_filer_id |
| `src/components/documents/DocumentAssignmentModal.tsx` | SELECT ohne tax_filer_id |
| `src/components/DocumentUploader.tsx` | INSERT ohne tax_filer_id |

---

## Schritt 1: Documents.tsx - loadDocuments reparieren

**Problem**: Zeile 268 - `activeTaxFilerId` fehlt in dependencies

```text
// VORHER (Zeile 268)
}, [selectedYear, toast]);

// NACHHER
}, [selectedYear, toast, activeTaxFilerId]);
```

---

## Schritt 2: Documents.tsx - useEffect für Person-Wechsel

**Problem**: Zeile 280-284 reagiert nicht auf activeTaxFilerId

```text
// VORHER
useEffect(() => {
  if (mountedRef.current) {
    loadDocuments();
  }
}, [selectedYear, loadDocuments]);

// NACHHER - activeTaxFilerId als dependency
useEffect(() => {
  if (mountedRef.current) {
    loadDocuments();
  }
}, [selectedYear, loadDocuments, activeTaxFilerId]);
```

---

## Schritt 3: Documents.tsx - loadCompletedTaxYears mit tax_filer_id

**Zeile 210-228**: SELECT muss auch nach Person filtern

```text
// VORHER
.from('completed_tax_returns')
.select('tax_year')
.eq('user_id', user.id);

// NACHHER
let query = supabase
  .from('completed_tax_returns')
  .select('tax_year')
  .eq('user_id', user.id);

if (activeTaxFilerId) {
  query = query.eq('tax_filer_id', activeTaxFilerId);
}
```

---

## Schritt 4: YearReassignmentModal.tsx - tax_filer_id Filterung

**Zeile 56-62**: Import TaxFilerContext und filtern

```text
// Import hinzufügen
import { useTaxFiler } from '@/contexts/TaxFilerContext';

// Im Komponenten-Body
const { activeTaxFilerId } = useTaxFiler();

// In loadDocuments
let query = supabase
  .from('uploaded_documents')
  .select('*')
  .eq('user_id', user.id)
  .eq('tax_year', currentYear)
  .eq('status', 'active');

if (activeTaxFilerId) {
  query = query.eq('tax_filer_id', activeTaxFilerId);
}
```

---

## Schritt 5: DocumentAssignmentModal.tsx - tax_filer_id Filterung

**Zeile 76-82**: Import TaxFilerContext und filtern

```text
// Import hinzufügen
import { useTaxFiler } from '@/contexts/TaxFilerContext';

// Im Komponenten-Body
const { activeTaxFilerId } = useTaxFiler();

// In loadDocuments
let query = supabase
  .from('uploaded_documents')
  .select('*')
  .eq('user_id', user.id)
  .eq('tax_year', taxYear)
  .eq('status', 'active');

if (activeTaxFilerId) {
  query = query.eq('tax_filer_id', activeTaxFilerId);
}
```

---

## Schritt 6: DocumentUploader.tsx - tax_filer_id beim Insert

**Zeile 190-206**: tax_filer_id mit speichern

```text
// Import hinzufügen (falls noch nicht vorhanden)
import { useTaxFiler } from '@/contexts/TaxFilerContext';

// Im Komponenten-Body
const { activeTaxFilerId } = useTaxFiler();

// In insert
.insert({
  user_id: userId,
  tax_filer_id: activeTaxFilerId || null,  // NEU
  checklist_item_id: checklistItem.id,
  file_name: fileWithPreview.file.name,
  ...
})
```

---

## Zusammenfassung der Änderungen

| Datei | Änderungstyp |
|-------|--------------|
| `Documents.tsx` | useCallback deps + useEffect deps + loadCompletedTaxYears |
| `YearReassignmentModal.tsx` | Context + Query Filter |
| `DocumentAssignmentModal.tsx` | Context + Query Filter |
| `DocumentUploader.tsx` | Context + Insert |

---

## Ergebnis

Nach dieser Implementierung:
- Dokumente werden nur für die ausgewählte Person angezeigt
- Uploads werden der richtigen Person zugeordnet
- Jahres-Neuzuordnung funktioniert personenspezifisch
- Wechsel zwischen Personen lädt automatisch die richtigen Dokumente

