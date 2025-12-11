import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface AdminWelcomeHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
  onRefresh?: () => void;
  showStats?: boolean;
  children?: React.ReactNode;
}

interface AdminStats {
  totalUsers: number;
  pendingTickets: number;
  processingTaxReturns: number;
}

export const AdminWelcomeHeader: React.FC<AdminWelcomeHeaderProps> = ({
  title,
  subtitle,
  badge,
  onRefresh,
  showStats = false,
  children
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminName, setAdminName] = useState<string>('Admin');
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, pendingTickets: 0, processingTaxReturns: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    loadAdminInfo();
    if (showStats) {
      loadStats();
    }

    return () => clearInterval(timer);
  }, [showStats]);

  const loadAdminInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          setAdminName(fullName || 'Admin');
        }
      }
    } catch (error) {
      console.error('Error loading admin info:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Get total users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get pending tickets count
      const { count: ticketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      // Get processing tax returns count
      const { count: taxReturnsCount } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing');

      setStats({
        totalUsers: usersCount || 0,
        pendingTickets: ticketsCount || 0,
        processingTaxReturns: taxReturnsCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      if (showStats) {
        await loadStats();
      }
      setRefreshing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Section Header */}
      <Card
        className="border-2 border-white transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.43)',
          backdropFilter: 'blur(15px)',
          borderRadius: '20px'
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              {badge && (
                <Badge 
                  variant={badge.variant || 'secondary'}
                  className="px-3 py-1 text-sm font-medium"
                >
                  {badge.text}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              {children}
              {onRefresh && (
                <Button 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  variant="outline"
                  className="bg-white/20 border-gray-300 text-gray-700 hover:bg-white/30 transition-all"
                  style={{ borderRadius: '12px' }}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Aktualisieren
                </Button>
              )}
            </div>
          </div>
          {subtitle && (
            <p className="text-gray-600 mt-2">{subtitle}</p>
          )}
        </div>
      </Card>
    </div>
  );
};