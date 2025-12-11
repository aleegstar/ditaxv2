import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FolderOpen, MessageCircle, User, Bell, Menu } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { useIntelligentNavbar } from '@/hooks/useIntelligentNavbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from '@/contexts/SidebarContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { ChatButtonWithNotification } from '@/components/chat/ChatButtonWithNotification';
import { MobileMenuSheet } from '@/components/ui/modern-mobile-menu';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: <Home className="w-5 h-5" /> },
  { label: 'Dokumente', path: '/documents', icon: <FolderOpen className="w-5 h-5" /> },
  { label: 'Chat', path: '/chat', icon: <MessageCircle className="w-5 h-5" /> },
  { label: 'Profil', path: '/profile', icon: <User className="w-5 h-5" /> },
];

export const ModernNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { menuSheetOpen, setMenuSheetOpen } = useSidebar();
  const [activeIndex, setActiveIndex] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    avatarUrl?: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  const { isVisible, shouldAnimate, bottomPosition } = useIntelligentNavbar({
    hideOnScroll: true,
    showOnScrollUp: true,
    hideOnKeyboard: true,
    debounceMs: 150,
  });

  // Get current user with auth state listener
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
          avatarUrl: profile?.avatar_url || undefined,
          firstName: profile?.first_name || undefined,
          lastName: profile?.last_name || undefined,
        });
      }
    };

    // Initial load
    getCurrentUser();

    // Listen for auth state changes and profile updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        getCurrentUser();
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update active index based on current path
  useEffect(() => {
    const currentIndex = navItems.findIndex(item => item.path === location.pathname);
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [location.pathname]);

  // Update indicator position
  useEffect(() => {
    const activeElement = navRefs.current[activeIndex];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [activeIndex]);

  const handleNavClick = (path: string, index: number) => {
    setActiveIndex(index);
    navigate(path);
  };

  const getUserInitials = () => {
    if (!currentUser?.firstName) return null; // Return null to show icon instead
    
    const firstInitial = currentUser.firstName.charAt(0).toUpperCase();
    const lastInitial = currentUser.lastName?.charAt(0)?.toUpperCase() || '';
    
    return `${firstInitial}${lastInitial}`;
  };

  // Mobile view
  if (isMobile) {
    return null; // Use existing mobile menu
  }

  // Desktop view
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ 
            duration: 0.36, 
            ease: [0.22, 1, 0.36, 1] 
          }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl"
          style={{
            bottom: bottomPosition,
          }}
        >
          {/* Glass Container */}
          <motion.div
            className="relative mx-auto h-[72px] rounded-[999px] overflow-hidden"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            {/* Glassmorphism Background */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border border-border/50 rounded-[999px] shadow-lg" />
            
            {/* Border Beam Effect */}
            <BorderBeam
              size={200}
              duration={12}
              borderWidth={1.5}
              colorFrom="hsl(var(--primary))"
              colorTo="hsl(var(--secondary))"
              delay={0}
            />

            {/* Content */}
            <div className="relative flex items-center justify-between h-full px-8">
              {/* Logo */}
              <motion.div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img 
                  src="https://ditax.ch/wp-content/uploads/2025/08/Frame-118.svg" 
                  alt="DiTax" 
                  className="h-10 w-auto"
                />
              </motion.div>

              {/* Navigation Items */}
              <div className="relative flex items-center gap-1">
                {/* Animated Indicator */}
                <motion.div
                  className="absolute bottom-0 h-[3px] bg-gradient-to-r from-primary to-secondary rounded-full"
                  style={{
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                  }}
                  initial={false}
                  animate={{
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                  }}
                  transition={{
                    duration: 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Glow Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-60"
                    animate={{
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                {navItems.map((item, index) => (
                  <motion.button
                    key={item.path}
                    ref={el => navRefs.current[index] = el}
                    onClick={() => handleNavClick(item.path, index)}
                    className={`
                      relative px-6 py-3 rounded-full transition-all duration-200
                      flex items-center gap-2 font-medium text-sm
                      ${activeIndex === index 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                    whileHover={{ 
                      scale: 1.05,
                      y: -2,
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Icon with rotation animation */}
                    <motion.div
                      animate={activeIndex === index ? { 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1],
                      } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      {item.icon}
                    </motion.div>
                    
                    {/* Label */}
                    <motion.span
                      initial={false}
                      animate={activeIndex === index ? {
                        opacity: 1,
                        x: 0,
                      } : {
                        opacity: 0.8,
                        x: 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  </motion.button>
                ))}
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <NotificationDropdown />
                </motion.div>

                {/* Chat */}
                <motion.div
                  data-tour="chat-header-icon"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChatButtonWithNotification />
                </motion.div>

                {/* Menu Toggle */}
                <motion.button
                  onClick={() => setMenuSheetOpen(true)}
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Menu className="w-5 h-5 text-foreground" />
                </motion.button>

                {/* User Avatar with Magnetic Effect */}
                <motion.button
                  onClick={() => navigate('/profile')}
                  className="relative"
                  whileHover={{ 
                    scale: 1.1,
                  }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Avatar className="w-10 h-10 border-2 border-primary/20 shadow-lg">
                    <AvatarImage 
                      src={currentUser?.avatarUrl || "/lovable-uploads/default-avatar.png"} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold text-sm">
                      {getUserInitials() || <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Pulsating Ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.nav>
      )}

    </AnimatePresence>
  );
};
