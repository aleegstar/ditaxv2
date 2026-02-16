import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/modern-dialog";
import {
  UnifiedAlertDialog,
  UnifiedAlertDialogAction,
  UnifiedAlertDialogCancel,
  UnifiedAlertDialogContent,
  UnifiedAlertDialogDescription,
  UnifiedAlertDialogFooter,
  UnifiedAlertDialogHeader,
  UnifiedAlertDialogIcon,
  UnifiedAlertDialogTitle,
  UnifiedAlertDialogTrigger,
} from "@/components/ui/unified-alert-dialog";
import { Upload, FileText, Trash2, Download, Eye } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName, validateStoragePath } from '@/utils/fileValidation';
import { toast } from "@/components/ui/use-toast";
import { SecurityService } from "@/services/SecurityService";

interface CompletedTaxReturn {
  id: string;
  tax_year: string;
  file_name: string;
  file_path: string;
  upload_date: string;
  status: string;
}

interface CompletedTaxReturnManagerProps {
  userId: string;
  userName: string;
  completedTaxReturns: CompletedTaxReturn[];
  onRefresh: () => void;
}

const CompletedTaxReturnManager: React.FC<CompletedTaxReturnManagerProps> = ({
  userId,
  userName,
  completedTaxReturns,
  onRefresh
}) => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Ungültiger Dateityp",
          description: "Bitte wählen Sie eine PDF-Datei aus.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !taxYear) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte wählen Sie eine Datei und geben Sie das Steuerjahr an.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Create file path with user ID folder structure
      // SECURITY: No sanitization needed here as filename is programmatically generated (no user input)
      const fileName = `${userId}_${taxYear}_${Date.now()}.pdf`;
      const filePath = `${userId}/${fileName}`;

      console.log('Admin uploading file:', {
        userId,
        fileName,
        filePath,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Verify admin permissions
      const isAdmin = await SecurityService.verifyAdminAccess('completed_tax_return_upload');
      if (!isAdmin) {
        throw new Error('Keine Admin-Berechtigung');
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error(`Auth-Fehler: ${userError?.message || 'Benutzer nicht authentifiziert'}`);
      }

      console.log('Admin verified, uploading file for user:', userId);

      // Upload file to storage with detailed logging
      console.log('Starting file upload to storage...');
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('completed-tax-returns')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('Upload error details:', {
          message: uploadError.message,
          error: uploadError
        });
        
        // Provide better error messages for common issues
        if (uploadError.message.toLowerCase().includes('not found') || 
            uploadError.message.toLowerCase().includes('bucket')) {
          throw new Error('Speicher-Bucket "completed-tax-returns" konnte nicht gefunden werden. Bitte kontaktieren Sie den Support.');
        }
        
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('Kein Upload-Resultat erhalten');
      }

      console.log('Upload successful:', uploadData);

      // Verify the file was actually uploaded by listing the folder
      const { data: fileList, error: listError } = await supabase.storage
        .from('completed-tax-returns')
        .list(userId);

      if (listError) {
        console.error('Error verifying upload:', listError);
        // Continue anyway, file might be uploaded
      } else {
        const uploadedFile = fileList?.find(file => file.name === fileName);
        if (!uploadedFile) {
          console.warn('File uploaded but not found in directory listing');
        } else {
          console.log('Upload verified in directory:', uploadedFile);
        }
      }

      // Insert record into completed_tax_returns table only after successful upload
      console.log('Inserting database record...');
      const { error: dbError } = await supabase
        .from('completed_tax_returns')
        .insert({
          user_id: userId,
          tax_year: taxYear,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: 'application/pdf',
          status: 'available',
          uploaded_by_admin_id: userData.user?.id
        });

      if (dbError) {
        // Clean up uploaded file if database insert fails
        console.error('Database error, cleaning up uploaded file:', dbError);
        await supabase.storage.from('completed-tax-returns').remove([filePath]);
        throw new Error(`Datenbank-Fehler: ${dbError.message}`);
      }

      console.log('Database record inserted successfully');

      // Update tax_returns status to success
      const { error: taxReturnUpdateError } = await supabase
        .from('tax_returns')
        .update({
          status: 'success',
          workflow_step: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('tax_year', taxYear);

      if (taxReturnUpdateError) {
        console.warn('Could not update tax_returns status:', taxReturnUpdateError);
        // Non-blocking, trigger will handle it as fallback
      } else {
        console.log('Tax return status updated to completed');
      }

      toast({
        title: "Erfolgreich hochgeladen",
        description: `Steuererklärung für ${taxYear} wurde erfolgreich hochgeladen.`
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setTaxYear(new Date().getFullYear().toString());
      onRefresh();
    } catch (error: any) {
      console.error('Error uploading completed tax return:', error);
      toast({
        title: "Upload-Fehler",
        description: error.message || "Die Steuererklärung konnte nicht hochgeladen werden.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (taxReturn: CompletedTaxReturn) => {
    try {
      // Delete from database first
      const { error: dbError } = await supabase
        .from('completed_tax_returns')
        .delete()
        .eq('id', taxReturn.id);

      if (dbError) throw dbError;

      // Delete file from storage (this might fail if file doesn't exist)
      const { error: storageError } = await supabase.storage
        .from('completed-tax-returns')
        .remove([taxReturn.file_path]);

      if (storageError) {
        console.warn('File deletion from storage failed (file might not exist):', storageError);
        // Don't throw error here, database deletion was successful
      }

      toast({
        title: "Erfolgreich gelöscht",
        description: "Steuererklärung wurde gelöscht."
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting completed tax return:', error);
      toast({
        title: "Lösch-Fehler",
        description: "Die Steuererklärung konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (taxReturn: CompletedTaxReturn) => {
    try {
      console.log('Admin downloading file:', taxReturn.file_path);
      
      // Check if file exists first
      const folderPath = taxReturn.file_path.split('/').slice(0, -1).join('/') || '';
      const searchFileName = taxReturn.file_path.split('/').pop() || '';
      
      const { data: fileList, error: listError } = await supabase.storage
        .from('completed-tax-returns')
        .list(folderPath, {
          search: searchFileName
        });

      if (listError) {
        console.error('Error checking file existence:', listError);
        toast({
          title: "Download-Fehler", 
          description: `Fehler beim Überprüfen der Datei: ${listError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!fileList || fileList.length === 0) {
        console.error('File not found in storage:', taxReturn.file_path);
        toast({
          title: "Datei nicht gefunden",
          description: "Die Datei existiert nicht im Speicher. Möglicherweise wurde sie nicht korrekt hochgeladen.",
          variant: "destructive"
        });
        return;
      }

      if (!validateStoragePath(taxReturn.file_path)) {
        throw new Error('Ungültiger Dateipfad');
      }

      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .download(taxReturn.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = taxReturn.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download erfolgreich",
        description: `${taxReturn.file_name} wurde heruntergeladen.`
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download-Fehler",
        description: `Die Datei konnte nicht heruntergeladen werden: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <Button 
          onClick={() => setUploadDialogOpen(true)}
          size="sm"
          className="bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-5 py-2 font-medium border-0 transition-colors duration-200 gap-2"
          style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
        >
          <Upload className="h-4 w-4" />
          Hochladen
        </Button>
      </div>
      
      {/* Documents list */}
      {completedTaxReturns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Keine fertigen Steuererklärungen</p>
          <p className="text-slate-400 text-sm mt-1">Laden Sie eine Steuererklärung hoch</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedTaxReturns.map(taxReturn => (
            <div 
              key={taxReturn.id} 
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200/50">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">
                    Steuererklärung {taxReturn.tax_year}
                  </h4>
                  <p className="text-sm text-slate-500 truncate max-w-[300px]">
                    {taxReturn.file_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hochgeladen am {new Date(taxReturn.upload_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(taxReturn)}
                  className="h-9 w-9 p-0 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <UnifiedAlertDialog>
                  <UnifiedAlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </UnifiedAlertDialogTrigger>
                  <UnifiedAlertDialogContent showCloseButton>
                    <UnifiedAlertDialogHeader>
                      <UnifiedAlertDialogIcon variant="delete">
                        <Trash2 className="w-8 h-8 text-red-500" />
                      </UnifiedAlertDialogIcon>
                      <UnifiedAlertDialogTitle>Steuererklärung löschen</UnifiedAlertDialogTitle>
                      <UnifiedAlertDialogDescription>
                        Möchten Sie die Steuererklärung für {taxReturn.tax_year} wirklich löschen? 
                        Diese Aktion kann nicht rückgängig gemacht werden.
                      </UnifiedAlertDialogDescription>
                    </UnifiedAlertDialogHeader>
                    <UnifiedAlertDialogFooter>
                      <UnifiedAlertDialogAction onClick={() => handleDelete(taxReturn)} variant="destructive">
                        Löschen
                      </UnifiedAlertDialogAction>
                      <UnifiedAlertDialogCancel>Abbrechen</UnifiedAlertDialogCancel>
                    </UnifiedAlertDialogFooter>
                  </UnifiedAlertDialogContent>
                </UnifiedAlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fertige Steuererklärung hochladen</DialogTitle>
            <DialogDescription>
              Laden Sie eine fertige Steuererklärung für {userName} hoch.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tax-year" className="text-right text-gray-900">
                Steuerjahr
              </Label>
              <Input
                id="tax-year"
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                className="col-span-3"
                min="2000"
                max="2030"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right text-gray-900">
                PDF-Datei
              </Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="col-span-3"
              />
            </div>
            {selectedFile && (
              <div className="text-sm text-gray-600">
                Ausgewählte Datei: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} className="rounded-full">
              Abbrechen
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile} className="rounded-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white">
              {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompletedTaxReturnManager;
