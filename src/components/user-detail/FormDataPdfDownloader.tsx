import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadFormDataPdf, triggerPdfDownload, PdfDownloadError } from '@/utils/pdfDownloadHelper';
interface FormDataPdfDownloaderProps {
  userId: string;
  taxYear: string;
  userName: string;
  userEmail?: string;
}
const FormDataPdfDownloader: React.FC<FormDataPdfDownloaderProps> = ({
  userId,
  taxYear,
  userName,
  userEmail
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const {
    toast
  } = useToast();
  const handleDownload = async () => {
    console.log('🚀 PDF Download button clicked!', {
      userId,
      taxYear,
      userName,
      userEmail
    });
    try {
      setIsDownloading(true);

      // Provide fallback for empty userName
      const effectiveUserName = userName && userName.trim() ? userName.trim() : userEmail && userEmail.trim() ? userEmail.trim() : 'Unbekannter Benutzer';
      console.log('🎯 Starting form data PDF download for:', {
        userId,
        taxYear,
        originalUserName: userName,
        effectiveUserName,
        userEmail
      });

      // Use the improved PDF download helper
      const data = await downloadFormDataPdf({
        userId,
        taxYear,
        userName: effectiveUserName,
        timeout: 30000,
        retries: 2
      });

      // Trigger the download
      const sanitizedName = (userName && userName.trim() ? userName : userEmail || 'Unbekannter_Benutzer').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `Formularangaben_${sanitizedName}_${taxYear}.pdf`;
      triggerPdfDownload(data, fileName);
      toast({
        title: "PDF erfolgreich erstellt",
        description: "Die Formularangaben wurden als PDF heruntergeladen."
      });
    } catch (error) {
      console.error('❌ Error downloading form data PDF:', error);
      let errorMessage = 'Unbekannter Fehler';
      if (error instanceof PdfDownloadError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Fehler beim PDF-Download",
        description: `Die Formularangaben konnten nicht als PDF exportiert werden. Details: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
      console.log('🔄 PDF download process finished, isDownloading set to false');
    }
  };
  return;
};
export default FormDataPdfDownloader;