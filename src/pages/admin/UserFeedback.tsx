import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquareHeart, Star, Calendar, Lightbulb, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FeedbackItem {
  id: string;
  user_id: string | null;
  user_email: string | null;
  rating: number;
  feature_request: string | null;
  created_at: string;
}

const emojis: Record<number, string> = {
  1: '😢',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😍'
};

const ratingLabels: Record<number, string> = {
  1: 'Sehr unzufrieden',
  2: 'Unzufrieden',
  3: 'Neutral',
  4: 'Zufrieden',
  5: 'Sehr zufrieden'
};

const UserFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

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
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = filterRating
    ? feedbacks.filter(f => f.rating === filterRating)
    : feedbacks;

  const averageRating = feedbacks.length > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : '–';

  const featureRequestCount = feedbacks.filter(f => f.feature_request).length;

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: feedbacks.filter(f => f.rating === rating).length,
    percentage: feedbacks.length > 0 
      ? Math.round((feedbacks.filter(f => f.rating === rating).length / feedbacks.length) * 100)
      : 0
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

      {/* Stats Cards */}
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
                <p className="text-2xl font-semibold flex items-center gap-2">
                  {averageRating}
                  {feedbacks.length > 0 && (
                    <span className="text-lg">
                      {emojis[Math.round(Number(averageRating))]}
                    </span>
                  )}
                </p>
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
                <p className="text-sm text-slate-500">Mit Wünschen</p>
                <p className="text-2xl font-semibold">{featureRequestCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Letztes Feedback</p>
                <p className="text-sm font-medium">
                  {feedbacks[0] 
                    ? format(new Date(feedbacks[0].created_at), 'dd.MM.yyyy', { locale: de })
                    : '–'}
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
            {ratingDistribution.reverse().map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-xl w-8">{emojis[rating]}</span>
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

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-600">Filter:</span>
        <Button
          variant={filterRating === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterRating(null)}
        >
          Alle
        </Button>
        {[5, 4, 3, 2, 1].map(rating => (
          <Button
            key={rating}
            variant={filterRating === rating ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterRating(rating)}
          >
            {emojis[rating]}
          </Button>
        ))}
      </div>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Alle Feedbacks 
            {filterRating && ` (${ratingLabels[filterRating]})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFeedbacks.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              Keine Feedbacks vorhanden.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredFeedbacks.map((feedback) => (
                <div key={feedback.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{emojis[feedback.rating]}</span>
                        <Badge variant="secondary">
                          {ratingLabels[feedback.rating]}
                        </Badge>
                      </div>
                      
                      {feedback.feature_request && (
                        <div className="bg-slate-50 rounded-lg p-3 mt-2">
                          <p className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            Funktionswunsch:
                          </p>
                          <p className="text-sm text-slate-700">
                            {feedback.feature_request}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{feedback.user_email || 'Unbekannt'}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </span>
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
