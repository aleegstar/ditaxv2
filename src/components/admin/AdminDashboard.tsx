import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, FileText, Users, MessageCircle, TrendingUp, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { AdminWelcomeHeader } from './AdminWelcomeHeader';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { StatsWidget } from '@/components/ui/stats-widget';

interface DashboardStats {
  totalUsers: number;
  newUsersLast30Days: number;
  pendingTaxReturns: number;
  expressTaxReturns: number;
  incompleteTaxReturns: number;
  openTickets: number;
  unreadMessages: number;
  completedThisMonth: number;
  pendingDefinitiveTaxBills: number;
  completedLastMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  completedChartData: number[];
  revenueChartData: number[];
}

interface ExpressTaxReturn {
  id: string;
  user_id: string;
  tax_year: string;
  created_at: string;
  workflow_step: string;
  status: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  daysSinceCreation: number;
}

export const AdminDashboard: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersLast30Days: 0,
    pendingTaxReturns: 0,
    expressTaxReturns: 0,
    incompleteTaxReturns: 0,
    openTickets: 0,
    unreadMessages: 0,
    completedThisMonth: 0,
    pendingDefinitiveTaxBills: 0,
    completedLastMonth: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    completedChartData: [30, 45, 40, 55, 60, 65, 70],
    revenueChartData: [35, 40, 50, 45, 60, 55, 65]
  });
  
  const [expressTaxReturns, setExpressTaxReturns] = useState<ExpressTaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadStats(),
        loadExpressTaxReturns()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Fehler",
        description: "Dashboard-Daten konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      
      const { count: newUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      const { count: pendingCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .in('workflow_step', ['review', 'processing'])
        .neq('status', 'completed');

      const { count: expressCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('express_service', true)
        .neq('status', 'completed');

      const incompleteExpressCount = expressCount;

      const { count: ticketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      const { count: messagesCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .is('recipient_id', null)
        .eq('read', false);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: completedThisMonthCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', startOfMonth.toISOString());

      const startOfLastMonth = new Date();
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      startOfLastMonth.setDate(1);
      startOfLastMonth.setHours(0, 0, 0, 0);
      
      const endOfLastMonth = new Date();
      endOfLastMonth.setDate(0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      
      const { count: completedLastMonthCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', startOfLastMonth.toISOString())
        .lte('updated_at', endOfLastMonth.toISOString());

      const { count: pendingDefinitiveTaxBillsCount } = await supabase
        .from('definitive_tax_bills')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);

      let revenueThisMonth = 0;
      let revenueLastMonth = 0;
      try {
        const { data: revenueData, error: revenueError } = await supabase.functions.invoke('get-stripe-revenue');
        if (!revenueError && revenueData) {
          revenueThisMonth = revenueData.revenueThisMonth || 0;
          revenueLastMonth = revenueData.revenueLastMonth || 0;
        } else {
          console.warn('Failed to fetch Stripe revenue, using fallback:', revenueError);
        }
      } catch (e) {
        console.warn('Stripe revenue fetch failed:', e);
      }

      const generateChartData = (current: number, previous: number) => {
        const trend = current > previous ? 1.1 : 0.9;
        return Array.from({ length: 7 }, (_, i) => {
          const base = 40 + (i * 5);
          return Math.round(base * trend);
        });
      };

      setStats({
        totalUsers: usersCount || 0,
        newUsersLast30Days: newUsersCount || 0,
        pendingTaxReturns: pendingCount || 0,
        expressTaxReturns: expressCount || 0,
        incompleteTaxReturns: incompleteExpressCount || 0,
        openTickets: ticketsCount || 0,
        unreadMessages: messagesCount || 0,
        completedThisMonth: completedThisMonthCount || 0,
        pendingDefinitiveTaxBills: pendingDefinitiveTaxBillsCount || 0,
        completedLastMonth: completedLastMonthCount || 0,
        revenueThisMonth,
        revenueLastMonth,
        completedChartData: generateChartData(completedThisMonthCount || 0, completedLastMonthCount || 0),
        revenueChartData: generateChartData(revenueThisMonth, revenueLastMonth)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadExpressTaxReturns = async () => {
    try {
      const { data: taxReturns, error } = await supabase
        .from('tax_returns')
        .select(`
          id,
          user_id,
          tax_year,
          created_at,
          workflow_step,
          status,
          profiles!inner (
            first_name,
            last_name,
            email
          )
        `)
        .eq('express_service', true)
        .neq('status', 'completed')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      const expressReturns: ExpressTaxReturn[] = taxReturns?.map(tr => ({
        id: tr.id,
        user_id: tr.user_id,
        tax_year: tr.tax_year,
        created_at: tr.created_at,
        workflow_step: tr.workflow_step,
        status: tr.status,
        user: {
          first_name: tr.profiles.first_name || '',
          last_name: tr.profiles.last_name || '',
          email: tr.profiles.email || ''
        },
        daysSinceCreation: Math.floor((new Date().getTime() - new Date(tr.created_at).getTime()) / (1000 * 60 * 60 * 24))
      })) || [];

      setExpressTaxReturns(expressReturns);
    } catch (error) {
      console.error('Error loading express tax returns:', error);
    }
  };

  const getWorkflowStepLabel = (step: string) => {
    const labels: { [key: string]: string } = {
      'data_collection': 'Datensammlung',
      'review': 'Überprüfung',
      'processing': 'Bearbeitung',
      'completed': 'Abgeschlossen'
    };
    return labels[step] || step;
  };

  const getPriorityBadge = (daysSinceCreation: number) => {
    if (daysSinceCreation >= 2) {
      return <Badge variant="destructive">Überfällig</Badge>;
    } else if (daysSinceCreation >= 1) {
      return <Badge variant="outline" className="border-orange-500 text-orange-700">Kritisch</Badge>;
    }
    return <Badge variant="secondary">Normal</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Lädt Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <AdminWelcomeHeader
        title="Admin Dashboard"
        subtitle="Übersicht über alle anstehenden Aufgaben und wichtige Metriken"
        badge={{
          text: `${stats.pendingTaxReturns} Aufgaben`,
          variant: 'secondary'
        }}
        onRefresh={loadDashboardData}
      />

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsWidget
          label="Abgeschlossene Steuererklärungen"
          amount={stats.completedThisMonth}
          change={stats.completedLastMonth > 0 
            ? Math.round(((stats.completedThisMonth - stats.completedLastMonth) / stats.completedLastMonth) * 100) 
            : 0}
          chartData={stats.completedChartData}
        />
        <StatsWidget
          label="Umsatz"
          amount={stats.revenueThisMonth}
          prefix="CHF "
          change={stats.revenueLastMonth > 0 
            ? Math.round(((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100) 
            : 0}
          chartData={stats.revenueChartData}
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/admin/tax-processing" className="group">
          <Card className="relative h-full border border-border/60 bg-card hover:border-border transition-colors duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                {stats.expressTaxReturns > 0 && (
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-primary/20">
                    {stats.expressTaxReturns}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Offene Steuererklärungen</h4>
                <p className="text-3xl tracking-tight text-foreground font-medium">{stats.pendingTaxReturns}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="relative h-full border border-border/60 bg-card hover:border-border transition-colors duration-200 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <Clock className="h-5 w-5" />
              </div>
              {stats.expressTaxReturns > 0 && (
                <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-orange-500/20">
                  {stats.expressTaxReturns}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Offene Express</h4>
              <p className="text-3xl tracking-tight text-foreground font-medium">{stats.expressTaxReturns}</p>
            </div>
          </CardContent>
        </Card>

        <Link to="/admin/tickets" className="group">
          <Card className="relative h-full border border-border/60 bg-card hover:border-border transition-colors duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <MessageCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Offene Tickets</h4>
                <p className="text-3xl tracking-tight text-foreground font-medium">{stats.openTickets}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/definitive-tax-bills" className="group">
          <Card className="relative h-full border border-border/60 bg-card hover:border-border transition-colors duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Rechnungen zur Prüfung</h4>
                <p className="text-3xl tracking-tight text-foreground font-medium">{stats.pendingDefinitiveTaxBills}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="relative h-full border border-border/60 bg-card hover:border-border transition-colors duration-200 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Diesen Monat</h4>
              <p className="text-3xl tracking-tight text-foreground font-medium">{stats.completedThisMonth}</p>
            </div>
          </CardContent>
        </Card>

        <Link to="/admin/users" className="group">
          <Card className="relative h-full border border-border/60 bg-card hover:border-border transition-colors duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <UserPlus className="h-5 w-5" />
                </div>
                {stats.newUsersLast30Days > 0 && (
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-primary/20">
                    +{stats.newUsersLast30Days}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Neue User (30 Tage)</h4>
                <p className="text-3xl tracking-tight text-foreground font-medium">{stats.newUsersLast30Days}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};
