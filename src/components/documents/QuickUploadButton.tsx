import React, { useRef, useState } from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { useI18n } from '@/contexts/I18nContext';

interface QuickUploadButtonProps {
  itemId: string;
  itemTitle: string;
  userId: string;
  taxYear: string;
  taxFilerId: string | null;
  onUploadComplete: () => void;
  onUploadStart?: () => void;
}

const QuickUploadButton: React.FC<QuickUploadButtonProps> = ({
  itemId,
  itemTitle,
  userId,
  taxYear,
  taxFilerId,
  onUploadComplete,
  onUploadStart
}) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset input so same file can be selected again
    event.target.value = '';
    
    setIsUploading(true);
    onUploadStart?.();
    
    // Show upload toast
    toast({
      title: "Upload läuft...",
      description: file.name,
    });
    
    try {
      const encryptedDocService = EncryptedDocumentService.getInstance();
      
      await encryptedDocService.uploadEncryptedDocument(
        file,
        itemId,
        userId,
        taxYear,
        itemTitle,
        taxFilerId
      );
      
      // Success toast
      toast({
        title: "Hochgeladen",
        description: `${itemTitle} wurde erfolgreich hochgeladen`,
      });
      
      // Wait a bit for DB propagation then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      onUploadComplete();
      
    } catch (error: any) {
      console.error('Quick upload error:', error);
      toast({
        title: "Fehler beim Hochladen",
        description: error.message || "Das Dokument konnte nicht hochgeladen werden",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="flex items-center justify-center gap-2 bg-gradient-to-b from-blue-500 to-blue-600 text-white font-medium h-9 px-4 rounded-lg transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] text-sm shadow-sm shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
        ) : (
          <CloudUpload className="w-4 h-4" strokeWidth={1.5} />
        )}
        {isUploading ? "Wird hochgeladen..." : t.documentChecklist.upload}
      </button>
    </>
  );
};

export default QuickUploadButton;
