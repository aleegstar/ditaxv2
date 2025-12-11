
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Chat löschen
          </AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie wirklich den gesamten Chat-Verlauf löschen? Diese Aktion kann nicht 
            rückgängig gemacht werden.
            <br /><br />
            <strong style={{ color: 'rgb(26, 32, 44)', opacity: 1 }}>Folgende Daten werden unwiderruflich gelöscht:</strong>
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Alle Chat-Nachrichten</li>
              <li>Alle hochgeladenen Anhänge</li>
              <li>Der gesamte Konversationsverlauf</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isDeleting}
            className="bg-white hover:bg-gray-50 border border-[rgb(230,230,230)] font-medium h-12 rounded-full"
            style={{ color: 'rgb(26, 32, 44)' }}
          >
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 text-white border-0 h-12 rounded-full"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Wird gelöscht...
              </div>
            ) : (
              'Endgültig löschen'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
