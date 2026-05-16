import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings,
  User as UserIcon,
  LogOut,
  ChevronUp,
  ChevronDown,
  Gift,
} from 'lucide-react';
import {
  HomeOutlineIcon,
  HomeSolidIcon,
  FolderOutlineIcon,
  FolderSolidIcon,
  ChatOutlineIcon,
  ChatSolidIcon,
  BookOutlineIcon,
  BookSolidIcon,
  StarOutlineIcon,
  StarSolidIcon,
} from '@/components/dashboard/NavIcons';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useI18n } from '@/contexts/I18nContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  iconActive?: React.ElementType;
  route: string;
  badge?: number;
}

const NavRow: React.FC<{ item: NavItem; isActive: boolean; onClick: () => void }> = ({
  item,
  isActive,
  onClick,
}) => {
  const Icon = isActive && item.iconActive ? item.iconActive : item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full flex items-center gap-2.5 pl-3 pr-2.5 h-[34px] rounded-[8px] text-[13px] transition-colors duration-150 text-left',
        isActive
          ? 'bg-primary/[0.06] text-primary font-semibold'
          : 'text-muted-foreground/85 hover:bg-foreground/[0.035] hover:text-foreground'
      )}
    >
      {isActive && (
        <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-[18px] w-[2.5px] rounded-r-full bg-primary" />
      )}
      <Icon
        className={cn(
          'w-[16px] h-[16px] flex-shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground/65 group-hover:text-foreground/85'
        )}
        strokeWidth={isActive ? 2 : 1.6}
      />
      <span className="truncate tracking-[-0.01em]">{item.label}</span>
      {!!item.badge && item.badge > 0 && (
        <span
          className={cn(
            'ml-auto inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-semibold tabular-nums',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-foreground/[0.08] text-foreground/75'
          )}
        >
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </button>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 pt-6 pb-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/55">
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
    { label: t.menu.taxes, icon: HomeOutlineIcon, iconActive: HomeSolidIcon, route: '/' },
    { label: t.menu.documents, icon: FolderOutlineIcon, iconActive: FolderSolidIcon, route: '/documents' },
    { label: t.menu.chat, icon: ChatOutlineIcon, iconActive: ChatSolidIcon, route: '/chat', badge: unreadCount },
  ];

  const supportItems: NavItem[] = [
    { label: t.menu.knowledgeBase, icon: BookOutlineIcon, iconActive: BookSolidIcon, route: '/help' },
    { label: t.menu.feedback, icon: StarOutlineIcon, iconActive: StarSolidIcon, route: '/feedback' },
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
  const currentYear = new Date().getFullYear() - 1; // active tax year

  return (
    <aside
      data-sidebar
      className="hidden md:flex flex-col w-[232px] flex-shrink-0 h-screen sticky top-0 bg-muted/60 border-r border-border/70 px-3 pt-5 pb-4"
    >
      {/* Logo */}
      <div className="px-2 pb-4">
        <button onClick={() => navigate('/')} className="flex items-center">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-[22px] w-auto" />
        </button>
      </div>

      {/* Contextual product module */}
      <button
        onClick={() => hasMultipleFilers && navigate('/select-person')}
        className={cn(
          'group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] bg-background border border-black/[0.06] shadow-[0_1px_0_rgba(15,27,61,0.02)] transition-colors',
          hasMultipleFilers && 'hover:bg-background hover:border-black/[0.1] cursor-pointer'
        )}
        aria-label="Aktiver Steuerpflichtiger"
      >
        <div className="w-7 h-7 rounded-full bg-primary/[0.08] flex items-center justify-center text-[11.5px] font-semibold text-primary ring-1 ring-primary/10">
          {filerInitial}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[12px] font-semibold text-foreground truncate tracking-[-0.01em]">
            {filerName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            <span className="text-[10.5px] text-muted-foreground/80 tabular-nums tracking-[-0.005em]">
              Steuerjahr {currentYear}
            </span>
          </div>
        </div>
        {hasMultipleFilers && (
          <ChevronDown
            className="w-3.5 h-3.5 text-muted-foreground/50 -rotate-90 group-hover:text-foreground/70 transition-colors"
            strokeWidth={1.75}
          />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto -mx-1 px-1 mt-1">
        <SectionLabel>Arbeitsbereich</SectionLabel>
        <div className="space-y-[2px]">
          {workItems.map((item) => (
            <NavRow
              key={item.route}
              item={item}
              isActive={isActive(item.route)}
              onClick={() => navigate(item.route)}
            />
          ))}
        </div>

        <SectionLabel>{t.menu.help}</SectionLabel>
        <div className="space-y-[2px]">
          {supportItems.map((item) => (
            <NavRow
              key={item.route}
              item={item}
              isActive={isActive(item.route)}
              onClick={() => navigate(item.route)}
            />
          ))}
        </div>
      </nav>

      {/* Secondary action — referral */}
      <button
        onClick={() => navigate('/invite-friends')}
        className="mt-3 mx-1 flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-[11.5px] text-muted-foreground/75 hover:text-foreground hover:bg-foreground/[0.035] transition-colors"
      >
        <Gift className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.6} />
        <span className="tracking-[-0.005em]">{t.menu.inviteFriends}</span>
        <span className="ml-auto text-[10px] font-medium text-primary/75 tabular-nums">−20</span>
      </button>

      {/* User profile */}
      <div className="pt-3 mt-3 border-t border-border/60">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 p-1.5 rounded-[10px] hover:bg-foreground/[0.035] transition-colors"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-black/[0.06]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[12px] font-semibold text-foreground/75 ring-1 ring-black/[0.05]">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[12.5px] font-medium text-foreground truncate tracking-[-0.01em]">
              {displayName}
            </div>
            <div className="text-[10.5px] text-muted-foreground/75 truncate">{profile?.email}</div>
          </div>
          {userMenuOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/55" strokeWidth={1.75} />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/55" strokeWidth={1.75} />
          )}
        </button>

        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1 space-y-[2px]"
          >
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-2.5 px-3 h-[32px] rounded-[8px] text-[12.5px] text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t.menu.profile}
            </button>
            <button
              onClick={() => navigate('/privacy-settings')}
              className="w-full flex items-center gap-2.5 px-3 h-[32px] rounded-[8px] text-[12.5px] text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground transition-colors"
            >
              <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t.menu.privacySettings}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 h-[32px] rounded-[8px] text-[12.5px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t.menu.logout}
            </button>
          </motion.div>
        )}
      </div>
    </aside>
  );
};

export default UserSidebar;
