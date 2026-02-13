import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquareHeart, Star, Calendar, Lightbulb, Filter, Bug, Heart, MailCheck } from 'lucide-react';
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
  1: 'Sehr unzufrieden',
  2: 'Unzufrieden',
  3: 'Neutral',
  4: 'Zufrieden',
  5: 'Sehr zufrieden',
};

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  bug: { label: 'Fehler', icon: Bug, color: 'bg-red-100 text-red-700' },
  feature: { label: 'Feature', icon: Lightbulb, color: 'bg-purple-100 text-purple-700' },
  praise: { label: 'Lob', icon: Heart, color: 'bg-green-100 text-green-700' },
};

const StarRating: React.FC<{ rating: number; size?: string }> = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={cn(size, s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200')}
      />
    ))}
  </div>
);

const UserFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false });

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

  const averageRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
      : '–';

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
      ? Math.round((feedbacks.filter((f) => f.rating === rating).length / feedbacks.length) * 100)
      : 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminWelcomeHeader
        title="User-Feedback"
        badge={{ text: `${feedbacks.length} Feedbacks`, variant: 'secondary' }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquareHeart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Gesamt</p>
                <p className="text-2xl font-semibold">{feedbacks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Durchschnitt</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold">{averageRating}</p>
                  {feedbacks.length > 0 && (
                    <StarRating rating={Math.round(Number(averageRating))} size="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Lightbulb className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Kategorien</p>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="text-red-600">{categoryCounts.bug} Bug</span>
                  <span className="text-purple-600">{categoryCounts.feature} Feature</span>
                  <span className="text-green-600">{categoryCounts.praise} Lob</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MailCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Kontakt erlaubt</p>
                <p className="text-2xl font-semibold">
                  {consentPercent}%
                  <span className="text-sm font-normal text-slate-400 ml-1">({consentCount})</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bewertungsverteilung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3">
                <StarRating rating={rating} size="w-3.5 h-3.5" />
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 w-16 text-right">
                  {count} ({percentage}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-600">Rating:</span>
        <Button variant={filterRating === null ? 'default' : 'outline'} size="sm" onClick={() => setFilterRating(null)}>
          Alle
        </Button>
        {[5, 4, 3, 2, 1].map((r) => (
          <Button key={r} variant={filterRating === r ? 'default' : 'outline'} size="sm" onClick={() => setFilterRating(r)}>
            {r}★
          </Button>
        ))}
        <span className="text-sm text-slate-600 ml-2">Kategorie:</span>
        <Button variant={filterCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(null)}>
          Alle
        </Button>
        {Object.entries(categoryConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Button key={key} variant={filterCategory === key ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(key)}>
              <Icon className="w-3.5 h-3.5 mr-1" />
              {cfg.label}
            </Button>
          );
        })}
      </div>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Alle Feedbacks
            {filterRating && ` (${filterRating}★)`}
            {filterCategory && ` – ${categoryConfig[filterCategory]?.label}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFeedbacks.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Keine Feedbacks vorhanden.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredFeedbacks.map((feedback) => (
                <div key={feedback.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <StarRating rating={feedback.rating} />
                        <Badge variant="secondary">{ratingLabels[feedback.rating]}</Badge>
                        {feedback.feedback_category && categoryConfig[feedback.feedback_category] && (() => {
                          const cfg = categoryConfig[feedback.feedback_category!];
                          const Icon = cfg.icon;
                          return (
                            <Badge className={cn('gap-1', cfg.color)} variant="outline">
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </Badge>
                          );
                        })()}
                        {feedback.contact_consent && (
                          <span title="Kontakt erlaubt"><MailCheck className="w-4 h-4 text-green-500" /></span>
                        )}
                      </div>

                      {feedback.feature_request && (
                        <div className="bg-slate-50 rounded-lg p-3 mt-2">
                          <p className="text-sm text-slate-700">{feedback.feature_request}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{feedback.user_email || 'Unbekannt'}</span>
                        <span>•</span>
                        <span>{format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserFeedback;
