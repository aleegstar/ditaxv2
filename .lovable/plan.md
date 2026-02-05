
# Plan: Behebung der Aikido Security Scan Findings

## Zusammenfassung der Probleme

Aus den Screenshots wurden 6 Sicherheitsprobleme identifiziert:

| Problem | Schweregrad | Typ | Betroffene Bereiche |
|---------|-------------|-----|---------------------|
| Path Traversal Attack | High (70) | SAST | 35 Stellen in src/components/admin/ und weitere |
| glob Vulnerability | High (75) | Dependency | CVE in glob 10.4.5 |
| react-router Vulnerability | Medium (65) | Dependency | CVE-2025-68470 |
| lodash Vulnerability | Medium (65) | Dependency | CVE-2025-13465 |
| rollup Vulnerability | Medium (64) | Dependency | DOM Clobbering XSS |
| CSP nicht restriktiv genug | Medium (60) | Surface Monitoring | Wildcard sources in CSP |

---

## Teil 1: Path Traversal Angriffe (KRITISCH - 35 Stellen)

### Aktueller Stand

Einige Dateien verwenden bereits `sanitizeFileName()` und `validateFilePath()`:
- `src/components/admin/DefinitiveTaxBillManager.tsx`
- `src/components/admin/DocumentTemplateManager.tsx`
- `src/components/admin/TaxReturnCreation.tsx`

### Betroffene Dateien OHNE Schutz (18 Stellen mit .upload())

| Datei | Problem |
|-------|---------|
| `src/components/user-detail/UserDefinitiveTaxBill.tsx` | `selectedFile.name` direkt verwendet |
| `src/pages/TaxReturnActions.tsx` | `selectedFile.name` direkt verwendet |
| `src/components/ui/tax-return-action-dialog.tsx` | Keine Validierung |
| `src/components/chat/ModernChatWindow.tsx` | UUID statt Dateiname - OK |
| `src/components/chat/ChatWindow.tsx` | UUID statt Dateiname - OK |
| `src/components/chat/MissingItemCard.tsx` | Keine Validierung |
| `src/components/DocumentUploader.tsx` | Prüfen ob Validierung existiert |
| `src/pages/Documents.tsx` | Keine Validierung |
| `src/pages/CreateTicket.tsx` | Keine Validierung |
| `src/components/tickets/CreateTicketDialog.tsx` | Keine Validierung |
| `src/components/AvatarUpload.tsx` | Extension direkt verwendet |
| `src/components/ui/profile-avatar-upload.tsx` | Extension direkt verwendet |
| `src/services/EncryptedChatService.ts` | Generierter Name - OK |
| `src/services/EncryptedDocumentService.ts` | Prüfen |
| `src/components/user-detail/CompletedTaxReturnManager.tsx` | Prüfen |

### Loesung

Fuer jede betroffene Datei:
1. Import hinzufuegen: `import { sanitizeFileName, validateFilePath } from '@/utils/fileValidation';`
2. Vor dem Upload: Dateinamen sanitisieren und Pfad validieren

**Beispiel-Pattern:**
```typescript
// SECURITY: Sanitize file name to prevent path traversal attacks
const { sanitizeFileName, validateFilePath } = await import('@/utils/fileValidation');
const safeName = sanitizeFileName(file.name);
const filePath = `${userId}/${safeName}`;

// SECURITY: Validate complete file path
if (!validateFilePath(filePath)) {
  toast({ title: "Fehler", description: "Ungueltiger Dateipfad erkannt.", variant: "destructive" });
  return;
}
```

---

## Teil 2: CSP Konfiguration (Medium - Score 60)

### Problem
Die CSP verwendet Wildcard-Sources und nicht-restriktive Direktiven:
- `img-src 'self' data: https: blob:` - `https:` ist ein Wildcard
- `'unsafe-inline'` und `'unsafe-eval'` in script-src (bekannte Einschraenkung)

### Betroffene Dateien
- `index.html` (Meta-Tag CSP)
- `src/utils/securityHeaders.ts` (Runtime CSP)
- `cloudflare/security-headers-worker.js` (HTTP Header CSP)
- `public/_headers` (Referenz)

### Loesung
1. `img-src` anpassen: `https:` durch explizite Domains ersetzen
2. `https://*.supabase.co` bereits spezifisch - OK
3. Hinzufuegen: `https://storage.googleapis.com` (fuer Social Images)

**Vorgeschlagene img-src:**
```
img-src 'self' data: blob: https://*.supabase.co https://storage.googleapis.com https://gqbhilftduwxjszznnzy.supabase.co
```

---

## Teil 3: Dependency Vulnerabilities

### 3.1 react-router-dom (CVE-2025-68470)

**Aktuell:** `^6.26.2`
**Empfohlen:** `6.30.2` oder hoeher

**Aenderung in package.json:**
```json
"react-router-dom": "^6.30.2"
```

### 3.2 lodash (CVE-2025-13465 - Prototype Pollution)

**Aktuell:** Transitive Dependency (4.17.21)
**Empfohlen:** 4.17.23

**Hinweis:** lodash ist keine direkte Dependency. Die Aktualisierung erfolgt durch:
1. Pruefung welches Package lodash als Dependency hat
2. Update des Parent-Packages oder Override in package.json

**Loesung:**
```json
"overrides": {
  "lodash": "^4.17.23"
}
```

### 3.3 rollup (DOM Clobbering XSS)

**Aktuell:** Transitive Dependency von Vite
**Empfohlen:** Patch-Version

**Aenderung in package.json:**
```json
"overrides": {
  "rollup": "^4.29.0"
}
```

### 3.4 glob (Command Injection CVE)

**Aktuell:** 10.4.5 (transitive)
**Empfohlen:** 10.5.0 oder 11.1.0

**Aenderung in package.json:**
```json
"overrides": {
  "glob": "^10.5.0"
}
```

---

## Implementierungsplan

### Phase 1: Kritische Fixes (Path Traversal)

**Zu bearbeitende Dateien:**

1. `src/components/user-detail/UserDefinitiveTaxBill.tsx`
2. `src/pages/TaxReturnActions.tsx`
3. `src/components/ui/tax-return-action-dialog.tsx`
4. `src/components/chat/MissingItemCard.tsx`
5. `src/components/DocumentUploader.tsx`
6. `src/pages/Documents.tsx`
7. `src/pages/CreateTicket.tsx`
8. `src/components/tickets/CreateTicketDialog.tsx`
9. `src/components/AvatarUpload.tsx`
10. `src/components/ui/profile-avatar-upload.tsx`
11. `src/components/user-detail/CompletedTaxReturnManager.tsx`
12. `src/services/EncryptedDocumentService.ts`

### Phase 2: CSP Hardening

**Zu bearbeitende Dateien:**

1. `index.html` - img-src restriktiver gestalten
2. `src/utils/securityHeaders.ts` - DEFAULT_CSP aktualisieren
3. `cloudflare/security-headers-worker.js` - CSP aktualisieren

### Phase 3: Dependency Updates

**Zu bearbeitende Dateien:**

1. `package.json` - Dependencies und Overrides aktualisieren

---

## Technische Details

### fileValidation.ts Erweiterung

Die bestehende Validierung ist gut, aber benoetigt eine zusaetzliche Funktion fuer File Extensions:

```typescript
/**
 * Validate and sanitize file extension
 * Prevents double extension attacks (e.g., file.pdf.exe)
 */
export function sanitizeFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length === 1) return fileName;
  
  // Only keep the last extension
  const name = parts.slice(0, -1).join('_');
  const ext = parts[parts.length - 1].toLowerCase();
  
  // Whitelist of allowed extensions
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'docx', 'xlsx'];
  
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Nicht erlaubte Dateiendung');
  }
  
  return `${sanitizeFileName(name)}.${ext}`;
}
```

### CSP img-src Optimierung

Ersetze:
```
img-src 'self' data: https: blob: https://*.supabase.co
```

Mit:
```
img-src 'self' data: blob: https://*.supabase.co https://gqbhilftduwxjszznnzy.supabase.co https://storage.googleapis.com
```

---

## Erwartete Ergebnisse

Nach der Implementierung:
- Path Traversal: 0 Findings (von 35)
- CSP Score: 75-80 (von 60)
- glob: Behoben durch Override
- react-router: Behoben durch Update
- lodash: Behoben durch Override
- rollup: Behoben durch Override

**Geschaetzter Aikido Score:** 85-90 (von 60-70)
