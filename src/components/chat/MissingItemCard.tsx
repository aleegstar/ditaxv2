import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Upload, 
  MessageSquare, 
  Check, 
  Loader2,
  File,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeFileName } from '@/utils/fileValidation';
import { toast } from 'sonner';
import type { MissingItemRequest, MissingItemResponse } from '@/hooks/useMissingItemRequests';

interface MissingItemCardProps {
  request: MissingItemRequest;
  onResponseAdded: (requestId: string, response: Partial<MissingItemResponse>) => void;
  localResponse?: Partial<MissingItemResponse>;
}

export const MissingItemCard: React.FC<MissingItemCardProps> = ({
  request,
  onResponseAdded,
  localResponse,
}) => {
  const [textContent, setTextContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; path: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasResponse = localResponse || request.responses?.length > 0;
  const existingResponse = localResponse || request.responses?.[0];
  const isDocumentRequest = request.request_type === 'document';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei zu gross (max. 10MB)');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const fileExt = file.name.split('.').pop();
      const safeExt = sanitizeFileName(fileExt || 'file');
      const fileName = `${user.id}/${request.id}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('missing-items')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadedFile({ name: file.name, path: fileName, size: file.size });

      onResponseAdded(request.id, {
        response_type: 'file',
        file_path: fileName,
        file_name: file.name,
        file_size: file.size,
      });

      toast.success('Datei hochgeladen');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) return;
    onResponseAdded(request.id, {
      response_type: 'text',
      text_content: textContent.trim(),
    });
  };

  const handleRemoveResponse = () => {
    onResponseAdded(request.id, {});
    setUploadedFile(null);
    setTextContent('');
  };

  const getStatusBadge = () => {
    if (request.status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
          Erneut einreichen
        </span>
      );
    }
    if (hasResponse) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20">
          Bereit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50">
        Ausstehend
      </span>
    );
  };

  return (
    <div className="rounded-[1.25rem] border border-border/40 bg-background overflow-hidden transition-all">
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center justify-between border-b border-border/30 bg-muted/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            {isDocumentRequest ? (
              <FileText className="h-4 w-4 text-muted-foreground stroke-[1.8]" />
            ) : (
              <MessageSquare className="h-4 w-4 text-muted-foreground stroke-[1.8]" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-foreground block truncate">
              {request.title}
            </span>
            {request.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{request.description}</p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Response Display */}
        {hasResponse && existingResponse && (
          <div className="bg-[hsl(var(--success))]/5 rounded-xl p-3.5 border border-[hsl(var(--success))]/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="h-4 w-4 text-[hsl(var(--success))] flex-shrink-0 stroke-[2]" />
                {existingResponse.response_type === 'file' ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">
                      {existingResponse.file_name || uploadedFile?.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-foreground line-clamp-2">
                    {existingResponse.text_content}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveResponse}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Area */}
        {!hasResponse && (
          <>
            {isDocumentRequest && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 rounded-xl transition-all"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Wird hochgeladen...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="h-5 w-5 text-muted-foreground stroke-[1.8]" />
                      <span className="text-xs text-muted-foreground">Datei hochladen</span>
                    </div>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
            )}

            {!isDocumentRequest && (
              <div className="space-y-3">
                <textarea
                  className="w-full min-h-[100px] p-3.5 text-sm text-foreground placeholder:text-muted-foreground bg-muted/30 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/40 transition-all resize-y"
                  placeholder="Ihre Antwort eingeben..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim()}
                    className="rounded-full px-5 py-2 text-sm font-semibold bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-primary-foreground shadow-sm shadow-primary/15 hover:scale-[1.02] hover:brightness-[1.04] transition-all disabled:opacity-50"
                  >
                    Speichern
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
