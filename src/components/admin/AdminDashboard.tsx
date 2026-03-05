import React, { useState, useEffect } from 'react';
import { FileText, Clock, MessageCircle, TrendingUp, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
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
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      await loadStats();
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
        incompleteTaxReturns: expressCount || 0,
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-16 text-[13px] text-muted-foreground">Laden...</div>
      </div>
    );
  }

  const metricCards = [
    { label: 'Offene Steuererklärungen', value: stats.pendingTaxReturns, to: '/admin/tax-processing', icon: FileText, badge: stats.expressTaxReturns > 0 ? `${stats.expressTaxReturns} Express` : null },
    { label: 'Offene Express', value: stats.expressTaxReturns, icon: Clock },
    { label: 'Offene Tickets', value: stats.openTickets, to: '/admin/tickets', icon: MessageCircle },
    { label: 'Rechnungen zur Prüfung', value: stats.pendingDefinitiveTaxBills, to: '/admin/definitive-tax-bills', icon: FileText },
    { label: 'Diesen Monat abgeschlossen', value: stats.completedThisMonth, icon: TrendingUp },
    { label: 'Neue User (30 Tage)', value: stats.newUsersLast30Days, to: '/admin/users', icon: UserPlus },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Übersicht über Aufgaben und Metriken</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {metricCards.map((card) => {
          const content = (
            <div className="border border-border/60 rounded-xl px-4 py-4 bg-background hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                  <card.icon className="h-4 w-4" />
                </div>
                {card.badge && (
                  <span className="text-[10px] font-medium text-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mb-0.5">{card.label}</p>
              <p className="text-[26px] font-semibold text-foreground tracking-tight leading-none">{card.value}</p>
            </div>
          );

          return card.to ? (
            <Link key={card.label} to={card.to}>{content}</Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
};
