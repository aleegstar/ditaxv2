import React, { useState, useEffect } from 'react';
import { FileText, MessageCircle, TrendingUp, RefreshCw, UserPlus, ArrowUp, ArrowDown, Zap, AlertTriangle, ClipboardCheck, LifeBuoy, ChevronRight, Activity } from 'lucide-react';
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

  const totalWorkload =
    stats.pendingTaxReturns + stats.expressTaxReturns + stats.openTickets + stats.pendingDefinitiveTaxBills;

  const queueItems = [
    {
      label: 'Express',
      sublabel: 'Bevorzugte Bearbeitung · 48h SLA',
      value: stats.expressTaxReturns,
      icon: Zap,
      tone: 'critical' as const,
      to: '/admin/tax-processing?filter=express',
    },
    {
      label: 'Fehlende Unterlagen',
      sublabel: 'User-Aktion ausstehend',
      value: stats.pendingTaxReturns,
      icon: AlertTriangle,
      tone: 'warn' as const,
      to: '/admin/missing-documents',
    },
    {
      label: 'Veranlagungen',
      sublabel: 'Definitive Steuerrechnungen prüfen',
      value: stats.pendingDefinitiveTaxBills,
      icon: ClipboardCheck,
      tone: 'info' as const,
      to: '/admin/definitive-tax-bills',
    },
    {
      label: 'Support Tickets',
      sublabel: 'Offen oder in Bearbeitung',
      value: stats.openTickets,
      icon: LifeBuoy,
      tone: 'neutral' as const,
      to: '/admin/tickets',
    },
  ];

  const toneStyles: Record<string, { dot: string; iconBg: string; iconText: string; ring: string }> = {
    critical: { dot: 'bg-red-500', iconBg: 'bg-red-50', iconText: 'text-red-600', ring: 'ring-red-600/15' },
    warn: { dot: 'bg-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600', ring: 'ring-amber-600/15' },
    info: { dot: 'bg-violet-500', iconBg: 'bg-violet-50', iconText: 'text-violet-600', ring: 'ring-violet-600/15' },
    neutral: { dot: 'bg-slate-500', iconBg: 'bg-slate-50', iconText: 'text-slate-600', ring: 'ring-slate-600/15' },
  };

  const revenueChange = calcChange(stats.revenueThisMonth, stats.revenueLastMonth);
  const revenuePositive = revenueChange >= 0;

  return (
    <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
      {/* Executive Header */}
      <div className="flex items-end justify-between gap-6 pb-5 border-b border-border">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/65 mb-1.5 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · {new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-[24px] font-semibold text-foreground tracking-[-0.022em] leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-1.5 truncate">
            {operationalSummary}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="h-9 w-9 rounded-lg bg-white border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
            aria-label="Aktualisieren"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
          </button>
          <Link
            to="/admin/tax-processing"
            className="h-9 px-3.5 rounded-lg bg-foreground text-background text-[12.5px] font-semibold hover:bg-foreground/90 transition-colors inline-flex items-center gap-1.5"
          >
            Steuerverarbeitung
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </Link>
        </div>
      </div>

      {/* Operational hero — dominant focal area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/70 inline-flex items-center gap-1.5">
                <Activity className="w-3 h-3" strokeWidth={2.25} />
                Operativer Workload
              </p>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-[40px] font-semibold text-foreground tracking-[-0.028em] leading-none tabular-nums">
                  {totalWorkload}
                </span>
                <span className="text-[12.5px] text-muted-foreground">aktive Vorgänge</span>
              </div>
            </div>
            <Link
              to="/admin/tax-processing"
              className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Warteschlange <ChevronRight className="w-3 h-3" strokeWidth={2} />
            </Link>
          </div>

          {/* Segmented workload bar */}
          {totalWorkload > 0 && (
            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted mb-4">
              <div className="bg-red-500" style={{ width: `${(stats.expressTaxReturns / totalWorkload) * 100}%` }} />
              <div className="bg-amber-500" style={{ width: `${(stats.pendingTaxReturns / totalWorkload) * 100}%` }} />
              <div className="bg-violet-500" style={{ width: `${(stats.pendingDefinitiveTaxBills / totalWorkload) * 100}%` }} />
              <div className="bg-slate-500" style={{ width: `${(stats.openTickets / totalWorkload) * 100}%` }} />
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 pt-1">
            {queueItems.map((q) => {
              const t = toneStyles[q.tone];
              return (
                <div key={q.label} className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 truncate">
                      {q.label}
                    </span>
                  </div>
                  <p className="text-[22px] font-semibold text-foreground tracking-[-0.02em] tabular-nums leading-none">
                    {q.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue secondary KPI */}
        <div className="bg-foreground text-background rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-background/55">
              Umsatz · {new Date().toLocaleDateString('de-CH', { month: 'long' })}
            </p>
            <p className="text-[32px] font-semibold tracking-[-0.025em] leading-none tabular-nums mt-2">
              CHF {stats.revenueThisMonth.toLocaleString('de-CH')}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${revenuePositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {revenuePositive ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
                {revenuePositive ? '+' : ''}{revenueChange}%
              </span>
              <span className="text-[11px] text-background/55">vs. Vormonat</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-background/10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-background/45 font-semibold">Vormonat</p>
              <p className="text-[13.5px] font-semibold tabular-nums mt-0.5">CHF {stats.revenueLastMonth.toLocaleString('de-CH')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.12em] text-background/45 font-semibold">Abschlüsse</p>
              <p className="text-[13.5px] font-semibold tabular-nums mt-0.5">{stats.completedThisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action queue + supporting metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">Aktionswarteschlange</p>
              <h2 className="text-[13.5px] font-semibold text-foreground tracking-[-0.01em] mt-0.5">Was jetzt Aufmerksamkeit braucht</h2>
            </div>
            <span className="text-[11px] text-muted-foreground/60 tabular-nums">{totalWorkload} offen</span>
          </div>
          <div className="divide-y divide-border">
            {queueItems.map((q) => {
              const t = toneStyles[q.tone];
              const Icon = q.icon;
              return (
                <Link
                  key={q.label}
                  to={q.to}
                  className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg ${t.iconBg} ring-1 ${t.ring} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${t.iconText}`} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground tracking-[-0.005em]">{q.label}</p>
                    <p className="text-[11.5px] text-muted-foreground/75 truncate">{q.sublabel}</p>
                  </div>
                  <span className="text-[18px] font-semibold text-foreground tabular-nums tracking-[-0.015em]">{q.value}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors flex-shrink-0" strokeWidth={2} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Supporting metric tiles */}
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            label="Neue User (30T)"
            value={stats.newUsersLast30Days}
            icon={UserPlus}
            to="/admin/users"
          />
          <StatCard
            label="Abschlüsse Monat"
            value={stats.completedThisMonth}
            change={calcChange(stats.completedThisMonth, stats.completedLastMonth)}
            icon={FileText}
          />
          <StatCard
            label="Gesamt User"
            value={stats.totalUsers}
            icon={UserPlus}
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 bg-white border border-border rounded-2xl p-6">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">Umsatzentwicklung</p>
              <h2 className="text-[18px] font-semibold text-foreground tracking-[-0.018em] tabular-nums mt-1">
                CHF {stats.revenueThisMonth.toLocaleString('de-CH')}
              </h2>
            </div>
            <span className="text-[10.5px] text-muted-foreground/60 uppercase tracking-[0.1em] font-semibold">6 Monate</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthlyRevenue} barGap={4} margin={{ top: 8, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="hsl(var(--border) / 0.6)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} width={36} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
              <Bar dataKey="revenue" name="Umsatz" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">Status-Verteilung</p>
              <h2 className="text-[13.5px] font-semibold text-foreground tracking-[-0.01em] mt-0.5">Aktuelle Pipeline</h2>
            </div>
            <Link to="/admin/tax-processing" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Alle →
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={stats.statusBreakdown} cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={2} dataKey="value" strokeWidth={0}>
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

      {/* Recent activity */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">Live-Aktivität</p>
            <h2 className="text-[13.5px] font-semibold text-foreground tracking-[-0.01em] mt-0.5">Letzte Steuererklärungen</h2>
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
