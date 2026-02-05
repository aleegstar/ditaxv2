
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, UserRound } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { debug } from '@/utils/debug';
import { useI18n } from '@/contexts/I18nContext';
import { sanitizeFileName } from '@/utils/fileValidation';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (avatarUrl: string) => void;
  loading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

const AvatarUpload = ({ currentAvatarUrl, onAvatarUpdate, loading = false, onLoadingChange }: AvatarUploadProps) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl || null);
  const { t } = useI18n();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.upload.avatar.fileTooLarge, {
        description: t.upload.avatar.fileTooLargeDesc
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t.upload.avatar.invalidFileType, {
        description: t.upload.avatar.invalidFileTypeDesc
      });
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!avatarFile) {
      toast.error(t.upload.avatar.noFileSelected);
      return;
    }

    try {
      onLoadingChange?.(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(t.upload.avatar.userNotLoggedIn);
      }

      const fileExt = avatarFile.name.split('.').pop();
      // SECURITY: Sanitize file extension to prevent path traversal
      const safeExt = sanitizeFileName(fileExt || 'jpg');
      const fileName = `${user.id}/${Date.now()}.${safeExt}`;

      debug.log('Uploading avatar to public bucket:', fileName);

      // Upload to public bucket
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { 
          cacheControl: '3600', 
          upsert: true 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`${t.upload.documents.uploadError}: ${uploadError.message}`);
      }

      debug.log('Upload successful:', data);

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;
      debug.log('Public avatar URL:', avatarUrl);
      
      onAvatarUpdate(avatarUrl);
      setAvatarFile(null);
      
      toast.success(t.upload.avatar.uploadSuccess, {
        description: t.upload.avatar.uploadSuccessDesc
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(t.upload.avatar.uploadFailed, {
        description: error.message || "Unbekannter Fehler beim Hochladen des Avatars."
      });
    } finally {
      onLoadingChange?.(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="relative">
          <Avatar className="w-32 h-32">
            <AvatarImage 
              src={avatarPreview || currentAvatarUrl || "/lovable-uploads/default-avatar.png"} 
              alt={t.upload.avatar.profileImage}
              className="object-cover"
            />
            <AvatarFallback>
              <UserRound className="h-16 w-16" />
            </AvatarFallback>
          </Avatar>
          
          <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-[#5298e4] text-white p-2 rounded-full cursor-pointer hover:bg-[#4188d4] transition-colors">
            <Upload size={16} />
            <input 
              type="file" 
              id="avatar-upload" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange}
              disabled={loading}
            />
          </label>
        </div>
      </div>
      
      {avatarFile && (
        <div className="text-center space-y-2">
          <div className="text-sm text-gray-600">
            {t.upload.avatar.newFileSelected}: {avatarFile.name}
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={loading}
            className="bg-[#5298e4] hover:bg-[#4188d4]"
          >
            {loading ? t.upload.avatar.uploading : t.upload.avatar.uploadButton}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;
