import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  MessageSquare,
  Download,
  Loader2,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMissingItemRequests, type MissingItemRequest } from '@/hooks/useMissingItemRequests';
import { toast } from 'sonner';

interface ReviewSubmittedItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxReturnId: string;
  userId: string;
  userName: string;
  taxYear: string;
  requests: MissingItemRequest[];
  onSuccess?: () => void;
}

export const ReviewSubmittedItemsDialog: React.FC<ReviewSubmittedItemsDialogProps> = ({
  open,
  onOpenChange,
  taxReturnId,
  userId,
  userName,
  taxYear,
  requests,
  onSuccess,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { approveRequest, rejectRequest, approveAllAndComplete } = useMissingItemRequests();

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('missing-items')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Fehler beim Herunterladen');
    }
  };

  const handleApprove = async (requestId: string) => {
    setIsProcessing(true);
    try {
      await approveRequest(requestId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;

    setIsProcessing(true);
    try {
      await rejectRequest(rejectingId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveAll = async () => {
    setIsProcessing(true);
    try {
      const success = await approveAllAndComplete(taxReturnId);
      if (success) {
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const allApproved = requests.every(r => r.status === 'approved');
  const hasRejected = requests.some(r => r.status === 'rejected');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Eingereichte Unterlagen prüfen
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{userName}</span> • Steuerjahr {taxYear}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className={`border rounded-lg p-4 space-y-3 ${
                request.status === 'approved'
                  ? 'border-green-200 bg-green-50'
                  : request.status === 'rejected'
                  ? 'border-red-200 bg-red-50'
                  : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {request.request_type === 'document' ? (
                    <FileText className="h-5 w-5 text-orange-500" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                  )}
                  <div>
                    <h4 className="font-medium">{request.title}</h4>
                    {request.description && (
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={
                    request.status === 'approved'
                      ? 'default'
                      : request.status === 'rejected'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {request.status === 'approved' && 'Genehmigt'}
                  {request.status === 'rejected' && 'Abgelehnt'}
                  {request.status === 'submitted' && 'Eingereicht'}
                </Badge>
              </div>

              {/* Response */}
              {request.responses && request.responses.length > 0 && (
                <div className="bg-white rounded-md p-3 border">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Antwort des Benutzers:
                  </div>
                  {request.responses.map((response, idx) => (
                    <div key={idx} className="space-y-2">
                      {response.response_type === 'file' ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-sm">{response.file_name}</span>
                            {response.file_size && (
                              <span className="text-xs text-muted-foreground">
                                ({Math.round(response.file_size / 1024)} KB)
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(response.file_path!, response.file_name!)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Herunterladen
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm bg-slate-50 p-2 rounded">
                          {response.text_content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {request.status === 'submitted' && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectingId(request.id)}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ablehnen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Genehmigen
                  </Button>
                </div>
              )}

              {/* Reject Form */}
              {rejectingId === request.id && (
                <div className="space-y-3 border-t pt-3">
                  <Label>Ablehnungsgrund</Label>
                  <Textarea
                    placeholder="Bitte geben Sie einen Grund für die Ablehnung an..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Ablehnen'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasRejected && (
            <div className="flex items-center gap-2 text-sm text-amber-600 mr-auto">
              <AlertTriangle className="h-4 w-4" />
              Einige Einreichungen wurden abgelehnt
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schliessen
          </Button>
          {!allApproved && requests.some(r => r.status === 'submitted') && (
            <Button onClick={handleApproveAll} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Alle genehmigen & Status wechseln
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
