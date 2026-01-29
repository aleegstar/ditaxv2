
# Plan: Tax Filer ID Filterung im gesamten System überprüfen und korrigieren

## Analyse-Ergebnis

Nach eingehender Prüfung des Codes habe ich folgende Bereiche identifiziert, in denen die `tax_filer_id` fehlt oder inkorrekt gehandhabt wird:

---

## Problemübersicht

| Bereich | Status | Problem |
|---------|--------|---------|
| `useTaxYearData` Hook | ✅ Korrigiert | Bereits in vorherigem Schritt behoben |
| `UserTaxReturns` (Erstellung) | ✅ Korrigiert | Bereits in vorherigem Schritt behoben |
| `FormContext` (form_data, form_progress) | ✅ Vorhanden | `activeTaxFilerId` wird korrekt verwendet |
| `DocumentService.fetchDocuments` | ✅ Vorhanden | `taxFilerId` wird korrekt gefiltert |
| `/documents` Page - Direktupload | ❌ Fehlt | `tax_filer_id` fehlt beim Insert |
| `/documents` Page - Laden | ❌ Fehlt | `tax_filer_id` fehlt beim Select |
| `EncryptedDocumentService` | ❌ Fehlt | `tax_filer_id` fehlt beim Insert |
| `EnhancedDocumentUploader` | ❌ Fehlt | `tax_filer_id` wird nicht übergeben |
| `InlineDocumentUploader` | ❌ Fehlt | `tax_filer_id` wird nicht übergeben |
| `DocumentUploader` | ❌ Fehlt | `tax_filer_id` wird nicht übergeben |

---

## Erforderliche Änderungen

### 1. EncryptedDocumentService erweitern
**Datei:** `src/services/EncryptedDocumentService.ts`

Die `uploadEncryptedDocument` Methode muss einen neuen Parameter `taxFilerId` akzeptieren:

```text
// Vorher (Zeile 61-67)
async uploadEncryptedDocument(
  file: File,
  checklistItemId: string | null,
  userId: string,
  taxYear: string,
  checklistItemTitle?: string
)

// Nachher
async uploadEncryptedDocument(
  file: File,
  checklistItemId: string | null,
  userId: string,
  taxYear: string,
  checklistItemTitle?: string,
  taxFilerId?: string | null
)
```

Und beim Insert (Zeile 119-141):
```text
.insert({
  ...
  tax_filer_id: taxFilerId || null,
  ...
})
```

---

### 2. EnhancedDocumentUploader anpassen
**Datei:** `src/components/EnhancedDocumentUploader.tsx`

- Import `useTaxFiler` aus dem Context
- `activeTaxFilerId` beim Upload übergeben

```text
// Neue Import
import { useTaxFiler } from '@/contexts/TaxFilerContext';

// Im Komponenten-Body
const { activeTaxFilerId } = useTaxFiler();

// Beim Upload (Zeile 354-360)
await encryptedDocService.uploadEncryptedDocument(
  fileWithPreview.file, 
  checklistItem?.id || null, 
  userId, 
  taxYear,
  checklistItem?.title,
  activeTaxFilerId  // Neu
);
```

---

### 3. InlineDocumentUploader anpassen
**Datei:** `src/components/InlineDocumentUploader.tsx`

Gleiche Änderung wie EnhancedDocumentUploader:
- `useTaxFiler` importieren
- `activeTaxFilerId` übergeben

---

### 4. DocumentUploader anpassen
**Datei:** `src/components/DocumentUploader.tsx`

Gleiche Änderung wie EnhancedDocumentUploader:
- `useTaxFiler` importieren
- `activeTaxFilerId` übergeben

---

### 5. Documents Page - Direktupload korrigieren
**Datei:** `src/pages/Documents.tsx`

Beim direkten Upload (Zeile 361-370) fehlt `tax_filer_id`:

```text
// Vorher
.insert({
  user_id: user.id,
  file_name: file.name,
  file_type: file.type,
  file_path: filePath,
  tax_year: selectedYear,
  status: 'active',
  is_assigned_to_checklist: false,
  document_category: 'upload'
})

// Nachher
.insert({
  user_id: user.id,
  tax_filer_id: activeTaxFilerId,  // Neu
  file_name: file.name,
  ...
})
```

---

### 6. Documents Page - Laden korrigieren
**Datei:** `src/pages/Documents.tsx`

Beim Laden der Dokumente (Zeile 241-246) fehlt die Filterung:

```text
// Vorher
.eq('user_id', user.id)
.eq('tax_year', selectedYear)
.eq('status', 'active')

// Nachher
.eq('user_id', user.id)
.eq('tax_year', selectedYear)
.eq('tax_filer_id', activeTaxFilerId)  // Neu
.eq('status', 'active')
```

---

### 7. Documents Page - Context Integration
**Datei:** `src/pages/Documents.tsx`

Die `DocumentsContent` Komponente muss Zugriff auf den TaxFilerContext erhalten:

```text
// Import hinzufügen
import { useTaxFiler } from '@/contexts/TaxFilerContext';

// In DocumentsContent
const { activeTaxFilerId } = useTaxFiler();
```

---

## Admin-Bereich

Der Admin-Bereich (`/admin`) zeigt Daten **aller Benutzer** an und ist daher nicht von der Tax Filer Filterung betroffen. Die Admin-Ansichten zeigen:
- Alle Benutzer mit ihren Steuererklärungen
- Fehlende Dokumente aller Benutzer
- Signierte Steuererklärungen aller Benutzer

Dies ist korrekt, da Admins den Überblick über alle Daten benötigen.

---

## Zusammenfassung der zu ändernden Dateien

| Datei | Änderungstyp |
|-------|--------------|
| `src/services/EncryptedDocumentService.ts` | Parameter + Insert erweitern |
| `src/components/EnhancedDocumentUploader.tsx` | Context nutzen, Parameter übergeben |
| `src/components/InlineDocumentUploader.tsx` | Context nutzen, Parameter übergeben |
| `src/components/DocumentUploader.tsx` | Context nutzen, Parameter übergeben |
| `src/pages/Documents.tsx` | Context nutzen, Query + Insert erweitern |

---

## Ergebnis nach Implementierung

Nach diesen Änderungen:
- Jeder Tax Filer hat seine eigenen Dokumente
- Dokument-Uploads werden korrekt der ausgewählten Person zugeordnet
- Beim Wechsel der Person werden nur deren Dokumente angezeigt
- Die Dokumenten-Checkliste ist personenspezifisch
