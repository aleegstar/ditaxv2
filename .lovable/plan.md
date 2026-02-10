
# OCR-Validierung als Bottom Sheet in der Dokumentencheckliste

## Uebersicht
Nach dem Datei-Upload in der Checkliste wird die OCR-Validierung in einem Bottom Sheet (Drawer) angezeigt, statt nur Toast-Benachrichtigungen zu verwenden. Der User sieht die "AI prueft"-Animation und danach das Validierungsergebnis (DocumentCheckScreen) -- alles innerhalb des Drawers.

## Ablauf

```text
1. User klickt "Hochladen" -> Datei-Picker oeffnet sich
2. User waehlt Datei -> Bottom Sheet faehrt hoch
3. Phase 1: AIDocumentValidation-Animation (Sphere + rotierende Status-Texte)
4. Phase 2: DocumentCheckScreen (Ergebnis mit Confirm/Reupload Buttons)
5. Bei "Einreichen" -> Upload im Hintergrund, Sheet schliesst sich
6. Bei "Anderes Dokument" -> Sheet schliesst sich, Datei verworfen
```

## Technische Umsetzung

### Datei: `src/components/DocumentChecklist.tsx`

**Neue Imports:**
- `DocumentValidator` aus `@/services/DocumentValidator`
- `AIDocumentValidation` aus `@/components/ui/ai-document-validation`
- `DocumentCheckScreen` aus `@/components/documents/DocumentCheckScreen`
- `Drawer, DrawerContent` aus `@/components/ui/drawer`
- `ValidationResult, ValidationProgress` aus `@/types/documentProfile`

**Neue State-Variablen:**
- `ocrDrawerOpen: boolean` -- steuert das Bottom Sheet
- `ocrPhase: 'validating' | 'result'` -- welche Phase im Drawer
- `validationResult: ValidationResult | null` -- OCR-Ergebnis
- `validationProgress: ValidationProgress | null` -- Fortschritt waehrend OCR
- `pendingUploadFile: File | null` -- die ausgewaehlte Datei
- `pendingUploadItem: ChecklistItem | null` -- das zugehoerige Item

**Aenderung an `handleQuickUpload`:**
1. Datei wird validiert (Typ/Groesse) wie bisher
2. Statt sofortigem Upload wird das Bottom Sheet geoeffnet (`ocrDrawerOpen = true`)
3. `DocumentValidator.validate()` wird aufgerufen mit Progress-Callback
4. Waehrend der Validierung: Phase `'validating'` zeigt `AIDocumentValidation`
5. Nach Abschluss: Phase wechselt zu `'result'` und zeigt `DocumentCheckScreen`
6. Bei hoher Konfidenz (>= 80, kein `needsUserConfirmation`): Upload startet automatisch, Drawer schliesst sich

**Drawer-Inhalt (im JSX):**
- Phase `validating`: `AIDocumentValidation` mit `progress`, `documentType` und `documentTypeId`
- Phase `result`: `DocumentCheckScreen` mit `result`, `fileName`, `onConfirm`, `onReupload`

**Callbacks im Drawer:**
- `onConfirm`: Upload ausfuehren (bestehende Upload-Logik), Drawer schliessen, Toast zeigen
- `onReupload`: Drawer schliessen, Datei verwerfen, File-Input erneut triggern
- `onClose`: Drawer schliessen, Datei verwerfen

### Datei: `src/components/ui/drawer.tsx`

Keine Aenderung noetig -- der bestehende Drawer wird als Fullscreen-Overlay verwendet, was fuer das Bottom-Sheet-Erlebnis auf Mobile gut funktioniert.

### Bestehende Logik bleibt erhalten
- Alle Upload-Parameter (userId, taxYear, activeTaxFilerId, checklistItemId) bleiben identisch
- `EncryptedDocumentService.uploadEncryptedDocument()` wird weiterhin verwendet
- `markUploaded()` und `refreshDocuments()` werden nach erfolgreichem Upload aufgerufen
- Fehlerbehandlung mit Toast-Benachrichtigungen bleibt bestehen
