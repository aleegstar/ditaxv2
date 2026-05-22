import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  FileQuestion,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { MissingItemCard } from '@/components/chat/MissingItemCard';
import { usePendingMissingItems, useMissingItemRequests, type MissingItemResponse } from '@/hooks/useMissingItemRequests';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import missingItemsHero from '@/assets/missing-items-hero.png';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SubpageHeader 
        title="Fehlende Unterlagen/Angaben" 
        onBack={() => navigate('/')} 
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        {pendingRequests.length === 0 ? (
          /* Empty State – Card mit Hero */
          <div className="bg-card rounded-3xl border border-border shadow-[0_20px_60px_-20px_rgba(15,27,61,0.12)] overflow-hidden grid lg:grid-cols-2">
            <div className="relative h-56 lg:h-auto lg:min-h-[420px]">
              <img src={missingItemsHero} alt="Alles erledigt" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/80 via-[#0F1B3D]/15 to-transparent" />
              <div className="absolute top-5 left-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-foreground">Alles erledigt</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white">
                <h2 className="text-2xl lg:text-3xl font-semibold leading-tight">Lehn dich zurück.</h2>
              </div>
            </div>
            <div className="p-6 sm:p-10 lg:p-12 flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
                <CheckCircle2 className="w-8 h-8 text-white stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
                Keine offenen Anfragen
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Du hast aktuell nichts zu tun. Wir melden uns, sobald wir etwas von dir brauchen.
              </p>
              <Button
                onClick={() => navigate('/')}
                className="w-full h-12 rounded-2xl mt-auto"
              >
                Zurück zur Übersicht
              </Button>
            </div>
          </div>
        ) : (
          /* Active State – Hero links, Aufgaben rechts */
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
            {/* Hero / Intro Card */}
            <div className="bg-card rounded-3xl border border-border shadow-[0_20px_60px_-20px_rgba(15,27,61,0.12)] overflow-hidden flex flex-col">
              <div className="relative h-56 lg:h-64">
                <img src={missingItemsHero} alt="Wir kümmern uns gemeinsam" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/85 via-[#0F1B3D]/20 to-transparent" />
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg">
                  <FileQuestion className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{pendingRequests.length} offen</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-2">Letzter Schritt</p>
                  <h2 className="text-2xl font-semibold leading-tight">Fast geschafft.</h2>
                </div>
              </div>
              <div className="p-6 lg:p-8 flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Beantworte die offenen Anfragen, damit unser Steuer-Team deine Erklärung abschliessen kann.
                </p>

                {/* Progress */}
                <div className="space-y-3 mt-auto">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Fortschritt</span>
                    <span className="text-muted-foreground">{answeredCount}/{pendingRequests.length}</span>
                  </div>
                  <div className="h-2 rounded-full bg-background overflow-hidden border border-border">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                      style={{ width: `${(answeredCount / pendingRequests.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Card */}
            <div className="bg-card rounded-3xl border border-border shadow-[0_20px_60px_-20px_rgba(15,27,61,0.12)] overflow-hidden flex flex-col">
              <div className="p-6 lg:p-8 border-b border-border flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">Offene Anfragen</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Bitte beantworte alle {pendingRequests.length} Anfrage(n)
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-background border border-border text-foreground whitespace-nowrap">
                  {answeredCount}/{pendingRequests.length}
                </span>
              </div>

              <div className="p-6 lg:p-8 space-y-6 flex-1">
                {documentRequests.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground">
                      <AlertCircle className="w-5 h-5 text-orange-500 stroke-[1.5]" />
                      <span className="text-sm font-semibold">
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

                {informationRequests.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground">
                      <AlertCircle className="w-5 h-5 text-primary stroke-[1.5]" />
                      <span className="text-sm font-semibold">
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
              </div>

              <div className="p-6 lg:p-8 border-t border-border bg-background/50">
                {allRequestsAnswered ? (
                  <Button
                    onClick={handleSubmitAll}
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-2xl"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Wird eingereicht...
                      </>
                    ) : (
                      <>Alle {pendingRequests.length} Angaben einreichen</>
                    )}
                  </Button>
                ) : (
                  <div className="w-full h-12 rounded-2xl bg-background border border-border flex items-center justify-center gap-3 text-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground stroke-[1.5]" />
                    <span className="text-sm font-medium">
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
