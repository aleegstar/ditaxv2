import { useState } from 'react';
import { CloudOff, CloudUpload, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { OfflineQueueService } from '@/services/OfflineQueueService';

/**
 * Compact badge + bottom-sheet inspector for the offline write queue.
 * Renders nothing while the queue is empty so it stays out of the way.
 */
export const QueueStatusBadge = () => {
  const { jobs, pendingCount, failedCount, draining } = useOfflineQueue();
  const [open, setOpen] = useState(false);

  if (jobs.length === 0) return null;

  const total = jobs.length;
  const label = failedCount > 0
    ? `${failedCount} fehlgeschlagen`
    : draining
      ? 'Synchronisiere…'
      : `${pendingCount} warten auf Synchronisation`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 border-b border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        aria-label="Offene Synchronisations-Aktionen anzeigen"
      >
        {failedCount > 0 ? (
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
        ) : (
          <CloudUpload className={`h-4 w-4 text-muted-foreground ${draining ? 'animate-pulse' : ''}`} aria-hidden="true" />
        )}
        <span>{label}</span>
        <span className="text-muted-foreground">({total})</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Offene Aktionen</SheetTitle>
            <SheetDescription>
              Diese Aktionen werden automatisch synchronisiert, sobald
              eine Verbindung besteht. Du kannst sie jederzeit erneut
              versuchen oder verwerfen.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {job.status === 'failed' ? (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
                      ) : job.status === 'running' ? (
                        <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin shrink-0" aria-hidden="true" />
                      ) : (
                        <CloudOff className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{job.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {job.type === 'document.upload' && 'Dokument-Upload'}
                      {job.attempts > 0 && ` · ${job.attempts} Versuche`}
                    </div>
                    {job.lastError && (
                      <div className="mt-2 text-xs text-destructive break-words">
                        {job.lastError}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {job.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await OfflineQueueService.retry(job.id);
                          toast.success('Erneuter Versuch gestartet');
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await OfflineQueueService.discard(job.id);
                        toast('Aktion verworfen');
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default QueueStatusBadge;
