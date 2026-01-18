/**
 * Document Check Screen Component (Compact Version)
 * 
 * Displays validation results after document upload.
 * Compact design for use in dialogs.
 * 
 * PRIVACY: Shows only validation results, never document content.
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, FileQuestion, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';

interface DocumentCheckScreenProps {
  result: ValidationResult;
  fileName: string;
  onConfirm: () => void;
  onReupload: () => void;
  onChangeType: () => void;
  onClose?: () => void;
  isConfirming?: boolean;
  embedded?: boolean;
}

export const DocumentCheckScreen: React.FC<DocumentCheckScreenProps> = ({
  result,
  fileName,
  onConfirm,
  onReupload,
  onChangeType,
  onClose,
  isConfirming = false,
  embedded = false
}) => {
  const profile = getDocumentProfile(result.best.docTypeId);
  const confidence = result.best.confidence;
  const isImageWithoutOcr = result.signals.meta.mimeType?.startsWith('image/') && !result.signals.keywords?.available;

  // Determine status
  const getStatus = () => {
    if (confidence >= 80) return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/50', label: 'Erkannt' };
    if (confidence >= 50) return { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/50', label: 'Prüfen' };
    return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/50', label: 'Unsicher' };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Get short status message
  const getStatusMessage = () => {
    if (isImageWithoutOcr) {
      return 'Bitte manuell bestätigen';
    }
    if (confidence >= 80) {
      return 'Dokument erkannt';
    }
    if (confidence >= 50) {
      return 'Bitte bestätigen';
    }
    if (confidence >= 20) {
      return 'Geringe Übereinstimmung';
    }
    return 'Keine Übereinstimmung';
  };

  // Get main warning reason (most important one)
  const getWarningReason = () => {
    const reasons = result.best.reasons;
    const warning = reasons.find(r => r.includes('⚠️') || r.includes('Keine passenden'));
    return warning?.replace('⚠️ ', '') || null;
  };

  const warningReason = getWarningReason();

  // Show "trotzdem einreichen" when confidence is low
  const showSubmitAnyway = confidence < 80;

  return (
    <div className="space-y-4">
      {/* Header with close button */}
      {onClose && (
        <div className="flex items-center justify-between -mt-2 -mx-2">
          <span className="text-lg font-semibold text-foreground pl-2">Dokumentenprüfung</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Compact Result Display */}
      <div className={`p-4 rounded-xl ${status.bgColor} border border-border`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-8 h-8 ${status.color} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">
                {profile?.label || 'Unbekannt'}
              </span>
              {!isImageWithoutOcr && (
                <Badge 
                  variant={confidence >= 80 ? 'default' : confidence >= 50 ? 'secondary' : 'destructive'}
                  className="flex-shrink-0"
                >
                  {confidence}%
                </Badge>
              )}
            </div>
            <p className={`text-sm ${status.color}`}>
              {getStatusMessage()}
            </p>
          </div>
        </div>

        {/* Warning reason if exists */}
        {warningReason && confidence < 50 && (
          <p className="text-sm text-muted-foreground mt-2 pl-11">
            {warningReason}
          </p>
        )}
      </div>

      {/* File name - subtle */}
      <p className="text-xs text-muted-foreground truncate px-1">
        {fileName}
      </p>

      {/* Action Buttons - Primary: Neue Datei */}
      <div className="space-y-3 pt-2">
        {/* Primary Action: Upload new file */}
        <Button 
          onClick={onReupload} 
          className="w-full"
          size="lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Andere Datei hochladen
        </Button>
        
        {/* Secondary: Change type */}
        <Button 
          variant="outline" 
          onClick={onChangeType} 
          className="w-full"
          size="default"
        >
          <FileQuestion className="w-4 h-4 mr-2" />
          Dokumenttyp ändern
        </Button>

        {/* Tertiary: Submit anyway (only when low confidence) */}
        {showSubmitAnyway && (
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="w-full text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 py-2 transition-colors disabled:opacity-50"
          >
            {isConfirming ? 'Wird verarbeitet...' : 'Dokument trotzdem einreichen'}
          </button>
        )}

        {/* High confidence: Show normal confirm */}
        {!showSubmitAnyway && (
          <Button 
            onClick={onConfirm} 
            disabled={isConfirming} 
            variant="outline"
            className="w-full"
            size="default"
          >
            {isConfirming ? 'Wird verarbeitet...' : 'Dokument hochladen'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DocumentCheckScreen;
