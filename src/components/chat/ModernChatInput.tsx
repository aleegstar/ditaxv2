
import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X, FileText, Image } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { EncryptedChatService } from '@/services/EncryptedChatService';
import { debug } from '@/utils/debug';

interface ModernChatInputProps {
  onSendMessage: (content: string, file?: File) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  userId: string;
}

const ModernChatInput: React.FC<ModernChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Schreiben Sie eine Nachricht...",
  userId
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const encryptedChatService = EncryptedChatService.getInstance();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !selectedFile) || disabled || uploading) return;

    try {
      setUploading(true);
      await onSendMessage(message, selectedFile || undefined);
      
      // Reset form
      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      debug.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [message, selectedFile, disabled, uploading, onSendMessage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!encryptedChatService.isSupportedFileType(file)) {
      toast({
        title: "Dateityp nicht unterstützt",
        description: "Nur Bilder (JPEG, PNG, GIF, WebP) und PDFs sind erlaubt.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Datei zu groß",
        description: "Die Datei darf maximal 10MB groß sein.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="p-4 space-y-3">
      {/* File Preview */}
      {selectedFile && (
        <div className="rounded-lg p-3 bg-muted border border-border">
          <div className="flex items-center gap-3">
            {getFileIcon(selectedFile)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-2 transition-all duration-300 hover:border-gray-300 focus-within:border-gray-400">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf"
            className="hidden"
          />
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || uploading}
            className="flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            style={{
              height: 'auto',
              maxHeight: '240px'
            }}
            onInput={(e) => {
              const textarea = e.target as HTMLTextAreaElement;
              textarea.style.height = 'auto';
              textarea.style.height = Math.min(textarea.scrollHeight, 240) + 'px';
            }}
          />
          
          <div className="flex items-center justify-between gap-2 p-0 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={handleFileClick}
              disabled={disabled || uploading}
              className="flex h-8 w-8 text-gray-500 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Button
              type="submit" 
              size="sm"
              disabled={(!message.trim() && !selectedFile) || disabled || uploading}
              className={`h-8 w-8 rounded-full transition-all duration-200 ${
                (message.trim() || selectedFile) && !disabled && !uploading
                  ? 'bg-gray-900 hover:bg-gray-800 text-white'
                  : 'bg-transparent hover:bg-gray-200 text-gray-400 hover:text-gray-600'
              }`}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {uploading && (
          <div className="text-center mt-2">
            <span className="text-xs text-muted-foreground">Nachricht wird gesendet...</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ModernChatInput;
