import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Ticket, 
  FolderOpen, 
  MessageCircle, 
  Users, 
  BarChart3, 
  DollarSign, 
  LogOut, 
  Settings, 
  User as UserIcon, 
  ChevronRight, 
  UserMinus, 
  PenLine,
  LayoutDashboard,
  FileCheck,
  Receipt,
  Headphones,
  FolderCog,
  MessageSquare,
  CreditCard,
  Zap,
  Trash2,
  AlertCircle,
  MessageSquareHeart
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
        "group flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary text-white shadow-md"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className={cn(
        "h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200",
        !isActive && "group-hover:scale-110"
      )} />
      <span className="truncate">{title}</span>
    </NavLink>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function NavGroup({ title, children, defaultOpen = true }: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-muted-foreground transition-colors"
      >
        <ChevronRight 
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen && "rotate-90"
          )} 
        />
        {title}
      </button>
      <div className={cn(
        "space-y-0.5 overflow-hidden transition-all duration-200",
        isOpen ? "opacity-100 max-h-[500px]" : "opacity-0 max-h-0"
      )}>
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

  useEffect(() => {
    const loadAdminInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (user.email) {
        setAdminEmail(user.email);
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile?.first_name) {
        const fullName = profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile.first_name;
        setAdminName(fullName);
      }
      
      if (profile?.avatar_url) {
        setAdminAvatarUrl(profile.avatar_url);
      }
    };
    
    loadAdminInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadAdminInfo();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Erfolgreich abgemeldet",
        description: "Du wurdest erfolgreich abgemeldet."
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        variant: "destructive",
        title: "Abmeldefehler",
        description: "Ein Fehler ist beim Abmelden aufgetreten."
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentPath = window.location.pathname;

  const mainNavItems = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  ];

  const taxNavItems = [
    { title: "Steuererklärungen", url: "/admin/tax-processing", icon: FileText },
    { title: "Fehlende Unterlagen", url: "/admin/missing-documents", icon: AlertCircle },
    { title: "Zur Übermittlung", url: "/admin/signed-returns", icon: PenLine },
    { title: "Veranlagungen", url: "/admin/definitive-tax-bills", icon: FileCheck },
  ];

  const supportNavItems = [
    { title: "Support Tickets", url: "/admin/tickets", icon: Headphones },
    { title: "Chat", url: "/admin/chat", icon: MessageSquare },
    { title: "Schnellantworten", url: "/admin/quick-replies", icon: Zap },
  ];

  const managementNavItems = [
    { title: "Benutzer", url: "/admin/users", icon: Users },
    { title: "Vorlagen", url: "/admin/templates", icon: FolderCog },
    { title: "Zahlungen", url: "/admin/payment-status", icon: CreditCard },
    { title: "User-Feedback", url: "/admin/user-feedback", icon: MessageSquareHeart },
    { title: "Lösch-Feedback", url: "/admin/deletion-feedback", icon: Trash2 },
  ];

  return (
    <div 
      data-sidebar 
      className="h-full flex-shrink-0 w-64 flex flex-col relative min-h-0 bg-sidebar"
    >
      {/* Logo Header */}
      <div className="flex items-center h-16 px-5 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-7 w-auto" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Admin Panel</span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {/* Main */}
        <div className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
              isActive={currentPath === item.url}
            />
          ))}
        </div>

        {/* Tax Section */}
        <NavGroup title="Steuern" defaultOpen={true}>
          {taxNavItems.map((item) => (
            <NavItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
              isActive={currentPath === item.url}
            />
          ))}
        </NavGroup>

        {/* Support Section */}
        <NavGroup title="Support" defaultOpen={true}>
          {supportNavItems.map((item) => (
            <NavItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
              isActive={currentPath === item.url}
            />
          ))}
        </NavGroup>

        {/* Management Section */}
        <NavGroup title="Verwaltung" defaultOpen={true}>
          {managementNavItems.map((item) => (
            <NavItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
              isActive={currentPath === item.url}
            />
          ))}
        </NavGroup>
      </nav>

      {/* User Profile Section */}
      <div className="shrink-0 p-3 bg-sidebar">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full outline-none">
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-colors cursor-pointer">
              <Avatar className="h-9 w-9 ring-2 ring-border">
                {adminAvatarUrl ? (
                  <AvatarImage src={adminAvatarUrl} alt={adminName} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(adminName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-foreground truncate">
                  {adminName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {adminEmail}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/privacy-settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Einstellungen</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Abmelden</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}