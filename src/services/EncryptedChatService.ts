
import { supabase } from '@/integrations/supabase/client';
import CryptoService from './CryptoService';
import KeyManagementService from './KeyManagementService';
import { v4 as uuidv4 } from 'uuid';
import { validateStoragePath } from '@/utils/fileValidation';

export interface EncryptedChatAttachment {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  originalSize: number;
  isImage: boolean;
  isPdf: boolean;
  url?: string;
}

/**
 * Service for handling encrypted chat file uploads and downloads
 */
export class EncryptedChatService {
  private static instance: EncryptedChatService;
  private cryptoService: CryptoService;
  private keyService: KeyManagementService;
  
  public static getInstance(): EncryptedChatService {
    if (!EncryptedChatService.instance) {
      EncryptedChatService.instance = new EncryptedChatService();
    }
    return EncryptedChatService.instance;
  }
  
  constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.keyService = KeyManagementService.getInstance();
  }
  
  /**
   * Check if file type is supported for chat
   */
  isSupportedFileType(file: File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];
    if (allowedTypes.includes(file.type)) return true;

    // Fallback: check file extension (Android often sends application/octet-stream)
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    return !!ext && allowedExtensions.includes(ext);
  }

  /**
   * Resolve the actual MIME type from file extension when browser reports application/octet-stream
   */
  private resolveFileType(file: File): string {
    if (file.type && file.type !== 'application/octet-stream') return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
    };
    return (ext && mimeMap[ext]) || file.type;
  }
  
  /**
   * Upload encrypted chat attachment
   */
  async uploadEncryptedChatAttachment(
    file: File,
    userId: string
  ): Promise<EncryptedChatAttachment> {
    try {
      if (!this.isSupportedFileType(file)) {
        throw new Error('Dateityp wird nicht unterstützt. Nur Bilder (JPEG, PNG, GIF, WebP) und PDFs sind erlaubt.');
      }

      const resolvedType = this.resolveFileType(file);

      // Get user encryption key
      const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
      
      // Encrypt file content
      const { encryptedData, iv } = await this.cryptoService.encryptFile(file, encryptionKey);
      
      // Generate integrity hash of original file
      const originalData = await file.arrayBuffer();
      const integrityHash = await this.cryptoService.generateIntegrityHash(originalData);
      
      // Encrypt metadata
      const originalMetadata = {
        originalName: file.name,
        originalSize: file.size,
        originalType: resolvedType,
        uploadTimestamp: new Date().toISOString()
      };
      
      const { encryptedMetadata, iv: metadataIv } = await this.cryptoService.encryptMetadata(
        originalMetadata,
        encryptionKey
      );
      
      // Create encrypted file blob
      const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
      
      // Generate encrypted filename
      const encryptedFileName = `enc_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.enc`;
      const filePath = `${userId}/${encryptedFileName}`;
      
      // Upload encrypted file to chat_attachments storage
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, encryptedBlob);
      
      if (uploadError) {
        throw new Error(`Upload-Fehler: ${uploadError.message}`);
      }
      
      // Store encrypted attachment metadata in database
      const attachmentData = {
        file_name: encryptedFileName,
        file_type: 'application/octet-stream',
        file_path: filePath,
        file_size: encryptedBlob.size,
        uploaded_by: userId,
        encrypted: true,
        encryption_version: 1,
        iv: iv,
        metadata_iv: metadataIv,
        encrypted_metadata: encryptedMetadata,
        integrity_hash: integrityHash,
        original_size: file.size
      };
      
      const { data, error: dbError } = await supabase
        .from('chat_attachments')
        .insert(attachmentData)
        .select()
        .single();
      
      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('chat_attachments').remove([filePath]);
        throw new Error(`Datenbankfehler: ${dbError.message}`);
      }
      
      return {
        id: data.id,
        fileName: file.name,
        fileType: resolvedType,
        filePath: filePath,
        originalSize: file.size,
        isImage: resolvedType.startsWith('image/'),
        isPdf: resolvedType === 'application/pdf'
      };
    } catch (error: any) {
      console.error('Error uploading encrypted chat attachment:', error);
      throw error;
    }
  }
  
  /**
   * Download and decrypt chat attachment
   */
  async downloadDecryptedChatAttachment(
    attachmentId: string,
    userId: string
  ): Promise<{ blob: Blob; filename: string; fileType: string }> {
    try {
      // Get attachment metadata
      const { data: attachment, error: attachmentError } = await supabase
        .from('chat_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();
      
      if (attachmentError || !attachment) {
        throw new Error('Anhang nicht gefunden');
      }
      
      if (!attachment.encrypted) {
        throw new Error('Anhang ist nicht verschlüsselt');
      }
      
      // Get user encryption key
      const decryptionKey = await this.keyService.getUserEncryptionKey(userId);
      
      // Validate storage path before download
      if (!validateStoragePath(attachment.file_path)) {
        throw new Error('Ungültiger Dateipfad erkannt');
      }
      
      // Download encrypted file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('chat_attachments')
        .download(attachment.file_path);
      
      if (downloadError || !fileData) {
        throw new Error('Fehler beim Herunterladen der verschlüsselten Datei');
      }
      
      // Decrypt file content
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedBuffer = await this.cryptoService.decryptFile(
        encryptedBuffer,
        decryptionKey,
        attachment.iv
      );
      
      // Verify integrity
      const isValid = await this.cryptoService.verifyIntegrity(
        decryptedBuffer,
        attachment.integrity_hash
      );
      
      if (!isValid) {
        throw new Error('Datei-Integrität konnte nicht verifiziert werden');
      }
      
      // Decrypt metadata
      const originalMetadata = await this.cryptoService.decryptMetadata(
        attachment.encrypted_metadata,
        decryptionKey,
        attachment.metadata_iv
      );
      
      const blob = new Blob([decryptedBuffer], { type: originalMetadata.originalType });
      
      return {
        blob,
        filename: originalMetadata.originalName,
        fileType: originalMetadata.originalType
      };
    } catch (error: any) {
      console.error('Error downloading encrypted chat attachment:', error);
      throw error;
    }
  }
  
  /**
   * Create a temporary URL for decrypted file display
   */
  async createTemporaryUrl(
    attachmentId: string,
    userId: string
  ): Promise<string> {
    try {
      const { blob } = await this.downloadDecryptedChatAttachment(attachmentId, userId);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error creating temporary URL:', error);
      throw error;
    }
  }
}

export default EncryptedChatService;
