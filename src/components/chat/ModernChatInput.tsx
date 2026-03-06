
import React, { useState, useRef, useCallback } from 'react';
import { ArrowUp, Plus, X, FileText, Image } from 'lucide-react';
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
    <div className="px-4 pb-4 pt-2 space-y-2">
      {/* File Preview */}
      {selectedFile && (
        <div className="rounded-xl p-3 bg-muted/60 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {getFileIcon(selectedFile)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Lovable-style Input */}
      <form onSubmit={handleSubmit} className="w-full">
        <div
          className="rounded-2xl transition-all duration-200"
          style={{
            background: 'hsl(40 30% 96%)',
            border: '1px solid hsl(40 20% 90%)',
          }}
        >
          {/* Textarea */}
          <div className="px-4 pt-3 pb-1">
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
              className="flex w-full bg-transparent text-[15px] text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[24px] resize-none leading-relaxed"
              style={{ color: 'hsl(30 10% 25%)' }}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
              }}
              style-={{}}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
            {/* Left: + button */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleFileClick}
                disabled={disabled || uploading}
                className="flex items-center justify-center h-7 w-7 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  border: '1.5px solid hsl(30 10% 78%)',
                  color: 'hsl(30 10% 45%)',
                }}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            {/* Right: send button */}
            <div className="flex items-center">
              <button
                type="submit"
                disabled={(!message.trim() && !selectedFile) || disabled || uploading}
                className="flex items-center justify-center h-7 w-7 rounded-full transition-all duration-200 active:scale-95"
                style={{
                  background: (message.trim() || selectedFile) && !disabled && !uploading
                    ? 'hsl(30 5% 25%)'
                    : 'hsl(30 8% 82%)',
                  color: (message.trim() || selectedFile) && !disabled && !uploading
                    ? 'hsl(0 0% 100%)'
                    : 'hsl(30 5% 55%)',
                  cursor: (!message.trim() && !selectedFile) || disabled || uploading
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {uploading && (
          <div className="text-center mt-2">
            <span className="text-xs text-muted-foreground animate-pulse">Nachricht wird gesendet...</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ModernChatInput;
