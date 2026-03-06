
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-muted-foreground hover:text-foreground h-7 w-7 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Lovable-style Input */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="rounded-2xl border border-border/60 bg-muted/40 backdrop-blur-sm transition-all duration-200 focus-within:border-border focus-within:bg-muted/60 hover:border-border/80">
          {/* Textarea */}
          <div className="px-4 pt-3 pb-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              disabled={disabled || uploading}
              className="flex w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[24px] resize-none leading-relaxed"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              style={{ height: 'auto', maxHeight: '200px' }}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
              }}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            {/* Left: + button and attachment */}
            <div className="flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFileClick}
                disabled={disabled || uploading}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </Button>
            </div>

            {/* Right: send button */}
            <div className="flex items-center gap-1">
              <Button
                type="submit"
                size="sm"
                disabled={(!message.trim() && !selectedFile) || disabled || uploading}
                className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
                  (message.trim() || selectedFile) && !disabled && !uploading
                    ? 'bg-foreground hover:bg-foreground/90 text-background shadow-sm'
                    : 'bg-muted-foreground/20 text-muted-foreground/40 cursor-not-allowed'
                }`}
              >
                <Send className="h-4 w-4" />
              </Button>
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
