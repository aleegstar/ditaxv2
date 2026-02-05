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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei zu gross (max. 10MB)');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const fileExt = file.name.split('.').pop();
      // SECURITY: Sanitize file extension to prevent path traversal
      const safeExt = sanitizeFileName(fileExt || 'file');
      const fileName = `${user.id}/${request.id}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('missing-items')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadedFile({
        name: file.name,
        path: fileName,
        size: file.size,
      });

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
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100 ring-1 ring-red-500/10">
          Bitte erneut einreichen
        </span>
      );
    }
    if (hasResponse) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-100 ring-1 ring-green-500/10">
          Bereit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-100 ring-1 ring-orange-500/10">
        Ausstehend
      </span>
    );
  };

  return (
    <div className="group bg-white rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300 overflow-hidden">
      {/* Task Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/30">
        <div className="flex items-center gap-3">
          {isDocumentRequest ? (
            <FileText className="h-5 w-5 text-orange-500 flex-shrink-0" />
          ) : (
            <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
          <div>
            <span className="text-base font-medium text-slate-900">
              {request.title}
            </span>
            {request.description && (
              <p className="text-sm text-slate-500 mt-0.5">{request.description}</p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Input & Action */}
      <div className="p-5 bg-white">
        {/* Response Display */}
        {hasResponse && existingResponse && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                {existingResponse.response_type === 'file' ? (
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-700">
                      {existingResponse.file_name || uploadedFile?.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-700 line-clamp-2">
                    {existingResponse.text_content}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveResponse}
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Area - Show based on request type */}
        {!hasResponse && (
          <>
            {/* Document Request: File Upload Only */}
            {isDocumentRequest && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      <span className="text-sm text-slate-600">Wird hochgeladen...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-slate-400" />
                      <span className="text-sm text-slate-600">Datei hochladen</span>
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

            {/* Information Request: Text Input Only */}
            {!isDocumentRequest && (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    className="w-full min-h-[120px] p-4 text-base text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y shadow-sm"
                    placeholder="Ihre Antwort eingeben..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 mr-2 stroke-[2]" />
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
