import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string;
  initialQuality?: number;
}

/**
 * Komprimiert ein Bild automatisch für optimale Speichernutzung
 * - Max Größe: 1 MB
 * - Max Breite/Höhe: 1920px
 * - Format: WebP für beste Kompression
 * - Qualität: 80% (optimaler Balance zwischen Qualität und Größe)
 */
export async function compressImage(file: File): Promise<File> {
  // Prüfe ob es ein Bild ist
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    // Temporär WebP deaktiviert für bessere Kompatibilität
    // fileType: 'image/webp',
    initialQuality: 0.8
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    const originalSizeKB = (file.size / 1024).toFixed(2);
    const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
    const savingsPercent = Math.round((1 - compressedFile.size / file.size) * 100);
    
    console.log(`📦 Bild komprimiert: ${originalSizeKB} KB → ${compressedSizeKB} KB (${savingsPercent}% Einsparung)`);
    
    return compressedFile;
  } catch (error) {
    console.error('Komprimierung fehlgeschlagen:', error);
    // Fallback auf Original bei Fehler
    return file;
  }
}

/**
 * Gibt Komprimierungs-Info für UI-Feedback zurück
 */
export function getCompressionStats(originalSize: number, compressedSize: number) {
  const originalSizeKB = (originalSize / 1024).toFixed(2);
  const compressedSizeKB = (compressedSize / 1024).toFixed(2);
  const savingsPercent = Math.round((1 - compressedSize / originalSize) * 100);
  
  return {
    originalSizeKB,
    compressedSizeKB,
    savingsPercent,
    message: `Bild komprimiert: ${originalSizeKB} KB → ${compressedSizeKB} KB (${savingsPercent}% Einsparung)`
  };
}
