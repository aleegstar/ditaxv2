
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, UserRound } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileAvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (avatarUrl: string) => void;
  loading?: boolean;
}

export const ProfileAvatarUpload = ({ currentAvatarUrl, onAvatarUpdate, loading = false }: ProfileAvatarUploadProps) => {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!avatarFile) {
      toast.error("Keine Datei ausgewählt");
      return;
    }

    try {
      setUploading(true);
      
      // Get current user with better error handling
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw new Error(`Authentifizierungsfehler: ${userError.message}`);
      }
      
      if (!user) {
        console.error('No user session found');
        throw new Error('Benutzer nicht angemeldet - bitte melden Sie sich erneut an');
      }

      console.log('User authenticated:', user.id);

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      console.log('Uploading avatar to avatars bucket:', fileName);

      // Upload to avatars bucket
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { 
          cacheControl: '3600', 
          upsert: true 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload-Fehler: ${uploadError.message}`);
      }

      console.log('Upload successful:', data);

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;
      console.log('Public avatar URL:', avatarUrl);

      // Update profile with avatar URL - with better error handling
      console.log('Updating profile for user:', user.id);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        
        // Check if it's an RLS policy error
        if (updateError.message.includes('row-level security') || updateError.message.includes('policy')) {
          throw new Error('Berechtigung fehlt - RLS-Policy-Fehler. Bitte kontaktieren Sie den Administrator.');
        }
        
        throw new Error(`Fehler beim Aktualisieren des Profils: ${updateError.message}`);
      }
      
      console.log('Profile updated successfully');
      
      onAvatarUpdate(avatarUrl);
      setAvatarFile(null);
      
      toast.success("Avatar erfolgreich hochgeladen", {
        description: "Ihr Avatar wurde aktualisiert."
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error("Avatar-Upload fehlgeschlagen", {
        description: error.message || "Unbekannter Fehler beim Hochladen des Avatars."
      });
    } finally {
      setUploading(false);
    }
  };

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
