/**
 * Document Check Screen Component (Compact Version)
 * 
 * Displays validation results after document upload.
 * Compact design for use in dialogs.
 * 
 * PRIVACY: Shows only validation results, never document content.
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';

interface DocumentCheckScreenProps {
  result: ValidationResult;
  fileName: string;
  onConfirm: () => void;
  onReupload: () => void;
  onClose?: () => void;
  isConfirming?: boolean;
}

export const DocumentCheckScreen: React.FC<DocumentCheckScreenProps> = ({
  result,
  fileName,
  onConfirm,
  onReupload,
  onClose,
  isConfirming = false
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
      return 'Texterkennung nicht möglich – bitte bestätigen';
    }
    if (confidence >= 80) {
      return 'Dokument wurde erkannt';
    }
    if (confidence >= 50) {
      return 'Nicht eindeutig erkannt – bitte prüfen';
    }
    if (confidence >= 20) {
      return 'Scheint nicht das richtige Dokument zu sein';
    }
    return 'Dokument wurde nicht erkannt';
  };

  // Get explanation text for low confidence
  const getExplanationText = () => {
    if (confidence >= 80) return null;
    if (isImageWithoutOcr) {
      return 'Wir konnten keinen Text aus dem Bild lesen. Bitte prüfe, ob dies das richtige Dokument ist.';
    }
    if (confidence >= 50) {
      return 'Das Dokument entspricht möglicherweise nicht dem erwarteten Typ. Bitte überprüfe es.';
    }
    return `Das hochgeladene Dokument scheint kein "${profile?.label || 'erwartetes Dokument'}" zu sein. Bitte lade das richtige Dokument hoch.`;
  };

  const explanationText = getExplanationText();

  // Get main warning reason (most important one)
  const getWarningReason = () => {
    const reasons = result.best.reasons;
    const warning = reasons.find(r => r.includes('⚠️') || r.includes('Keine passenden'));
    return warning?.replace('⚠️ ', '') || null;
  };

  const warningReason = getWarningReason();

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

        {/* Explanation text for low confidence */}
        {explanationText && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            {explanationText}
          </p>
        )}

        {/* Warning reason if exists */}
        {warningReason && confidence < 50 && !explanationText && (
          <p className="text-sm text-muted-foreground mt-2 pl-11">
            {warningReason}
          </p>
        )}
      </div>

      {/* File name - subtle */}
      <p className="text-xs text-muted-foreground truncate px-1">
        {fileName}
      </p>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        {/* Primary Action: Upload new file */}
        <Button 
          onClick={onReupload} 
          className="w-full"
          size="lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {confidence < 50 ? 'Richtiges Dokument hochladen' : 'Andere Datei hochladen'}
        </Button>
        
        {/* Secondary: Submit anyway */}
        <Button 
          variant="outline"
          onClick={onConfirm}
          disabled={isConfirming}
          className="w-full"
          size="default"
        >
          {isConfirming ? 'Wird verarbeitet...' : 'Dokument trotzdem einreichen'}
        </Button>
      </div>
    </div>
  );
};

export default DocumentCheckScreen;
