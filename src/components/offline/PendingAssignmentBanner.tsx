import { useNavigate } from 'react-router-dom';
import { Inbox, ChevronRight } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePendingAssignmentCount } from '@/hooks/usePendingAssignmentCount';

/**
 * Slim banner shown when the user has documents that were uploaded
 * offline and still need to be assigned to a person, year and checklist
 * item (or deleted). Hidden offline (the OfflineGate handles that case).
 */
export const PendingAssignmentBanner = () => {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { count } = usePendingAssignmentCount();

  if (!online || count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/documents/review')}
      className="w-full flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/15 text-left hover:bg-primary/10 transition-colors"
    >
      <Inbox className="h-4 w-4 text-primary shrink-0" strokeWidth={1.75} />
      <span className="text-sm text-foreground flex-1">
        {count === 1
          ? '1 Dokument wartet auf Zuordnung'
          : `${count} Dokumente warten auf Zuordnung`}
      </span>
      <span className="text-xs font-medium text-primary inline-flex items-center gap-1">
        Jetzt zuordnen <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
    </button>
  );
};

export default PendingAssignmentBanner;
