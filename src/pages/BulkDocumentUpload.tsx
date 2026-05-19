import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  SkipForward,
} from 'lucide-react';
import { BulkPreviewCard } from '@/components/documents/BulkPreviewCard';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { FormProvider, useFormContext } from '@/contexts/form';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { validateFile } from '@/utils/fileValidation';
import {
  classifyFiles,
  type ClassifiedFile,
} from '@/services/BulkClassificationService';
import { ensurePdfJsLoaded } from '@/utils/loadPdfJs';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

type Stage = 'drop' | 'analyzing' | 'review' | 'uploading' | 'missing';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';

function confidenceTone(conf: number): { label: string; cls: string } {
  if (conf >= 80) return { label: 'Sicher erkannt', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (conf >= 50) return { label: 'Wahrscheinlich', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Unsicher', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
}

const BulkUploadContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const { toast } = useToast();
  const { checklistItems, generateChecklist, formDataLoaded } = useFormContext();
  const { activeTaxFilerId } = useTaxFiler();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('drop');
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<ClassifiedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [pdfReady, setPdfReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const autoAdvanceTimer = useRef<number | null>(null);

  // Load PDF.js once on mount so PDF text + OCR fallback actually work here.
  useEffect(() => {
    let mounted = true;
    ensurePdfJsLoaded().then((ok) => {
      if (mounted) setPdfReady(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (formDataLoaded) generateChecklist();
  }, [formDataLoaded, generateChecklist]);

  const checklistOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    for (const c of checklistItems) {
      if (!map.has(c.id)) map.set(c.id, { id: c.id, title: c.title });
    }
    return Array.from(map.values());
  }, [checklistItems]);

  // Items still missing (not yet uploaded). These are the drop targets.
  const openItems = useMemo(() => {
    const seen = new Set<string>();
    return checklistItems
      .filter((c) => c.required && !c.uploaded)
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }, [checklistItems]);

  // ─────────────────────────────── intake ──────────────────────────────
  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const arr = Array.from(incoming);
      const accepted: ClassifiedFile[] = [];
      for (const f of arr) {
        const v = await validateFile(f);
        if (!v.isValid) {
          toast({ title: 'Datei abgelehnt', description: `${f.name}: ${v.error}`, variant: 'destructive' });
          continue;
        }
        accepted.push({
          id: uuidv4(),
          file: f,
          status: 'pending',
          suggestedChecklistItemId: null,
          suggestedLabel: null,
          confidence: 0,
          alternatives: [],
        });
      }
      if (accepted.length === 0) return;

      // Make sure PDF.js is loaded before we try to read PDFs.
      const ok = await ensurePdfJsLoaded();
      setPdfReady(ok);
      if (!ok) {
        console.warn('[BulkUpload] PDF.js failed to load – PDFs will not be OCR-classified');
      }

      setFiles(accepted);
      setStage('analyzing');
      const result = await classifyFiles(accepted, checklistItems, (next) => setFiles(next));
      setFiles(result);
      setCurrentIndex(0);
      setShowSummary(false);
      setStage('review');
    },
    [checklistItems, toast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  // ─────────────────────────────── review actions ──────────────────────
  const updateAssignment = (id: string, checklistItemId: string | null) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const opt = checklistOptions.find((o) => o.id === checklistItemId);
        return {
          ...f,
          suggestedChecklistItemId: checklistItemId,
          suggestedLabel: opt?.title ?? null,
        };
      }),
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const assignedCount = files.filter((f) => !!f.suggestedChecklistItemId).length;
  const unassignedFiles = files.filter((f) => !f.suggestedChecklistItemId);
  const unassignedCount = unassignedFiles.length;
  const canUpload = assignedCount > 0;

  const goNext = useCallback(() => {
    setCurrentIndex((idx) => {
      if (idx + 1 >= files.length) {
        setShowSummary(true);
        return idx;
      }
      return idx + 1;
    });
  }, [files.length]);

  const goPrev = useCallback(() => {
    setShowSummary(false);
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const handleAssign = (id: string, checklistItemId: string | null) => {
    updateAssignment(id, checklistItemId);
    if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current);
    if (checklistItemId) {
      autoAdvanceTimer.current = window.setTimeout(() => goNext(), 250);
    }
  };

  useEffect(() => () => {
    if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current);
  }, []);

  // ─────────────────────────────── upload ──────────────────────────────
  const handleConfirmUpload = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      toast({ title: 'Nicht angemeldet', variant: 'destructive' });
      return;
    }
    const svc = EncryptedDocumentService.getInstance();
    const toUpload = files.filter((f) => !!f.suggestedChecklistItemId);
    setUploadProgress({ done: 0, total: toUpload.length });
    setStage('uploading');

    let done = 0;
    for (const entry of toUpload) {
      try {
        const checklistItem = checklistItems.find((c) => c.id === entry.suggestedChecklistItemId);
        await svc.uploadEncryptedDocument(
          entry.file,
          entry.suggestedChecklistItemId!,
          user.id,
          year,
          checklistItem?.title,
          activeTaxFilerId,
        );
      } catch (e: any) {
        console.error('[BulkUpload] upload failed', entry.file.name, e);
        toast({
          title: `Fehler bei ${entry.file.name}`,
          description: e?.message ?? 'Upload fehlgeschlagen',
          variant: 'destructive',
        });
      } finally {
        done += 1;
        setUploadProgress({ done, total: toUpload.length });
      }
    }

    await generateChecklist();
    setStage('missing');
  };

  // ─────────────────────────────── missing items after upload ──────────
  const uploadedIds = useMemo(() => {
    return new Set(
      files
        .filter((f) => !!f.suggestedChecklistItemId)
        .map((f) => f.suggestedChecklistItemId as string),
    );
  }, [files]);

  const missingItems = useMemo(() => {
    return checklistItems.filter(
      (c) => c.required && !c.uploaded && !uploadedIds.has(c.id),
    );
  }, [checklistItems, uploadedIds]);

  // ─────────────────────────────── render helpers ──────────────────────
  const renderDrop = () => (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        'rounded-3xl border-2 border-dashed bg-card transition-all cursor-pointer',
        'flex flex-col items-center justify-center text-center px-6 py-16 md:py-24',
        dragOver
          ? 'border-[#1E3A5F] bg-[#1E3A5F]/[0.04]'
          : 'border-border hover:border-foreground/30',
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F]/5 flex items-center justify-center mb-5">
        <Upload className="w-6 h-6 text-[#1E3A5F]" strokeWidth={1.75} />
      </div>
      <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
        Zieh alle Unterlagen hierher
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        Wir analysieren jedes Dokument und schlagen die passende Kategorie vor.
        Nicht erkannte Dateien kannst Du im nächsten Schritt einfach per Drag &amp; Drop
        zuordnen.
      </p>
      <Button className="mt-6" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
        Dateien auswählen
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">PDF · JPG · PNG · HEIC – bis 25 MB pro Datei</p>
      {!pdfReady && (
        <p className="mt-2 text-[11px] text-muted-foreground/80">PDF-Erkennung wird vorbereitet…</p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );

  const renderAnalyzing = () => {
    const done = files.filter((f) => f.status === 'done' || f.status === 'error').length;
    const currentAnalyzing = files.find((f) => f.status === 'analyzing');
    const pct = files.length ? (done / files.length) * 100 : 0;
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-[18px] h-[18px] animate-pulse" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-foreground tracking-[-0.012em]">
              <span className="shimmer-text">KI prüft Deine Unterlagen…</span>
            </h3>
            <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
              {done} / {files.length} analysiert
              {currentAnalyzing && (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="shimmer-text font-medium">{currentAnalyzing.file.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="mt-5 space-y-2.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 text-[13px]">
              {f.status === 'analyzing' && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
              {f.status === 'pending' && <div className="w-4 h-4 rounded-full border border-border shrink-0" />}
              {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {f.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span
                className={cn(
                  'truncate',
                  f.status === 'analyzing'
                    ? 'shimmer-text font-medium'
                    : f.status === 'pending'
                      ? 'text-muted-foreground/70'
                      : 'text-foreground/80',
                )}
              >
                {f.file.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };


  const renderReview = () => {
    if (files.length === 0) return null;

    // Summary view after last file
    if (showSummary) {
      return (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Überprüfe Deine Zuordnungen und lade hoch.
          </div>
          <div className="rounded-3xl border border-border bg-card divide-y divide-border overflow-hidden">
            {files.map((f, idx) => {
              const tone = confidenceTone(f.confidence);
              return (
                <div key={f.id} className="p-4 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">{f.file.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {f.suggestedChecklistItemId
                        ? f.suggestedLabel
                        : <span className="text-amber-700">Nicht zugeordnet</span>}
                    </div>
                  </div>
                  {f.suggestedChecklistItemId && f.confidence > 0 && (
                    <span className={cn('shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap', tone.cls)}>
                      {Math.round(f.confidence)}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowSummary(false); setCurrentIndex(idx); }}
                    className="text-xs text-[#1E3A5F] hover:underline shrink-0"
                  >
                    Ändern
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="shrink-0 w-7 h-7 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
                    aria-label="Entfernen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-4 mt-6 z-10">
            <div className="rounded-2xl border border-border bg-card/95 backdrop-blur p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="text-sm">
                <span className="font-semibold text-foreground">{assignedCount}</span>
                <span className="text-muted-foreground"> von {files.length} bereit</span>
                {unassignedCount > 0 && (
                  <span className="ml-2 text-amber-700 text-xs">· {unassignedCount} ohne Zuordnung</span>
                )}
              </div>
              <Button onClick={handleConfirmUpload} disabled={!canUpload}>
                {unassignedCount > 0 ? `${assignedCount} hochladen` : 'Hochladen'}
              </Button>
            </div>
          </div>
        </>
      );
    }

    const safeIndex = Math.min(currentIndex, files.length - 1);
    const f = files[safeIndex];
    const tone = confidenceTone(f.confidence);
    const isLast = safeIndex === files.length - 1;

    return (
      <>
        {/* Step header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-muted-foreground">
            Dokument <span className="font-semibold text-foreground">{safeIndex + 1}</span> von {files.length}
          </div>
          <button
            type="button"
            onClick={() => { handleAssign(f.id, null); goNext(); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <SkipForward className="w-3.5 h-3.5" /> Überspringen
          </button>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          {/* Large preview */}
          <div className="bg-muted/40 flex items-center justify-center" style={{ minHeight: 360 }}>
            <BulkPreviewCard
              fileId={f.id}
              file={f.file}
              className="w-full h-[360px] md:h-[460px] flex items-center justify-center"
            />
          </div>

          {/* Meta + dropdown */}
          <div className="p-4 md:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{f.file.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {(f.file.size / 1024).toFixed(0)} KB
                  {f.suggestedLabel && (
                    <> · Vorschlag: <span className="text-foreground/80">{f.suggestedLabel}</span></>
                  )}
                </div>
              </div>
              {f.confidence > 0 && (
                <span className={cn('shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap', tone.cls)}>
                  {Math.round(f.confidence)}%
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Zuordnen zu
              </label>
              <div className="relative">
                <select
                  value={f.suggestedChecklistItemId ?? ''}
                  onChange={(e) => handleAssign(f.id, e.target.value || null)}
                  className="w-full appearance-none rounded-xl border border-border bg-background pr-9 pl-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                >
                  <option value="">Kategorie wählen…</option>
                  {openItems.length > 0 && (
                    <optgroup label="Offene Unterlagen">
                      {openItems.map((o) => (
                        <option key={o.id} value={o.id}>{o.title}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Alle Kategorien">
                    {checklistOptions
                      .filter((o) => !openItems.some((oi) => oi.id === o.id))
                      .map((o) => (
                        <option key={o.id} value={o.id}>{o.title}</option>
                      ))}
                  </optgroup>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={safeIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
              </Button>
              <Button onClick={() => (isLast ? setShowSummary(true) : goNext())}>
                {isLast ? 'Zur Übersicht' : 'Weiter'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {files.map((ff, i) => (
            <button
              key={ff.id}
              type="button"
              onClick={() => { setShowSummary(false); setCurrentIndex(i); }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === safeIndex ? 'w-6 bg-[#1E3A5F]' : ff.suggestedChecklistItemId ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-muted-foreground/30',
              )}
              aria-label={`Zu Dokument ${i + 1}`}
            />
          ))}
        </div>
      </>
    );
  };

  const renderUploading = () => (
    <div className="rounded-3xl border border-border bg-card p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F] mx-auto" />
      <div className="mt-4 text-sm font-medium text-foreground">
        Dokumente werden verschlüsselt hochgeladen…
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {uploadProgress.done} / {uploadProgress.total}
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden max-w-sm mx-auto">
        <div
          className="h-full bg-[#1E3A5F] transition-all"
          style={{
            width: `${
              uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0
            }%`,
          }}
        />
      </div>
    </div>
  );

  const renderMissing = () => (
    <>
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-foreground">
              {uploadProgress.done} Dokumente hochgeladen
            </div>
            <div className="text-sm text-muted-foreground">
              Verschlüsselt gespeichert für Steuerjahr {year}.
            </div>
          </div>
        </div>
      </div>

      {missingItems.length > 0 ? (
        <div className="mt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Noch fehlend ({missingItems.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Lade nach – oder reiche später ein.
            </span>
          </div>
          <div className="rounded-3xl border border-border bg-card divide-y divide-border overflow-hidden">
            {missingItems.map((item) => (
              <div
                key={item.id}
                className="p-4 md:p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {item.description}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiles([]);
                    setStage('drop');
                  }}
                >
                  Hochladen
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 text-center">
          <div className="text-sm font-medium text-foreground">
            Alle erforderlichen Unterlagen sind eingereicht.
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setFiles([]);
            setStage('drop');
          }}
        >
          Weitere hochladen
        </Button>
        <Button
          className="flex-1"
          onClick={() => navigate(`/documents?year=${year}`)}
        >
          Zur Übersicht
        </Button>
      </div>
    </>
  );

  return (
    <AnimatedPageContainer>
      <div className="min-h-screen bg-background pb-24">
        <SubpageHeader
          title={`Unterlagen hochladen · ${year}`}
          onBack={() => navigate(`/documents?year=${year}`)}
        />
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
          {stage === 'drop' && renderDrop()}
          {stage === 'analyzing' && renderAnalyzing()}
          {stage === 'review' && renderReview()}
          {stage === 'uploading' && renderUploading()}
          {stage === 'missing' && renderMissing()}
        </div>
      </div>
    </AnimatedPageContainer>
  );
};

const BulkDocumentUpload: React.FC = () => {
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  return (
    <FormProvider taxYear={year}>
      <BulkUploadContent />
    </FormProvider>
  );
};

export default BulkDocumentUpload;
