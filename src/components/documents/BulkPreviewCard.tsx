import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { ensurePdfJsLoaded } from '@/utils/loadPdfJs';

// Cache previews across mounts so re-navigating doesn't re-render PDFs.
const previewCache = new Map<string, string>();

interface Props {
  fileId: string;
  file: File;
  className?: string;
}

export const BulkPreviewCard: React.FC<Props> = ({ fileId, file, className }) => {
  const [url, setUrl] = useState<string | null>(() => previewCache.get(fileId) ?? null);
  const [loading, setLoading] = useState(!previewCache.has(fileId));
  const [error, setError] = useState(false);
  const createdObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (previewCache.has(fileId)) {
      setUrl(previewCache.get(fileId)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    const run = async () => {
      try {
        if (file.type.startsWith('image/')) {
          const obj = URL.createObjectURL(file);
          createdObjectUrl.current = obj;
          previewCache.set(fileId, obj);
          if (!cancelled) {
            setUrl(obj);
            setLoading(false);
          }
          return;
        }
        if (file.type === 'application/pdf') {
          const ok = await ensurePdfJsLoaded();
          if (!ok || !(window as any).pdfjsLib) throw new Error('pdfjs missing');
          const buf = await file.arrayBuffer();
          const pdf = await (window as any).pdfjsLib.getDocument({ data: buf }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no canvas ctx');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          previewCache.set(fileId, dataUrl);
          if (!cancelled) {
            setUrl(dataUrl);
            setLoading(false);
          }
          return;
        }
        throw new Error('unsupported');
      } catch (e) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fileId, file]);

  if (loading) {
    return (
      <div className={className}>
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs">Vorschau wird erstellt…</span>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={className}>
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileText className="w-10 h-10" strokeWidth={1.5} />
          <span className="text-xs truncate max-w-[80%]">{file.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <img src={url} alt={file.name} className="w-full h-full object-contain" />
    </div>
  );
};

export default BulkPreviewCard;
