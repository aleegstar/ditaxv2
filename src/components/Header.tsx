import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Menu } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { ChatButtonWithNotification } from "@/components/chat/ChatButtonWithNotification";
import { toast } from "@/hooks/use-toast";
import { useSidebar } from '@/contexts/SidebarContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { debug } from '@/utils/debug';
import { ModernNavbar } from '@/components/ui/modern-navbar';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    avatarUrl?: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  // Get current user and their avatar with auth state listener
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, first_name, last_name')
          .eq('id', session.user.id)
          .maybeSingle();
        
        setCurrentUser({
          id: session.user.id,
          avatarUrl: profile?.avatar_url || undefined,
          firstName: profile?.first_name || undefined,
          lastName: profile?.last_name || undefined
        });
      }
    };

    // Initial load
    getCurrentUser();

    // Listen for auth changes and profile updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        getCurrentUser();
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show modern navbar on desktop, mobile header on mobile
  if (!isMobile) {
    return <ModernNavbar />;
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Erfolgreich abgemeldet",
        description: "Auf Wiedersehen!"
      });
      navigate('/auth');
    } catch (error) {
      debug.error('Error logging out:', error);
      toast({
        variant: "destructive",
        title: "Fehler beim Abmelden",
        description: "Bitte versuchen Sie es erneut."
      });
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const getUserDisplayName = () => {
    if (!currentUser?.firstName) return 'Benutzer';
    if (currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    return currentUser.firstName;
  };

  const getUserInitials = () => {
    if (!currentUser?.firstName) return null; // Return null to show icon instead
    
    const firstInitial = currentUser.firstName.charAt(0).toUpperCase();
    const lastInitial = currentUser.lastName?.charAt(0)?.toUpperCase() || '';
    
    return `${firstInitial}${lastInitial}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg z-40">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Menu toggle and Logo */}
        <div className="flex items-center gap-3">
          {/* Only show menu button on mobile */}
          {isMobile && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleSidebar}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {/* Logo */}
          <div className="md:hidden">
            <img 
              src="https://ditax.ch/wp-content/uploads/2025/08/Frame-118.svg" 
              alt="DiTax" 
              className="h-8 w-auto brightness-0 invert"
            />
          </div>
        </div>

        {/* Right: Navigation items */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationDropdown />

          {/* Chat */}
          <div data-tour="chat-header-icon">
            <ChatButtonWithNotification />
          </div>

          {/* Menu Toggle for Sidebar */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSidebar}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* User Profile Menu - Sheet for Mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="relative p-1 rounded-full hover:bg-white/10">
                <Avatar className="w-8 h-8 border-2 border-white/20">
                  <AvatarImage 
                    src={currentUser?.avatarUrl || "/lovable-uploads/default-avatar.png"}
                    alt={getUserDisplayName()}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-white/20 text-white font-medium text-sm">
                    {getUserInitials() || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </SheetTrigger>
            
            <SheetContent side="right" className="w-[280px] bg-white">
              <div className="flex flex-col gap-4 mt-6">
                <div className="px-2 py-3 border-b border-gray-200">
                  <p className="text-base font-semibold text-gray-900">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Eingeloggt
                  </p>
                </div>
                
                <Button 
                  variant="ghost" 
                  onClick={handleProfileClick}
                  className="justify-start h-12 px-4 text-base"
                >
                  <User className="mr-3 h-5 w-5" />
                  <span>Profil</span>
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/privacy-settings')}
                  className="justify-start h-12 px-4 text-base"
                >
                  <Settings className="mr-3 h-5 w-5" />
                  <span>Einstellungen</span>
                </Button>
                
                <div className="border-t border-gray-200 pt-2">
                  <Button 
                    variant="ghost"
                    onClick={handleLogout}
                    className="justify-start h-12 px-4 text-base text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span>Abmelden</span>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
