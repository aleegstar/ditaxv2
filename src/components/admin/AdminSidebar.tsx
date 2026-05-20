import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  AlertCircle,
  Send,
  CircleCheck,
  HelpCircle,
  MessageCircle,
  Wand2,
  Users,
  CreditCard,
  ScanLine,
  FileX2,
  Star,
  MessageSquareOff,
  Mail,
  BadgePercent,
  FileCode2,
  PackageCheck,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronUp,
  ChevronDown,
  Zap,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import adminHeroCouple from '@/assets/admin-hero-couple.jpg';

interface NavItem {
  label: string;
  icon: React.ElementType;
  route: string;
  badge?: number;
}

const NavRow: React.FC<{ item: NavItem; isActive: boolean; onClick: () => void }> = ({
  item,
  isActive,
  onClick,
}) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
        isActive
          ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] border border-slate-200/60 text-slate-900'
          : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
      )}
    >
      <Icon
        className={cn('w-[18px] h-[18px] flex-shrink-0', isActive ? 'text-[#1E3A5F]' : 'text-slate-400 group-hover:text-slate-700')}
        strokeWidth={1.5}
      />

      <span className="truncate">{item.label}</span>
      {!!item.badge && item.badge > 0 && (
        <span
          className={cn(
            'ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums',
            isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
          )}
        >
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </button>
  );
};

const SectionLabel: React.FC<{
  children: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}> = ({ children, collapsible, open, onToggle }) => {
  if (!collapsible) {
    return (
      <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 px-3">
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full mb-3 px-3 flex items-center justify-between group"
    >
      <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
        {children}
      </span>
      <ChevronDown
        className={cn(
          'w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-transform',
          open ? 'rotate-0' : '-rotate-90'
        )}
        strokeWidth={2}
      />
    </button>
  );
};

export function AdminSidebar() {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('Ditax Admin');
  const [adminAvatarUrl, setAdminAvatarUrl] = useState('');
  const [workload, setWorkload] = useState<{ express: number; tickets: number } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const { userId, email } = useAuth();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    if (email) setAdminEmail(email);

    const loadAdminInfo = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled || !profile) return;

      if (profile.first_name) {
        setAdminName(
          profile.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile.first_name
        );
      }
      if (profile.avatar_url) setAdminAvatarUrl(profile.avatar_url);
    };

    const loadWorkload = async () => {
      const [express, tickets] = await Promise.all([
        supabase
          .from('tax_returns')
          .select('*', { count: 'exact', head: true })
          .eq('express_service', true)
          .neq('status', 'completed'),
        supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
      ]);
      if (cancelled) return;
      setWorkload({
        express: express.count || 0,
        tickets: tickets.count || 0,
      });
    };

    loadAdminInfo();
    loadWorkload();
    return () => { cancelled = true; };
  }, [userId, email]);


  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: 'Erfolgreich abgemeldet', description: 'Du wurdest erfolgreich abgemeldet.' });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        variant: 'destructive',
        title: 'Abmeldefehler',
        description: 'Ein Fehler ist beim Abmelden aufgetreten.',
      });
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const mainNav: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/admin/dashboard' },
  ];

  const taxNav: NavItem[] = [
    { label: 'Steuererklärungen', icon: FileText, route: '/admin/tax-processing' },
    { label: 'Fehlende Unterlagen', icon: AlertCircle, route: '/admin/missing-documents' },
    { label: 'Zur Übermittlung', icon: Send, route: '/admin/signed-returns' },
    { label: 'Veranlagungen', icon: CircleCheck, route: '/admin/definitive-tax-bills' },
  ];

  const supportNav: NavItem[] = [
    { label: 'Support Tickets', icon: HelpCircle, route: '/admin/tickets', badge: workload?.tickets },
    { label: 'Chat', icon: MessageCircle, route: '/admin/chat' },
  ];

  const managementNav: NavItem[] = [
    { label: 'Benutzer', icon: Users, route: '/admin/users' },
    { label: 'Schnellantworten', icon: Wand2, route: '/admin/quick-replies' },
    { label: 'Zahlungen', icon: CreditCard, route: '/admin/payment-status' },
    { label: 'OCR Konfiguration', icon: ScanLine, route: '/admin/ocr-config' },
    { label: 'Nicht erkannte Uploads', icon: FileX2, route: '/admin/ocr-unrecognized' },
    { label: 'User-Feedback', icon: Star, route: '/admin/user-feedback' },
    { label: 'Lösch-Feedback', icon: MessageSquareOff, route: '/admin/deletion-feedback' },
    { label: 'Newsletter', icon: Mail, route: '/admin/newsletter' },
    { label: 'Aktionscodes', icon: BadgePercent, route: '/admin/promo-codes' },
  ];

  const exportNav: NavItem[] = [
    { label: 'AG eTax XML', icon: FileCode2, route: '/admin/ag-xml' },
    { label: 'AG Import-Test', icon: PackageCheck, route: '/admin/ag-import' },
  ];


  const isActive = (path: string) => currentPath === path;
  const managementHasActive = managementNav.some(i => isActive(i.route));
  const exportHasActive = exportNav.some(i => isActive(i.route));

  useEffect(() => {
    if (managementHasActive) setManagementOpen(true);
    if (exportHasActive) setExportOpen(true);
  }, [managementHasActive, exportHasActive]);

  const expressCount = workload?.express ?? 0;

  return (
    <aside
      data-sidebar
      className="hidden md:flex flex-col justify-between w-64 flex-shrink-0 h-screen sticky top-0 bg-[#F8F9FB] border-r border-slate-200/50 py-8 px-6 overflow-y-auto"
    >
      <div className="space-y-8">
        {/* Logo */}
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 px-2"
        >
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-6 w-auto" />
          <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
            Admin
          </span>
        </button>

        {/* Workspace context card */}
        <div className="w-full bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-sm font-semibold text-slate-900 truncate">Operations</div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">Live · alle Vorgänge</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-6">
          <ul className="space-y-1">
            {mainNav.map(item => (
              <li key={item.route}>
                <NavRow item={item} isActive={isActive(item.route)} onClick={() => navigate(item.route)} />
              </li>
            ))}
          </ul>

          <div>
            <SectionLabel>Steuern</SectionLabel>
            <ul className="space-y-1">
              {taxNav.map(item => (
                <li key={item.route}>
                  <NavRow item={item} isActive={isActive(item.route)} onClick={() => navigate(item.route)} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionLabel>Support</SectionLabel>
            <ul className="space-y-1">
              {supportNav.map(item => (
                <li key={item.route}>
                  <NavRow item={item} isActive={isActive(item.route)} onClick={() => navigate(item.route)} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionLabel
              collapsible
              open={managementOpen}
              onToggle={() => setManagementOpen(v => !v)}
            >
              Verwaltung
            </SectionLabel>
            {managementOpen && (
              <ul className="space-y-1">
                {managementNav.map(item => (
                  <li key={item.route}>
                    <NavRow item={item} isActive={isActive(item.route)} onClick={() => navigate(item.route)} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <SectionLabel
              collapsible
              open={exportOpen}
              onToggle={() => setExportOpen(v => !v)}
            >
              Export
            </SectionLabel>
            {exportOpen && (
              <ul className="space-y-1">
                {exportNav.map(item => (
                  <li key={item.route}>
                    <NavRow item={item} isActive={isActive(item.route)} onClick={() => navigate(item.route)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>
      </div>

      <div className="space-y-4 pt-6">
        {/* Hero card — happy customers */}
        <button
          onClick={() => navigate('/admin/tax-processing?filter=express')}
          className="group relative w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300/70 transition-all text-left"
        >
          <div className="relative h-20 overflow-hidden">
            <img
              src={adminHeroCouple}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0F1B3D]/85 via-[#1E3A5F]/55 to-transparent" />
            <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0F1B3D] shadow-sm">
              <Zap className="w-3 h-3" strokeWidth={2} />
              {expressCount > 0 ? `${expressCount} Express` : 'Live'}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-slate-900 leading-tight">
              {expressCount > 0 ? 'Express-Fälle bearbeiten' : 'Glückliche Kunden'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {expressCount > 0 ? '48h SLA · höchste Priorität' : 'Alles erledigt — gut gemacht'}
            </div>
          </div>
        </button>

        {/* User profile */}
        <div>
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition-colors group',
              userMenuOpen
                ? 'bg-white border border-slate-200/70 shadow-[0_2px_8px_-4px_rgba(15,27,61,0.08)]'
                : 'hover:bg-slate-100/60'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {adminAvatarUrl ? (
                <img
                  src={adminAvatarUrl}
                  alt={adminName}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 flex-shrink-0">
                  {getInitials(adminName)}
                </div>
              )}
              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold text-slate-900 truncate leading-tight">
                  {adminName}
                </div>
                <div className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                  {adminEmail}
                </div>
              </div>
            </div>
            <ChevronUp
              className={cn(
                'w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform flex-shrink-0',
                userMenuOpen && 'rotate-180'
              )}
              strokeWidth={1.75}
            />
          </button>

          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-2 rounded-xl border border-slate-200/70 bg-white shadow-[0_4px_16px_-6px_rgba(15,27,61,0.08)] overflow-hidden"
            >
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 px-3 h-10 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-slate-500 flex-shrink-0" strokeWidth={1.75} />
                <span className="truncate">Profil</span>
              </button>
              <button
                onClick={() => navigate('/privacy-settings')}
                className="w-full flex items-center gap-3 px-3 h-10 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                <Settings className="w-4 h-4 text-slate-500 flex-shrink-0" strokeWidth={1.75} />
                <span className="truncate">Einstellungen</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 h-10 text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                <span className="truncate">Abmelden</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </aside>
  );
}
