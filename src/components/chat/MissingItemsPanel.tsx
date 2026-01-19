import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Send, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MissingItemCard } from './MissingItemCard';
import { usePendingMissingItems, useMissingItemRequests, type MissingItemResponse } from '@/hooks/useMissingItemRequests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MissingItemsPanelProps {
  userId: string;
  onSubmitted?: () => void;
}

export const MissingItemsPanel: React.FC<MissingItemsPanelProps> = ({
  userId,
  onSubmitted,
}) => {
  const { pendingRequests, loading, refetch } = usePendingMissingItems(userId);
  const { submitResponse, submitAllResponses } = useMissingItemRequests(userId);
  const [localResponses, setLocalResponses] = useState<Record<string, Partial<MissingItemResponse>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset local responses when requests change
  useEffect(() => {
    setLocalResponses({});
  }, [pendingRequests]);

  if (loading) {
    return null;
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  const handleResponseAdded = (requestId: string, response: Partial<MissingItemResponse>) => {
    if (Object.keys(response).length === 0) {
      // Remove response
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
      // Save all responses to database
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

      // Mark all requests as submitted
      const requestIds = pendingRequests.map(r => r.id);
      const success = await submitAllResponses(requestIds);

      if (success) {
        // Send a chat message confirming submission
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

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 rounded-full">
            <ClipboardList className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              Fehlende Unterlagen/Angaben
            </h3>
            <p className="text-sm text-slate-600">
              Bitte beantworten Sie alle {pendingRequests.length} Anfrage(n)
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-amber-700 border-amber-300">
          {answeredCount}/{pendingRequests.length} beantwortet
        </Badge>
      </div>

      {/* Document Requests */}
      {documentRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Fehlende Unterlagen ({documentRequests.length})
          </h4>
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
          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            Fehlende Angaben ({informationRequests.length})
          </h4>
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

      {/* Submit Button */}
      <div className="pt-2 border-t border-amber-200">
        <Button
          onClick={handleSubmitAll}
          disabled={!allRequestsAnswered || isSubmitting}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Wird eingereicht...
            </>
          ) : allRequestsAnswered ? (
            <>
              <Send className="h-4 w-4 mr-2" />
              Alle {pendingRequests.length} Angaben einreichen
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {pendingRequests.length - answeredCount} Anfrage(n) noch offen
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
