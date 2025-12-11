import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import { downloadCoverLetterPdf, triggerCoverLetterDownload, CoverLetterDownloadError } from '@/utils/coverLetterDownloadHelper';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CoverLetterDownloaderProps {
  userId: string;
  userName?: string;
}

export const CoverLetterDownloader: React.FC<CoverLetterDownloaderProps> = ({
  userId,
  userName,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();
  
  // Check if profile has meaningful data
  const hasProfileData = profile && (
    (profile.first_name?.trim()) || 
    (profile.last_name?.trim())
  );

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      const result = await downloadCoverLetterPdf({
        userId,
        userName,
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const userDisplayName = userName || 'Benutzer';
      
      // Determine file extension based on content type
      const fileExtension = result.contentType.includes('wordprocessingml') ? '.docx' : '.pdf';
      const filename = `Begleitschreiben_${userDisplayName}_${timestamp}${fileExtension}`;
      
      triggerCoverLetterDownload(result.buffer, filename, result.contentType);
      
      toast({
        title: 'Begleitschreiben erstellt',
        description: hasProfileData 
          ? 'Das personalisierte Begleitschreiben wurde erfolgreich generiert und heruntergeladen.'
          : 'Das Begleitschreiben wurde erstellt. Vervollständigen Sie Ihr Profil für ein personalisiertes Dokument.',
      });
    } catch (error: any) {
      console.error('Error downloading cover letter:', error);
      
      let errorMessage = 'Unbekannter Fehler beim Erstellen des Begleitschreibens';
      
      if (error instanceof CoverLetterDownloadError) {
        errorMessage = `Fehler beim Erstellen des Begleitschreibens: ${error.message}`;
      } else if (error.message) {
        errorMessage = `Fehler: ${error.message}`;
      }
      
      toast({
        title: 'Fehler beim Erstellen des Begleitschreibens',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!hasProfileData && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vervollständigen Sie Ihr Profil (Name und Adresse) für ein personalisiertes Begleitschreiben.
          </AlertDescription>
        </Alert>
      )}
      
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        size="sm"
        className="bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] font-medium border-0 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2"
        style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {isDownloading ? 'Begleitschreiben wird generiert...' : 'Begleitschreiben erstellen'}
      </Button>
    </div>
  );
};