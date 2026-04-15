import React, { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';

// Global image cache to prevent re-fetching
const imageCache = new Map<string, string>();

export const DocumentThumbnail = memo<{ doc: any }>(({ doc }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(() => imageCache.get(doc.id) || null);
  const [loading, setLoading] = useState(!imageCache.has(doc.id));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (imageCache.has(doc.id)) {
      setImageUrl(imageCache.get(doc.id)!);
      setLoading(false);
      return;
    }
    let isMounted = true;
    const loadImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        const metadata = doc.metadata as any;

        if (metadata?.encrypted) {
          const encryptedService = EncryptedDocumentService.getInstance();
          const { blob } = await encryptedService.downloadOwnDecryptedDocument(doc.id, user.id);
          if (!isMounted) return;
          const objectUrl = URL.createObjectURL(blob);
          imageCache.set(doc.id, objectUrl);
          setImageUrl(objectUrl);
        } else {
          const { data, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.file_path, 3600);
          if (urlError) {
            setError(true);
          } else if (data?.signedUrl && isMounted) {
            imageCache.set(doc.id, data.signedUrl);
            setImageUrl(data.signedUrl);
          }
        }
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadImage();
    return () => { isMounted = false; };
  }, [doc.id, doc.file_path, doc.metadata]);

  if (loading) {
    return <div className="w-full h-full bg-zinc-100 animate-pulse" />;
  }

  const fileExt = doc.file_name?.split('.').pop()?.toUpperCase() || 'FILE';

  if (error || !imageUrl) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-violet-400/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-tr from-orange-400/15 to-pink-400/15 rounded-full blur-2xl" />
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 flex items-center justify-center">
          <span className="px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-bold text-blue-600 shadow-sm">
            {fileExt}
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={doc.file_name}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setError(true)}
    />
  );
});

DocumentThumbnail.displayName = 'DocumentThumbnail';
