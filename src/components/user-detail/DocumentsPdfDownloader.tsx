
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentsPdfDownloaderProps {
  userId: string;
  taxYear: string;
  userName: string;
  documentCount: number;
}

const DocumentsPdfDownloader: React.FC<DocumentsPdfDownloaderProps> = ({
  userId,
  taxYear,
  userName,
  documentCount
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    if (documentCount === 0) {
      toast({
        title: "Keine Dokumente",
        description: "Für dieses Steuerjahr sind keine Dokumente vorhanden.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log(`Generating PDF for user ${userId}, tax year ${taxYear}`);
      
      // Get the current session for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Nicht authentifiziert');
      }

      // Use Supabase client for proper authentication and API key handling
      const { data: pdfData, error: functionError } = await supabase.functions.invoke(
        'generate-user-documents-pdf',
        {
          body: {
            user_id: userId,
            tax_year: taxYear
          }
        }
      );

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(`Server error: ${functionError.message}`);
      }

      if (!pdfData || !pdfData.pdf) {
        throw new Error('Keine Daten vom Server erhalten');
      }

      // Decode Base64 to binary
      const binaryString = atob(pdfData.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfArrayBuffer = bytes.buffer;

      console.log(`PDF size: ${pdfArrayBuffer.byteLength} bytes`);
      console.log(`Stats: ${pdfData.successCount} success, ${pdfData.errorCount} errors, ${pdfData.skippedCount} skipped`);

      if (pdfArrayBuffer.byteLength === 0) {
        throw new Error('PDF ist leer');
      }

      // Create blob and download
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfData.fileName || `Unterlagen_${userName.replace(/\s+/g, '_')}_${taxYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success with stats
      const statsInfo = pdfData.errorCount > 0 
        ? ` (${pdfData.successCount} erfolgreich, ${pdfData.errorCount} Fehler)`
        : '';
      
      toast({
        title: "PDF erfolgreich erstellt",
        description: `Alle Dokumente für ${taxYear} wurden als PDF heruntergeladen.${statsInfo}`
      });

    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Fehler beim PDF-Download",
        description: error.message || "Beim Erstellen des PDFs ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownloadPdf}
      disabled={isGenerating || documentCount === 0}
      size="sm"
      className="bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] font-medium border-0 transition-colors duration-200 disabled:opacity-50"
      style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          PDF wird erstellt...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Unterlagen als PDF ({documentCount})
        </>
      )}
    </Button>
  );
};

export default DocumentsPdfDownloader;
