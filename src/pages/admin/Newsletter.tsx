import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Mail, Send, Users, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Campaign {
  id: string;
  subject: string;
  html_content: string;
  status: string;
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
}

export default function Newsletter() {
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get subscriber count
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .not('marketing_consent_at', 'is', null)
        .not('email', 'is', null);
      
      setSubscriberCount(count || 0);

      // Get campaigns
      const { data } = await supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setCampaigns((data as Campaign[]) || []);
    } catch (err) {
      console.error('Error loading newsletter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Betreff und Inhalt sind erforderlich.' });
      return;
    }

    setSending(true);
    try {
      // Create campaign
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: campaign, error: insertError } = await supabase
        .from('newsletter_campaigns')
        .insert({
          subject: subject.trim(),
          html_content: htmlContent.trim(),
          sent_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Invoke edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('send-newsletter', {
        body: { campaign_id: campaign.id },
      });

      if (fnError) throw fnError;

      toast({
        title: 'Newsletter versendet',
        description: `${result.sent} E-Mails erfolgreich versendet${result.failed > 0 ? `, ${result.failed} fehlgeschlagen` : ''}.`,
      });

      setSubject('');
      setHtmlContent('');
      loadData();
    } catch (err: any) {
      console.error('Error sending newsletter:', err);
      toast({ variant: 'destructive', title: 'Fehler', description: err.message || 'Newsletter konnte nicht versendet werden.' });
    } finally {
      setSending(false);
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
    draft: { label: 'Entwurf', variant: 'outline', icon: Clock },
    sending: { label: 'Wird gesendet...', variant: 'secondary', icon: RefreshCw },
    sent: { label: 'Versendet', variant: 'default', icon: CheckCircle2 },
    failed: { label: 'Fehlgeschlagen', variant: 'destructive', icon: XCircle },
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Newsletter</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          E-Mails an abonnierte Benutzer versenden
        </p>
      </div>

      {/* Subscriber Count */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[13px] text-muted-foreground">Aktive Abonnenten</p>
            <p className="text-xl font-semibold text-foreground">{subscriberCount}</p>
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.8} />
          <h2 className="text-[14px] font-medium text-foreground">Neue Kampagne</h2>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-muted-foreground">Betreff</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="E-Mail Betreff..."
            className="bg-white/50 border-border/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-muted-foreground">HTML-Inhalt</label>
          <Textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="<h1>Hallo!</h1><p>Ihr Newsletter-Inhalt...</p>"
            rows={10}
            className="bg-white/50 border-border/40 font-mono text-[13px]"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[12px] text-muted-foreground">
            Wird an {subscriberCount} Abonnent{subscriberCount !== 1 ? 'en' : ''} gesendet
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!subject.trim() || !htmlContent.trim() || sending || subscriberCount === 0}
                className="rounded-full gap-2"
                style={{ background: 'linear-gradient(to bottom, hsl(222, 100%, 60%), hsl(222, 100%, 47%))' }}
              >
                {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sending ? 'Wird gesendet...' : 'Newsletter senden'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Newsletter versenden?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion versendet eine E-Mail an <strong>{subscriberCount} Abonnent{subscriberCount !== 1 ? 'en' : ''}</strong> mit dem Betreff "{subject}". Dies kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleSend}>Jetzt senden</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Campaign History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-foreground">Kampagnen-Historie</h2>
          <button onClick={loadData} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm p-8 text-center">
            <p className="text-[13px] text-muted-foreground">Noch keine Kampagnen versendet</p>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm divide-y divide-white/30">
            {campaigns.map((campaign) => {
              const config = statusConfig[campaign.status] || statusConfig.draft;
              const StatusIcon = config.icon;
              return (
                <div key={campaign.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate">{campaign.subject}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {campaign.sent_at
                        ? format(new Date(campaign.sent_at), 'dd. MMM yyyy, HH:mm', { locale: de })
                        : format(new Date(campaign.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                      {campaign.recipient_count > 0 && ` · ${campaign.recipient_count} Empfänger`}
                    </p>
                  </div>
                  <Badge variant={config.variant} className="gap-1 text-[11px]">
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
