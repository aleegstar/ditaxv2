
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { File, X, Upload, Image, FileText, Check, AlertCircle, Shield, ShieldCheck } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { ChecklistItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFormContext } from '@/contexts';
import { useTaxFiler } from '@/contexts/TaxFilerContext';

import { useI18n } from '@/contexts/I18nContext';

interface DocumentUploaderProps {
  checklistItem: ChecklistItem;
  onBack: () => void;
  onDocumentSubmitted: () => void;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  id: string;
  uploading: boolean;
  progress: number;
  error?: string;
  uploaded: boolean;
  encrypted?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  checklistItem,
  onBack,
  onDocumentSubmitted
}) => {
  const { taxYear } = useFormContext();
  const { activeTaxFilerId } = useTaxFiler();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true); // Default to encrypted
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadRequestId = useRef(uuidv4()).current;
  const encryptedDocService = EncryptedDocumentService.getInstance();
  const { t } = useI18n();

  // Datei auswählen
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Dateien hinzufügen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const newFiles: FileWithPreview[] = [];

    for (const selectedFile of selectedFiles) {
      // Datei prüfen
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError(`Die Datei "${selectedFile.name}" ${t.upload.documents.fileTooLarge}`);
        continue;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError(`Die Datei "${selectedFile.name}" ${t.upload.documents.invalidFormat}`);
        continue;
      }

      const fileWithPreview: FileWithPreview = {
        file: selectedFile,
        id: uuidv4(),
        uploading: false,
        progress: 0,
        uploaded: false,
        encrypted: false
      };

      // Vorschau für Bilder erstellen
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setFiles(prev => prev.map(f => 
            f.id === fileWithPreview.id 
              ? { ...f, preview: reader.result as string }
              : f
          ));
        };
        reader.readAsDataURL(selectedFile);
      }

      newFiles.push(fileWithPreview);
    }

    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Einzelne Datei entfernen
  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Einzelne Datei hochladen
  const uploadSingleFile = async (fileWithPreview: FileWithPreview): Promise<boolean> => {
    try {
      // Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(t.upload.documents.loginRequired);
      }
      
      const userId = sessionData.session.user.id;

      console.log('Starting upload for:', {
        fileName: fileWithPreview.file.name,
        encrypted: encryptionEnabled,
        fileSize: fileWithPreview.file.size,
        userId
      });

      // Update progress
      setFiles(prev => prev.map(f => 
        f.id === fileWithPreview.id 
          ? { ...f, uploading: true, progress: 20 }
          : f
      ));

      if (encryptionEnabled) {
        // Use encrypted upload
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, progress: 50 }
            : f
        ));

        await encryptedDocService.uploadEncryptedDocument(
          fileWithPreview.file,
          checklistItem.id,
          userId,
          taxYear,
          checklistItem.title,
          activeTaxFilerId
        );

        // Mark as uploaded with encryption
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, progress: 100, uploaded: true, uploading: false, encrypted: true }
            : f
        ));
      } else {
        // Use regular upload (existing logic)
        const fileId = uuidv4();
        const fileExt = fileWithPreview.file.name.split('.').pop();
        const filePath = `${userId}/${checklistItem.id}_${fileId}.${fileExt}`;

        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, progress: 30 }
            : f
        ));

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, fileWithPreview.file);

        if (uploadError) {
          throw new Error(`${t.upload.documents.uploadError}: ${uploadError.message}`);
        }

        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, progress: 90 }
            : f
        ));

        // Store metadata in database
        const { error: dbError } = await supabase
          .from('uploaded_documents')
          .insert({
            user_id: userId,
            checklist_item_id: checklistItem.id,
            file_name: fileWithPreview.file.name,
            file_type: fileWithPreview.file.type,
            file_path: filePath,
            status: 'active',
            metadata: {
              uploadRequestId,
              originalName: fileWithPreview.file.name,
              size: fileWithPreview.file.size,
              uploadTimestamp: new Date().toISOString(),
              encrypted: false
            }
          });

        if (dbError) {
          await supabase.storage.from('documents').remove([filePath]);
          throw new Error(`${t.upload.documents.databaseError}: ${dbError.message}`);
        }

        // Mark as uploaded
        setFiles(prev => prev.map(f => 
          f.id === fileWithPreview.id 
            ? { ...f, progress: 100, uploaded: true, uploading: false, encrypted: false }
            : f
        ));
      }

      return true;
    } catch (err: any) {
      console.error('Upload error:', err);
      setFiles(prev => prev.map(f => 
        f.id === fileWithPreview.id 
          ? { ...f, error: err.message, uploading: false, progress: 0 }
          : f
      ));
      return false;
    }
  };

  // Alle Dateien hochladen
  const handleUploadAll = async () => {
    if (!files.length) {
      setError(t.upload.documents.selectAtLeastOne);
      return;
    }

    const filesToUpload = files.filter(f => !f.uploaded && !f.error);
    if (!filesToUpload.length) {
      setError(t.upload.documents.noFilesToUpload);
      return;
    }

    setUploading(true);
    setError(null);

    let successCount = 0;
    
    // Upload files sequentially to avoid overwhelming the server
    for (const file of filesToUpload) {
      const success = await uploadSingleFile(file);
      if (success) successCount++;
    }

    setUploading(false);

    if (successCount > 0) {
      toast({
        title: t.upload.documents.uploadSuccess,
        description: `${successCount} von ${filesToUpload.length} Dateien ${t.upload.documents.uploadSuccessDesc}`
      });

      // Update parent component
      onDocumentSubmitted();

      // If all files uploaded successfully, go back
      if (successCount === filesToUpload.length) {
        setTimeout(() => {
          onBack();
        }, 800);
      }
    } else {
      setError('Keine Dateien konnten erfolgreich hochgeladen werden.');
    }
  };

  const hasValidFiles = files.some(f => !f.error);
  const hasUploadedFiles = files.some(f => f.uploaded);
  const uploadableFiles = files.filter(f => !f.uploaded && !f.error);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">{t.upload.documents.title}</h2>
        <Button variant="outline" onClick={onBack} disabled={uploading} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
          {uploading ? t.upload.documents.pleaseWait : hasUploadedFiles ? t.upload.documents.finished : t.upload.documents.cancel}
        </Button>
      </div>

      {/* Checklist item info */}
      <div className="mb-6 p-4 rounded-xl bg-white/5 backdrop-blur-[20px] border border-white/20">
        <h3 className="font-medium mb-1 text-white">{checklistItem.title}</h3>
        <p className="text-sm text-white/70">{checklistItem.description}</p>
      </div>

      {/* Encryption toggle with frosted glass effect */}
      <div className="mb-6 p-6 rounded-3xl relative overflow-hidden" 
           style={{
             background: 'rgba(255, 255, 255, 0.05)',
             backdropFilter: 'blur(15px)',
             border: '1px solid rgba(255, 255, 255, 0.1)',
             boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(0, 0, 0, 0.2), 0 2px 8px 0 rgba(0, 0, 0, 0.1)'
           }}>
        {/* Subtle gradient overlay for gloss effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="relative">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="encryption-toggle"
                checked={encryptionEnabled}
                onCheckedChange={setEncryptionEnabled}
                disabled={uploading}
              />
              <Label htmlFor="encryption-toggle" className="flex items-center space-x-2 text-white">
                {encryptionEnabled ? (
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                ) : (
                  <Shield className="h-4 w-4 text-white/60" />
                )}
                <span className="font-medium">
                  {encryptionEnabled ? t.upload.documents.encryptionEnabled : t.upload.documents.standardUpload}
                </span>
              </Label>
            </div>
          </div>
          <p className="text-sm text-white/70 mt-2">
            {encryptionEnabled 
              ? t.upload.documents.encryptionDescription
              : t.upload.documents.standardDescription
            }
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/jpeg,image/png,application/pdf"
        multiple 
      />

      {/* File selection area with frosted glass effect */}
      <div 
        onClick={handleFileSelect}
        className="relative overflow-hidden rounded-3xl p-8 text-center cursor-pointer mb-4 transition-all duration-300 hover:scale-[1.02]"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(0, 0, 0, 0.2), 0 2px 8px 0 rgba(0, 0, 0, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        }}
      >
        {/* Subtle gradient overlay for gloss effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="relative">
          <Upload className="h-10 w-10 mx-auto mb-4 text-white/60" />
          <p className="font-medium mb-2 text-white">
            {files.length > 0 ? t.upload.documents.addMoreFiles : t.upload.documents.selectFiles}
          </p>
          <p className="text-sm text-white/70">
            {t.upload.documents.supportedFormats}
          </p>
        </div>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-3 mb-6">
          {files.map((fileWithPreview) => (
            <div key={fileWithPreview.id} className="rounded-xl p-4 border border-white/20 bg-white/5 backdrop-blur-[20px]">
              {/* File info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {fileWithPreview.file.type.startsWith('image/') ? (
                    <Image className="h-5 w-5 mr-2 text-blue-400" />
                  ) : (
                    <FileText className="h-5 w-5 mr-2 text-orange-400" />
                  )}
                  <span className="font-medium text-white">{fileWithPreview.file.name}</span>
                  <span className="ml-2 text-xs text-white/60">
                    {(fileWithPreview.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {fileWithPreview.encrypted && (
                    <ShieldCheck className="h-4 w-4 ml-2 text-green-400" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {fileWithPreview.uploaded && (
                    <Check className="h-4 w-4 text-green-400" />
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(fileWithPreview.id);
                    }}
                    disabled={fileWithPreview.uploading}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Preview for images */}
              {fileWithPreview.preview && (
                <div className="mb-2">
                  <img 
                    src={fileWithPreview.preview} 
                    alt={t.upload.documents.preview} 
                    className="max-h-32 mx-auto object-contain rounded border border-white/20" 
                  />
                </div>
              )}
              
              {/* Error message */}
              {fileWithPreview.error && (
                <div className="mb-2 p-2 bg-red-500/20 text-red-300 rounded border border-red-500/30 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{fileWithPreview.error}</span>
                </div>
              )}
              
              {/* Upload progress */}
              {fileWithPreview.uploading && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">
                      {encryptionEnabled ? t.upload.documents.encryptionProgress : t.upload.documents.uploadProgress}
                    </span>
                    <span className="text-white/70">{Math.round(fileWithPreview.progress)}%</span>
                  </div>
                  <Progress value={fileWithPreview.progress} className="h-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded border border-red-500/30 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Upload button */}
      {hasValidFiles && (
        <div className="flex justify-end">
          <Button 
            onClick={handleUploadAll} 
            disabled={uploading || uploadableFiles.length === 0}
            className="min-w-32 bg-white/10 border border-white/20 text-white hover:bg-white/20"
          >
            {uploading ? (
              <div className="flex items-center gap-2">
                <span>
                  {encryptionEnabled ? t.upload.documents.encrypting : t.upload.documents.uploading}
                </span>
              </div>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {uploadableFiles.length} Datei{uploadableFiles.length !== 1 ? 'en' : ''} 
                {encryptionEnabled ? ` ${t.upload.documents.encrypted}` : ''} {t.upload.documents.uploadFiles}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
