import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Folder,
  MessageSquare,
  BookOpen,
  Star,
  Gift,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Settings,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useI18n } from '@/contexts/I18nContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { cn } from '@/lib/utils';

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
        className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-blue-600' : '')}
        strokeWidth={1.75}
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

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 px-3">
    {children}
  </div>
);

export const UserSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const { t } = useI18n();
  const { unreadCount } = useUnreadMessages();
  const { activeTaxFiler, hasMultipleFilers } = useTaxFiler();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const workItems: NavItem[] = [
    { label: t.menu.taxes, icon: Home, route: '/' },
    { label: t.menu.documents, icon: Folder, route: '/documents' },
    { label: t.menu.chat, icon: MessageSquare, route: '/chat', badge: unreadCount },
  ];

  const supportItems: NavItem[] = [
    { label: t.menu.knowledgeBase, icon: BookOpen, route: '/help' },
    { label: t.menu.feedback, icon: Star, route: '/feedback' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User';
  const initial = profile?.first_name?.charAt(0)?.toUpperCase() || 'U';

  const filerName = activeTaxFiler
    ? [activeTaxFiler.first_name, activeTaxFiler.last_name].filter(Boolean).join(' ')
    : displayName;
  const filerInitial = (activeTaxFiler?.first_name || displayName).charAt(0).toUpperCase();
  const currentYear = new Date().getFullYear() - 1;

  return (
    <aside
      data-sidebar
      className="hidden md:flex flex-col justify-between w-64 flex-shrink-0 h-screen sticky top-0 bg-[#F8F9FB] border-r border-slate-200/50 py-8 px-6 overflow-y-auto"
    >
      <div className="space-y-8">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center px-2">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-6 w-auto" />
        </button>

        {/* Context Selector */}
        <button
          onClick={() => hasMultipleFilers && navigate('/select-person')}
          className={cn(
            'w-full bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] transition-all',
            hasMultipleFilers && 'cursor-pointer hover:shadow-md hover:border-slate-200'
          )}
          aria-label="Aktiver Steuerpflichtiger"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm flex-shrink-0">
              {filerInitial}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-sm font-semibold text-slate-900 truncate">{filerName}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Steuerjahr {currentYear}
              </div>
            </div>
          </div>
          {hasMultipleFilers && (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" strokeWidth={1.75} />
          )}
        </button>

        {/* Navigation */}
        <nav className="space-y-6">
          <div>
            <SectionLabel>Arbeitsbereich</SectionLabel>
            <ul className="space-y-1">
              {workItems.map((item) => (
                <li key={item.route}>
                  <NavRow
                    item={item}
                    isActive={isActive(item.route)}
                    onClick={() => navigate(item.route)}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>{t.menu.help}</SectionLabel>
            <ul className="space-y-1">
              {supportItems.map((item) => (
                <li key={item.route}>
                  <NavRow
                    item={item}
                    isActive={isActive(item.route)}
                    onClick={() => navigate(item.route)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className="space-y-4">
        {/* Invite Card */}
        <button
          onClick={() => navigate('/invite-friends')}
          className="w-full bg-white border border-slate-200/60 rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50/50 border border-blue-100/50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Gift className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Freunde einladen</div>
            <div className="text-xs text-slate-500 mt-0.5">20 CHF Guthaben erhalten</div>
          </div>
        </button>

        {/* User Profile Bottom */}
        <div>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 flex-shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
                <div className="text-xs text-slate-500 truncate">{profile?.email}</div>
              </div>
            </div>
            {userMenuOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" strokeWidth={1.75} />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" strokeWidth={1.75} />
            )}
          </button>

          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-2 space-y-0.5"
            >
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 transition-colors"
              >
                <UserIcon className="w-4 h-4" strokeWidth={1.75} />
                {t.menu.profile}
              </button>
              <button
                onClick={() => navigate('/privacy-settings')}
                className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 transition-colors"
              >
                <Settings className="w-4 h-4" strokeWidth={1.75} />
                {t.menu.privacySettings}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
                {t.menu.logout}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default UserSidebar;
