import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, UserRound, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeFileName } from '@/utils/fileValidation';

interface ProfileAvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (avatarUrl: string) => void;
  loading?: boolean;
  renderTrigger?: (onClick: () => void) => React.ReactNode;
}

export const ProfileAvatarUpload = ({ 
  currentAvatarUrl, 
  onAvatarUpdate, 
  loading = false,
  renderTrigger 
}: ProfileAvatarUploadProps) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Datei zu groß", {
        description: "Avatar-Dateien dürfen maximal 5MB groß sein."
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Ungültiger Dateityp", {
        description: "Bitte wählen Sie eine Bilddatei aus."
      });
      return;
    }

    // If renderTrigger is used, upload immediately
    if (renderTrigger) {
      setUploading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('Benutzer nicht angemeldet');
        }

        const fileExt = file.name.split('.').pop();
        // SECURITY: Sanitize file extension to prevent path traversal
        const safeExt = sanitizeFileName(fileExt || 'jpg');
        const fileName = `${user.id}/avatar-${Date.now()}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { 
            cacheControl: '3600', 
            upsert: true 
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        const avatarUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;
        
        onAvatarUpdate(avatarUrl);
        toast.success("Profilbild aktualisiert");
      } catch (error: any) {
        console.error('Error uploading avatar:', error);
        toast.error("Upload fehlgeschlagen", {
          description: error.message
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!avatarFile) {
      toast.error("Keine Datei ausgewählt");
      return;
    }

    try {
      setUploading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error(`Authentifizierungsfehler: ${userError.message}`);
      }
      
      if (!user) {
        throw new Error('Benutzer nicht angemeldet');
      }

      const fileExt = avatarFile.name.split('.').pop();
      // SECURITY: Sanitize file extension to prevent path traversal
      const safeExt = sanitizeFileName(fileExt || 'jpg');
      const fileName = `${user.id}/avatar.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { 
          cacheControl: '3600', 
          upsert: true 
        });

      if (uploadError) {
        throw new Error(`Upload-Fehler: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Fehler beim Aktualisieren des Profils: ${updateError.message}`);
      }
      
      onAvatarUpdate(avatarUrl);
      setAvatarFile(null);
      
      toast.success("Avatar erfolgreich hochgeladen");
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error("Avatar-Upload fehlgeschlagen", {
        description: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  // If renderTrigger is provided, just render the hidden input and trigger
  if (renderTrigger) {
    return (
      <>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          accept="image/*"
          className="hidden"
          disabled={uploading || loading}
        />
        {uploading ? (
          <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#1D64FF] text-white flex items-center justify-center border-[3px] border-[#020408] shadow-lg z-10">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          renderTrigger(handleClick)
        )}
      </>
    );
  }

  // Default render (legacy behavior)
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="relative">
          <Avatar className="w-32 h-32 border-2 border-white/20">
            <AvatarImage 
              src={avatarPreview || currentAvatarUrl || "/lovable-uploads/default-avatar.png"} 
              alt="Profilbild"
              className="object-cover"
            />
            <AvatarFallback className="bg-white/10 text-white">
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
              disabled={loading || uploading}
            />
          </label>
        </div>
      </div>
      
      {avatarFile && (
        <div className="text-center space-y-2">
          <div className="text-sm text-white/70">
            Neue Datei ausgewählt: {avatarFile.name}
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={loading || uploading}
            className="bg-[#5298e4] hover:bg-[#4188d4] text-white"
          >
            {uploading ? "Wird hochgeladen..." : "Avatar hochladen"}
          </Button>
        </div>
      )}
    </div>
  );
};
