import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => Promise<void>;
  taxYear: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  open,
  onClose,
  onCapture,
  taxYear
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !stream) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer rear camera on mobile
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Kamera-Fehler",
        description: "Kamera konnte nicht geöffnet werden. Bitte überprüfen Sie die Berechtigungen.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image data URL
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataURL);
    setIsCapturing(true);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsCapturing(false);
  };

  const savePhoto = async () => {
    if (!capturedImage || !canvasRef.current) return;

    setIsUploading(true);
    try {
      // Convert canvas to blob
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileName = `camera-capture-${Date.now()}.jpg`;
        const filePath = `documents/${user.id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        // Save to database
        const { error: dbError } = await supabase
          .from('uploaded_documents')
          .insert({
            user_id: user.id,
            file_name: fileName,
            file_type: 'image/jpeg',
            file_path: filePath,
            tax_year: taxYear,
            status: 'active',
            is_assigned_to_checklist: false,
            document_category: 'camera_capture'
          });

        if (dbError) throw dbError;

        toast({
          title: "Erfolg",
          description: "Foto erfolgreich gespeichert",
        });

        // Call the onCapture callback
        await onCapture(blob);
        onClose();
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Speichern des Fotos",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setIsCapturing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Dokument fotografieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-64 object-cover ${isCapturing ? 'hidden' : 'block'}`}
            />
            
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-64 object-cover"
              />
            )}

            {/* Overlay for capturing state */}
            {!stream && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Kamera wird geladen...</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {!isCapturing ? (
              <>
                <Button
                  onClick={capturePhoto}
                  disabled={!stream}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Foto aufnehmen
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  <X className="h-5 w-5 mr-2" />
                  Abbrechen
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={savePhoto}
                  disabled={isUploading}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-5 w-5 mr-2" />
                  {isUploading ? 'Speichern...' : 'Speichern'}
                </Button>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Erneut aufnehmen
                </Button>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="text-sm text-gray-400 text-center space-y-1">
            <p>💡 Tipps für beste Ergebnisse:</p>
            <p>• Sorgen Sie für gute Beleuchtung</p>
            <p>• Halten Sie das Dokument gerade</p>
            <p>• Vermeiden Sie Schatten auf dem Dokument</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;