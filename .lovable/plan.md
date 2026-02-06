
# Plan: Upload-Problem in der Dokumenten-Checkliste beheben

## Ursache des Problems

Nach eingehender Analyse der Datenbank und des Codes wurde die Hauptursache identifiziert:

### Das Core-Problem

Das neueste hochgeladene Dokument hat `tax_filer_id = NULL`:
```
id: 28f8bd8a-6e3f-48ee-855a-f162c8afa724
tax_filer_id: <nil>  ← PROBLEM
tax_year: 2029
```

Während die Document-Abfrage nach einer spezifischen `tax_filer_id` filtert, was bedeutet:
- **Upload**: Dokument wird ohne TaxFilerId gespeichert
- **Abruf**: Query sucht nach Dokumenten MIT einer spezifischen TaxFilerId
- **Resultat**: Dokument wird nicht gefunden

### Warum passiert das?

1. Der TaxFilerContext nutzt `sessionStorage` für die Auswahl
2. Bei der Initialisierung kann `activeTaxFilerId` noch `null` sein
3. Der Upload-Hook speichert zu diesem Zeitpunkt das Dokument ohne TaxFilerId
4. Beim Refresh ist die TaxFilerId dann gesetzt, aber das Dokument matcht nicht

## Lösungsplan

### Änderung 1: TaxFilerId-Prüfung vor Upload
**Datei:** `src/hooks/use-inline-upload.ts`

Vor dem Start des Uploads prüfen, ob eine gültige TaxFilerId verfügbar ist. Wenn nicht, diese aus dem TaxFilerContext laden.

```typescript
// Vor dem Upload
const { data: sessionData } = await supabase.auth.getSession();
const userId = sessionData.session.user.id;

// Fallback: TaxFilerId aus sessionStorage oder DB laden wenn nicht vorhanden
let effectiveTaxFilerId = taxFilerIdRef.current;
if (!effectiveTaxFilerId) {
  effectiveTaxFilerId = sessionStorage.getItem('ditax_selected_tax_filer');
}
```

### Änderung 2: Document-Query toleranter machen
**Datei:** `src/services/DocumentService.ts`

Die Query so anpassen, dass sie auch Dokumente ohne TaxFilerId findet (OR-Bedingung):

```typescript
// Wenn taxFilerId vorhanden, auch Dokumente ohne TaxFilerId einschliessen
if (taxFilerId) {
  query = query.or(`tax_filer_id.eq.${taxFilerId},tax_filer_id.is.null`);
}
```

### Änderung 3: Migration für existierende Dokumente
**SQL-Migration** (wird im Supabase Dashboard ausgeführt)

Das betroffene Dokument nachträglich der korrekten TaxFilerId zuordnen:

```sql
-- Dokumente ohne tax_filer_id dem primären Tax Filer zuweisen
UPDATE uploaded_documents ud
SET tax_filer_id = (
  SELECT tf.id FROM tax_filers tf 
  WHERE tf.user_id = ud.user_id AND tf.is_primary = true 
  LIMIT 1
)
WHERE ud.tax_filer_id IS NULL 
AND ud.status = 'active';
```

### Änderung 4: Logging verbessern
**Datei:** `src/hooks/use-inline-upload.ts`

Detailliertes Logging hinzufügen um zu sehen, welche TaxFilerId beim Upload verwendet wird:

```typescript
console.log('[InlineUpload] Upload params:', {
  fileName: file.name,
  checklistItemId,
  taxFilerId: effectiveTaxFilerId || 'NONE - will be null',
  taxYear
});
```

## Technische Details

```text
┌─────────────────────────────────────────────────────────────┐
│              AKTUELLER FLOW (FEHLERHAFT)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User öffnet Checkliste                                  │
│       ↓                                                     │
│  2. TaxFilerContext lädt... activeTaxFilerId = null         │
│       ↓                                                     │
│  3. User wählt Datei aus                                    │
│       ↓                                                     │
│  4. Upload startet mit tax_filer_id = null ← PROBLEM        │
│       ↓                                                     │
│  5. TaxFilerContext fertig: activeTaxFilerId = "abc123"     │
│       ↓                                                     │
│  6. Refresh: Query WHERE tax_filer_id = "abc123"            │
│       ↓                                                     │
│  7. Dokument nicht gefunden (hat tax_filer_id = null)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              NEUER FLOW (KORRIGIERT)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User öffnet Checkliste                                  │
│       ↓                                                     │
│  2. TaxFilerContext lädt...                                 │
│       ↓                                                     │
│  3. User wählt Datei aus                                    │
│       ↓                                                     │
│  4a. Prüfe: Ist activeTaxFilerId vorhanden?                 │
│       ↓ NEIN                                                │
│  4b. Fallback: Lade aus sessionStorage                      │
│       ↓                                                     │
│  5. Upload mit korrekter tax_filer_id                       │
│       ↓                                                     │
│  6. Refresh: Query findet das Dokument                      │
│                                                             │
│  ALTERNATIV:                                                │
│  6. Query mit OR-Bedingung findet auch null-Dokumente       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/hooks/use-inline-upload.ts` | SessionStorage-Fallback für TaxFilerId hinzufügen |
| `src/services/DocumentService.ts` | Query um OR-Bedingung für null TaxFilerId erweitern |
| `src/hooks/use-inline-upload.ts` | Besseres Logging der Upload-Parameter |

## Sofortige Daten-Reparatur

Nach der Code-Änderung muss eine SQL-Query ausgeführt werden um das bereits hochgeladene Dokument zu reparieren:

```sql
UPDATE uploaded_documents 
SET tax_filer_id = (
  SELECT id FROM tax_filers 
  WHERE user_id = uploaded_documents.user_id 
  AND is_primary = true 
  LIMIT 1
)
WHERE tax_filer_id IS NULL 
AND status = 'active';
```

## Erwartetes Ergebnis

Nach diesen Änderungen:
1. Uploads verwenden immer eine gültige TaxFilerId (aus Context oder SessionStorage)
2. Document-Refresh findet auch Dokumente ohne TaxFilerId
3. Existierende "verwaiste" Dokumente werden dem primären TaxFiler zugeordnet
