
import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SessionInfo {
  userId: string | null;
  email: string | null;
  sessionValid: boolean;
  lastRefresh: string;
}

const UserSessionDebug: React.FC = () => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    userId: null,
    email: null,
    sessionValid: false,
    lastRefresh: new Date().toISOString()
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      setSessionInfo({
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        sessionValid: !!session && !error,
        lastRefresh: new Date().toISOString()
      });

      if (error) {
        console.error('Session error:', error);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setSessionInfo(prev => ({
        ...prev,
        sessionValid: false,
        lastRefresh: new Date().toISOString()
      }));
    }
  };

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      await supabase.auth.refreshSession();
      await checkSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    checkSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        checkSession();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Only show in development or when there are auth issues
  if (process.env.NODE_ENV === 'production' && sessionInfo.sessionValid) {
    return null;
  }

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-blue-800">
          Session Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">User ID:</span>
            <div className="font-mono text-xs text-muted-foreground">
              {sessionInfo.userId || 'Not logged in'}
            </div>
          </div>
          <div>
            <span className="font-medium">Email:</span>
            <div className="text-xs text-muted-foreground">
              {sessionInfo.email || 'No email'}
            </div>
          </div>
          <div>
            <span className="font-medium">Session:</span>
            <Badge variant={sessionInfo.sessionValid ? "default" : "destructive"}>
              {sessionInfo.sessionValid ? 'Valid' : 'Invalid'}
            </Badge>
          </div>
          <div>
            <span className="font-medium">Last Check:</span>
            <div className="text-xs text-muted-foreground">
              {new Date(sessionInfo.lastRefresh).toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRefreshSession}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Session
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleLogout}
          >
            <LogOut className="h-3 w-3 mr-1" />
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserSessionDebug;
