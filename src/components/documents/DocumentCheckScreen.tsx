/**
 * Document Check Screen Component
 * 
 * Displays validation results after document upload.
 * Shows confidence, alternatives, and user guidance.
 * 
 * PRIVACY: Shows only validation results, never document content.
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, RefreshCw, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ValidationResult } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';
import { Capacitor } from '@capacitor/core';

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

  // Check if this is an image without OCR
  const isImageWithoutOcr = result.signals.meta.mimeType?.startsWith('image/') && !result.signals.keywords?.available;

  // Check for detected patterns
  const hasScreenshotPattern = result.signals.layout.detected.screenshotPattern === true;
  const hasLogoPattern = result.signals.layout.detected.logoPattern === true;
  const hasDocumentFormat = result.signals.layout.detected.documentAspectRatio === true;
  const hasSufficientResolution = result.signals.layout.detected.sufficientResolution === true;

  return (
    <div className="space-y-4">
      {/* Screenshot Warning - RED - Most serious */}
      {isImageWithoutOcr && hasScreenshotPattern && (
        <div className="bg-red-50 dark:bg-red-950/50 border-2 border-red-400 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                Dies sieht wie ein Screenshot aus
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Bitte laden Sie das <strong>Original-Dokument</strong> hoch (PDF oder Foto des Dokuments), 
                nicht einen Screenshot davon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logo Warning - RED */}
      {isImageWithoutOcr && hasLogoPattern && !hasScreenshotPattern && (
        <div className="bg-red-50 dark:bg-red-950/50 border-2 border-red-400 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                Dies sieht nicht wie ein Dokument aus
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Bitte laden Sie Ihren <strong>{profile?.label || 'Dokument'}</strong> als Foto oder PDF hoch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Format Detected - BLUE - Positive signal */}
      {isImageWithoutOcr && hasDocumentFormat && !hasScreenshotPattern && !hasLogoPattern && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                Dokumentformat erkannt
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Das Bildformat entspricht einem Dokument. 
                Bitte bestätigen Sie, dass dies ein <strong>{profile?.label || 'Dokument'}</strong> ist.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generic Image Warning - Only if no pattern detected */}
      {isImageWithoutOcr && !hasDocumentFormat && !hasScreenshotPattern && !hasLogoPattern && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                Manuelle Prüfung erforderlich
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Bei Bildern ist keine automatische Dokumentenerkennung möglich. 
                Bitte bestätigen Sie, dass dies ein <strong>{profile?.label || 'Dokument'}</strong> ist.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Result Card */}
      <Card className="border-2 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Dokumentenprüfung</CardTitle>
            {!isImageWithoutOcr && getConfidenceIcon()}
            {isImageWithoutOcr && <Info className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Name */}
          <p className="text-sm text-muted-foreground truncate">{fileName}</p>

          {/* Best Match - Different display for images */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{profile?.label || 'Unbekannt'}</span>
              {isImageWithoutOcr ? (
                <Badge variant="secondary">Manuell</Badge>
              ) : (
                <Badge variant={confidence >= 80 ? 'default' : confidence >= 50 ? 'secondary' : 'destructive'}>
                  {confidence}%
                </Badge>
              )}
            </div>
            <p className={`text-sm ${isImageWithoutOcr ? 'text-amber-600 dark:text-amber-400' : getConfidenceColor()}`}>
              {isImageWithoutOcr ? 'Bitte manuell bestätigen' : getConfidenceLabel()}
            </p>
          </div>

          {/* User Guidance - Prominent for images */}
          {profile?.userGuidance && (isImageWithoutOcr || confidence < 80) && (
            <div className={`pt-2 ${isImageWithoutOcr ? 'bg-blue-50/50 dark:bg-blue-950/30 -mx-4 px-4 py-3 border-y border-blue-200 dark:border-blue-800' : 'border-t'} space-y-2`}>
              <p className="text-xs font-medium text-foreground">
                {isImageWithoutOcr ? '✓ Bitte prüfen Sie vor dem Bestätigen:' : 'Bitte prüfen Sie:'}
              </p>
              <ul className="text-sm space-y-1.5">
                {profile.userGuidance.whatToCheck.slice(0, isImageWithoutOcr ? 5 : 3).map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reasons - Only show for non-images or if we have real reasons */}
          {!isImageWithoutOcr && result.best.reasons.length > 0 && (
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

          {/* Alternatives - Only show for non-images with low confidence */}
          {!isImageWithoutOcr && confidence < 80 && result.candidates.length > 1 && (
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
        </CardContent>
      </Card>

      {/* Cloud OCR Success Badge */}
      {result.signals.keywords?.source === 'cloud-ocr' && result.signals.keywords?.available && (
        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Dokument erkannt via Cloud-Analyse (DSGVO-konform)</span>
        </div>
      )}

      {/* Native OCR Success Badge - Only show when OCR actually worked */}
      {result.signals.keywords?.source === 'native-ocr' && result.signals.keywords?.available && (
        <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Text automatisch erkannt</span>
        </div>
      )}

      {/* Privacy Badge - Different message for Cloud vs Local */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
        <Shield className="w-3.5 h-3.5 text-green-600" />
        {result.signals.keywords?.source === 'cloud-ocr' ? (
          <span>Nur Schlagwörter werden analysiert – keine Speicherung von Dokumentinhalten.</span>
        ) : (
          <span>Prüfung erfolgt lokal auf Ihrem Gerät. Keine Daten werden übertragen.</span>
        )}
      </div>

      {/* Spacer for fixed footer */}
      <div className="h-28" />

      {/* Fixed Footer Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-inset-bottom z-50">
        <div className="max-w-md mx-auto space-y-2">
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
    </div>
  );
};

export default DocumentCheckScreen;
