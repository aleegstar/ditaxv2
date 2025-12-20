
import { supabase } from '@/integrations/supabase/client';
import CryptoService from './CryptoService';
import KeyManagementService from './KeyManagementService';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  checklistItemId: string;
  encrypted: boolean;
  integrity_hash?: string;
}

// Define proper types for encrypted metadata
interface EncryptedDocumentMetadata {
  encrypted?: boolean;
  iv?: string;
  encryptedMetadata?: string;
  metadataIv?: string;
  integrity_hash?: string;
  original_size?: number;
  encrypted_size?: number;
  encryption_version?: number;
}

/**
 * Service for handling encrypted document uploads and downloads
 */
class EncryptedDocumentService {
  private static instance: EncryptedDocumentService;
  private cryptoService: CryptoService;
  private keyService: KeyManagementService;
  
  public static getInstance(): EncryptedDocumentService {
    if (!EncryptedDocumentService.instance) {
      EncryptedDocumentService.instance = new EncryptedDocumentService();
    }
    return EncryptedDocumentService.instance;
  }
  
  constructor() {
    this.cryptoService = CryptoService.getInstance();
    this.keyService = KeyManagementService.getInstance();
  }

  /**
   * Check if a document is encrypted
   */
  isDocumentEncrypted(document: any): boolean {
    return document?.metadata?.encrypted === true;
  }
  
  /**
   * Upload encrypted document (uses local user key)
   */
  async uploadEncryptedDocument(
    file: File,
    checklistItemId: string | null,
    userId: string,
    taxYear: string
  ): Promise<void> {
    try {
      console.log('🔐 Starting encrypted document upload for user:', userId);
      
      // Get user's local encryption key (no master key needed)
      const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
      console.log('🔑 Got user encryption key');
      
      // Generate integrity hash of original file
      const originalBuffer = await file.arrayBuffer();
      const integrityHash = await this.cryptoService.generateIntegrityHash(originalBuffer);
      
      // Encrypt the file
      const { encryptedData, iv } = await this.cryptoService.encryptFile(file, encryptionKey);
      console.log('🔐 File encrypted successfully');
      
      // Encrypt metadata
      const metadata = {
        original_name: file.name,
        original_type: file.type,
        original_size: file.size,
        upload_timestamp: new Date().toISOString()
      };
      
      const { encryptedMetadata, iv: metadataIv } = await this.cryptoService.encryptMetadata(
        metadata,
        encryptionKey
      );
      
      // Create unique file path
      const fileId = uuidv4();
      const filePath = `${userId}/${checklistItemId}/${fileId}`;
      
      // Upload encrypted file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, new Blob([encryptedData]), {
          contentType: 'application/octet-stream'
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      console.log('📁 File uploaded to storage');
      
      // Store document metadata in database
      const { error: dbError } = await supabase
        .from('uploaded_documents')
        .insert({
          id: fileId,
          user_id: userId,
          checklist_item_id: checklistItemId,
          file_name: file.name,
          file_type: file.type,
          file_path: filePath,
          tax_year: taxYear,
          metadata: {
            encrypted: true,
            iv: iv,
            encryptedMetadata: encryptedMetadata,
            metadataIv: metadataIv,
            integrity_hash: integrityHash,
            original_size: file.size,
            encrypted_size: encryptedData.byteLength,
            encryption_version: 1
          }
        });
      
      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('documents').remove([filePath]);
        throw dbError;
      }
      
      console.log('✅ Document metadata stored in database');
      
    } catch (error) {
      console.error('❌ Error uploading encrypted document:', error);
      throw new Error(`Fehler beim Hochladen des Dokuments: ${error.message}`);
    }
  }
  
  /**
   * Download and decrypt document (for document owner - uses local key)
   */
  async downloadOwnDecryptedDocument(documentId: string, userId: string): Promise<{
    blob: Blob;
    fileName: string;
    fileType: string;
  }> {
    try {
      // Get document metadata
      const { data: document, error: docError } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();
      
      if (docError || !document) {
        throw new Error('Dokument nicht gefunden');
      }
      
      // Get user's local encryption key
      const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
      
      // Download encrypted file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (downloadError || !fileData) {
        throw new Error('Fehler beim Herunterladen der Datei');
      }
      
      // Cast metadata to proper type
      const metadata = document.metadata as EncryptedDocumentMetadata;
      
      // Decrypt file
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedBuffer = await this.cryptoService.decryptFile(
        encryptedBuffer,
        encryptionKey,
        metadata.iv!
      );
      
      // Verify integrity
      const isValid = await this.cryptoService.verifyIntegrity(
        decryptedBuffer,
        metadata.integrity_hash!
      );
      
      if (!isValid) {
        throw new Error('Datei-Integrität konnte nicht verifiziert werden');
      }
      
      // Get original metadata
      let fileName = document.file_name;
      let fileType = document.file_type;
      
      if (metadata.encryptedMetadata && metadata.metadataIv) {
        try {
          const originalMetadata = await this.cryptoService.decryptMetadata(
            metadata.encryptedMetadata,
            encryptionKey,
            metadata.metadataIv
          );
          fileName = originalMetadata.original_name;
          fileType = originalMetadata.original_type;
        } catch (err) {
          console.warn('Could not decrypt metadata, using fallback values');
        }
      }
      
      return {
        blob: new Blob([decryptedBuffer], { type: fileType }),
        fileName,
        fileType
      };
      
    } catch (error) {
      console.error('Error downloading own decrypted document:', error);
      throw new Error(`Fehler beim Entschlüsseln des Dokuments: ${error.message}`);
    }
  }

  /**
   * Download and decrypt document (for document owner)
   */
  async downloadDecryptedDocument(documentId: string, userId: string): Promise<{
    blob: Blob;
    fileName: string;
    fileType: string;
  }> {
    try {
      // Get document metadata
      const { data: document, error: docError } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();
      
      if (docError || !document) {
        throw new Error('Dokument nicht gefunden');
      }
      
      // Get user's local encryption key
      const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
      
      // Download encrypted file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (downloadError || !fileData) {
        throw new Error('Fehler beim Herunterladen der Datei');
      }
      
      // Cast metadata to proper type
      const metadata = document.metadata as EncryptedDocumentMetadata;
      
      // Decrypt file
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedBuffer = await this.cryptoService.decryptFile(
        encryptedBuffer,
        encryptionKey,
        metadata.iv!
      );
      
      // Verify integrity
      const isValid = await this.cryptoService.verifyIntegrity(
        decryptedBuffer,
        metadata.integrity_hash!
      );
      
      if (!isValid) {
        throw new Error('Datei-Integrität konnte nicht verifiziert werden');
      }
      
      // Get original metadata
      let fileName = document.file_name;
      let fileType = document.file_type;
      
      if (metadata.encryptedMetadata && metadata.metadataIv) {
        try {
          const originalMetadata = await this.cryptoService.decryptMetadata(
            metadata.encryptedMetadata,
            encryptionKey,
            metadata.metadataIv
          );
          fileName = originalMetadata.original_name;
          fileType = originalMetadata.original_type;
        } catch (err) {
          console.warn('Could not decrypt metadata, using fallback values');
        }
      }
      
      return {
        blob: new Blob([decryptedBuffer], { type: fileType }),
        fileName,
        fileType
      };
      
    } catch (error) {
      console.error('Error downloading decrypted document:', error);
      throw new Error(`Fehler beim Entschlüsseln des Dokuments: ${error.message}`);
    }
  }
  
  /**
   * Admin function to download and decrypt any user's document
   * Uses server-side decryption - master key never leaves the server
   */
  async adminDownloadDecryptedDocument(documentId: string, adminUserId: string): Promise<{
    blob: Blob;
    fileName: string;
    fileType: string;
  }> {
    try {
      console.log('🔧 Admin requesting server-side document decryption:', documentId, 'by admin:', adminUserId);
      
      // Validate current session first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 Current auth user:', user?.id, 'Error:', userError);
      
      if (!user) {
        console.error('❌ No authenticated user found');
        throw new Error('Keine Authentifizierung gefunden');
      }

      // Use server-side decryption - master key never leaves the server
      const result = await this.keyService.adminDecryptDocumentServerSide(
        documentId,
        'Admin document access via UI'
      );
      
      console.log('✅ Server-side decryption completed for document:', documentId);
      
      return result;
      
    } catch (error) {
      console.error('Error in admin download:', error);
      throw new Error(`Fehler beim Entschlüsseln des Dokuments: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }
  
  /**
   * Get user's documents
   */
  async getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('upload_date', { ascending: false });
    
    if (error) {
      throw new Error(`Fehler beim Laden der Dokumente: ${error.message}`);
    }
    
    return (data || []).map(doc => {
      const metadata = doc.metadata as EncryptedDocumentMetadata;
      return {
        id: doc.id,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: metadata?.original_size || 0,
        uploadDate: doc.upload_date,
        checklistItemId: doc.checklist_item_id,
        encrypted: metadata?.encrypted || false,
        integrity_hash: metadata?.integrity_hash
      };
    });
  }
  
  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    // Get document to find file path
    const { data: document, error: getError } = await supabase
      .from('uploaded_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
    
    if (getError || !document) {
      throw new Error('Dokument nicht gefunden');
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);
    
    if (storageError) {
      console.warn('Could not delete file from storage:', storageError);
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);
    
    if (dbError) {
      throw new Error(`Fehler beim Löschen des Dokuments: ${dbError.message}`);
    }
  }
}

export default EncryptedDocumentService;
