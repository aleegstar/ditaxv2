import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, UserMinus, TrendingDown, Calendar, MessageSquare } from 'lucide-react';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DeletionFeedback {
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
  const [feedbacks, setFeedbacks] = useState<DeletionFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReason, setFilterReason] = useState<string>('all');
  const [reasonStats, setReasonStats] = useState<ReasonStats[]>([]);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_deletion_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFeedbacks(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading deletion feedbacks:', error);
      toast({
        title: "Fehler",
        description: "Feedbacks konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: DeletionFeedback[]) => {
    const reasonCounts: Record<string, number> = {};
    
    data.forEach(feedback => {
      const reason = feedback.reason;
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const total = data.length;
    const stats: ReasonStats[] = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    setReasonStats(stats);
  };

  const getReasonBadgeColor = (reason: string): string => {
    const colors: Record<string, string> = {
      'Ich nutze den Service nicht mehr': 'bg-gray-100 text-gray-700',
      'Zu teuer': 'bg-amber-100 text-amber-700',
      'Datenschutzbedenken': 'bg-purple-100 text-purple-700',
      'Schlechte Benutzererfahrung': 'bg-red-100 text-red-700',
      'Andere Steuerlösung gefunden': 'bg-blue-100 text-blue-700',
      'Sonstiges': 'bg-slate-100 text-slate-700',
    };
    return colors[reason] || 'bg-slate-100 text-slate-700';
  };

  const filteredFeedbacks = filterReason === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.reason === filterReason);

  const uniqueReasons = [...new Set(feedbacks.map(f => f.reason))];

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminWelcomeHeader
        title="Lösch-Feedback"
        subtitle="Feedback von Nutzern, die ihr Konto gelöscht haben"
        badge={{
          text: `${feedbacks.length} Löschungen`,
          variant: 'secondary'
        }}
        onRefresh={loadFeedbacks}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-8">
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserMinus className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Gesamt Löschungen</p>
                <p className="text-2xl font-semibold text-slate-900">{feedbacks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Häufigster Grund</p>
                <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">
                  {reasonStats[0]?.reason || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Letzte Löschung</p>
                <p className="text-sm font-medium text-slate-900">
                  {feedbacks[0] 
                    ? format(new Date(feedbacks[0].created_at), 'dd.MM.yyyy', { locale: de })
                    : '-'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Mit Feedback</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {feedbacks.filter(f => f.additional_feedback).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reason Distribution */}
      {reasonStats.length > 0 && (
        <Card className="bg-white border border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-slate-800 text-lg">Gründe-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reasonStats.map((stat) => (
                <div key={stat.reason} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-700">{stat.reason}</span>
                      <span className="text-sm font-medium text-slate-900">{stat.count} ({stat.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-[280px] bg-white">
            <SelectValue placeholder="Nach Grund filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Gründe</SelectItem>
            {uniqueReasons.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="sm"
          onClick={loadFeedbacks}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
          <p className="mt-2 text-slate-500">Lade Feedbacks...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <Card className="bg-white border border-slate-200">
          <CardContent className="py-12 text-center">
            <UserMinus className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Keine Lösch-Feedbacks vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((feedback) => (
            <Card key={feedback.id} className="bg-white border border-slate-200">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-700 font-medium">{feedback.user_email}</span>
                      <Badge className={getReasonBadgeColor(feedback.reason)}>
                        {feedback.reason}
                      </Badge>
                    </div>
                    
                    {feedback.additional_feedback && (
                      <div className="bg-slate-50 rounded-lg p-3 mt-2">
                        <p className="text-sm text-slate-500 mb-1">Zusätzliches Feedback:</p>
                        <p className="text-slate-700">{feedback.additional_feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-slate-500 whitespace-nowrap">
                    {format(new Date(feedback.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeletionFeedback;
