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
  MessageSquareHeart,
  ScanSearch,
  FileQuestion
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
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300",
        isActive
          ? "bg-card text-foreground font-semibold shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-border/60 hover:shadow-md hover:-translate-y-0.5"
          : "text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm font-medium"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg transition-transform",
        isActive 
          ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20 group-hover:scale-105"
          : "text-muted-foreground group-hover:text-primary"
      )}>
        <Icon className="h-4 w-4 flex-shrink-0" />
      </div>
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
      <div className="px-5 py-2">
        <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="space-y-0.5">
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
    { title: "OCR Konfiguration", url: "/admin/ocr-config", icon: ScanSearch },
    { title: "Nicht erkannte Uploads", url: "/admin/ocr-unrecognized", icon: FileQuestion },
    { title: "User-Feedback", url: "/admin/user-feedback", icon: MessageSquareHeart },
    { title: "Lösch-Feedback", url: "/admin/deletion-feedback", icon: Trash2 },
  ];

  return (
    <div 
      data-sidebar 
      className="h-full flex-shrink-0 w-[280px] flex flex-col relative min-h-0 bg-transparent p-6 justify-between"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Logo Header */}
        <div className="flex items-center mb-8 px-2">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-7 w-auto" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pr-2">
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
      </div>

      {/* User Profile Section */}
      <div className="mt-4 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full outline-none">
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-colors cursor-pointer">
              <Avatar className="h-9 w-9">
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