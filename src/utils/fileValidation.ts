/**
 * Advanced File Validation with Magic Number Verification
 * Prevents polyglot file attacks and content-type spoofing
 * 
 * SECURITY: Path Traversal Protection
 * sanitizeFileName() and validateFilePath() protect against directory traversal attacks
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: string;
}

/**
 * Sanitize file name to prevent path traversal attacks
 * Removes dangerous characters like "..", "/", "\", leading dots
 * 
 * @param fileName - Original file name from user input
 * @returns Safe file name suitable for storage
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name');
  }
  
  return fileName
    .replace(/\.\./g, '')              // Remove ".." path traversal
    .replace(/[\/\\]/g, '_')           // Replace slashes with underscores
    .replace(/^\.+/, '')                // Remove leading dots
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Only allow safe characters
    .substring(0, 255);                 // Limit length to prevent buffer overflow
}

/**
 * Validate file path to prevent path traversal attacks
 * Checks for "..", absolute paths, and excessive length
 * 
 * @param path - File path to validate
 * @returns true if path is safe, false otherwise
 */
export function validateFilePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  const normalizedPath = path.replace(/\\/g, '/');
  
  // Check for path traversal attempts
  if (normalizedPath.includes('..')) {
    return false;
  }
  
  // Check for absolute paths
  if (normalizedPath.startsWith('/')) {
    return false;
  }
  
  // Check for excessive length
  if (normalizedPath.length >= 512) {
    return false;
  }
  
  return true;
}

/**
 * Validate storage path before download/signedUrl operations
 * Prevents path traversal when reading files from Supabase Storage
 * 
 * @param path - Storage path from database
 * @returns true if path is safe for storage operations
 */
export function validateStoragePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  const normalized = path.replace(/\\/g, '/');
  if (normalized.includes('..')) return false;
  if (normalized.startsWith('/')) return false;
  if (normalized.length > 512) return false;
  return true;
}

// Magic number signatures for file type verification
const FILE_SIGNATURES = {
  pdf: {
    signature: [0x25, 0x50, 0x44, 0x46], // %PDF
    mimeTypes: ['application/pdf']
  },
  png: {
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    mimeTypes: ['image/png']
  },
  jpeg: {
    signature: [0xFF, 0xD8, 0xFF],
    mimeTypes: ['image/jpeg', 'image/jpg']
  },
  gif87a: {
    signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    mimeTypes: ['image/gif']
  },
  gif89a: {
    signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    mimeTypes: ['image/gif']
  },
  webp: {
    signature: [0x52, 0x49, 0x46, 0x46], // RIFF (WebP starts with RIFF)
    mimeTypes: ['image/webp']
  },
  zip: {
    signature: [0x50, 0x4B, 0x03, 0x04], // ZIP/DOCX/XLSX
    mimeTypes: ['application/zip', 'application/vnd.openxmlformats-officedocument']
  }
} as const;

/**
 * Verify file type using magic number (file signature)
 * Prevents content-type spoofing and polyglot attacks
 */
export async function verifyFileType(file: File): Promise<FileValidationResult> {
  try {
    // Read first 16 bytes for magic number check
    const headerBuffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);
    
    // Check against known signatures
    let detectedType: string | null = null;
    
    for (const [type, info] of Object.entries(FILE_SIGNATURES)) {
      const matches = info.signature.every((byte, i) => byte === bytes[i]);
      
      if (matches) {
        // Additional check for WebP
        if (type === 'webp') {
          // WebP has "WEBP" at offset 8
          if (!(bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)) {
            continue;
          }
        }
        
        detectedType = type;
        
        // Verify declared type matches actual signature
        const declaredTypeMatches = info.mimeTypes.some(mimeType => 
          file.type.includes(mimeType.split('/')[1]) || 
          mimeType.includes(file.type)
        );
        
        if (!declaredTypeMatches && type !== 'zip') {
          return {
            isValid: false,
            error: `Dateiformat-Inkonsistenz erkannt: Deklariert als ${file.type}, aber tatsächlich ${type}`,
            detectedType: type
          };
        }
        
        break;
      }
    }
    
    if (!detectedType) {
      return {
        isValid: false,
        error: 'Unbekanntes oder nicht unterstütztes Dateiformat'
      };
    }
    
    return {
      isValid: true,
      detectedType
    };
    
  } catch (error) {
    console.error('File type verification error:', error);
    return {
      isValid: false,
      error: 'Fehler bei der Dateitypüberprüfung'
    };
  }
}

/**
 * Comprehensive file validation
 * Combines size, type, and magic number checks
 */
export async function validateFile(file: File, maxSizeBytes: number = 20 * 1024 * 1024): Promise<FileValidationResult> {
  // Size check
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `Datei ist zu groß (max. ${maxSizeBytes / (1024 * 1024)} MB)`
    };
  }
  
  // Minimum size check (prevent empty files)
  if (file.size < 100) {
    return {
      isValid: false,
      error: 'Datei ist zu klein oder leer'
    };
  }
  
  // Allowed MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Ungültiger Dateityp. Erlaubt sind: PDF, JPEG, PNG, GIF, WebP'
    };
  }
  
  // Magic number verification
  const magicNumberCheck = await verifyFileType(file);
  if (!magicNumberCheck.isValid) {
    return magicNumberCheck;
  }
  
  return {
    isValid: true,
    detectedType: magicNumberCheck.detectedType
  };
}

/**
 * Strip EXIF metadata from images
 * Prevents GPS and device information leakage
 */
export async function stripImageMetadata(imageFile: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // Draw image to canvas (this strips EXIF data)
      ctx.drawImage(img, 0, 0);
      
      // Convert back to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, imageFile.type);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
}
