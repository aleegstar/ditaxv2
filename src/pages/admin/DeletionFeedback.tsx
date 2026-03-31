import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DeletionFeedbackItem {
  id: string;
  user_email: string;
  reason: string;
  additional_feedback: string | null;
  created_at: string;
  deleted_user_id: string | null;
}

interface ReasonStats {
  reason: string;
  count: number;
  percentage: number;
}

const DeletionFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<DeletionFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReason, setFilterReason] = useState<string>('all');
  const [reasonStats, setReasonStats] = useState<ReasonStats[]>([]);

  useEffect(() => { loadFeedbacks(); }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('account_deletion_feedback').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFeedbacks(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading deletion feedbacks:', error);
      toast({ title: "Fehler", description: "Feedbacks konnten nicht geladen werden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: DeletionFeedbackItem[]) => {
    const reasonCounts: Record<string, number> = {};
    data.forEach(f => { reasonCounts[f.reason] = (reasonCounts[f.reason] || 0) + 1; });
    const total = data.length;
    setReasonStats(
      Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
    );
  };

  const filteredFeedbacks = filterReason === 'all' ? feedbacks : feedbacks.filter(f => f.reason === filterReason);
  const uniqueReasons = ['all', ...new Set(feedbacks.map(f => f.reason))];
  const withFeedbackCount = feedbacks.filter(f => f.additional_feedback).length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-center py-16">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Lösch-Feedback</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{feedbacks.length} Löschungen</p>
        </div>
        <button onClick={loadFeedbacks} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gesamt', value: String(feedbacks.length) },
          { label: 'Häufigster Grund', value: reasonStats[0]?.reason || '–' },
          { label: 'Letzte Löschung', value: feedbacks[0] ? format(new Date(feedbacks[0].created_at), 'dd.MM.yyyy', { locale: de }) : '–' },
          { label: 'Mit Feedback', value: String(withFeedbackCount) },
        ].map(stat => (
          <div key={stat.label} className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-[13px] font-semibold text-foreground truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Reason Distribution */}
      {reasonStats.length > 0 && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-sm">
          <h2 className="text-[13px] font-medium text-muted-foreground mb-3">Gründe-Verteilung</h2>
          <div className="space-y-2">
            {reasonStats.map(stat => (
              <div key={stat.reason} className="flex items-center gap-3">
                <span className="text-[12px] text-foreground w-48 truncate flex-shrink-0">{stat.reason}</span>
                <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-foreground/20 transition-all duration-500" style={{ width: `${stat.percentage}%` }} />
                </div>
                <span className="text-[11px] text-muted-foreground w-16 text-right flex-shrink-0">{stat.count} ({stat.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5 flex-wrap">
        {uniqueReasons.map(reason => (
          <button
            key={reason}
            onClick={() => setFilterReason(reason)}
            className={cn(
              "px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap",
              filterReason === reason ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {reason === 'all' ? 'Alle' : reason}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredFeedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserMinus className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Keine Feedbacks</p>
          <p className="text-[13px] text-muted-foreground">Keine Lösch-Feedbacks vorhanden.</p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm divide-y divide-white/30">
          {filteredFeedbacks.map(feedback => (
            <div key={feedback.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-foreground">{feedback.user_email}</span>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {feedback.reason}
                    </span>
                  </div>
                  {feedback.additional_feedback && (
                    <p className="text-[12px] text-foreground leading-relaxed bg-muted/20 rounded-lg px-3 py-2">
                      {feedback.additional_feedback}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeletionFeedback;
