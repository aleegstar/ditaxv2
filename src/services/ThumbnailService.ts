// Service for generating and caching document thumbnails
import EncryptedDocumentService from './EncryptedDocumentService';

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface ThumbnailCache {
  [documentId: string]: string;
}

const THUMBNAIL_CACHE_KEY = 'document_thumbnails_v1';
const THUMBNAIL_SIZE = 200; // Max dimension in pixels

export class ThumbnailService {
  private static instance: ThumbnailService;
  private encryptedDocService: EncryptedDocumentService;

  private constructor() {
    this.encryptedDocService = EncryptedDocumentService.getInstance();
  }

  public static getInstance(): ThumbnailService {
    if (!ThumbnailService.instance) {
      ThumbnailService.instance = new ThumbnailService();
    }
    return ThumbnailService.instance;
  }

  // Get cached thumbnail from localStorage
  getCachedThumbnail(documentId: string): string | null {
    try {
      const cache: ThumbnailCache = JSON.parse(
        localStorage.getItem(THUMBNAIL_CACHE_KEY) || '{}'
      );
      return cache[documentId] || null;
    } catch {
      return null;
    }
  }

  // Save thumbnail to localStorage cache
  setCachedThumbnail(documentId: string, thumbnail: string): void {
    try {
      const cache: ThumbnailCache = JSON.parse(
        localStorage.getItem(THUMBNAIL_CACHE_KEY) || '{}'
      );
      cache[documentId] = thumbnail;
      localStorage.setItem(THUMBNAIL_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache thumbnail:', error);
    }
  }

  // Clear all cached thumbnails
  clearCache(): void {
    try {
      localStorage.removeItem(THUMBNAIL_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear thumbnail cache:', error);
    }
  }

  // Generate thumbnail for PDF (first page) - accepts URL or ArrayBuffer
  async generatePdfThumbnail(pdfSource: string | ArrayBuffer): Promise<string> {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js not loaded');
    }

    try {
      console.log('🔍 Loading PDF for thumbnail, type:', typeof pdfSource);
      const loadingTask = window.pdfjsLib.getDocument(pdfSource);
      const pdf = await loadingTask.promise;
      console.log('✅ PDF loaded, pages:', pdf.numPages);
      
      const page = await pdf.getPage(1);
      console.log('✅ Got first page');
      
      // Use smaller scale for thumbnail
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Fill with white background first
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      console.log('✅ PDF page rendered to canvas');

      // Convert to PNG (more reliable than JPEG)
      const dataUrl = canvas.toDataURL('image/png');
      
      // Verify we got valid data
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
        throw new Error('Generated invalid thumbnail data');
      }
      
      console.log('✅ PDF thumbnail generated successfully');
      return dataUrl;
    } catch (error) {
      console.error('❌ PDF thumbnail generation failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Generate thumbnail for encrypted image
  async generateEncryptedImageThumbnail(
    documentId: string,
    userId: string
  ): Promise<string> {
    console.log(`🔐 Generating thumbnail for encrypted image: ${documentId}`);
    
    try {
      // Download and decrypt the document
      const { blob } = await this.encryptedDocService.downloadOwnDecryptedDocument(documentId, userId);
      
      // Create temporary blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      try {
        // Generate thumbnail from decrypted blob
        const thumbnail = await this.generateImageThumbnail(blobUrl);
        console.log(`✅ Generated encrypted image thumbnail for: ${documentId}`);
        return thumbnail;
      } finally {
        // Always clean up blob URL
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error(`❌ Failed to generate encrypted image thumbnail for ${documentId}:`, error);
      throw error;
    }
  }

  // Generate thumbnail for encrypted PDF
  async generateEncryptedPdfThumbnail(
    documentId: string,
    userId: string
  ): Promise<string> {
    console.log(`🔐 Generating thumbnail for encrypted PDF: ${documentId}`);
    
    try {
      // Download and decrypt the PDF
      const { blob } = await this.encryptedDocService.downloadOwnDecryptedDocument(documentId, userId);
      console.log(`📦 Decrypted PDF blob size: ${blob.size} bytes`);
      
      // Convert blob to ArrayBuffer for PDF.js
      const arrayBuffer = await blob.arrayBuffer();
      console.log(`📦 ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      
      // Generate thumbnail from decrypted PDF ArrayBuffer
      const thumbnail = await this.generatePdfThumbnail(arrayBuffer);
      console.log(`✅ Generated encrypted PDF thumbnail for: ${documentId}`);
      return thumbnail;
    } catch (error) {
      console.error(`❌ Failed to generate encrypted PDF thumbnail for ${documentId}:`, error);
      throw error;
    }
  }

  // Generate thumbnail for image
  async generateImageThumbnail(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Check if image loaded correctly
          if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
            reject(new Error('Image did not load correctly'));
            return;
          }

          // Calculate dimensions maintaining aspect ratio
          let width = img.naturalWidth;
          let height = img.naturalHeight;
          const scale = Math.min(THUMBNAIL_SIZE / width, THUMBNAIL_SIZE / height);
          
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);

          canvas.width = width;
          canvas.height = height;
          
          // Fill with white background first (prevents black thumbnails)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to PNG (lossless, more reliable than JPEG for thumbnails)
          const dataUrl = canvas.toDataURL('image/png');
          
          // Verify we got actual image data
          if (dataUrl === 'data:,' || dataUrl.length < 100) {
            reject(new Error('Generated thumbnail is invalid'));
            return;
          }
          
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = (e) => {
        clearTimeout(timeout);
        console.error('Image load error:', e);
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  }

  // Main method to generate thumbnail for any document
  async generateThumbnail(
    documentId: string,
    fileUrl: string,
    fileType: string,
    isEncrypted?: boolean,
    userId?: string
  ): Promise<string> {
    // Check cache first
    const cached = this.getCachedThumbnail(documentId);
    if (cached) {
      return cached;
    }

    let thumbnail: string;

    // Handle encrypted documents
    if (isEncrypted && userId) {
      if (fileType.startsWith('image/')) {
        thumbnail = await this.generateEncryptedImageThumbnail(documentId, userId);
      } else if (fileType === 'application/pdf') {
        thumbnail = await this.generateEncryptedPdfThumbnail(documentId, userId);
      } else {
        throw new Error(`Unsupported encrypted file type: ${fileType}`);
      }
    } else {
      // Handle non-encrypted documents
      if (fileType === 'application/pdf') {
        thumbnail = await this.generatePdfThumbnail(fileUrl);
      } else if (fileType.startsWith('image/')) {
        thumbnail = await this.generateImageThumbnail(fileUrl);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
    }

    // Cache the result
    this.setCachedThumbnail(documentId, thumbnail);
    
    return thumbnail;
  }

  // Batch generate thumbnails with parallel processing
  async generateThumbnailsBatch(
    documents: Array<{ 
      id: string; 
      fileUrl: string; 
      fileType: string;
      isEncrypted?: boolean;
      userId?: string;
    }>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Use smaller batch size for encrypted documents (more intensive)
    const hasEncrypted = documents.some(doc => doc.isEncrypted);
    const batchSize = hasEncrypted ? 3 : 5;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      const promises = batch.map(async (doc) => {
        try {
          const thumbnail = await this.generateThumbnail(
            doc.id,
            doc.fileUrl,
            doc.fileType,
            doc.isEncrypted,
            doc.userId
          );
          return { id: doc.id, thumbnail };
        } catch (error) {
          console.error(`Failed to generate thumbnail for ${doc.id}:`, error);
          return { id: doc.id, thumbnail: null };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ id, thumbnail }) => {
        if (thumbnail) {
          results.set(id, thumbnail);
        }
      });
    }

    return results;
  }
}

export const thumbnailService = ThumbnailService.getInstance();
