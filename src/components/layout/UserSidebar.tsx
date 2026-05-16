import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings,
  User as UserIcon,
  LogOut,
  ChevronUp,
  ChevronDown,
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
  HeartOutlineIcon,
  HeartSolidIcon,
  StarOutlineIcon,
  StarSolidIcon,
} from '@/components/dashboard/NavIcons';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useI18n } from '@/contexts/I18nContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
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
        'group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all duration-200 text-left',
        isActive
          ? 'bg-primary/[0.07] text-primary font-semibold shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)]'
          : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon
        className={cn(
          'w-[17px] h-[17px] flex-shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground/80'
        )}
        strokeWidth={isActive ? 2 : 1.75}
      />
      <span className="truncate tracking-tight">{item.label}</span>
      {!!item.badge && item.badge > 0 && (
        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </button>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 pt-7 pb-2 text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60">
    {children}
  </div>
);

export const UserSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const { t } = useI18n();
  const { unreadCount } = useUnreadMessages();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const mainItems: NavItem[] = [
    { label: t.menu.taxes, icon: HomeOutlineIcon, iconActive: HomeSolidIcon, route: '/' },
    { label: t.menu.documents, icon: FolderOutlineIcon, iconActive: FolderSolidIcon, route: '/documents' },
    { label: t.menu.chat, icon: ChatOutlineIcon, iconActive: ChatSolidIcon, route: '/chat', badge: unreadCount },
  ];

  const helpItems: NavItem[] = [
    { label: t.menu.knowledgeBase, icon: BookOutlineIcon, iconActive: BookSolidIcon, route: '/help' },
    { label: t.menu.feedback, icon: StarOutlineIcon, iconActive: StarSolidIcon, route: '/feedback' },
    { label: t.menu.inviteFriends, icon: HeartOutlineIcon, iconActive: HeartSolidIcon, route: '/invite-friends' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User';
  const initial = profile?.first_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <aside
      data-sidebar
      className="hidden md:flex flex-col w-[252px] flex-shrink-0 h-screen sticky top-0 bg-white px-3 py-5"
    >
      {/* Logo */}
      <div className="px-3 pb-5">
        <button onClick={() => navigate('/')} className="flex items-center">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-6 w-auto" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <NavRow
              key={item.route}
              item={item}
              isActive={isActive(item.route)}
              onClick={() => navigate(item.route)}
            />
          ))}
        </div>

        <SectionLabel>{t.menu.help}</SectionLabel>
        <div className="space-y-0.5">
          {helpItems.map((item) => (
            <NavRow
              key={item.route}
              item={item}
              isActive={isActive(item.route)}
              onClick={() => navigate(item.route)}
            />
          ))}
        </div>
      </nav>

      {/* User profile */}
      <div className="pt-3 mt-3 border-t border-border/50">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/[0.04] transition-colors"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-border/40"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[13px] font-medium text-foreground/70 ring-1 ring-border/40">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-medium text-foreground truncate">{displayName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{profile?.email}</div>
          </div>
          {userMenuOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground/60" strokeWidth={1.75} />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground/60" strokeWidth={1.75} />
          )}
        </button>

        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1 space-y-0.5"
          >
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
            >
              <UserIcon className="w-4 h-4" strokeWidth={1.75} />
              {t.menu.profile}
            </button>
            <button
              onClick={() => navigate('/privacy-settings')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" strokeWidth={1.75} />
              {t.menu.privacySettings}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
              {t.menu.logout}
            </button>
          </motion.div>
        )}
      </div>
    </aside>
  );
};

export default UserSidebar;
