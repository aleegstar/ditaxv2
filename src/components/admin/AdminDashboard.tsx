import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, FileText, Users, MessageCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { AdminWelcomeHeader } from './AdminWelcomeHeader';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { StatsWidget } from '@/components/ui/stats-widget';

interface DashboardStats {
  totalUsers: number;
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
      // Get total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get tax returns ready for creation (workflow_step = 'review' or 'processing')
      const { count: pendingCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .in('workflow_step', ['review', 'processing'])
        .neq('status', 'completed');

      // Get all open express tax returns (not completed)
      const { count: expressCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('express_service', true)
        .neq('status', 'completed');

      // Keep incompleteTaxReturns as express count for now (same value)
      const incompleteExpressCount = expressCount;

      // Get open tickets
      const { count: ticketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      // Get unread messages (messages where recipient_id is null = admin messages)
      const { count: messagesCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .is('recipient_id', null)
        .eq('read', false);

      // Get completed this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: completedThisMonthCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', startOfMonth.toISOString());

      // Get completed last month
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

      // Get pending definitive tax bills
      const { count: pendingDefinitiveTaxBillsCount } = await supabase
        .from('definitive_tax_bills')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);

      // Calculate revenue (assuming each paid tax return is worth 199 CHF)
      const { count: paidThisMonth } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'paid')
        .gte('payment_date', startOfMonth.toISOString());

      const { count: paidLastMonth } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'paid')
        .gte('payment_date', startOfLastMonth.toISOString())
        .lte('payment_date', endOfLastMonth.toISOString());

      const revenueThisMonth = (paidThisMonth || 0) * 199;
      const revenueLastMonth = (paidLastMonth || 0) * 199;

      // Generate mock chart data (in production, this would come from daily/weekly aggregates)
      const generateChartData = (current: number, previous: number) => {
        const trend = current > previous ? 1.1 : 0.9;
        return Array.from({ length: 7 }, (_, i) => {
          const base = 40 + (i * 5);
          return Math.round(base * trend);
        });
      };

      setStats({
        totalUsers: usersCount || 0,
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
    <div className="container mx-auto px-4 py-8 space-y-6 bg-white min-h-screen">
      <AdminWelcomeHeader
        title="Admin Dashboard"
        subtitle="Übersicht über alle anstehenden Aufgaben und wichtige Metriken"
        badge={{
          text: `${stats.pendingTaxReturns} Aufgaben`,
          variant: 'secondary'
        }}
        onRefresh={loadDashboardData}
      />

      {/* Stats Widgets für Steuererklärungen und Umsatz */}
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

      {/* Moderne Statistiken Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Offene Steuererklärungen */}
        <Link to="/admin/tax-processing" className="group">
          <Card className="relative h-full border border-gray-100 bg-white hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gray-50">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                {stats.expressTaxReturns > 0 && (
                  <Badge className="bg-[#1D64FF] text-white text-xs px-2 py-1">
                    {stats.expressTaxReturns}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">Offene Steuererklärungen</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingTaxReturns}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Offene Express */}
        <Card className="relative h-full border border-gray-100 bg-white hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gray-50">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              {stats.expressTaxReturns > 0 && (
                <Badge className="bg-orange-500 text-white text-xs px-2 py-1">
                  {stats.expressTaxReturns}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900">Offene Express</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.expressTaxReturns}</p>
            </div>
          </CardContent>
        </Card>

        {/* Offene Tickets */}
        <Link to="/admin/tickets" className="group">
          <Card className="relative h-full border border-gray-100 bg-white hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gray-50">
                  <MessageCircle className="h-6 w-6 text-gray-400" />
                </div>
                {stats.openTickets > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs px-2 py-1">
                    {stats.openTickets}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">Offene Tickets</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.openTickets}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Rechnungen zur Prüfung */}
        <Link to="/admin/definitive-tax-bills" className="group">
          <Card className="relative h-full border border-gray-100 bg-white hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gray-50">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                {stats.pendingDefinitiveTaxBills > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs px-2 py-1">
                    {stats.pendingDefinitiveTaxBills}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900">Rechnungen zur Prüfung</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingDefinitiveTaxBills}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Diesen Monat */}
        <Card className="relative h-full border border-gray-100 bg-white hover:shadow-lg transition-all duration-200 rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gray-50">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              {stats.completedThisMonth > 0 && (
                <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                  {stats.completedThisMonth}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900">Diesen Monat</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.completedThisMonth}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};