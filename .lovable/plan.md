# Despia File Viewer Integration

`fileviewer://` ist aktuell **nicht** integriert. Wir bauen ihn als zentralen Helper und routen alle „Datei öffnen / Vorschau / PDF herunterladen"-Pfade in Despia-WebViews darüber, damit iOS QuickLook / Android In-App-Viewer genutzt wird statt Browser-Tab oder Download-Dialog.

## Was wird gebaut

### 1. Zentraler Helper `src/lib/despia.ts`
Neue Funktion `openInDespiaFileViewer(url, opts?)`:
- Akzeptiert absolute HTTPS-URL (signed URL bevorzugt).
- `encodeURIComponent(url)` zwingend, `theme` optional (`'light' | 'dark'`).
- Ruft `despia(\`fileviewer://?src=${encoded}${theme ? \`&theme=${theme}\` : ''}\`)`.
- Guard: nur ausführen wenn `isDespiaNative()`; sonst `return false`, damit Caller den Web-Fallback nutzt.
- Validierung: nur `https:`-URLs (sonst `console.warn` + `return false`).
- Für `blob:` / `data:` URLs → nicht unterstützt (Native fetch braucht echte HTTPS-URL); Caller bleibt beim Web-Fallback.

### 2. Convenience-Wrapper `openFile(url, opts?)`
- In Despia: `openInDespiaFileViewer(...)`.
- Sonst: `window.open(url, '_blank', 'noopener,noreferrer')`.
- Rückgabe `boolean` für „nativ geöffnet".

### 3. Integration an bestehenden Stellen
Nur ergänzend, kein Verhalten ändern wenn nicht Despia:

- **`src/components/DocumentViewer.tsx`** – beim Öffnen einer Datei (signed URL) in Despia direkt `fileviewer://` statt iframe/`<embed>` (Fallback bleibt für Browser).
- **`src/components/user-detail/DocumentCard.tsx`** – `handleDownload` und das Preview-Overlay: in Despia eine frische signed URL holen (über `documentService.refreshDocumentUrl`/Storage) und an `openFile` geben. `blob:`-URLs ungeeignet → wir nutzen die signed URL, nicht die lokal entschlüsselte Blob-URL (encrypted bleibt Web-Pfad, weil Native fetch keinen Decrypt kann – siehe Hinweis unten).
- **`src/utils/pdfDownloadHelper.ts`** und **`src/utils/coverLetterDownloadHelper.ts`** – wenn die generierte/abgelegte PDF eine HTTPS-URL hat: in Despia per `openFile` öffnen; bei reinem Client-Blob bleibt Download-Verhalten unverändert.
- **`src/pages/Invoices.tsx`** – Rechnungs-PDF (Stripe hosted_invoice_url / signed) per `openFile`.

### 4. Doku
- Kurzer Kommentar-Block in `src/lib/despia.ts` mit Link auf `https://setup.despia.com/native-features/file-viewer`.
- Eintrag in `mem://integrations/despia-native-integration-standard` (Memory-Update) mit „File Viewer via `openFile()` / `openInDespiaFileViewer()`".

## Wichtige Einschränkungen (technisch)

- **Encrypted Documents** (`EncryptedDocumentService`): Inhalt wird clientseitig entschlüsselt → resultiert in `blob:`-URL. Native fetch kann das nicht lesen. → Für verschlüsselte Dokumente bleibt der bestehende Web-Viewer aktiv. `openFile` erkennt `blob:`/`data:` und liefert `false`.
- **Auth**: Native fetch trägt keine Supabase-Cookies. Wir verwenden ausschliesslich `createSignedUrl` (kurzlebig, default 1 h, das ist okay).
- **Fire-and-forget**: kein Callback. UI nicht auf „geöffnet"-Status warten lassen.

## Was NICHT geändert wird

- Web-/Desktop-Verhalten (iframe-Preview, Download-Anker) bleibt 1:1.
- Kein Refactor der Encryption-Pipeline.
- Kein neuer NPM-Install nötig (`despia-native` ist bereits Dependency).

## Technische Details

```ts
// src/lib/despia.ts (neu)
export function openInDespiaFileViewer(
  url: string,
  opts?: { theme?: 'light' | 'dark' }
): boolean {
  if (!isDespiaNative()) return false;
  if (!/^https:\/\//i.test(url)) {
    console.warn('[fileviewer] only https URLs supported, got:', url.slice(0, 32));
    return false;
  }
  const qs = `src=${encodeURIComponent(url)}` +
    (opts?.theme ? `&theme=${opts.theme}` : '');
  despia(`fileviewer://?${qs}`);
  return true;
}

export function openFile(url: string, opts?: { theme?: 'light' | 'dark' }): boolean {
  if (openInDespiaFileViewer(url, opts)) return true;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}
```

## Rollout

1. Helper hinzufügen + Unit-smoke (manuell in Despia iOS + Android).
2. Call-Sites umstellen (jeweils 1–3 Zeilen).
3. Memory aktualisieren.
4. QA: signed URLs für Invoices/PDF im Despia-Build testen, Web-Fallback testen.
