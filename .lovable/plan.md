

# Diagnose: Upload-Problem auf Mobile finden

## Das eigentliche Problem

Wir haben 3 Versuche gemacht, das Problem zu loesen -- aber wir wissen gar nicht, WO genau der Upload haengt. Wir haben nur geraten. Die Loesung: Wir machen den aktuellen Schritt auf dem Button sichtbar, damit du auf dem Handy SOFORT siehst, wo es stoppt.

## Was geaendert wird

### Datei: `src/components/DocumentChecklist.tsx`

**1. Neuer State fuer Upload-Schritt-Anzeige:**

```typescript
const [uploadStepInfo, setUploadStepInfo] = useState<Record<string, string>>({});
```

**2. `executeUpload` - Schritt-fuer-Schritt Fortschritt anzeigen:**

Statt nur "Laedt..." zeigt der Button den aktuellen Schritt:

```typescript
const executeUpload = async (file: File, item: ChecklistItem) => {
  try {
    setUploadingItems(prev => [...prev, item.id]);
    
    // Schritt 1: Session
    setUploadStepInfo(prev => ({ ...prev, [item.id]: 'Session...' }));
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (!currentUserId) { /* error handling */ return; }

    // Schritt 2: Encryption Key
    setUploadStepInfo(prev => ({ ...prev, [item.id]: 'Schlüssel...' }));
    const encryptedDocService = EncryptedDocumentService.getInstance();

    // Schritt 3: Upload (beinhaltet file.arrayBuffer + encrypt + storage)
    setUploadStepInfo(prev => ({ ...prev, [item.id]: 'Hochladen...' }));
    await encryptedDocService.uploadEncryptedDocument(file, ...);

    // Fertig
    setUploadStepInfo(prev => { const n = {...prev}; delete n[item.id]; return n; });
    toast({ title: 'Erfolgreich hochgeladen' });
  } catch (error) {
    setUploadStepInfo(prev => ({ ...prev, [item.id]: 'FEHLER!' }));
    // ... error handling
  } finally {
    setUploadingItems(prev => prev.filter(id => id !== item.id));
    setUploadStepInfo(prev => { const n = {...prev}; delete n[item.id]; return n; });
  }
};
```

**3. Button zeigt Schritt statt "Laedt...":**

```typescript
// Vorher:
{isUploading ? 'Lädt…' : 'Hochladen'}

// Nachher:
{isUploading ? (uploadStepInfo[item.id] || 'Lädt…') : 'Hochladen'}
```

### Datei: `src/services/EncryptedDocumentService.ts`

**4. Detailliertes Logging in `uploadEncryptedDocument`:**

Jeder Schritt bekommt eine Console-Log-Nachricht mit Zeitstempel:

```typescript
async uploadEncryptedDocument(file, ...) {
  const t0 = Date.now();
  const log = (msg: string) => console.log(`[Upload +${Date.now()-t0}ms] ${msg}`);

  log('START - Getting encryption key');
  const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
  
  log('KEY OK - Reading file into memory');
  const originalBuffer = await file.arrayBuffer();
  
  log('FILE READ OK - Generating hash');
  const integrityHash = await this.cryptoService.generateIntegrityHash(originalBuffer);
  
  log('HASH OK - Encrypting file');
  const { encryptedData, iv } = await this.cryptoService.encryptBuffer(originalBuffer, encryptionKey);
  
  log('ENCRYPT OK - Uploading to storage');
  const { error: uploadError } = await supabase.storage.from('documents').upload(...);
  
  log('STORAGE OK - Saving metadata to DB');
  const { error: dbError } = await supabase.from('uploaded_documents').insert(...);
  
  log('DB OK - DONE');
}
```

## Naechster Schritt

Nachdem du diese Version auf dem Handy testest, sehen wir auf dem Button einen der folgenden Texte:
- **"Session..."** -- Problem mit der Anmeldung auf Mobile
- **"Schlüssel..."** -- Problem mit der Verschluesselungs-Key-Generierung
- **"Hochladen..."** -- Problem innerhalb des Upload-Prozesses (dann zeigen die Console-Logs genau wo)
- **"FEHLER!"** -- Ein Fehler tritt auf (Toast zeigt Details)

Das erspart uns weiteres Raten und zeigt uns das echte Problem.

## Warum nur auf Mobile?

Moegliche Gruende (die wir mit der Diagnose herausfinden):
- WebView hat eingeschraenkte Web Crypto API (Verschluesselung)
- WebView hat strengere CORS-Regeln (Storage Upload)
- Despia WebView verliert die Auth-Session beim Wechsel
- Mobile Netzwerk-Timeouts sind kuerzer
- `file.arrayBuffer()` verhaelt sich in WebViews anders

Mit dem sichtbaren Schritt auf dem Button werden wir es endlich genau wissen.
