

# Plan: Dokumenten-Checkliste Upload & Löschen reparieren

## Identifizierte Probleme

Nach detaillierter Analyse des Codes und der Datenbank habe ich **drei kritische Probleme** identifiziert:

### Problem 1: DocumentValidator blockiert den Upload
Die OCR-Validierung (`documentValidator.validate()`) kann bei bestimmten Bedingungen hängen bleiben oder sehr lange dauern:
- Tesseract-WASM muss initialisiert werden
- Bei großen Dateien kann die Analyse lange dauern
- Der aktuelle 20-Sekunden-Timeout kann immer noch zu lang sein

### Problem 2: Delete-Funktion scheitert still
Die `deleteDocument`-Funktion im `DocumentService` hat keine ausreichende Fehlerbehandlung:
- Zeile 99-103: Das Abrufen des Dokuments könnte aufgrund von RLS-Policies fehlschlagen
- Zeile 109: Storage-Löschung gibt keinen Fehler zurück, aber könnte fehlschlagen
- Zeile 111-116: Die Datenbank-Löschung wirft erst am Ende einen Fehler

### Problem 3: Race Condition beim Document-Refresh
Nach dem Upload wird `onUploadComplete` aufgerufen, das `refreshDocuments()` triggert. Aber:
- Der FormContext muss die Dokumente erneut laden
- Die Upload-Map wird nicht sofort aktualisiert
- Die Checkliste zeigt das Dokument nicht an, obwohl es in der DB existiert

## Lösungsplan

### Änderung 1: OCR-Validierung komplett optional machen
**Datei:** `src/hooks/use-inline-upload.ts`

Die Validierung soll NICHT blockierend sein. Bei jedem Fehler oder Timeout direkt zum Upload fortfahren:

```typescript
// Timeout auf 10 Sekunden reduzieren
const VALIDATION_TIMEOUT_MS = 10000; // 10 seconds (was 20)

// Bei handleFileSelect: Wenn Session nicht vorhanden, sofort abbrechen
const { data: sessionData } = await supabase.auth.getSession();
if (!sessionData?.session) {
  updateItemState(checklistItemId, {
    status: 'error',
    message: 'Bitte melde dich an'
  });
  return;
}
```

### Änderung 2: Upload direkt ohne Validierung starten (Schneller Pfad)
**Datei:** `src/hooks/use-inline-upload.ts`

Option hinzufügen, die Validierung komplett zu überspringen und direkt hochzuladen:

```typescript
// Nach Datei-Validierung (Format/Größe), direkt zum Upload
// Statt OCR-Validierung → Direct Upload
console.log('[InlineUpload] Skipping OCR, direct upload...');
await uploadFile(file, checklistItemId, checklistItemTitle);
```

### Änderung 3: Delete-Funktion robuster machen
**Datei:** `src/services/DocumentService.ts`

Bessere Fehlerbehandlung beim Löschen:

```typescript
async deleteDocument(documentId: string): Promise<void> {
  const userId = await this.checkAuth();

  // Explizit User-ID prüfen für RLS
  const { data: doc, error: fetchError } = await supabase
    .from('uploaded_documents')
    .select('file_path, tax_year, user_id')
    .eq('id', documentId)
    .eq('user_id', userId) // Explizite User-Prüfung
    .single();

  if (fetchError) {
    console.error('[DocumentService] Error fetching document:', fetchError);
    throw new Error('Dokument nicht gefunden oder keine Berechtigung');
  }
  
  // Storage löschen (mit Fehlerbehandlung)
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([doc.file_path]);
  
  if (storageError) {
    console.warn('[DocumentService] Storage delete warning:', storageError);
    // Continue anyway - file might already be deleted
  }

  // DB löschen
  const { error: dbError } = await supabase
    .from('uploaded_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId); // Doppelte Sicherheit

  if (dbError) {
    console.error('[DocumentService] DB delete error:', dbError);
    throw new Error('Dokument konnte nicht gelöscht werden');
  }
  
  // Cache aktualisieren...
}
```

### Änderung 4: Sofortige UI-Aktualisierung nach Upload
**Datei:** `src/components/DocumentChecklist.tsx`

Nach erfolgreichem Upload sofort die lokale State aktualisieren, nicht auf Refresh warten:

```typescript
onUploadComplete: async (itemId) => {
  // SOFORT lokalen State aktualisieren
  markUploaded(itemId, true);
  
  // Dann im Hintergrund refreshen
  refreshDocuments().catch(console.error);
}
```

### Änderung 5: Validierung temporär deaktivieren (Notfall-Fix)
**Datei:** `src/hooks/use-inline-upload.ts`

Als Notfall-Lösung die gesamte OCR-Validierung überspringen:

```typescript
// In handleFileSelect, nach Format-Validierung:
// TEMPORARY: Skip OCR validation entirely
console.log('[InlineUpload] Uploading directly (OCR disabled)...');
await uploadFile(file, checklistItemId, checklistItemTitle);
return;
```

## Technische Details

```text
┌─────────────────────────────────────────────────────────────┐
│           AKTUELLER FLOW (PROBLEMATISCH)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Datei auswählen                                         │
│       ↓                                                     │
│  2. Format-Validierung ✓                                    │
│       ↓                                                     │
│  3. OCR-Validierung (kann hängen!) ← PROBLEM                │
│       ↓ (wartet bis zu 20 Sekunden)                         │
│  4. Upload                                                  │
│       ↓                                                     │
│  5. Warte 2 Sekunden                                        │
│       ↓                                                     │
│  6. refreshDocuments() → loadDocuments() → UI Update        │
│       ↓ (kann fehlschlagen)                                 │
│  7. Dokument nicht sichtbar ← PROBLEM                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│           NEUER FLOW (VEREINFACHT)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Datei auswählen                                         │
│       ↓                                                     │
│  2. Format-Validierung ✓                                    │
│       ↓                                                     │
│  3. DIREKTER Upload (OCR übersprungen)                      │
│       ↓                                                     │
│  4. Sofort markUploaded(itemId, true) ← UI sofort grün      │
│       ↓                                                     │
│  5. refreshDocuments() im Hintergrund                       │
│                                                             │
│  RESULTAT: Schneller, zuverlässiger, sofortiges Feedback    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Zusammenfassung der Änderungen

| Datei | Änderung | Priorität |
|-------|----------|-----------|
| `src/hooks/use-inline-upload.ts` | OCR-Validierung überspringen, direkter Upload | HOCH |
| `src/services/DocumentService.ts` | Delete-Funktion mit expliziter User-ID Prüfung | HOCH |
| `src/components/DocumentChecklist.tsx` | Sofortige UI-Aktualisierung nach Upload | MITTEL |
| `src/hooks/use-inline-upload.ts` | Timeout auf 10s reduzieren (falls OCR reaktiviert) | NIEDRIG |

## Erwartete Verbesserungen

1. **Upload funktioniert sofort** - Keine OCR-Blockierung mehr
2. **Dokumente erscheinen sofort** - Lokale State-Aktualisierung
3. **Löschen funktioniert zuverlässig** - Bessere Fehlerbehandlung
4. **Schnellere User Experience** - Weniger Wartezeit

## Risikobewertung

- **Niedrig**: OCR-Validierung ist nice-to-have, nicht kritisch
- **OCR kann später reaktiviert werden** wenn stabil
- **Delete-Änderungen sind rückwärtskompatibel**

