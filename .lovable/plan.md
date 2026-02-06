

# Plan: Inline-Upload in Dokumenten-Checkliste (Aktualisiert)

## Kritische Parameter-Prüfung ✅

Der Upload benötigt diese Parameter - alle werden korrekt übergeben:

| Parameter | Quelle | Status |
|-----------|--------|--------|
| `file` | Ausgewählte Datei | ✅ |
| `checklistItemId` | `item.id` aus Checkliste | ✅ |
| `userId` | `supabase.auth.getSession()` | ✅ |
| `taxYear` | `useFormContext().taxYear` | ✅ Bereits verfügbar |
| `checklistItemTitle` | `item.title` aus Checkliste | ✅ |
| `taxFilerId` | `useTaxFiler().activeTaxFilerId` | ⚠️ **Muss hinzugefügt werden** |

---

## Technische Umsetzung

### Datei: `src/components/DocumentChecklist.tsx`

**1. Neue Imports:**
```typescript
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import DocumentValidator from '@/services/DocumentValidator';
import AIDocumentValidation from '@/components/ui/ai-document-validation';
import DocumentCheckScreen from '@/components/documents/DocumentCheckScreen';
import { validateFile } from '@/utils/fileValidation';
import { ValidationResult, ValidationProgress } from '@/types/documentProfile';
```

**2. Context-Hook hinzufügen:**
```typescript
const { activeTaxFilerId } = useTaxFiler();
```

**3. Neue State-Variablen:**
```typescript
// Inline-Upload State
const [processingItemId, setProcessingItemId] = useState<string | null>(null);
const [processingFile, setProcessingFile] = useState<File | null>(null);
const [isValidating, setIsValidating] = useState(false);
const [validationProgress, setValidationProgress] = useState<ValidationProgress | null>(null);
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
const [showCheckScreen, setShowCheckScreen] = useState(false);
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
const encryptedDocService = EncryptedDocumentService.getInstance();
const documentValidator = DocumentValidator.getInstance();
```

**4. File-Input-Handler:**
```typescript
const handleInlineUploadClick = (itemId: string) => {
  setProcessingItemId(itemId);
  fileInputRef.current?.click();
};

const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !processingItemId) {
    resetUploadState();
    return;
  }
  e.target.value = ''; // Reset input

  // Datei validieren (Typ, Grösse)
  const fileValidation = await validateFile(file, 10 * 1024 * 1024);
  if (!fileValidation.isValid) {
    toast({ title: "Fehler", description: fileValidation.error, variant: "destructive" });
    resetUploadState();
    return;
  }

  setProcessingFile(file);
  await performValidationAndUpload(file, processingItemId);
};
```

**5. Validation + Upload-Logik (KRITISCH - mit korrekten Parametern):**
```typescript
const performValidationAndUpload = async (file: File, itemId: string) => {
  setIsValidating(true);
  setValidationProgress({ step: 'preparing', percent: 0, message: 'Starte Prüfung...' });

  try {
    // OCR-Validierung durchführen
    const result = await documentValidator.validate(
      file,
      itemId,
      (progress) => setValidationProgress(progress)
    );

    setValidationResult(result);
    setValidationProgress(null);

    // Bei niedriger Konfidenz: Check-Screen anzeigen
    if (result.needsUserConfirmation) {
      setShowCheckScreen(true);
      setIsValidating(false);
      return;
    }

    // Hohe Konfidenz: Direkt hochladen
    await performUpload(file, itemId);

  } catch (error) {
    console.error('Validation error:', error);
    setValidationProgress(null);
    // Bei Fehler: Trotzdem Upload erlauben
    toast({
      title: "Hinweis",
      description: "Dokumentenprüfung übersprungen.",
      variant: "default"
    });
    await performUpload(file, itemId);
  } finally {
    setIsValidating(false);
  }
};

const performUpload = async (file: File, itemId: string) => {
  setIsUploading(true);

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('Nicht angemeldet');
    }

    const currentUserId = sessionData.session.user.id;
    
    // KRITISCH: taxFilerId mit Fallback auf sessionStorage
    const taxFilerId = activeTaxFilerId || sessionStorage.getItem('ditax_selected_tax_filer');
    
    // Checklist-Item für Titel holen
    const item = checklistItems.find(i => i.id === itemId);

    // Upload mit ALLEN korrekten Parametern
    await encryptedDocService.uploadEncryptedDocument(
      file,                    // File
      itemId,                  // checklistItemId
      currentUserId,           // userId
      taxYear,                 // taxYear (aus useFormContext)
      item?.title,             // checklistItemTitle
      taxFilerId               // taxFilerId (aus useTaxFiler + Fallback)
    );

    // Erfolg
    toast({
      title: "Dokument hochgeladen",
      description: `${item?.title || 'Dokument'} wurde erfolgreich hochgeladen.`
    });

    // Checkliste aktualisieren
    markUploaded(itemId, true);
    refreshDocuments();

  } catch (error: any) {
    console.error('Upload error:', error);
    toast({
      title: "Upload fehlgeschlagen",
      description: error.message || "Dokument konnte nicht hochgeladen werden.",
      variant: "destructive"
    });
  } finally {
    resetUploadState();
  }
};

const resetUploadState = () => {
  setProcessingItemId(null);
  setProcessingFile(null);
  setIsValidating(false);
  setValidationProgress(null);
  setValidationResult(null);
  setShowCheckScreen(false);
  setIsUploading(false);
};
```

**6. CheckScreen-Handler:**
```typescript
const handleCheckConfirm = () => {
  if (processingFile && processingItemId) {
    performUpload(processingFile, processingItemId);
  }
  setShowCheckScreen(false);
};

const handleCheckReupload = () => {
  resetUploadState();
};
```

**7. Hidden File-Input + Modals im JSX:**
```tsx
{/* Hidden File Input */}
<input
  ref={fileInputRef}
  type="file"
  accept="image/*,application/pdf"
  className="hidden"
  onChange={handleFileSelected}
/>

{/* AI Validation Modal */}
{isValidating && validationProgress && (
  <AIDocumentValidation
    progress={validationProgress}
    isOpen={isValidating}
  />
)}

{/* Check Screen Modal */}
{showCheckScreen && validationResult && processingItemId && (
  <DocumentCheckScreen
    isOpen={showCheckScreen}
    onClose={handleCheckReupload}
    result={validationResult}
    expectedDocType={processingItemId}
    onConfirm={handleCheckConfirm}
    onReupload={handleCheckReupload}
    onChangeType={() => {
      resetUploadState();
      navigate('/form?section=unterlagen');
    }}
  />
)}
```

**8. Upload-Button ändern (Zeile 542):**
```tsx
// VON:
<button onClick={() => handleUploadDocument(item.id)} ...>

// ZU:
<button 
  onClick={() => handleInlineUploadClick(item.id)} 
  disabled={isValidating || isUploading}
  ...
>
```

---

## Sicherheitsgarantien

| Garantie | Status |
|----------|--------|
| `EncryptedDocumentService` unverändert | ✅ |
| `DocumentValidator` unverändert | ✅ |
| `taxFilerId` korrekt übergeben | ✅ (mit Fallback) |
| `taxYear` korrekt übergeben | ✅ (aus FormContext) |
| `checklistItemId` korrekt übergeben | ✅ |
| `userId` korrekt übergeben | ✅ (aus Supabase Auth) |
| OCR-Validierung bleibt erhalten | ✅ |

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/DocumentChecklist.tsx` | Inline-Upload-Logik hinzufügen |

**Keine anderen Dateien werden verändert.**

---

## Resultat

**Vorher:** Klick → Navigation → Klick → Datei → Klick → OCR → Upload  
**Nachher:** Klick → Datei → OCR → Upload

Der Benutzer:
1. Klickt auf "Hochladen" in der Checkliste
2. Wählt eine Datei (File-Picker öffnet sich sofort)
3. Sieht das OCR-Modal (automatisch)
4. Dokument wird hochgeladen (automatisch bei hoher Konfidenz)

