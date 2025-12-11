import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Monitor, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface LoginSession {
  id: string;
  login_time: string;
  ip_address: string | null;
  user_agent: string | null;
  login_count: number;
}

export const LoginHistory: React.FC = () => {
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id, login_time, ip_address, user_agent, login_count')
        .order('login_time', { ascending: false })
        .limit(showAll ? 20 : 3);

      if (error) throw error;

      setSessions(data || []);
      
      // Check if there are more sessions
      if (!showAll && data && data.length === 3) {
        const { count } = await supabase
          .from('user_sessions')
          .select('id', { count: 'exact', head: true });
        setHasMore((count || 0) > 3);
      }
    } catch (error: any) {
      console.error('Error fetching login sessions:', error);
      toast.error('Fehler beim Laden der Login-Historie');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [showAll]);

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="w-4 h-4" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unbekanntes Gerät';
    
    const ua = userAgent.toLowerCase();
    let device = 'Desktop';
    let browser = 'Unbekannter Browser';

    // Detect device type
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobil';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet';
    }

    // Detect browser
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('edg')) {
      browser = 'Edge';
    }

    return `${device} • ${browser}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Login-Historie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Login-Historie
        </CardTitle>
        <CardDescription>
          Ihre letzten Anmeldungen und verwendeten Geräte
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Keine Login-Historie verfügbar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, index) => (
              <div key={session.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  {getDeviceIcon(session.user_agent)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {index === 0 ? 'Aktuelle Sitzung' : `Login #${session.login_count}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(session.login_time), { 
                        addSuffix: true, 
                        locale: de 
                      })}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getDeviceInfo(session.user_agent)}
                  </div>
                  {session.ip_address && (
                    <div className="text-xs text-muted-foreground mt-1">
                      IP: {session.ip_address}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {hasMore && !showAll && (
              <Button
                variant="outline"
                onClick={() => setShowAll(true)}
                className="w-full mt-4"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Weitere Logins anzeigen
              </Button>
            )}

            {showAll && sessions.length > 3 && (
              <Button
                variant="outline"
                onClick={() => setShowAll(false)}
                className="w-full mt-4"
              >
                <ChevronUp className="w-4 h-4 mr-2" />
                Weniger anzeigen
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};