
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Ticket } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface TicketStatusBadgeProps {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  count?: number;
}

export const TicketStatusBadge = ({ status, count = 1 }: TicketStatusBadgeProps) => {
  const { t } = useI18n();
  
  const getStatusConfig = (status: string) => {
    const statusMap = {
      'open': t.tickets.status.open,
      'in_progress': t.tickets.status.inProgress,
      'resolved': t.tickets.status.resolved,
      'closed': t.tickets.status.closed,
    };

    switch (status) {
      case 'open':
        return {
          label: statusMap.open,
          style: {
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderColor: 'rgba(239, 68, 68, 0.3)'
          }
        };
      case 'in_progress':
        return {
          label: statusMap.in_progress,
          style: {
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            borderColor: 'rgba(59, 130, 246, 0.3)'
          }
        };
      case 'resolved':
        return {
          label: statusMap.resolved,
          style: {
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#10b981',
            borderColor: 'rgba(34, 197, 94, 0.3)'
          }
        };
      case 'closed':
        return {
          label: statusMap.closed,
          style: {
            background: 'rgba(156, 163, 175, 0.1)',
            color: '#9ca3af',
            borderColor: 'rgba(156, 163, 175, 0.3)'
          }
        };
      default:
        return {
          label: status,
          style: {
            background: 'rgba(156, 163, 175, 0.1)',
            color: '#9ca3af',
            borderColor: 'rgba(156, 163, 175, 0.3)'
          }
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant="secondary" 
      className="border backdrop-blur-sm"
      style={{
        ...config.style,
        borderRadius: '12px'
      }}
    >
      <Ticket className="mr-1 h-3 w-3" />
      {config.label}
      {count > 1 && ` (${count})`}
    </Badge>
  );
};
