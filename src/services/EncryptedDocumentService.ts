
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
   * @param checklistItemTitle - Optional title for prefixing the filename
   */
  async uploadEncryptedDocument(
    file: File,
    checklistItemId: string | null,
    userId: string,
    taxYear: string,
    checklistItemTitle?: string,
    taxFilerId?: string | null
  ): Promise<void> {
    try {
      const t0 = Date.now();
      const log = (msg: string) => console.log(`[Upload +${Date.now()-t0}ms] ${msg}`);
      
      log('START - Getting encryption key for user: ' + userId);
      const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
      log('KEY OK');
      
      log('Reading file into memory, size: ' + file.size);
      const originalBuffer = await file.arrayBuffer();
      log('FILE READ OK, bytes: ' + originalBuffer.byteLength);
      
      log('Generating integrity hash');
      const integrityHash = await this.cryptoService.generateIntegrityHash(originalBuffer);
      log('HASH OK');
      
      log('Encrypting file');
      const { encryptedData, iv } = await this.cryptoService.encryptBuffer(originalBuffer, encryptionKey);
      log('ENCRYPT OK, encrypted size: ' + encryptedData.byteLength);
      
      log('Encrypting metadata');
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
      log('METADATA ENCRYPT OK');
      
      const fileId = uuidv4();
      const filePath = `${userId}/${checklistItemId}/${fileId}`;
      
      log('Uploading to storage: ' + filePath);
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, new Blob([encryptedData]), {
          contentType: 'application/octet-stream'
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      log('STORAGE OK');
      
      const displayFileName = checklistItemTitle 
        ? `${checklistItemTitle} - ${file.name}`
        : file.name;
      
      log('Saving metadata to DB');
      const { error: dbError } = await supabase
        .from('uploaded_documents')
        .insert({
          id: fileId,
          user_id: userId,
          tax_filer_id: taxFilerId || null,
          checklist_item_id: checklistItemId,
          file_name: displayFileName,
          file_type: file.type,
          file_path: filePath,
          tax_year: taxYear,
          is_assigned_to_checklist: !!checklistItemId,
          assigned_date: checklistItemId ? new Date().toISOString() : null,
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
        await supabase.storage.from('documents').remove([filePath]);
        throw dbError;
      }
      
      log('DB OK - DONE');
      
    } catch (error: any) {
      console.error('❌ Error uploading encrypted document:', error);
      throw new Error(`Fehler beim Hochladen des Dokuments: ${error?.message || error}`);
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
      
      if (!metadata?.iv) {
        throw new Error('Verschlüsselungsmetadaten (IV) fehlen. Das Dokument kann nicht entschlüsselt werden.');
      }
      
      // Decrypt file
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedBuffer = await this.cryptoService.decryptFile(
        encryptedBuffer,
        encryptionKey,
        metadata.iv
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
      
    } catch (error: any) {
      console.error('Error downloading own decrypted document:', error);
      throw new Error(`Fehler beim Entschlüsseln des Dokuments: ${error?.message || error}`);
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
      
      if (!metadata?.iv) {
        throw new Error('Verschlüsselungsmetadaten (IV) fehlen. Das Dokument kann nicht entschlüsselt werden.');
      }
      
      // Decrypt file
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedBuffer = await this.cryptoService.decryptFile(
        encryptedBuffer,
        encryptionKey,
        metadata.iv
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
      
    } catch (error: any) {
      console.error('Error downloading decrypted document:', error);
      throw new Error(`Fehler beim Entschlüsseln des Dokuments: ${error?.message || error}`);
    }
  }
  
  /**
   * Admin function to download and decrypt any user's document
   */
  async adminDownloadDecryptedDocument(documentId: string, adminUserId: string): Promise<{
    blob: Blob;
    fileName: string;
    fileType: string;
  }> {
    try {
      console.log('🔧 Admin downloading document:', documentId, 'by admin:', adminUserId);
      
      // Validate current session first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 Current auth user:', user?.id, 'Error:', userError);
      
      if (!user) {
        console.error('❌ No authenticated user found');
        throw new Error('Keine Authentifizierung gefunden');
      }
      
      // Get document metadata
      const { data: document, error: docError } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (docError || !document) {
        console.error('Document not found:', docError);
        throw new Error('Dokument nicht gefunden');
      }
      
      console.log('📄 Document found:', document);
      
      // Check if document is actually encrypted
      const metadata = document.metadata as EncryptedDocumentMetadata;
      if (!metadata || !metadata.encrypted) {
        console.log('📄 Document is not encrypted, downloading directly');
        // For non-encrypted documents, download directly
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(document.file_path);
        
        if (downloadError || !fileData) {
          console.error('Download error:', downloadError);
          throw new Error('Fehler beim Herunterladen der Datei');
        }
        
        const blob = new Blob([fileData], { type: document.file_type });
        return {
          blob,
          fileName: document.file_name,
          fileType: document.file_type
        };
      }
      
      // Get admin decryption key for the document owner
      const encryptionKey = await this.keyService.getAdminDecryptionKey(
        document.user_id,
        adminUserId
      );
      
      console.log('🔑 Got admin decryption key for user:', document.user_id);
      
      // Download encrypted file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (downloadError || !fileData) {
        console.error('Download error:', downloadError);
        throw new Error('Fehler beim Herunterladen der verschlüsselten Datei');
      }
      
      console.log('📥 Downloaded encrypted file, size:', fileData.size);
      
      if (!metadata?.iv) {
        throw new Error('Verschlüsselungsmetadaten (IV) fehlen. Das Dokument kann nicht entschlüsselt werden.');
      }
      
      // Decrypt file
      const encryptedBuffer = await fileData.arrayBuffer();
      const decryptedBuffer = await this.cryptoService.decryptFile(
        encryptedBuffer,
        encryptionKey,
        metadata.iv
      );
      
      console.log('🔓 Decrypted file, size:', decryptedBuffer.byteLength);
      
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
          fileName = originalMetadata.original_name || fileName;
          fileType = originalMetadata.original_type || fileType;
          console.log('📝 Decrypted metadata:', { fileName, fileType });
        } catch (err) {
          console.warn('Could not decrypt metadata, using fallback values');
        }
      }
      
      // Verify integrity if available
      if (metadata.integrity_hash) {
        try {
          const isValid = await this.cryptoService.verifyIntegrity(
            decryptedBuffer,
            metadata.integrity_hash
          );
          
          if (!isValid) {
            console.warn('⚠️ Integrity check failed for document:', documentId);
          } else {
            console.log('✅ Integrity check passed');
          }
        } catch (integrityError) {
          console.warn('Could not verify integrity:', integrityError);
        }
      }
      
      // Log successful admin access
      await supabase
        .from('admin_access_logs')
        .insert({
          admin_user_id: adminUserId,
          accessed_user_id: document.user_id,
          document_id: documentId,
          action: 'document_decrypt_download'
        });
      
      return {
        blob: new Blob([decryptedBuffer], { type: fileType }),
        fileName,
        fileType
      };
      
    } catch (error: any) {
      console.error('Error in admin download:', error);
      throw new Error(`Fehler beim Entschlüsseln des Dokuments: ${error?.message || error}`);
    }
  }
  
  /**
   * Upload from a pre-read ArrayBuffer (avoids file.arrayBuffer() which hangs on mobile WebViews)
   */
  async uploadFromBuffer(
    buffer: ArrayBuffer,
    fileName: string,
    fileType: string,
    checklistItemId: string | null,
    userId: string,
    taxYear: string,
    checklistItemTitle?: string,
    taxFilerId?: string | null
  ): Promise<void> {
    try {
      console.log('🔐 Starting buffer-based encrypted upload for user:', userId);
      
      const encryptionKey = await this.keyService.getUserEncryptionKey(userId);
      
      const integrityHash = await this.cryptoService.generateIntegrityHash(buffer);
      const { encryptedData, iv } = await this.cryptoService.encryptBuffer(buffer, encryptionKey);
      console.log('🔐 File encrypted successfully');
      
      const metadata = {
        original_name: fileName,
        original_type: fileType,
        original_size: buffer.byteLength,
        upload_timestamp: new Date().toISOString()
      };
      
      const { encryptedMetadata, iv: metadataIv } = await this.cryptoService.encryptMetadata(
        metadata,
        encryptionKey
      );
      
      const fileId = uuidv4();
      const filePath = `${userId}/${checklistItemId}/${fileId}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, new Blob([encryptedData]), {
          contentType: 'application/octet-stream'
        });
      
      if (uploadError) throw uploadError;
      
      console.log('📁 File uploaded to storage');
      
      const displayFileName = checklistItemTitle 
        ? `${checklistItemTitle} - ${fileName}`
        : fileName;
      
      const { error: dbError } = await supabase
        .from('uploaded_documents')
        .insert({
          id: fileId,
          user_id: userId,
          tax_filer_id: taxFilerId || null,
          checklist_item_id: checklistItemId,
          file_name: displayFileName,
          file_type: fileType,
          file_path: filePath,
          tax_year: taxYear,
          is_assigned_to_checklist: !!checklistItemId,
          assigned_date: checklistItemId ? new Date().toISOString() : null,
          metadata: {
            encrypted: true,
            iv: iv,
            encryptedMetadata: encryptedMetadata,
            metadataIv: metadataIv,
            integrity_hash: integrityHash,
            original_size: buffer.byteLength,
            encrypted_size: encryptedData.byteLength,
            encryption_version: 1
          }
        });
      
      if (dbError) {
        await supabase.storage.from('documents').remove([filePath]);
        throw dbError;
      }
      
      console.log('✅ Document metadata stored in database');
    } catch (error: any) {
      console.error('❌ Error uploading from buffer:', error);
      throw new Error(`Fehler beim Hochladen des Dokuments: ${error?.message || error}`);
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
