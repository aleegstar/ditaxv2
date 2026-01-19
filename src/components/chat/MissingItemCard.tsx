import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  MessageSquare, 
  Check, 
  X,
  Loader2,
  File,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [mode, setMode] = useState<'idle' | 'text' | 'file'>('idle');
  const [textContent, setTextContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; path: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasResponse = localResponse || request.responses?.length > 0;
  const existingResponse = localResponse || request.responses?.[0];

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
      const fileName = `${user.id}/${request.id}/${Date.now()}.${fileExt}`;

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

      setMode('idle');
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

    setMode('idle');
  };

  const handleRemoveResponse = () => {
    onResponseAdded(request.id, {});
    setUploadedFile(null);
    setTextContent('');
  };

  const getStatusBadge = () => {
    if (request.status === 'rejected') {
      return <Badge variant="destructive">Abgelehnt - Bitte erneut einreichen</Badge>;
    }
    if (hasResponse) {
      return <Badge className="bg-green-100 text-green-800">Bereit zum Einreichen</Badge>;
    }
    return <Badge variant="outline" className="text-orange-600 border-orange-300">Ausstehend</Badge>;
  };

  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-all ${
      request.status === 'rejected' 
        ? 'border-red-300 bg-red-50' 
        : hasResponse 
          ? 'border-green-300 bg-green-50' 
          : 'border-orange-200 bg-orange-50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {request.request_type === 'document' ? (
            <FileText className="h-5 w-5 text-orange-500 flex-shrink-0" />
          ) : (
            <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
          <div>
            <h4 className="font-medium text-slate-800">{request.title}</h4>
            {request.description && (
              <p className="text-sm text-slate-600 mt-0.5">{request.description}</p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Response Display */}
      {hasResponse && existingResponse && (
        <div className="bg-white rounded-lg p-3 border border-slate-200">
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
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!hasResponse && mode === 'idle' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Datei hochladen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode('text')}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Text eingeben
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

      {/* Upload in progress */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-slate-600">Wird hochgeladen...</span>
        </div>
      )}

      {/* Text Input Mode */}
      {mode === 'text' && (
        <div className="space-y-2">
          <Textarea
            placeholder="Ihre Antwort eingeben..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode('idle');
                setTextContent('');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={handleTextSubmit}
              disabled={!textContent.trim()}
            >
              <Check className="h-4 w-4 mr-1" />
              Speichern
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
