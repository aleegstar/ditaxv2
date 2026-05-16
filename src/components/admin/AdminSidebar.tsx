import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutGrid,
  ScrollText,
  TriangleAlert,
  Send,
  ClipboardCheck,
  LifeBuoy,
  MessagesSquare,
  Sparkles,
  UsersRound,
  Wallet,
  Scan,
  FileWarning,
  Star,
  MessageSquareDashed,
  Mail,
  Ticket,
  FileCode,
  PackageCheck,
  LogOut, 
  Settings, 
  User as UserIcon, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface NavItemProps {
  title: string;
  url: string;
  icon: React.ElementType;
  isActive: boolean;
}

function NavItem({ title, url, icon: Icon, isActive }: NavItemProps) {
  return (
    <NavLink
      to={url}
      className={cn(
        'group relative w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] transition-colors text-left',
        isActive
          ? 'bg-foreground/[0.055] text-foreground font-medium'
          : 'text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-primary" />
      )}
      <Icon
        className={cn(
          'w-[15px] h-[15px] flex-shrink-0',
          isActive ? 'text-foreground' : 'text-muted-foreground/65 group-hover:text-foreground/80'
        )}
        strokeWidth={1.75}
      />
      <span className="truncate">{title}</span>
    </NavLink>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  hasActive?: boolean;
}

function NavGroup({ title, children, collapsible = false, defaultOpen = true, hasActive = false }: NavGroupProps) {
  const [open, setOpen] = useState(defaultOpen || hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  const Label = (
    <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.14em]">
      {title}
    </span>
  );

  if (!collapsible) {
    return (
      <div className="space-y-0.5">
        <div className="px-2.5 pt-5 pb-1.5">{Label}</div>
        <div className="space-y-px">{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2.5 pt-5 pb-1.5 group"
      >
        {Label}
        <ChevronDown
          className={cn(
            'w-3 h-3 text-muted-foreground/40 transition-transform group-hover:text-muted-foreground/70',
            open ? 'rotate-0' : '-rotate-90'
          )}
          strokeWidth={2}
        />
      </button>
      {open && <div className="space-y-px">{children}</div>}
    </div>
  );
}

export function AdminSidebar() {
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('Ditax Admin');
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string>('');
  const [workload, setWorkload] = useState<{ pending: number; express: number; tickets: number } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    const loadAdminInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (user.email) setAdminEmail(user.email);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile?.first_name) {
        setAdminName(profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name);
      }
      if (profile?.avatar_url) setAdminAvatarUrl(profile.avatar_url);
    };

    const loadWorkload = async () => {
      const [pending, express, tickets] = await Promise.all([
        supabase.from('tax_returns').select('*', { count: 'exact', head: true }).in('workflow_step', ['review', 'processing']).neq('status', 'completed'),
        supabase.from('tax_returns').select('*', { count: 'exact', head: true }).eq('express_service', true).neq('status', 'completed'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      ]);
      setWorkload({
        pending: pending.count || 0,
        express: express.count || 0,
        tickets: tickets.count || 0,
      });
    };

    loadAdminInfo();
    loadWorkload();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadAdminInfo());
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Erfolgreich abgemeldet", description: "Du wurdest erfolgreich abgemeldet." });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({ variant: "destructive", title: "Abmeldefehler", description: "Ein Fehler ist beim Abmelden aufgetreten." });
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const mainNavItems = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutGrid },
  ];

  const taxNavItems = [
    { title: "Steuererklärungen", url: "/admin/tax-processing", icon: ScrollText },
    { title: "Fehlende Unterlagen", url: "/admin/missing-documents", icon: TriangleAlert },
    { title: "Zur Übermittlung", url: "/admin/signed-returns", icon: Send },
    { title: "Veranlagungen", url: "/admin/definitive-tax-bills", icon: ClipboardCheck },
  ];

  const supportNavItems = [
    { title: "Support Tickets", url: "/admin/tickets", icon: LifeBuoy },
    { title: "Chat", url: "/admin/chat", icon: MessagesSquare },
  ];

  const managementNavItems = [
    { title: "Benutzer", url: "/admin/users", icon: UsersRound },
    { title: "Schnellantworten", url: "/admin/quick-replies", icon: Sparkles },
    { title: "Zahlungen", url: "/admin/payment-status", icon: Wallet },
    { title: "OCR Konfiguration", url: "/admin/ocr-config", icon: Scan },
    { title: "Nicht erkannte Uploads", url: "/admin/ocr-unrecognized", icon: FileWarning },
    { title: "User-Feedback", url: "/admin/user-feedback", icon: Star },
    { title: "Lösch-Feedback", url: "/admin/deletion-feedback", icon: MessageSquareDashed },
    { title: "Newsletter", url: "/admin/newsletter", icon: Mail },
    { title: "Aktionscodes", url: "/admin/promo-codes", icon: Ticket },
  ];

  const exportNavItems = [
    { title: "AG eTax XML", url: "/admin/ag-xml", icon: FileCode },
    { title: "AG Import-Test", url: "/admin/ag-import", icon: PackageCheck },
  ];

  const managementHasActive = managementNavItems.some(item => currentPath === item.url);
  const exportHasActive = exportNavItems.some(item => currentPath === item.url);

  return (
    <aside
      data-sidebar
      className="hidden md:flex flex-col w-[244px] flex-shrink-0 h-screen sticky top-0 bg-muted/40 px-2.5 py-4 border-r border-border"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo + workspace label */}
        <div className="flex items-center gap-2 mb-3 px-2.5 h-9">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-[18px] w-auto opacity-85" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/55 ml-1">Admin</span>
        </div>

        {/* Live workload module */}
        {workload && (
          <button
            onClick={() => navigate('/admin/tax-processing')}
            className="mx-1 mb-3 px-3 py-2.5 rounded-[10px] bg-background border border-border hover:border-foreground/15 transition-colors text-left group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Workload
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors" />
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <p className="text-[18px] font-semibold text-foreground tabular-nums tracking-[-0.02em] leading-none">
                  {workload.pending + workload.express}
                </p>
                <p className="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/60 font-semibold mt-1">Offen</p>
              </div>
              {workload.express > 0 && (
                <div className="ml-auto">
                  <p className="text-[13px] font-semibold text-red-600 tabular-nums leading-none">{workload.express}</p>
                  <p className="text-[9.5px] uppercase tracking-[0.1em] text-red-600/70 font-semibold mt-1">Express</p>
                </div>
              )}
              {workload.tickets > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-amber-600 tabular-nums leading-none">{workload.tickets}</p>
                  <p className="text-[9.5px] uppercase tracking-[0.1em] text-amber-600/70 font-semibold mt-1">Tickets</p>
                </div>
              )}
            </div>
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pr-0.5">
          <div className="space-y-px">
            {mainNavItems.map((item) => (
              <NavItem key={item.url} {...item} isActive={currentPath === item.url} />
            ))}
          </div>

          <NavGroup title="Steuern">
            {taxNavItems.map((item) => (
              <NavItem key={item.url} {...item} isActive={currentPath === item.url} />
            ))}
          </NavGroup>

          <NavGroup title="Support">
            {supportNavItems.map((item) => (
              <NavItem key={item.url} {...item} isActive={currentPath === item.url} />
            ))}
          </NavGroup>

          <NavGroup title="Verwaltung" collapsible defaultOpen={false} hasActive={managementHasActive}>
            {managementNavItems.map((item) => (
              <NavItem key={item.url} {...item} isActive={currentPath === item.url} />
            ))}
          </NavGroup>

          <NavGroup title="AG eTax Export" collapsible defaultOpen={exportHasActive} hasActive={exportHasActive}>
            {exportNavItems.map((item) => (
              <NavItem key={item.url} {...item} isActive={currentPath === item.url} />
            ))}
          </NavGroup>
        </nav>
      </div>

      {/* User Profile */}
      <div className="pt-3 mt-2 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full outline-none">
            <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-foreground/[0.04] transition-colors cursor-pointer">
              <Avatar className="h-7 w-7">
                {adminAvatarUrl ? (
                  <AvatarImage src={adminAvatarUrl} alt={adminName} />
                ) : (
                  <AvatarFallback className="bg-foreground/[0.06] text-foreground/60 text-[10px] font-medium">
                    {getInitials(adminName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[12px] font-medium text-foreground/80 truncate">
                  {adminName}
                </div>
                <div className="text-[10px] text-muted-foreground/60 truncate">
                  {adminEmail}
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-52 mb-2">
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer text-[13px]">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/privacy-settings')} className="cursor-pointer text-[13px]">
              <Settings className="mr-2 h-4 w-4" />
              <span>Einstellungen</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer focus:text-destructive text-[13px]">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Abmelden</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
