import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Zap, AlertTriangle, ClipboardCheck, LifeBuoy, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';

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
  recentTaxReturns: { userName: string; taxYear: string; status: string; date: string; express: boolean }[];
}

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
      const [
        { count: usersCount },
        { count: pendingCount },
        { count: expressCount },
        { count: ticketsCount },
        { count: completedThisMonthCount },
        { count: completedLastMonthCount },
        { count: pendingDefinitiveTaxBillsCount },
        { data: recentReturns },
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
        supabase.from('tax_returns').select('user_id, tax_year, status, updated_at, express_service, workflow_step').order('updated_at', { ascending: false }).limit(6),
      ]);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: newUsersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo.toISOString());

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
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="text-[13px] text-muted-foreground">Laden...</div>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Abgeschlossen';
      case 'processing': return 'In Bearbeitung';
      case 'review': return 'In Prüfung';
      default: return 'Offen';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'processing': return 'bg-blue-500';
      case 'review': return 'bg-violet-500';
      default: return 'bg-amber-500';
    }
  };

  const queueItems = [
    {
      label: 'Express-Fälle',
      sublabel: '48h SLA · höchste Priorität',
      value: stats.expressTaxReturns,
      icon: Zap,
      iconClass: 'text-red-600',
      to: '/admin/tax-processing?filter=express',
    },
    {
      label: 'Fehlende Unterlagen',
      sublabel: 'User-Aktion ausstehend',
      value: stats.pendingTaxReturns,
      icon: AlertTriangle,
      iconClass: 'text-amber-600',
      to: '/admin/missing-documents',
    },
    {
      label: 'Veranlagungen prüfen',
      sublabel: 'Definitive Steuerrechnungen',
      value: stats.pendingDefinitiveTaxBills,
      icon: ClipboardCheck,
      iconClass: 'text-violet-600',
      to: '/admin/definitive-tax-bills',
    },
    {
      label: 'Support Tickets',
      sublabel: 'Offen oder in Bearbeitung',
      value: stats.openTickets,
      icon: LifeBuoy,
      iconClass: 'text-slate-600',
      to: '/admin/tickets',
    },
  ];

  const urgent = queueItems.filter(q => q.value > 0);
  const primaryUrgent = urgent[0];
  const totalOpen = queueItems.reduce((s, q) => s + q.value, 0);

  const heroLine = stats.expressTaxReturns > 0
    ? `${stats.expressTaxReturns} Express-${stats.expressTaxReturns === 1 ? 'Fall' : 'Fälle'} benötig${stats.expressTaxReturns === 1 ? 't' : 'en'} Aufmerksamkeit`
    : stats.pendingTaxReturns > 0
      ? `${stats.pendingTaxReturns} Steuererklärungen warten auf Bearbeitung`
      : stats.pendingDefinitiveTaxBills > 0
        ? `${stats.pendingDefinitiveTaxBills} Veranlagungen zur Prüfung`
        : stats.openTickets > 0
          ? `${stats.openTickets} offene Support-Anfragen`
          : 'Alles erledigt — keine offenen Vorgänge';

  const revenueChange = calcChange(stats.revenueThisMonth, stats.revenueLastMonth);
  const revenuePositive = revenueChange >= 0;
  const completedChange = calcChange(stats.completedThisMonth, stats.completedLastMonth);

  return (
    <div className="max-w-5xl mx-auto px-8 py-12 space-y-14">
      {/* Hero — single operational focal point */}
      <section>
        <div className="flex items-center justify-between gap-6 mb-8">
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground/60 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="h-8 w-8 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.04] transition-colors disabled:opacity-50 inline-flex items-center justify-center"
            aria-label="Aktualisieren"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
          </button>
        </div>

        <h1 className="text-[34px] font-semibold text-foreground tracking-[-0.028em] leading-[1.1]">
          {getGreeting()}.
        </h1>
        <p className="text-[20px] text-muted-foreground tracking-[-0.015em] leading-snug mt-2 max-w-2xl">
          {heroLine}
        </p>

        {primaryUrgent && (
          <div className="mt-8 flex items-center gap-3">
            <Link
              to={primaryUrgent.to}
              className="h-10 px-4 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-colors inline-flex items-center gap-2"
            >
              {primaryUrgent.label} öffnen
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Link>
            <Link
              to="/admin/tax-processing"
              className="h-10 px-3 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
            >
              Alle Vorgänge
            </Link>
          </div>
        )}
      </section>

      {/* Operational queue — primary content */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-foreground tracking-[-0.012em]">
            Aktionswarteschlange
          </h2>
          <span className="text-[12px] text-muted-foreground/70 tabular-nums">{totalOpen} offen</span>
        </div>

        <div className="divide-y divide-border/70">
          {queueItems.map((q) => {
            const Icon = q.icon;
            const muted = q.value === 0;
            return (
              <Link
                key={q.label}
                to={q.to}
                className="group flex items-center gap-4 py-4 -mx-3 px-3 rounded-lg hover:bg-foreground/[0.025] transition-colors"
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${muted ? 'text-muted-foreground/35' : q.iconClass}`} strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium tracking-[-0.005em] ${muted ? 'text-muted-foreground/75' : 'text-foreground'}`}>
                    {q.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground/65 mt-0.5">{q.sublabel}</p>
                </div>
                <span className={`text-[22px] font-semibold tabular-nums tracking-[-0.02em] ${muted ? 'text-muted-foreground/35' : 'text-foreground'}`}>
                  {q.value}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/25 group-hover:text-foreground/60 transition-colors flex-shrink-0" strokeWidth={2} />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent activity — secondary */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-foreground tracking-[-0.012em]">
            Letzte Aktivität
          </h2>
          <Link to="/admin/tax-processing" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Alle anzeigen
          </Link>
        </div>

        {stats.recentTaxReturns.length === 0 ? (
          <p className="text-[13px] text-muted-foreground/70 py-8">Keine Steuererklärungen vorhanden</p>
        ) : (
          <div className="divide-y divide-border/70">
            {stats.recentTaxReturns.map((tr, i) => (
              <div key={i} className="flex items-center gap-4 py-3.5">
                <div className="w-7 h-7 rounded-full bg-muted/70 flex items-center justify-center text-[10px] font-semibold text-muted-foreground flex-shrink-0">
                  {tr.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-foreground tracking-[-0.005em] truncate">
                    {tr.userName}
                    {tr.express && (
                      <span className="ml-2 text-[10.5px] font-semibold text-red-600 uppercase tracking-[0.08em]">Express</span>
                    )}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground/70 tabular-nums">Steuerjahr {tr.taxYear} · {tr.date}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(tr.status)}`} />
                  {getStatusLabel(tr.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quiet footer metrics — minimal, no boxes */}
      <section className="pt-10 border-t border-border/70">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/55">Umsatz · Monat</p>
            <p className="text-[20px] font-semibold text-foreground tracking-[-0.02em] tabular-nums mt-2">
              CHF {stats.revenueThisMonth.toLocaleString('de-CH')}
            </p>
            {stats.revenueLastMonth > 0 && (
              <p className={`text-[11.5px] mt-1 inline-flex items-center gap-0.5 font-medium tabular-nums ${revenuePositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {revenuePositive ? <ArrowUp size={10} strokeWidth={2.5} /> : <ArrowDown size={10} strokeWidth={2.5} />}
                {revenuePositive ? '+' : ''}{revenueChange}% vs. Vormonat
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/55">Abschlüsse</p>
            <p className="text-[20px] font-semibold text-foreground tracking-[-0.02em] tabular-nums mt-2">
              {stats.completedThisMonth}
            </p>
            {stats.completedLastMonth > 0 && (
              <p className={`text-[11.5px] mt-1 font-medium tabular-nums ${completedChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {completedChange >= 0 ? '+' : ''}{completedChange}% vs. Vormonat
              </p>
            )}
          </div>
          <Link to="/admin/users" className="group">
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/55">Neue User (30T)</p>
            <p className="text-[20px] font-semibold text-foreground tracking-[-0.02em] tabular-nums mt-2 group-hover:text-foreground">
              {stats.newUsersLast30Days}
            </p>
            <p className="text-[11.5px] text-muted-foreground/60 mt-1">von {stats.totalUsers} gesamt</p>
          </Link>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/55">Aktive User</p>
            <p className="text-[20px] font-semibold text-foreground tracking-[-0.02em] tabular-nums mt-2">
              {stats.totalUsers}
            </p>
            <p className="text-[11.5px] text-muted-foreground/60 mt-1">registriert</p>
          </div>
        </div>
      </section>
    </div>
  );
};
