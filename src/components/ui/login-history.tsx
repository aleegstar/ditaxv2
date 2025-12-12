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
      <section className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-400" />
            Login-Historie
          </h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-xl flex items-center gap-3.5 animate-pulse">
              <div className="w-9 h-9 bg-zinc-800 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <History className="w-5 h-5 text-zinc-400" />
          Login-Historie
        </h2>
        <p className="text-sm text-zinc-400">Ihre letzten Anmeldungen und verwendeten Geräte.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white/[0.02] backdrop-blur-[12px] border border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-900/80 flex items-center justify-center text-zinc-600 mb-4 border border-white/5 shadow-inner">
            <History className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-medium text-zinc-200">Keine Login-Historie verfügbar</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session, index) => (
            <div 
              key={session.id} 
              className={`bg-white/[0.02] backdrop-blur-[12px] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] p-3.5 rounded-xl flex items-center justify-between group transition-colors ${index > 0 ? 'border-white/[0.03]' : ''}`}
            >
              <div className={`flex items-center gap-3.5 ${index > 0 ? 'opacity-60' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  index === 0 
                    ? 'bg-[#1D64FF]/10 text-[#1D64FF] border-[#1D64FF]/20' 
                    : 'bg-zinc-800 text-zinc-400 border-white/5'
                }`}>
                  {getDeviceIcon(session.user_agent)}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className={`text-sm font-medium ${index === 0 ? 'text-zinc-200' : 'text-zinc-300'}`}>
                    {index === 0 ? 'Aktuelle Sitzung' : `Login #${session.login_count}`}
                  </div>
                  <div className={`text-[11px] ${index === 0 ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {getDeviceInfo(session.user_agent)}
                  </div>
                </div>
              </div>
              <div className={`text-xs ${
                index === 0 
                  ? 'font-medium text-[#1D64FF] bg-[#1D64FF]/10 px-2.5 py-1 rounded-md border border-[#1D64FF]/20' 
                  : 'text-zinc-500'
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
              className="w-full py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 border border-dashed border-white/10 hover:border-white/20 rounded-lg transition-all flex items-center justify-center gap-1.5 hover:bg-white/[0.02]"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Weitere Logins anzeigen
            </button>
          )}

          {showAll && sessions.length > 3 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 border border-dashed border-white/10 hover:border-white/20 rounded-lg transition-all flex items-center justify-center gap-1.5 hover:bg-white/[0.02]"
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
