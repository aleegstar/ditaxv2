import React, { useState, useEffect } from 'react';
import { FileText, Users, MessageCircle, TrendingUp, UserPlus, Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { AdminWelcomeHeader } from './AdminWelcomeHeader';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { StatsWidget } from '@/components/ui/stats-widget';
import { cn } from '@/lib/utils';

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

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  badge?: number;
}

function StatCard({ label, value, icon: Icon, href, badge }: StatCardProps) {
  const content = (
    <div className="flex items-center justify-between p-5 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors">
      <div className="space-y-1">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      </div>
      <div className="flex items-center gap-2">
        {badge != null && badge > 0 && (
          <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
            {badge}
          </span>
        )}
        <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
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
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Lädt Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminWelcomeHeader
        title="Dashboard"
        subtitle="Übersicht über alle anstehenden Aufgaben und Metriken"
        badge={{
          text: `${stats.pendingTaxReturns} offen`,
        }}
        onRefresh={loadDashboardData}
      />

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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Offene Steuererklärungen"
          value={stats.pendingTaxReturns}
          icon={FileText}
          href="/admin/tax-processing"
          badge={stats.expressTaxReturns}
        />
        <StatCard
          label="Offene Express"
          value={stats.expressTaxReturns}
          icon={Clock}
        />
        <StatCard
          label="Offene Tickets"
          value={stats.openTickets}
          icon={MessageCircle}
          href="/admin/tickets"
        />
        <StatCard
          label="Veranlagungen zur Prüfung"
          value={stats.pendingDefinitiveTaxBills}
          icon={FileText}
          href="/admin/definitive-tax-bills"
        />
        <StatCard
          label="Diesen Monat abgeschlossen"
          value={stats.completedThisMonth}
          icon={TrendingUp}
        />
        <StatCard
          label="Neue User (30 Tage)"
          value={stats.newUsersLast30Days}
          icon={UserPlus}
          href="/admin/users"
        />
      </div>
    </div>
  );
};
