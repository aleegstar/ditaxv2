import React from 'react';
import {
  UnifiedAlertDialog,
  UnifiedAlertDialogAction,
  UnifiedAlertDialogContent,
  UnifiedAlertDialogDescription,
  UnifiedAlertDialogFooter,
  UnifiedAlertDialogHeader,
  UnifiedAlertDialogIcon,
  UnifiedAlertDialogTitle,
} from '@/components/ui/unified-alert-dialog';
import { Trash2 } from 'lucide-react';

interface ChatDeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const ChatDeleteConfirmDialog: React.FC<ChatDeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting
}) => {
  return (
    <UnifiedAlertDialog open={isOpen} onOpenChange={onClose}>
      <UnifiedAlertDialogContent showCloseButton onClose={onClose}>
        <UnifiedAlertDialogHeader>
          <UnifiedAlertDialogIcon variant="delete">
            <Trash2 className="w-8 h-8 text-red-500" />
          </UnifiedAlertDialogIcon>
          <UnifiedAlertDialogTitle>
            Chat löschen
          </UnifiedAlertDialogTitle>
          <UnifiedAlertDialogDescription>
            Diese Konversation wird unwiderruflich gelöscht und kann nicht wiederhergestellt werden.
          </UnifiedAlertDialogDescription>
        </UnifiedAlertDialogHeader>
        <UnifiedAlertDialogFooter>
          <UnifiedAlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                Wird gelöscht...
              </div>
            ) : (
              'Löschen'
            )}
          </UnifiedAlertDialogAction>
        </UnifiedAlertDialogFooter>
      </UnifiedAlertDialogContent>
    </UnifiedAlertDialog>
  );
};
