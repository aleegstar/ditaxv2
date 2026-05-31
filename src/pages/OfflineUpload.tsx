import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudOff, Upload, FileText, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import { OfflineQueueService } from '@/services/OfflineQueueService';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { toast } from 'sonner';
import type { QueueSnapshot } from '@/services/queue/types';

/**
 * Offline-only surface. The only screen the user can reach while the
 * browser reports `navigator.onLine === false` (enforced by OfflineGate).
 *
 * Lets the user encrypt files locally and push them into the offline
 * upload queue. On reconnect the queue drains; pending docs land in
 * `uploaded_documents` with `pending_assignment=true` and the user is
 * nudged to `/documents/review`.
 *
 * Auth note: encryption needs a derived user key. If the user has never
 * been online on this device, the key is unavailable and we surface a
 * clear "einmalig anmelden" hint instead of silently failing.
 */
const OfflineUpload: React.FC = () => {
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  // Subscribe to queue snapshot for the "diese Session"-style list.
  useEffect(() => {
    return OfflineQueueService.subscribe(setSnapshot);
  }, []);

  // When connectivity returns and nothing pending, send the user to the
  // review screen (or dashboard if no pending docs exist).
  useEffect(() => {
    if (online) {
      const t = setTimeout(() => {
        navigate('/documents/review', { replace: true });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [online, navigate]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!userId) {
      toast.error('Bitte einmalig online anmelden, damit Uploads verschlüsselt werden können.');
      return;
    }
    setBusy(true);
    try {
      const svc = EncryptedDocumentService.getInstance();
      for (const file of Array.from(files)) {
        try {
          await svc.uploadPendingDocument(file, userId);
        } catch (err) {
          console.error('[OfflineUpload] enqueue failed', err);
          toast.error(`${file.name}: ${err instanceof Error ? err.message : 'Fehler'}`);
        }
      }
      toast.success(
        files.length === 1
          ? 'Dokument gespeichert. Wird beim nächsten Online-Status gesynct.'
          : `${files.length} Dokumente gespeichert.`,
      );
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const pendingJobs = snapshot?.jobs.filter((j) => j.type === 'document.upload') ?? [];

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* Status header */}
      <div
        className="w-full bg-muted border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-2">
          <CloudOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-foreground">
            {online ? 'Wieder online – Sync läuft…' : 'Offline-Modus'}
          </span>
        </div>
      </div>

      <main className="flex-1 w-full max-w-md mx-auto px-5 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dokumente sammeln
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Lade jetzt deine Unterlagen hoch. Sobald du wieder online bist,
            kannst du sie der richtigen Person, dem Jahr und dem
            Steuerformular zuordnen – oder löschen.
          </p>
        </header>

        {/* Auth gate hint */}
        {!userId && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-[13px] text-foreground leading-relaxed">
              Du musst dich einmal online anmelden, damit deine Dokumente
              auf diesem Gerät verschlüsselt werden können.
            </div>
          </div>
        )}

        {/* Upload actions */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <Button
            type="button"
            className="w-full h-12 rounded-2xl"
            disabled={busy || !userId}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Datei auswählen
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-2xl"
            disabled={busy || !userId}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            Foto aufnehmen
          </Button>
        </div>

        {/* Local queue list */}
        {pendingJobs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
              In Warteschlange ({pendingJobs.length})
            </h2>
            <ul className="space-y-2">
              {pendingJobs.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  {j.status === 'failed' ? (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : j.status === 'running' ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm text-foreground truncate flex-1">{j.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {j.status === 'failed' ? 'Fehler' : j.status === 'running' ? 'Sync…' : 'Wartet'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[12px] text-muted-foreground leading-relaxed pt-4">
          Alle Dateien werden bereits auf deinem Gerät verschlüsselt. Übertragung
          erfolgt automatisch, sobald die Verbindung zurück ist.
        </p>
      </main>
    </div>
  );
};

export default OfflineUpload;
