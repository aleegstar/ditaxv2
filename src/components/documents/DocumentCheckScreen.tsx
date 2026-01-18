/**
 * Document Check Screen Component
 * 
 * Displays validation results after document upload.
 * Shows confidence, alternatives, and user guidance.
 * 
 * PRIVACY: Shows only validation results, never document content.
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, Upload, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';

interface DocumentCheckScreenProps {
  result: ValidationResult;
  fileName: string;
  onConfirm: () => void;
  onReupload: () => void;
  onChangeType: () => void;
  isConfirming?: boolean;
}

export const DocumentCheckScreen: React.FC<DocumentCheckScreenProps> = ({
  result,
  fileName,
  onConfirm,
  onReupload,
  onChangeType,
  isConfirming = false
}) => {
  const profile = getDocumentProfile(result.best.docTypeId);
  const confidence = result.best.confidence;

  const getConfidenceColor = () => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceIcon = () => {
    if (confidence >= 80) return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
    if (confidence >= 50) return <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
    return <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
  };

  const getConfidenceLabel = () => {
    if (confidence >= 80) return 'Hohe Übereinstimmung';
    if (confidence >= 50) return 'Bitte bestätigen';
    return 'Geringe Übereinstimmung';
  };

  return (
    <div className="space-y-4">
      {/* Main Result Card */}
      <Card className="border-2 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Dokumentenprüfung</CardTitle>
            {getConfidenceIcon()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Name */}
          <p className="text-sm text-muted-foreground truncate">{fileName}</p>

          {/* Best Match */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{profile?.label || 'Unbekannt'}</span>
              <Badge variant={confidence >= 80 ? 'default' : confidence >= 50 ? 'secondary' : 'destructive'}>
                {confidence}%
              </Badge>
            </div>
            <p className={`text-sm ${getConfidenceColor()}`}>{getConfidenceLabel()}</p>
          </div>

          {/* Reasons */}
          {result.best.reasons.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Erkannte Merkmale:</p>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                {result.best.reasons.slice(0, 4).map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternatives (if confidence < 80) */}
          {confidence < 80 && result.candidates.length > 1 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Andere Möglichkeiten:</p>
              <div className="space-y-1">
                {result.candidates.slice(1, 3).map((candidate) => {
                  const altProfile = getDocumentProfile(candidate.docTypeId);
                  return (
                    <div key={candidate.docTypeId} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{altProfile?.label}</span>
                      <Badge variant="outline" className="text-xs">{candidate.confidence}%</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Guidance */}
          {profile?.userGuidance && confidence < 80 && (
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Bitte prüfen Sie:</p>
              <ul className="text-sm space-y-1">
                {profile.userGuidance.whatToCheck.slice(0, 3).map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
        <Shield className="w-3.5 h-3.5 text-green-600" />
        <span>Prüfung erfolgt lokal auf Ihrem Gerät. Keine Daten werden übertragen.</span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {result.needsUserConfirmation ? (
          <>
            <Button onClick={onConfirm} disabled={isConfirming} className="w-full">
              {isConfirming ? 'Wird bestätigt...' : 'Ja, das ist das richtige Dokument'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onReupload} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Andere Datei
              </Button>
              <Button variant="ghost" onClick={onChangeType} className="flex-1">
                <Info className="w-4 h-4 mr-2" />
                Typ ändern
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button onClick={onConfirm} disabled={isConfirming} className="w-full">
              {isConfirming ? 'Wird hochgeladen...' : 'Dokument hochladen'}
            </Button>
            <Button variant="ghost" onClick={onReupload} className="w-full">
              Andere Datei wählen
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentCheckScreen;
