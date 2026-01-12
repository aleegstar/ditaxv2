import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { History, Monitor, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
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
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            Login-Historie
          </h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl flex items-center gap-3.5 animate-pulse">
              <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          Login-Historie
        </h2>
        <p className="text-sm text-gray-600">Ihre letzten Anmeldungen und verwendeten Geräte.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3 border border-gray-200">
            <History className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-medium text-gray-700">Keine Login-Historie verfügbar</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session, index) => (
            <div 
              key={session.id} 
              className="bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 p-3.5 rounded-xl flex items-center justify-between group transition-colors"
            >
              <div className={`flex items-center gap-3.5 ${index > 0 ? 'opacity-70' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  index === 0 
                    ? 'bg-blue-100 text-[#1D64FF] border-blue-200' 
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {getDeviceIcon(session.user_agent)}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className={`text-sm font-medium ${index === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {index === 0 ? 'Aktuelle Sitzung' : `Login #${session.login_count}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getDeviceInfo(session.user_agent)}
                  </div>
                </div>
              </div>
              <div className={`text-xs ${
                index === 0 
                  ? 'font-medium text-[#1D64FF] bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200' 
                  : 'text-gray-500'
              }`}>
                {formatDistanceToNow(new Date(session.login_time), { 
                  addSuffix: true, 
                  locale: de 
                })}
              </div>
            </div>
          ))}

          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg transition-all flex items-center justify-center gap-1.5 hover:bg-gray-50"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Weitere Logins anzeigen
            </button>
          )}

          {showAll && sessions.length > 3 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg transition-all flex items-center justify-center gap-1.5 hover:bg-gray-50"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Weniger anzeigen
            </button>
          )}
        </div>
      )}
    </section>
  );
};
