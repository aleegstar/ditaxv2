
import React, { useState, useEffect } from 'react';
import { FileText, Image, Download, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { EncryptedChatService } from '@/services/EncryptedChatService';

interface ChatAttachmentProps {
  attachmentId: string;
  fileName: string;
  fileType: string;
  originalSize: number;
  userId: string;
  isCurrentUser: boolean;
}

const ChatAttachment: React.FC<ChatAttachmentProps> = ({
  attachmentId,
  fileName,
  fileType,
  originalSize,
  userId,
  isCurrentUser
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const encryptedChatService = EncryptedChatService.getInstance();

  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  // Load image preview for current user's images
  useEffect(() => {
    if (isImage) {
      loadImagePreview();
    }
    
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [attachmentId, isImage, isCurrentUser]);

  const loadImagePreview = async () => {
    try {
      setLoading(true);
      const url = await encryptedChatService.createTemporaryUrl(attachmentId, userId);
      setImageUrl(url);
    } catch (error) {
      console.error('Error loading image preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const { blob, filename } = await encryptedChatService.downloadDecryptedChatAttachment(
        attachmentId,
        userId
      );
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download erfolgreich",
        description: `${filename} wurde heruntergeladen`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download-Fehler",
        description: "Datei konnte nicht heruntergeladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    if (isImage) {
      return <Image className="h-5 w-5" />;
    } else if (isPdf) {
      return <FileText className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isImage && imageUrl) {
    return (
      <div className="relative group max-w-xs">
        <img
          src={imageUrl}
          alt={fileName}
          className="rounded-lg max-w-full h-auto shadow-lg"
          style={{ maxHeight: '300px' }}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={loading}
            className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {fileName} • {formatFileSize(originalSize)}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border max-w-xs cursor-pointer transition-colors ${
        isCurrentUser 
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      }`}
      onClick={handleDownload}
    >
      <div className={`p-2 rounded ${isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'}`}>
        {getFileIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {fileName}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(originalSize)}
        </p>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        disabled={loading}
        className="shrink-0"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default ChatAttachment;
