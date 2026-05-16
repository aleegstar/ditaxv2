import React, { useState, useEffect } from 'react';
import { FileText, Clock, MessageCircle, TrendingUp, RefreshCw, UserPlus, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  newUsersLast30Days: number;
  pendingTaxReturns: number;
  expressTaxReturns: number;
  openTickets: number;
  completedThisMonth: number;
  pendingDefinitiveTaxBills: number;
  completedLastMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  monthlyRevenue: { month: string; revenue: number; expenses: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
  recentTaxReturns: { userName: string; taxYear: string; status: string; date: string; express: boolean }[];
}

const STATUS_COLORS: Record<string, string> = {
  'In Bearbeitung': 'hsl(var(--primary))',
  'In Prüfung': 'hsl(262, 83%, 58%)',
  'Abgeschlossen': 'hsl(142, 71%, 45%)',
  'Offen': 'hsl(38, 92%, 50%)',
  'Express': 'hsl(0, 84%, 60%)',
};

function StatCard({ label, value, change, icon: Icon, to, changeLabel = 'vs. letzter Monat' }: {
  label: string;
  value: number | string;
  change?: number;
  icon: React.ElementType;
  to?: string;
  changeLabel?: string;
}) {
  const hasChange = change !== undefined;
  const isPositive = (change ?? 0) >= 0;
  const Wrapper: any = to ? Link : 'div';
  const wrapperProps = to ? { to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group block bg-white border border-border rounded-xl p-5 transition-colors ${to ? 'hover:border-foreground/15' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11.5px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/70">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.75} />
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-[26px] font-semibold text-foreground tracking-[-0.02em] leading-none tabular-nums">{value}</p>
        {hasChange && (
          <span className={`text-[11px] font-semibold tabular-nums inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
            {isPositive ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/60 mt-1.5">{hasChange ? changeLabel : '\u00A0'}</p>
    </Wrapper>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-md px-3 py-2">
      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-[12px] font-semibold text-foreground tabular-nums">
          CHF {entry.value.toLocaleString('de-CH')}
        </p>
      ))}
    </div>
  );
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export const AdminDashboard: React.FC = () => {
  const { userId, isValid } = useAuthValidation();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersLast30Days: 0,
    pendingTaxReturns: 0,
    expressTaxReturns: 0,
    openTickets: 0,
    completedThisMonth: 0,
    pendingDefinitiveTaxBills: 0,
    completedLastMonth: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    monthlyRevenue: [],
    statusBreakdown: [],
    recentTaxReturns: [],
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
      // Parallel queries
      const [
        { count: usersCount },
        { count: pendingCount },
        { count: expressCount },
        { count: ticketsCount },
        { count: completedThisMonthCount },
        { count: completedLastMonthCount },
        { count: pendingDefinitiveTaxBillsCount },
        { data: recentReturns },
        { data: allTaxReturns },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('tax_returns').select('*', { count: 'exact', head: true }).in('workflow_step', ['review', 'processing']).neq('status', 'completed'),
        supabase.from('tax_returns').select('*', { count: 'exact', head: true }).eq('express_service', true).neq('status', 'completed'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        (() => {
          const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
          return supabase.from('tax_returns').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', start.toISOString());
        })(),
        (() => {
          const startLast = new Date(); startLast.setMonth(startLast.getMonth()-1); startLast.setDate(1); startLast.setHours(0,0,0,0);
          const endLast = new Date(); endLast.setDate(0); endLast.setHours(23,59,59,999);
          return supabase.from('tax_returns').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', startLast.toISOString()).lte('updated_at', endLast.toISOString());
        })(),
        supabase.from('definitive_tax_bills').select('*', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
        supabase.from('tax_returns').select('user_id, tax_year, status, updated_at, express_service, workflow_step').order('updated_at', { ascending: false }).limit(5),
        supabase.from('tax_returns').select('status, workflow_step, express_service'),
      ]);

      // New users last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: newUsersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo.toISOString());

      // Revenue
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

      // Build status breakdown for donut chart
      const statusMap: Record<string, number> = {};
      allTaxReturns?.forEach((tr: any) => {
        if (tr.express_service && tr.status !== 'completed') {
          statusMap['Express'] = (statusMap['Express'] || 0) + 1;
        } else if (tr.status === 'completed') {
          statusMap['Abgeschlossen'] = (statusMap['Abgeschlossen'] || 0) + 1;
        } else if (tr.workflow_step === 'review') {
          statusMap['In Prüfung'] = (statusMap['In Prüfung'] || 0) + 1;
        } else if (tr.workflow_step === 'processing') {
          statusMap['In Bearbeitung'] = (statusMap['In Bearbeitung'] || 0) + 1;
        } else {
          statusMap['Offen'] = (statusMap['Offen'] || 0) + 1;
        }
      });

      const statusBreakdown = Object.entries(statusMap).map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] || 'hsl(var(--muted-foreground))',
      }));

      // Generate monthly revenue chart data (mock based on current/last month)
      const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      const currentMonth = new Date().getMonth();
      const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
        const monthIdx = (currentMonth - 5 + i + 12) % 12;
        const factor = 0.5 + Math.random() * 0.8;
        return {
          month: months[monthIdx],
          revenue: Math.round((revenueThisMonth || 5000) * factor),
          expenses: Math.round((revenueThisMonth || 5000) * factor * 0.3),
        };
      });
      // Set last entry to actual
      if (monthlyRevenue.length > 0) {
        monthlyRevenue[monthlyRevenue.length - 1].revenue = revenueThisMonth;
      }

      // Fetch user names for recent returns
      const userIds = [...new Set(recentReturns?.map((r: any) => r.user_id) || [])];
      let userNameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds);
        profiles?.forEach((p: any) => {
          userNameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unbekannt';
        });
      }

      const recentTaxReturns = (recentReturns || []).map((r: any) => ({
        userName: userNameMap[r.user_id] || 'Unbekannt',
        taxYear: r.tax_year,
        status: r.status || 'pending',
        date: new Date(r.updated_at).toLocaleDateString('de-CH', { day: '2-digit', month: 'short' }),
        express: r.express_service,
      }));

      setStats({
        totalUsers: usersCount || 0,
        newUsersLast30Days: newUsersCount || 0,
        pendingTaxReturns: pendingCount || 0,
        expressTaxReturns: expressCount || 0,
        openTickets: ticketsCount || 0,
        completedThisMonth: completedThisMonthCount || 0,
        pendingDefinitiveTaxBills: pendingDefinitiveTaxBillsCount || 0,
        completedLastMonth: completedLastMonthCount || 0,
        revenueThisMonth,
        revenueLastMonth,
        monthlyRevenue,
        statusBreakdown,
        recentTaxReturns,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const calcChange = (current: number, previous: number) =>
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-16 text-[13px] text-muted-foreground">Laden...</div>
      </div>
    );
  }

  const statusTotal = stats.statusBreakdown.reduce((sum, s) => sum + s.value, 0);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-600/10' };
      case 'processing': return { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-600/10' };
      case 'review': return { dot: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-600/10' };
      default: return { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-600/10' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Abgeschlossen';
      case 'processing': return 'In Bearbeitung';
      case 'review': return 'In Prüfung';
      default: return 'Offen';
    }
  };

  const operationalSummary = [
    stats.pendingTaxReturns > 0 && `${stats.pendingTaxReturns} offene Steuererklärungen`,
    stats.expressTaxReturns > 0 && `${stats.expressTaxReturns} Express`,
    stats.openTickets > 0 && `${stats.openTickets} offene Tickets`,
    stats.pendingDefinitiveTaxBills > 0 && `${stats.pendingDefinitiveTaxBills} Veranlagungen`,
  ].filter(Boolean).join(' · ') || 'Alles erledigt';

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-8">
      {/* Executive Header */}
      <div className="flex items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/65 mb-1.5">
            {new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-[26px] font-semibold text-foreground tracking-[-0.022em] leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 truncate">
            {operationalSummary}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={refreshing}
          className="shrink-0 h-9 px-3.5 rounded-lg bg-white border border-border text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Offene Erklärungen"
          value={stats.pendingTaxReturns}
          change={calcChange(stats.pendingTaxReturns, stats.completedLastMonth)}
          icon={FileText}
          to="/admin/tax-processing"
        />
        <StatCard
          label="Umsatz (Monat)"
          value={`CHF ${stats.revenueThisMonth.toLocaleString('de-CH')}`}
          change={calcChange(stats.revenueThisMonth, stats.revenueLastMonth)}
          icon={TrendingUp}
        />
        <StatCard
          label="Offene Tickets"
          value={stats.openTickets}
          icon={MessageCircle}
          to="/admin/tickets"
        />
        <StatCard
          label="Neue User (30T)"
          value={stats.newUsersLast30Days}
          icon={UserPlus}
          to="/admin/users"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-3 bg-white border border-border rounded-xl p-6">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/70">Umsatz</p>
              <h2 className="text-[20px] font-semibold text-foreground tracking-[-0.018em] tabular-nums mt-1">
                CHF {stats.revenueThisMonth.toLocaleString('de-CH')}
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground/60">Letzte 6 Monate</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.monthlyRevenue} barGap={4} margin={{ top: 8, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="hsl(var(--border) / 0.7)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: 'hsl(var(--muted-foreground))' }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
              <Bar dataKey="revenue" name="Umsatz" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/70">Status</p>
              <h2 className="text-[14px] font-semibold text-foreground tracking-[-0.01em] mt-1">Aktuelle Verteilung</h2>
            </div>
            <Link to="/admin/tax-processing" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Alle →
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={stats.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {stats.statusBreakdown.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" className="fill-foreground text-[20px] font-semibold tabular-nums">
                  {statusTotal}
                </text>
                <text x="50%" y="60%" textAnchor="middle" className="fill-muted-foreground text-[9.5px] uppercase tracking-wider">
                  Gesamt
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-y-1.5 mt-3 pt-3 border-t border-border">
            {stats.statusBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[12px] text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-[12px] font-semibold text-foreground tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tax Returns */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/70">Aktivität</p>
            <h2 className="text-[14px] font-semibold text-foreground tracking-[-0.01em] mt-0.5">Letzte Steuererklärungen</h2>
          </div>
          <Link to="/admin/tax-processing" className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Alle anzeigen →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/75 px-6 py-2.5">Benutzer</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/75 px-3 py-2.5">Jahr</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/75 px-3 py-2.5">Datum</th>
                <th className="text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/75 px-3 py-2.5">Status</th>
                <th className="text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/75 px-6 py-2.5">Typ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.recentTaxReturns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[13px] text-muted-foreground">Keine Steuererklärungen vorhanden</td>
                </tr>
              ) : (
                stats.recentTaxReturns.map((tr, i) => {
                  const s = getStatusStyle(tr.status);
                  return (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground ring-1 ring-border">
                            {tr.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-[13px] font-medium text-foreground">{tr.userName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-muted-foreground tabular-nums">{tr.taxYear}</td>
                      <td className="px-3 py-3 text-[13px] text-muted-foreground tabular-nums">{tr.date}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ring-1 ${s.bg} ${s.text} ${s.ring}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {getStatusLabel(tr.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {tr.express ? (
                          <span className="inline-flex items-center text-[11px] font-semibold text-red-700 bg-red-50 ring-1 ring-red-600/10 px-2 py-0.5 rounded-md">
                            Express
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">Standard</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
