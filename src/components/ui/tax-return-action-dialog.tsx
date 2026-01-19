import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/modern-dialog";
import { ModernUploadDialog, ModernUploadDialogContent, ModernUploadDialogHeader, ModernUploadDialogTitle } from "@/components/ui/modern-upload-dialog";
import { Download, Eye, AlertTriangle, Upload, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from '@/contexts/I18nContext';
import { useNavigate } from 'react-router-dom';

interface TaxReturnActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  taxYear: string;
  completedTaxReturnId: string;
  definitiveTaxBill?: any;
  userId: string;
  onTaxBillUpload?: () => void;
  isSigned?: boolean;
}

export const TaxReturnActionDialog = ({
  isOpen,
  onClose,
  fileName,
  filePath,
  taxYear,
  completedTaxReturnId,
  definitiveTaxBill,
  userId,
  onTaxBillUpload,
  isSigned = false
}: TaxReturnActionDialogProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = React.useState(false);

  const handleCreateTicket = () => {
    navigate(`/create-ticket/${completedTaxReturnId}/${taxYear}`);
    onClose();
  };

  const handleDownload = async () => {
    try {
      console.log('Starting download for file:', filePath);
      console.log('Full file path breakdown:', {
        filePath,
        folderPath: filePath.split('/').slice(0, -1).join('/'),
        fileName: filePath.split('/').pop()
      });

      // First, let's check if the file exists using the list method
      const folderPath = filePath.split('/').slice(0, -1).join('/') || '';
      const searchFileName = filePath.split('/').pop() || '';
      console.log('Checking file existence:', {
        folderPath,
        searchFileName
      });
      const {
        data: fileList,
        error: listError
      } = await supabase.storage.from('completed-tax-returns').list(folderPath, {
        search: searchFileName
      });
      if (listError) {
        console.error('Error checking file existence:', listError);
        toast({
          variant: "destructive",
          title: t.taxReturn.downloadFailed,
          description: `${t.taxReturn.downloadFailedDescription} ${listError.message}`
        });
        return;
      }
      console.log('File list result:', fileList);
      if (!fileList || fileList.length === 0) {
        console.error('File not found in storage. Available files:', fileList);
        toast({
          variant: "destructive",
          title: t.taxReturn.fileNotFound,
          description: t.taxReturn.fileNotFoundDescription
        });
        return;
      }
      console.log('File found, proceeding with download');

      // Now download the file
      const {
        data,
        error
      } = await supabase.storage.from('completed-tax-returns').download(filePath);
      if (error) {
        console.error('Download error:', error);
        toast({
          variant: "destructive",
          title: t.taxReturn.downloadFailed,
          description: `${t.taxReturn.downloadFailedDescription} ${error.message}`
        });
        return;
      }
      if (!data) {
        console.error('No data received from download');
        toast({
          variant: "destructive",
          title: t.taxReturn.downloadFailed,
          description: t.taxReturn.downloadFailedDescription
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('Download successful for:', fileName);
      toast({
        title: t.taxReturn.downloadSuccess,
        description: `${fileName} ${t.taxReturn.downloadSuccessDescription}`
      });
      onClose();
    } catch (error: any) {
      console.error('Download exception:', error);
      toast({
        variant: "destructive",
        title: t.taxReturn.downloadFailed,
        description: `${t.common.error}: ${error?.message || t.common.error}`
      });
    }
  };

  const handleView = async () => {
    try {
      console.log('Starting view for file:', filePath);
      console.log('Full file path breakdown:', {
        filePath,
        folderPath: filePath.split('/').slice(0, -1).join('/'),
        fileName: filePath.split('/').pop()
      });

      // First, let's check if the file exists using the list method
      const folderPath = filePath.split('/').slice(0, -1).join('/') || '';
      const searchFileName = filePath.split('/').pop() || '';
      console.log('Checking file existence:', {
        folderPath,
        searchFileName
      });
      const {
        data: fileList,
        error: listError
      } = await supabase.storage.from('completed-tax-returns').list(folderPath, {
        search: searchFileName
      });
      if (listError) {
        console.error('Error checking file existence:', listError);
        toast({
          variant: "destructive",
          title: t.taxReturn.viewFailed,
          description: `${t.taxReturn.viewFailedDescription} ${listError.message}`
        });
        return;
      }
      console.log('File list result:', fileList);
      if (!fileList || fileList.length === 0) {
        console.error('File not found in storage. Available files:', fileList);
        toast({
          variant: "destructive",
          title: t.taxReturn.fileNotFound,
          description: t.taxReturn.fileNotFoundDescription
        });
        return;
      }
      console.log('File found, creating signed URL');

      // Create signed URL for viewing
      const {
        data,
        error
      } = await supabase.storage.from('completed-tax-returns').createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Signed URL error:', error);
        toast({
          variant: "destructive",
          title: t.taxReturn.viewFailed,
          description: `${t.taxReturn.viewFailedDescription} ${error.message}`
        });
        return;
      }
      if (!data?.signedUrl) {
        console.error('No signed URL received');
        toast({
          variant: "destructive",
          title: t.taxReturn.viewFailed,
          description: t.taxReturn.viewFailedDescription
        });
        return;
      }

      // Open PDF in new tab
      console.log('Opening PDF in new tab:', data.signedUrl);
      window.open(data.signedUrl, '_blank');
      toast({
        title: t.taxReturn.viewSuccess,
        description: `${fileName} ${t.taxReturn.viewSuccessDescription}`
      });
      onClose();
    } catch (error: any) {
      console.error('View exception:', error);
      toast({
        variant: "destructive",
        title: t.taxReturn.viewFailed,
        description: `${t.common.error}: ${error?.message || t.common.error}`
      });
    }
  };

  const handleTaxBillDownload = async () => {
    if (!definitiveTaxBill) return;

    try {
      const { data, error } = await supabase.storage
        .from('definitive-tax-bills')
        .download(definitiveTaxBill.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = definitiveTaxBill.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download erfolgreich",
        description: `${definitiveTaxBill.file_name} wurde heruntergeladen.`
      });
    } catch (error: any) {
      console.error('Tax bill download error:', error);
      toast({
        variant: "destructive",
        title: "Download fehlgeschlagen",
        description: error?.message || "Fehler beim Herunterladen der Steuerrechnung."
      });
    }
  };

  const handleTaxBillView = async () => {
    if (!definitiveTaxBill) return;

    try {
      const { data, error } = await supabase.storage
        .from('definitive-tax-bills')
        .createSignedUrl(definitiveTaxBill.file_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
      toast({
        title: "Steuerrechnung geöffnet",
        description: `${definitiveTaxBill.file_name} wurde in einem neuen Tab geöffnet.`
      });
    } catch (error: any) {
      console.error('Tax bill view error:', error);
      toast({
        variant: "destructive",
        title: "Anzeige fehlgeschlagen",
        description: error?.message || "Fehler beim Öffnen der Steuerrechnung."
      });
    }
  };

  const handleTaxBillUpload = async () => {
        if (!selectedFile) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Datei aus.",
        variant: "destructive",
      });
      return;
    }

    setUploadLoading(true);

    try {
      const filePath = `${userId}/${taxYear}/${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('definitive-tax-bills')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('definitive_tax_bills')
        .insert({
          user_id: userId,
          tax_year: taxYear,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          uploaded_by_user_id: userId,
        });

      if (insertError) throw insertError;

      toast({
        title: "Erfolg",
        description: "Steuerrechnung wurde erfolgreich hochgeladen.",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      onTaxBillUpload?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Fehler",
        description: error?.message || "Upload fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[450px] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl bg-white/5 backdrop-blur-[15px] text-white p-6 border border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
          <DialogHeader>
            <DialogTitle className="text-white relative z-10">
              Steuererklärung {taxYear}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 relative z-10 space-y-6">
            {/* Abgeschlossene Steuererklärung */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/80">Abgeschlossene Steuererklärung</h3>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleView} 
                  className="w-full h-11 bg-white hover:bg-gray-50 text-black border border-gray-200 rounded-full shadow-sm font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ansehen
                </Button>
                
                <Button 
                  onClick={handleDownload} 
                  className="w-full h-11 bg-white hover:bg-gray-50 text-black border border-gray-200 rounded-full shadow-sm font-medium flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Herunterladen
                </Button>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-white/10" />

            {/* Definitive Steuerrechnung */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/80">Definitive Steuerrechnung</h3>
              
              {definitiveTaxBill ? (
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleTaxBillView} 
                    className="w-full h-11 bg-green-500/20 hover:bg-green-500/30 text-green-100 border border-green-500/30 rounded-full shadow-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Rechnung ansehen
                  </Button>
                  
                  <Button 
                    onClick={handleTaxBillDownload} 
                    className="w-full h-11 bg-green-500/20 hover:bg-green-500/30 text-green-100 border border-green-500/30 rounded-full shadow-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Rechnung herunterladen
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setUploadDialogOpen(true)} 
                  className="w-full h-11 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border border-blue-500/30 rounded-full shadow-sm font-medium flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Steuerrechnung hochladen
                </Button>
              )}
            </div>

            {/* Problem melden - nur vor Unterschrift */}
            {!isSigned && (
              <>
                <div className="border-t border-white/10" />
                <Button 
                  onClick={handleCreateTicket} 
                  className="w-full h-11 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 border border-orange-500/30 rounded-full shadow-sm font-medium flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Problem melden
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <ModernUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <ModernUploadDialogContent className="sm:max-w-md">
          <ModernUploadDialogHeader>
            <ModernUploadDialogTitle>Steuerrechnung hochladen</ModernUploadDialogTitle>
          </ModernUploadDialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="tax-bill-upload" style={{ color: 'rgb(26, 32, 44)' }}>PDF-Datei oder Bild auswählen</Label>
              <Input
                id="tax-bill-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setUploadDialogOpen(false)} 
                className="w-full bg-white hover:bg-gray-50 border border-[rgb(230,230,230)] font-medium h-12 rounded-full"
                style={{ color: 'rgb(26, 32, 44)' }}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleTaxBillUpload} 
                disabled={!selectedFile || uploadLoading} 
                className="w-full h-12 rounded-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white border-0"
                style={{
                  boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
                }}
              >
                {uploadLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hochladen
              </Button>
            </div>
          </div>
        </ModernUploadDialogContent>
      </ModernUploadDialog>
    </>
  );
};
