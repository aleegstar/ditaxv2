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
  Check,
  ShieldCheck,
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
import bulkUploadHero from '@/assets/bulk-upload-hero.jpg';

type Stage = 'drop' | 'analyzing' | 'review' | 'uploading' | 'missing';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';

// Single soft mint pill for assigned documents — matches the global fintech palette.
const CONFIDENCE_PILL_CLS =
  'bg-[hsl(var(--primary)/0.06)] text-primary border-[hsl(var(--primary)/0.18)]';

const BulkUploadContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const from = searchParams.get('from');
  const backTarget = from === 'checklist'
    ? `/form?section=unterlagen&year=${year}`
    : `/documents?year=${year}`;
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
  const [editingId, setEditingId] = useState<string | null>(null);
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
    if (from === 'checklist') {
      navigate(backTarget);
      return;
    }
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
    <div className="space-y-5">
      {/* Hero card — matches dashboard mode-switcher style */}
      <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
        <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-muted">
          <img
            src={bulkUploadHero}
            alt="Zwei Personen freuen sich über erledigte Steuerunterlagen"
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/60">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
            <span className="text-[11px] font-medium text-foreground">In Minuten erledigt</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-foreground tracking-[-0.012em]">
            Unterlagen für {year} hochladen
          </h2>
          <p className="text-[13px] text-muted-foreground leading-[1.5] mt-1">
            Lade alle Belege auf einmal hoch. Wir analysieren jedes Dokument lokal
            auf deinem Gerät und schlagen die passende Kategorie vor.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'rounded-2xl border-2 border-dashed bg-card transition-all cursor-pointer',
          'flex flex-col items-center justify-center text-center px-6 py-12 md:py-16',
          dragOver
            ? 'border-primary bg-primary/[0.04]'
            : 'border-border hover:border-foreground/30',
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Upload className="w-5 h-5 text-primary" strokeWidth={1.75} />
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
          Zieh deine Unterlagen hierher
        </h3>
        <p className="mt-1.5 text-[13px] text-muted-foreground max-w-md">
          PDF · JPG · PNG · HEIC – bis 25 MB pro Datei
        </p>
        <Button className="mt-5" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          Dateien auswählen
        </Button>
        {!pdfReady && (
          <p className="mt-3 text-[11px] text-muted-foreground/80">PDF-Erkennung wird vorbereitet…</p>
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

      {/* Privacy note — same style as analyzing card */}
      <div className="flex items-start gap-2 rounded-xl bg-muted/40 border border-border/60 px-3 py-2.5">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
        <p className="text-[12px] text-muted-foreground leading-[1.45]">
          Deine Dokumente werden verschlüsselt gespeichert. Nur Du und unser
          Steuer-Team haben Zugriff. Die Analyse erfolgt lokal auf deinem Gerät.
        </p>
      </div>
    </div>
  );

  const renderAnalyzing = () => {
    const done = files.filter((f) => f.status === 'done' || f.status === 'error').length;
    const currentAnalyzing = files.find((f) => f.status === 'analyzing');
    const pct = files.length ? (done / files.length) * 100 : 0;
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />
            <span className="absolute inset-0 rounded-xl border border-primary/20 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-foreground tracking-[-0.012em]">
              Ditax prüft Deine Unterlagen
            </h3>
            <p className="text-[13px] text-muted-foreground leading-[1.5] mt-1 truncate">
              {done} von {files.length} analysiert
              {currentAnalyzing && (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="text-foreground/80">{currentAnalyzing.file.name}</span>
                </>
              )}
            </p>
          </div>
          <span className="text-[12px] font-medium text-primary tabular-nums shrink-0">
            {Math.round(pct)}%
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="mt-5 space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2.5 text-[13px]">
              {f.status === 'analyzing' && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
              {f.status === 'pending' && <div className="w-4 h-4 rounded-full border border-border shrink-0" />}
              {f.status === 'done' && (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                </div>
              )}
              {f.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span
                className={cn(
                  'truncate',
                  f.status === 'pending'
                    ? 'text-muted-foreground/60'
                    : f.status === 'analyzing'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground',
                )}
              >
                {f.file.name}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/40 border border-border/60 px-3 py-2.5">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-[12px] text-muted-foreground leading-[1.45]">
            Analyse erfolgt lokal auf deinem Gerät. Der Inhalt verlässt es nicht.
          </p>
        </div>
      </div>
    );
  };



  const renderReview = () => {
    if (files.length === 0) return null;

    return (
      <>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
          Überprüfe Deine Zuordnungen und lade hoch.
        </div>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
          {files.map((f) => {
            const isEditing = editingId === f.id;
            return (
              <div key={f.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] sm:text-sm font-medium text-foreground truncate">
                      {f.file.name}
                    </div>
                    <div className="text-[12px] truncate">
                      {f.suggestedChecklistItemId ? (
                        <span className="text-primary">{f.suggestedLabel}</span>
                      ) : (
                        <span className="text-amber-600">Nicht zugeordnet</span>
                      )}
                    </div>
                  </div>
                  {f.suggestedChecklistItemId && f.confidence > 0 && (
                    <span
                      className={cn(
                        'shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border tabular-nums whitespace-nowrap',
                        CONFIDENCE_PILL_CLS,
                      )}
                    >
                      {Math.round(f.confidence)}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : f.id)}
                    className="text-[12px] text-primary hover:underline shrink-0 font-medium"
                  >
                    Ändern
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="shrink-0 w-7 h-7 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors"
                    aria-label="Entfernen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-3 pl-7 animate-fade-in">
                    <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">
                      Zuordnen zu
                    </label>
                    <div className="relative">
                      <select
                        value={f.suggestedChecklistItemId ?? ''}
                        onChange={(e) => {
                          handleAssign(f.id, e.target.value || null);
                          setEditingId(null);
                        }}
                        className="w-full appearance-none rounded-xl border border-border bg-background pr-9 pl-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-4 mt-5 z-10">
          <div className="rounded-2xl border border-border bg-card/95 backdrop-blur px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 shadow-[0_4px_16px_-4px_rgba(15,27,61,0.08)]">
            <div className="text-[13px] sm:text-sm">
              <span className="font-semibold text-foreground">{assignedCount}</span>
              <span className="text-muted-foreground"> von {files.length} bereit</span>
              {unassignedCount > 0 && (
                <span className="ml-2 text-amber-600 text-[12px]">· {unassignedCount} ohne Zuordnung</span>
              )}
            </div>
            <Button onClick={handleConfirmUpload} disabled={!canUpload}>
              Hochladen
            </Button>
          </div>
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
          onClick={() => navigate(backTarget)}
        >
          {from === 'checklist' ? 'Zurück zur Checkliste' : 'Zur Übersicht'}
        </Button>
      </div>
    </>
  );

  return (
    <AnimatedPageContainer>
      <div className="min-h-screen bg-background pb-24">
        <SubpageHeader
          title={`Unterlagen hochladen · ${year}`}
          onBack={() => navigate(backTarget)}
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
