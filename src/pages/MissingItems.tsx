import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  FileQuestion,
  Send,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { MissingItemCard } from '@/components/chat/MissingItemCard';
import { usePendingMissingItems, useMissingItemRequests, type MissingItemResponse } from '@/hooks/useMissingItemRequests';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MissingItems: React.FC = () => {
  const navigate = useNavigate();
  const { userId, isValid } = useAuthValidation();
  const { pendingRequests, loading, refetch } = usePendingMissingItems(userId || undefined);
  const { submitResponse, submitAllResponses } = useMissingItemRequests(userId || undefined);
  const [localResponses, setLocalResponses] = useState<Record<string, Partial<MissingItemResponse>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast.success('Alle Angaben erfolgreich eingereicht!');
        refetch();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SubpageHeader 
        title="Fehlende Unterlagen/Angaben" 
        onBack={() => navigate('/')} 
      />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {pendingRequests.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Alles erledigt!
            </h2>
            <p className="text-slate-500 mb-6">
              Es gibt aktuell keine offenen Anfragen.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Zurück zur Übersicht
            </Button>
          </div>
        ) : (
          /* Main Card */
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 ring-1 ring-slate-200 overflow-hidden">
            {/* Header Section */}
            <div className="p-6 pb-5 border-b border-slate-50 bg-white/50">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-center shadow-sm">
                      <FileQuestion className="w-6 h-6 text-amber-600 stroke-[1.5]" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
                      Offene Anfragen
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Bitte beantworten Sie alle {pendingRequests.length} Anfrage(n)
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-amber-200 text-amber-700 shadow-sm">
                    {answeredCount}/{pendingRequests.length} beantwortet
                  </span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 pt-5 space-y-5">
              {/* Document Requests */}
              {documentRequests.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <AlertCircle className="w-5 h-5 text-orange-500 stroke-[1.5]" />
                    <span className="text-base font-medium">
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-slate-900">
                    <AlertCircle className="w-5 h-5 text-blue-600 stroke-[1.5]" />
                    <span className="text-base font-medium">
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

              {/* Footer Status Bar */}
              <div className="mt-6">
                {allRequestsAnswered ? (
                  <Button
                    onClick={handleSubmitAll}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-base font-medium shadow-lg shadow-blue-600/20 transition-all active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Wird eingereicht...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Alle {pendingRequests.length} Angaben einreichen
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="w-full bg-orange-400 rounded-xl py-4 px-6 flex items-center justify-center gap-3 text-white shadow-lg shadow-orange-500/20 border border-orange-300">
                    <Clock className="w-5 h-5 stroke-[1.5]" />
                    <span className="text-base font-medium tracking-wide">
                      {openCount} Anfrage(n) noch offen
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissingItems;
