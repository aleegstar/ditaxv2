

# Security Fixes fuer 3 aikido.dev Findings

## 1. glob CVE-2025-64756 (Score 75) -- NICHT DIREKT FIXBAR

**Problem:** `glob` ist eine transitive Abhaengigkeit (kommt ueber andere Pakete). Es ist nicht direkt in `package.json` gelistet.

**Aktion:** Lovable verwaltet die Lock-Datei automatisch. Ein manuelles Update von `glob` ist nicht moeglich, da es eine Sub-Dependency ist. Dieses Finding in aikido.dev als "accepted risk" markieren, bis die uebergeordneten Pakete aktualisiert werden.

---

## 2. SSRF in cloudflare/security-headers-worker.js (Score 70) -- FIXBAR

**Problem:** Zeile 16: `const response = await fetch(request);` leitet beliebige Requests weiter. Ein Angreifer koennte theoretisch interne Ressourcen ansprechen.

**Fix:** Origin-Validierung hinzufuegen, damit nur Requests an die eigene Domain (`ditaxv2.lovable.app`, `app.ditax.ch`) weitergeleitet werden:

```javascript
async function handleRequest(request) {
  // SECURITY: Validate request URL to prevent SSRF
  const url = new URL(request.url);
  const allowedHosts = ['ditaxv2.lovable.app', 'app.ditax.ch', 'ditax.ch'];
  
  if (!allowedHosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) {
    return new Response('Forbidden', { status: 403 });
  }
  
  const response = await fetch(request);
  // ... rest unchanged
}
```

**Datei:** `cloudflare/security-headers-worker.js`

---

## 3. Path Traversal in 35 Stellen (Score 70) -- TEILWEISE FIXBAR

**Problem:** Viele Stellen nutzen `file_path` aus der Datenbank direkt in `.download()` oder `.createSignedUrl()` ohne Validierung. Ein manipulierter DB-Eintrag koennte auf Dateien ausserhalb des vorgesehenen Ordners zugreifen.

**Bereits gesichert (haben `sanitizeFileName`/`validateFilePath`):**
- `DefinitiveTaxBillManager.tsx` (Upload)
- `DocumentTemplateManager.tsx` (Upload)
- `MissingItemCard.tsx` (Upload)
- `AvatarUpload.tsx` (Upload)

**Fix:** Eine zentrale Hilfsfunktion `validateStoragePath()` erstellen und bei allen `.download()`, `.createSignedUrl()` Aufrufen einsetzen:

```typescript
// In src/utils/fileValidation.ts - neue Funktion
export function validateStoragePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  const normalized = path.replace(/\\/g, '/');
  if (normalized.includes('..')) return false;
  if (normalized.startsWith('/')) return false;
  if (normalized.length > 512) return false;
  return true;
}
```

**Betroffene Dateien fuer Download/SignedUrl-Validierung:**

| Datei | Operation | Zeile ca. |
|-------|-----------|-----------|
| `DefinitiveTaxBillManager.tsx` | `.download(bill.file_path)` | 289 |
| `DocumentTemplateManager.tsx` | `.createSignedUrl(t.file_path, 60)` | 47 |
| `ChatBubble.tsx` | `.download(attachment.file_path)` | 36 |
| `ReviewSubmittedItemsDialog.tsx` | `.download(filePath)` | 58 |
| `UserDetail.tsx` | `.download(taxReturn.file_path)` | 381 |
| `CompletedTaxReturnManager.tsx` | `.download(taxReturn.file_path)` | 288 |
| `SignatureDialog.tsx` | `.createSignedUrl(...)` | 130 |
| `SignedTaxReturns.tsx` | `.createSignedUrl(...)` | 236 |
| `TicketManagement.tsx` | `.createSignedUrl(...)` | 53 |
| `EncryptedChatService.ts` | `.download(attachment.file_path)` | 176 |

Jede dieser Stellen erhaelt eine `validateStoragePath()` Pruefung vor dem Storage-Aufruf.

---

## Zusammenfassung

| Finding | Score | Status | Aenderung |
|---------|-------|--------|-----------|
| glob CVE | 75 | Nicht fixbar | Transitive Dependency, in aikido.dev akzeptieren |
| SSRF Worker | 70 | **Fixbar** | Origin-Validierung in Worker |
| Path Traversal | 70 | **Fixbar** | `validateStoragePath()` bei allen Downloads/SignedUrls |

**Dateien die geaendert werden:**
1. `cloudflare/security-headers-worker.js` -- SSRF-Schutz
2. `src/utils/fileValidation.ts` -- Neue `validateStoragePath()` Funktion
3. 10 Dateien mit Download/SignedUrl-Aufrufen -- Path-Validierung hinzufuegen

