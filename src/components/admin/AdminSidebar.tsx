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
  Layers,
  Wallet,
  Scan,
  FileWarning,
  Star,
  MessageSquareDashed,
  LogOut, 
  Settings, 
  User as UserIcon, 
  ChevronRight
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
        "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
        isActive
          ? "bg-primary/8 text-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
      )}
    >
      <Icon className={cn(
        "h-[18px] w-[18px] flex-shrink-0 transition-colors",
        isActive 
          ? "text-primary"
          : "text-muted-foreground/70 group-hover:text-foreground"
      )} strokeWidth={isActive ? 2 : 1.75} />
      <span className="truncate">{title}</span>
    </NavLink>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
}

function NavGroup({ title, children }: NavGroupProps) {
  return (
    <div className="space-y-0.5">
      <div className="px-3 pt-5 pb-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.1em]">
          {title}
        </span>
      </div>
      <div className="space-y-px">
        {children}
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('Ditax Admin');
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string>('');
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
    
    loadAdminInfo();
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
    { title: "Schnellantworten", url: "/admin/quick-replies", icon: Sparkles },
  ];

  const managementNavItems = [
    { title: "Benutzer", url: "/admin/users", icon: UsersRound },
    { title: "Vorlagen", url: "/admin/templates", icon: Layers },
    { title: "Zahlungen", url: "/admin/payment-status", icon: Wallet },
    { title: "OCR Konfiguration", url: "/admin/ocr-config", icon: Scan },
    { title: "Nicht erkannte Uploads", url: "/admin/ocr-unrecognized", icon: FileWarning },
    { title: "User-Feedback", url: "/admin/user-feedback", icon: Star },
    { title: "Lösch-Feedback", url: "/admin/deletion-feedback", icon: MessageSquareDashed },
  ];

  return (
    <div 
      data-sidebar 
      className="h-full flex-shrink-0 w-[260px] flex flex-col relative min-h-0 bg-transparent px-4 py-6 justify-between"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div className="flex items-center mb-6 px-3">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-6 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {/* Main */}
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

          <NavGroup title="Verwaltung">
            {managementNavItems.map((item) => (
              <NavItem key={item.url} {...item} isActive={currentPath === item.url} />
            ))}
          </NavGroup>
        </nav>
      </div>

      {/* User Profile */}
      <div className="pt-4 border-t border-border/40">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full outline-none">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <Avatar className="h-8 w-8">
                {adminAvatarUrl ? (
                  <AvatarImage src={adminAvatarUrl} alt={adminName} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(adminName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium text-foreground truncate">
                  {adminName}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {adminEmail}
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
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
    </div>
  );
}
