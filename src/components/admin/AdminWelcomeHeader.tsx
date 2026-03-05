import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';

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

export const AdminWelcomeHeader: React.FC<AdminWelcomeHeaderProps> = ({
  title,
  subtitle,
  badge,
  onRefresh,
  children
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {badge && (
            <span className="px-2.5 py-0.5 bg-muted text-muted-foreground rounded-md text-xs font-medium">
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}
        {onRefresh && (
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        )}
      </div>
    </div>
  );
};
