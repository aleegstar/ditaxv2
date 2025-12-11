import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FileText, Ticket, FolderOpen, MessageCircle, Users, BarChart3, DollarSign, LogOut, Settings, User as UserIcon, ChevronDown } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";

interface SidebarGroupProps {
  children: React.ReactNode;
  className?: string;
}

function SidebarGroup({ children, className }: SidebarGroupProps) {
  return <div className={`py-2 ${className}`}>{children}</div>;
}

interface SidebarGroupLabelProps {
  children: React.ReactNode;
  className?: string;
}

function SidebarGroupLabel({ children, className }: SidebarGroupLabelProps) {
  return <div className={`px-4 ${className}`}>{children}</div>;
}

interface SidebarGroupContentProps {
  children: React.ReactNode;
  className?: string;
}

function SidebarGroupContent({ children, className }: SidebarGroupContentProps) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

interface SidebarMenuProps {
  children: React.ReactNode;
  className?: string;
}

function SidebarMenu({ children, className }: SidebarMenuProps) {
  return <ul className={`space-y-1 ${className}`}>{children}</ul>;
}

interface SidebarMenuItemProps {
  children: React.ReactNode;
  className?: string;
}

function SidebarMenuItem({ children, className }: SidebarMenuItemProps) {
  return <li className={className}>{children}</li>;
}

interface SidebarMenuButtonProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

function SidebarMenuButton({ children, className, asChild }: SidebarMenuButtonProps) {
  if (asChild) {
    return <>{children}</>;
  }
  return <button className={`w-full ${className}`}>{children}</button>;
}

export function AdminSidebar() {
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('Ditax Admin');
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string>('');
  const [navigationExpanded, setNavigationExpanded] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAdminInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (user.email) {
        setAdminEmail(user.email);
      }
      
      // Try to get admin info from profile
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
    
    // Initial load
    loadAdminInfo();

    // Listen for auth state changes
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
        description: "Sie wurden erfolgreich abgemeldet."
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

  const adminNavItems: Array<{
    title: string;
    url: string;
    icon: any;
    badge?: string;
  }> = [{
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: BarChart3
  }, {
    title: "Steuererklärungen",
    url: "/admin/tax-processing",
    icon: FileText
  }, {
    title: "Veranlagungen",
    url: "/admin/definitive-tax-bills",
    icon: FileText
  }, {
    title: "Support",
    url: "/admin/tickets",
    icon: Ticket
  }, {
    title: "Vorlagen",
    url: "/admin/templates",
    icon: FolderOpen
  }, {
    title: "Chat",
    url: "/admin/chat",
    icon: MessageCircle
  }, {
    title: "Benutzer",
    url: "/admin/users",
    icon: Users
  }, {
    title: "Zahlungen",
    url: "/admin/payment-status",
    icon: DollarSign
  }];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div data-sidebar className="h-full flex-shrink-0 w-64 flex flex-col relative min-h-0" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
      <div className="flex items-center h-16 px-4 shrink-0">
        <div className="flex items-center space-x-3">
          <img src="/ditax-logo-new.png" alt="Ditax" className="h-6 w-auto" />
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <SidebarGroup>
          <button 
            onClick={() => setNavigationExpanded(!navigationExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
          >
            <span>Navigation</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${navigationExpanded ? 'rotate-180' : ''}`} />
          </button>
          {navigationExpanded && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1 pl-2">
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={({ isActive }) => 
                          `flex items-center justify-between px-3 py-2 text-sm font-normal rounded-md transition-colors ${
                            isActive 
                              ? 'bg-white text-gray-900' 
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`
                        }
                      >
                        <div className="flex items-center">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="ml-3">{item.title}</span>
                        </div>
                        {item.badge && (
                          <Badge 
                            variant="outline" 
                            className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0 font-medium"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </nav>

      {/* User Profile Section at Bottom */}
      <div className="shrink-0 p-4" style={{ backgroundColor: 'rgb(244, 244, 244)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Avatar className="h-9 w-9">
                {adminAvatarUrl ? (
                  <AvatarImage src={adminAvatarUrl} alt={adminName} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(adminName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {adminName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {adminEmail}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/privacy-settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Einstellungen</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Abmelden</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}