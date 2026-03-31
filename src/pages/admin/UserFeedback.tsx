import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, RefreshCw, MessageSquare, MailCheck } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FeedbackItem {
  id: string;
  user_id: string | null;
  user_email: string | null;
  rating: number;
  feature_request: string | null;
  feedback_category: string | null;
  contact_consent: boolean;
  created_at: string;
}

const ratingLabels: Record<number, string> = {
  1: 'Sehr unzufrieden', 2: 'Unzufrieden', 3: 'Neutral', 4: 'Zufrieden', 5: 'Sehr zufrieden',
};

const categoryLabels: Record<string, string> = {
  bug: 'Fehler', feature: 'Feature', praise: 'Lob',
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={cn("w-3 h-3", s <= rating ? "text-foreground fill-foreground" : "text-muted-foreground/20")} />
    ))}
  </div>
);

const UserFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => { fetchFeedbacks(); }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase.from('user_feedback').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFeedbacks((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (filterRating && f.rating !== filterRating) return false;
    if (filterCategory && f.feedback_category !== filterCategory) return false;
    return true;
  });

  const averageRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : '–';

  const consentCount = feedbacks.filter((f) => f.contact_consent).length;
  const consentPercent = feedbacks.length > 0 ? Math.round((consentCount / feedbacks.length) * 100) : 0;

  const categoryCounts = {
    bug: feedbacks.filter((f) => f.feedback_category === 'bug').length,
    feature: feedbacks.filter((f) => f.feedback_category === 'feature').length,
    praise: feedbacks.filter((f) => f.feedback_category === 'praise').length,
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: feedbacks.filter((f) => f.rating === rating).length,
    percentage: feedbacks.length > 0
      ? Math.round((feedbacks.filter((f) => f.rating === rating).length / feedbacks.length) * 100) : 0,
  }));

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
          <h1 className="text-lg font-semibold text-foreground tracking-tight">User-Feedback</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{feedbacks.length} Feedbacks</p>
        </div>
        <button onClick={fetchFeedbacks} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gesamt', value: String(feedbacks.length) },
          { label: 'Durchschnitt', value: `${averageRating} ★` },
          { label: 'Kategorien', value: `${categoryCounts.bug} Bug · ${categoryCounts.feature} Feature · ${categoryCounts.praise} Lob` },
          { label: 'Kontakt erlaubt', value: `${consentPercent}% (${consentCount})` },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-[13px] font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Rating Distribution */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-sm">
        <h2 className="text-[13px] font-medium text-muted-foreground mb-3">Bewertungsverteilung</h2>
        <div className="space-y-2">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3">
              <div className="w-16 flex items-center gap-1">
                <span className="text-[12px] font-medium text-foreground">{rating}</span>
                <Star className="w-3 h-3 text-foreground fill-foreground" />
              </div>
              <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/20 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground w-16 text-right">{count} ({percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5">
          <button
            onClick={() => setFilterRating(null)}
            className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all", filterRating === null ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            Alle
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRating(r)}
              className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all", filterRating === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {r}★
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5">
          <button
            onClick={() => setFilterCategory(null)}
            className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all", filterCategory === null ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            Alle
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all", filterCategory === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Keine Feedbacks</p>
          <p className="text-[13px] text-muted-foreground">Keine Feedbacks für die aktuelle Filterauswahl.</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl bg-background divide-y divide-border/40">
          {filteredFeedbacks.map((feedback) => (
            <div key={feedback.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarRating rating={feedback.rating} />
                    <span className="text-[10px] font-medium text-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                      {ratingLabels[feedback.rating]}
                    </span>
                    {feedback.feedback_category && categoryLabels[feedback.feedback_category] && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        {categoryLabels[feedback.feedback_category]}
                      </span>
                    )}
                    {feedback.contact_consent && (
                      <span title="Kontakt erlaubt"><MailCheck className="w-3.5 h-3.5 text-muted-foreground" /></span>
                    )}
                  </div>

                  {feedback.feature_request && (
                    <p className="text-[12px] text-foreground leading-relaxed bg-muted/20 rounded-lg px-3 py-2">
                      {feedback.feature_request}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{feedback.user_email || 'Unbekannt'}</span>
                    <span>·</span>
                    <span>{format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserFeedback;
