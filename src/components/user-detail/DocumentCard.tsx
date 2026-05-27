import React, { useEffect, useRef, useState } from 'react';
import { FileText, Eye, Download, Copy, GripVertical, Image as ImageIcon, Check } from 'lucide-react';
import { UploadedDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { documentService } from '@/services/DocumentService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { openInDespiaFileViewer } from '@/lib/despia';

interface DocumentCardProps {
  document: UploadedDocument;
  onPreview: (document: UploadedDocument) => void;
  /** Required for decrypting encrypted documents. Falls back to current auth user. */
  userId?: string;
  /** Admin context decrypts via server-side admin endpoint. */
  isAdmin?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document: doc, onPreview, userId, isAdmin = true }) => {
  const { toast } = useToast();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Lazy-load thumbnail when visible
  useEffect(() => {
    if (!observerRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(observerRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    const load = async () => {
      try {
        const isEncrypted = doc.metadata?.encrypted === true;
        let resolvedUid = userId;
        if (!resolvedUid) {
          const { data } = await supabase.auth.getUser();
          resolvedUid = data.user?.id;
        }

        if (isEncrypted && resolvedUid) {
          const svc = EncryptedDocumentService.getInstance();
          const { blob: b } = isAdmin
            ? await svc.adminDownloadDecryptedDocument(doc.id, resolvedUid)
            : await svc.downloadDecryptedDocument(doc.id, resolvedUid);
          if (cancelled) return;
          createdUrl = URL.createObjectURL(b);
          setBlob(b);
          setBlobUrl(createdUrl);
        } else if (doc.url) {
          // For unencrypted, fetch into blob so drag/copy works cross-app
          const res = await fetch(doc.url);
          const b = await res.blob();
          if (cancelled) return;
          createdUrl = URL.createObjectURL(b);
          setBlob(b);
          setBlobUrl(createdUrl);
        } else {
          const refreshed = await documentService.refreshDocumentUrl(doc.id);
          if (refreshed) {
            const res = await fetch(refreshed);
            const b = await res.blob();
            if (cancelled) return;
            createdUrl = URL.createObjectURL(b);
            setBlob(b);
            setBlobUrl(createdUrl);
          }
        }
      } catch (e) {
        console.warn('[DocumentCard] thumbnail load failed:', doc.fileName, e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [inView, doc.id, doc.url, doc.metadata?.encrypted, userId, isAdmin]);

  const isImage = doc.fileType?.startsWith('image/');
  const isPDF = doc.fileType === 'application/pdf';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!blobUrl || !blob) {
      e.preventDefault();
      toast({ title: 'Bitte warten', description: 'Datei wird noch geladen.' });
      return;
    }
    try {
      const mime = doc.fileType || blob.type || 'application/octet-stream';
      // Chromium-only: enables drag into native apps (eTax) as a real file via virtual download
      // Format: "mime:filename:absolute-url"
      const absUrl = blobUrl;
      e.dataTransfer.setData('DownloadURL', `${mime}:${doc.fileName}:${absUrl}`);
      e.dataTransfer.setData('text/uri-list', absUrl);
      e.dataTransfer.setData('text/plain', doc.fileName);
      e.dataTransfer.effectAllowed = 'copy';
    } catch (err) {
      console.warn('[DocumentCard] drag setup failed', err);
    }
  };

  const handleCopy = async () => {
    if (!blob) return;
    try {
      // Try native file clipboard (works in Chromium for images/PDF)
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const item = new ClipboardItem({ [blob.type || 'application/octet-stream']: blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        toast({ title: 'In Zwischenablage kopiert', description: doc.fileName });
        return;
      }
      throw new Error('Clipboard API nicht verfügbar');
    } catch {
      // Fallback: download the file so user can grab it from Downloads
      handleDownload();
      toast({ title: 'Datei heruntergeladen', description: 'Aus dem Download-Ordner in eTax ziehen.' });
    }
  };

  const handleDownload = async () => {
    // Prefer native Despia file viewer when we have an HTTPS URL
    // (unencrypted docs only — encrypted ones live in a local blob: URL).
    if (doc.url && /^https:\/\//i.test(doc.url) && openInDespiaFileViewer(doc.url)) {
      return;
    }
    if (!blobUrl) return;
    const a = window.document.createElement('a');
    a.href = blobUrl;
    a.download = doc.fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <div
      ref={observerRef}
      draggable={!!blobUrl}
      onDragStart={handleDragStart}
      className={cn(
        'group relative bg-card border border-border rounded-2xl overflow-hidden transition-all',
        'hover:border-foreground/20 hover:shadow-[0_4px_16px_-4px_rgba(15,27,61,0.08)]',
        blobUrl ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      )}
      title={blobUrl ? 'Zum Ziehen in eTax bereit' : 'Lade Datei…'}
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border">
        {loading && (
          <div className="animate-pulse text-muted-foreground/40">
            <FileText className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            <FileText className="h-8 w-8" strokeWidth={1.5} />
            <span className="text-[10px]">Vorschau nicht verfügbar</span>
          </div>
        )}
        {!loading && !error && blobUrl && isImage && (
          <img
            src={blobUrl}
            alt={doc.fileName}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        )}
        {!loading && !error && blobUrl && isPDF && (
          <>
            <iframe
              src={`${blobUrl}#toolbar=0&navpanes=0&view=FitH`}
              className="absolute inset-0 w-full h-full pointer-events-none"
              title={doc.fileName}
            />
            <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wide bg-foreground/85 text-background px-1.5 py-0.5 rounded">
              PDF
            </span>
          </>
        )}
        {!loading && !error && blobUrl && !isImage && !isPDF && (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <FileText className="h-8 w-8" strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-wide">{doc.fileType?.split('/')[1] ?? 'Datei'}</span>
          </div>
        )}

        {/* Drag affordance */}
        {blobUrl && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-md p-1 border border-border">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          </div>
        )}

        {/* Click overlay → preview */}
        <button
          type="button"
          onClick={() => onPreview(doc)}
          className="absolute inset-0 flex items-center justify-center bg-foreground/0 hover:bg-foreground/30 transition-colors group/preview"
          aria-label="Vorschau öffnen"
        >
          <span className="opacity-0 group-hover/preview:opacity-100 transition-opacity bg-background/95 text-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border flex items-center gap-1.5 shadow-sm">
            <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
            Vorschau
          </span>
        </button>
      </div>

      {/* Meta + actions */}
      <div className="p-3 space-y-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate" title={doc.fileName}>
            {doc.fileName}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {doc.uploadDate.toLocaleDateString('de-DE')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] flex-1 rounded-lg"
            onClick={handleCopy}
            disabled={!blob}
          >
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Kopiert' : 'Kopieren'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] rounded-lg"
            onClick={handleDownload}
            disabled={!blobUrl}
            aria-label="Herunterladen"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
