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
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    pendingTickets: 0,
    processingTaxReturns: 0
  });
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: profile
        } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
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
      const {
        count: usersCount
      } = await supabase.from('profiles').select('*', {
        count: 'exact',
        head: true
      });

      // Get pending tickets count
      const {
        count: ticketsCount
      } = await supabase.from('support_tickets').select('*', {
        count: 'exact',
        head: true
      }).in('status', ['open', 'in_progress']);

      // Get processing tax returns count
      const {
        count: taxReturnsCount
      } = await supabase.from('tax_returns').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'processing');
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
  return <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-3xl tracking-tight text-foreground font-medium">{title}</h1>
            {badge && <span className="px-3 py-1 bg-primary text-white rounded-full text-xs font-semibold shadow-sm shadow-primary/30">
                {badge.text}
              </span>}
          </div>
          {subtitle && <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {children}
          {onRefresh && <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="rounded-xl shadow-sm hover:shadow-md transition-all">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>}
        </div>
      </div>
    </div>;
};