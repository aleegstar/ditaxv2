
# Plan: Upload-Problem in der Dokumenten-Checkliste beheben

## Problem-Analyse

Nach eingehender Untersuchung des Codes habe ich folgende Ursachen für das Upload-Problem identifiziert:

### Hauptprobleme

1. **Race Condition beim Upload-Complete**: Der `onUploadComplete` Callback wird aufgerufen, bevor die Datenbank-Insert-Operation garantiert sichtbar ist. Das führt dazu, dass `refreshDocuments()` die neuen Dokumente noch nicht findet.

2. **TaxFilerId-Abhängigkeit**: Die `loadDocuments`-Funktion im FormContext bricht ab, wenn `activeTaxFilerId` nicht gesetzt ist:
   ```javascript
   if (!activeTaxFilerId) {
     console.log('No active tax filer for loading documents');
     return;
   }
   ```
   Dies verhindert das Laden der Dokumente, wenn der TaxFiler noch nicht initialisiert wurde.

3. **Fehlende Wartezeit nach Upload**: Der Upload-Service gibt `true` zurück, sobald der Supabase-Insert abgeschlossen ist, aber die RLS-Policies und Replikation können einen kurzen Delay haben.

## Lösungsplan

### Änderung 1: Verzögertes Refresh nach Upload
**Datei:** `src/hooks/use-inline-upload.ts`

Füge eine kleine Verzögerung vor dem `onUploadComplete`-Callback ein, um sicherzustellen, dass die Datenbank-Operation vollständig propagiert ist:

```typescript
// Nach erfolgreichem Upload
updateItemState(checklistItemId, {
  status: 'success',
  progress: 100,
  message: 'Hochgeladen'
});

// Verzögerung für Datenbank-Propagation
setTimeout(() => {
  clearItemState(checklistItemId);
  onUploadComplete?.(checklistItemId);
}, 2000); // Erhöht von 1500ms auf 2000ms
```

### Änderung 2: Robusteres Document-Loading im FormContext
**Datei:** `src/contexts/form/FormContext.tsx`

Entferne die strikte `activeTaxFilerId`-Prüfung oder mache sie optionaler:

```typescript
const loadDocuments = useCallback(async () => {
  if (!session?.user?.id) {
    console.log('No session available for loading documents');
    return;
  }
  
  // Lade Dokumente auch ohne activeTaxFilerId (zeigt alle Dokumente des Users)
  try {
    console.log(`Loading documents for tax year: ${taxYear}`);
    const docs = await documentService.fetchDocuments(
      true, 
      taxYear, 
      activeTaxFilerId || undefined // Optional statt required
    );
    // ...
  }
}, [taxYear, session, activeTaxFilerId, updateDocumentProgress]);
```

### Änderung 3: Retry-Mechanismus für Document-Refresh
**Datei:** `src/components/DocumentChecklist.tsx`

Implementiere einen Retry-Mechanismus wenn das erste Refresh keine neuen Dokumente findet:

```typescript
onUploadComplete: async (itemId) => {
  // Erstes Refresh
  await refreshDocuments();
  markUploaded(itemId, true);
  
  // Prüfe ob Dokument erschienen ist, sonst retry nach 1 Sekunde
  const docs = getDocumentsForItem(itemId);
  if (docs.length === 0) {
    setTimeout(async () => {
      await refreshDocuments();
    }, 1000);
  }
}
```

### Änderung 4: Besseres Error-Logging im Upload-Service
**Datei:** `src/services/EncryptedDocumentService.ts`

Füge detaillierteres Logging hinzu um zukünftige Probleme schneller zu diagnostizieren:

```typescript
// Nach erfolgreichem DB-Insert
console.log('✅ Document metadata stored in database:', {
  fileId,
  checklistItemId,
  taxFilerId: taxFilerId || 'none',
  taxYear
});
```

## Technische Details

```text
┌─────────────────────────────────────────────────────────────┐
│                  Verbesserter Upload-Flow                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Datei auswählen                                         │
│       ↓                                                     │
│  2. Validierung (OCR) ← 20s Timeout                         │
│       ↓                                                     │
│  3. Upload zu Storage + DB ← 45s Timeout                    │
│       ↓                                                     │
│  4. Status: "Hochgeladen" (Success-Anzeige)                 │
│       ↓                                                     │
│  5. 2 Sekunden warten (DB-Propagation)     ← NEU            │
│       ↓                                                     │
│  6. refreshDocuments() aufrufen                             │
│       ↓                                                     │
│  7. Prüfen ob Dokument in Liste erscheint  ← NEU            │
│       ↓ (falls nicht)                                       │
│  8. Retry nach 1 Sekunde                   ← NEU            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/hooks/use-inline-upload.ts` | Timeout vor `onUploadComplete` auf 2s erhöhen |
| `src/contexts/form/FormContext.tsx` | `activeTaxFilerId` optional machen in `loadDocuments` |
| `src/components/DocumentChecklist.tsx` | Retry-Mechanismus wenn Dokument nicht erscheint |
| `src/services/EncryptedDocumentService.ts` | Besseres Logging nach DB-Insert |

## Risikobewertung

- **Niedrig**: Die Änderungen sind minimal und betreffen nur den Timing-Aspekt
- **Keine Breaking Changes**: Bestehende Funktionalität bleibt erhalten
- **Bessere User Experience**: Upload-Feedback wird zuverlässiger

## Test-Empfehlung

Nach der Implementierung sollte der komplette Upload-Flow getestet werden:
1. Dokument in der Checkliste hochladen
2. Prüfen ob die Success-Anzeige erscheint
3. Prüfen ob das Dokument in der Liste angezeigt wird
4. Seite neu laden und prüfen ob das Dokument persistiert wurde
