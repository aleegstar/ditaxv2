import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Loader2,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import { MissingItemCard } from './MissingItemCard';
import { usePendingMissingItems, useMissingItemRequests, type MissingItemResponse } from '@/hooks/useMissingItemRequests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MissingItemsPanelProps {
  userId: string;
  taxFilerId?: string | null;
  onSubmitted?: () => void;
}

export const MissingItemsPanel: React.FC<MissingItemsPanelProps> = ({
  userId,
  taxFilerId,
  onSubmitted,
}) => {
  const { pendingRequests, loading, refetch } = usePendingMissingItems(userId, taxFilerId);
  const { submitResponse, submitAllResponses } = useMissingItemRequests(userId);
  const [localResponses, setLocalResponses] = useState<Record<string, Partial<MissingItemResponse>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLocalResponses({});
  }, [pendingRequests]);

  if (loading || pendingRequests.length === 0) {
    return null;
  }

  const handleResponseAdded = (requestId: string, response: Partial<MissingItemResponse>) => {
    if (Object.keys(response).length === 0) {
      const newResponses = { ...localResponses };
      delete newResponses[requestId];
      setLocalResponses(newResponses);
    } else {
      setLocalResponses(prev => ({
        ...prev,
        [requestId]: response,
      }));
    }
  };

  const allRequestsAnswered = pendingRequests.every(
    req => localResponses[req.id] && Object.keys(localResponses[req.id]).length > 0
  );

  const answeredCount = Object.keys(localResponses).filter(
    id => localResponses[id] && Object.keys(localResponses[id]).length > 0
  ).length;

  const handleSubmitAll = async () => {
    if (!allRequestsAnswered) return;

    setIsSubmitting(true);
    try {
      for (const [requestId, response] of Object.entries(localResponses)) {
        if (response.response_type === 'text' && response.text_content) {
          await submitResponse(requestId, 'text', response.text_content);
        } else if (response.response_type === 'file' && response.file_path) {
          await submitResponse(requestId, 'file', undefined, {
            path: response.file_path,
            name: response.file_name || '',
            size: response.file_size || 0,
          });
        }
      }

      const requestIds = pendingRequests.map(r => r.id);
      const success = await submitAllResponses(requestIds);

      if (success) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('chat_messages').insert({
            sender_id: user.id,
            content: `✅ Ich habe ${pendingRequests.length} Anfrage(n) beantwortet und eingereicht.`,
            chat_type: 'support',
          });
        }

        setLocalResponses({});
        refetch();
        onSubmitted?.();
      }
    } catch (error) {
      console.error('Error submitting responses:', error);
      toast.error('Fehler beim Einreichen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const documentRequests = pendingRequests.filter(r => r.request_type === 'document');
  const informationRequests = pendingRequests.filter(r => r.request_type === 'information');
  const openCount = pendingRequests.length - answeredCount;

  return (
    <div className="w-full rounded-[2rem] bg-card/70 backdrop-blur-2xl border border-border/40 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3.5 items-start">
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] flex items-center justify-center shadow-md shadow-primary/20">
              <AlertCircle className="w-5 h-5 text-primary-foreground stroke-[1.8]" />
            </div>
            <div className="space-y-0.5 pt-0.5">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Offene Anfragen
              </h3>
              <p className="text-sm text-muted-foreground">
                Bitte beantworten Sie alle {pendingRequests.length} Anfrage(n)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
            {answeredCount}/{pendingRequests.length} beantwortet
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Document Requests */}
        {documentRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4.5 h-4.5 text-muted-foreground stroke-[1.8]" />
              <span className="text-sm font-medium text-foreground">
                Fehlende Unterlagen ({documentRequests.length})
              </span>
            </div>
            {documentRequests.map(request => (
              <MissingItemCard
                key={request.id}
                request={request}
                onResponseAdded={handleResponseAdded}
                localResponse={localResponses[request.id]}
              />
            ))}
          </div>
        )}

        {/* Information Requests */}
        {informationRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4.5 h-4.5 text-muted-foreground stroke-[1.8]" />
              <span className="text-sm font-medium text-foreground">
                Fehlende Angaben ({informationRequests.length})
              </span>
            </div>
            {informationRequests.map(request => (
              <MissingItemCard
                key={request.id}
                request={request}
                onResponseAdded={handleResponseAdded}
                localResponse={localResponses[request.id]}
              />
            ))}
          </div>
        )}

        {/* Footer Action */}
        <div className="pt-1">
          {allRequestsAnswered ? (
            <Button
              onClick={handleSubmitAll}
              disabled={isSubmitting}
              className="w-full rounded-full py-6 text-sm font-semibold bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] hover:brightness-[1.04] transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird eingereicht...
                </>
              ) : (
                <>Alle {pendingRequests.length} Angaben einreichen</>
              )}
            </Button>
          ) : (
            <div className="w-full rounded-full py-4 px-6 flex items-center justify-center gap-2.5 bg-muted text-muted-foreground border border-border/50">
              <Clock className="w-4 h-4 stroke-[1.8]" />
              <span className="text-sm font-medium">
                {openCount} Anfrage(n) noch offen
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
