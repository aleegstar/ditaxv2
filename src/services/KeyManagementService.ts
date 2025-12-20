
import { supabase } from '@/integrations/supabase/client';
import CryptoService from './CryptoService';

/**
 * Key management service for handling encryption keys
 */
export class KeyManagementService {
  private static instance: KeyManagementService;
  private cryptoService: CryptoService;
  private userKeyCache: Map<string, string> = new Map();
  
  public static getInstance(): KeyManagementService {
    if (!KeyManagementService.instance) {
      KeyManagementService.instance = new KeyManagementService();
    }
    return KeyManagementService.instance;
  }
  
  constructor() {
    this.cryptoService = CryptoService.getInstance();
  }
  
  /**
   * Get or generate user encryption key for normal users (local key)
   * Users encrypt their own data without needing the master key
   */
  async getUserEncryptionKey(userId: string): Promise<string> {
    // Check cache first
    if (this.userKeyCache.has(userId)) {
      return this.userKeyCache.get(userId)!;
    }
    
    try {
      // Try to get existing key metadata from database
      const { data, error } = await supabase
        .from('user_encryption_keys')
        .select('encrypted_key, key_salt, key_source')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Generate local user key (no master key needed)
      const userKey = await this.cryptoService.generateLocalUserKey(userId);
      
      // Store key metadata if not exists
      if (!data) {
        await this.storeKeyMetadata(userId, 'local');
      }
      
      this.userKeyCache.set(userId, userKey);
      return userKey;
    } catch (error) {
      console.error('Error getting user encryption key:', error);
      throw new Error('Fehler beim Abrufen des Verschlüsselungsschlüssels');
    }
  }
  
  /**
   * Store key metadata in database
   */
  private async storeKeyMetadata(userId: string, keySource: 'local' | 'master'): Promise<void> {
    const { error } = await supabase
      .from('user_encryption_keys')
      .insert({
        user_id: userId,
        key_version: 1,
        created_at: new Date().toISOString(),
        encrypted_key: 'derived',
        key_salt: userId,
        key_source: keySource
      });
    
    if (error) {
      console.error('Error storing key metadata:', error);
      throw new Error('Fehler beim Speichern der Schlüssel-Metadaten');
    }
  }
  
  /**
   * Server-side document decryption for admins
   * The master key NEVER leaves the server - decryption happens on the edge function
   */
  async adminDecryptDocumentServerSide(
    documentId: string,
    justification?: string
  ): Promise<{ blob: Blob; fileName: string; fileType: string }> {
    console.log('🔐 Requesting server-side document decryption for:', documentId);
    
    try {
      // Validate session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Keine aktive Session gefunden - bitte erneut anmelden');
      }

      // Call edge function for server-side decryption
      const { data, error } = await supabase.functions.invoke('admin-decrypt-document', {
        body: { documentId, justification },
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) {
        console.error('❌ Server-side decryption error:', error);
        throw new Error(error.message || 'Fehler bei der Server-seitigen Entschlüsselung');
      }

      if (!data?.success || !data?.data) {
        console.error('❌ Invalid response from decryption service:', data);
        throw new Error('Ungültige Antwort vom Entschlüsselungsdienst');
      }

      // Convert base64 back to blob
      const binaryString = atob(data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: data.fileType });
      
      console.log('✅ Server-side decryption successful for document:', documentId);
      
      return {
        blob,
        fileName: data.fileName,
        fileType: data.fileType
      };
    } catch (error) {
      console.error('❌ Error in server-side decryption:', error);
      throw new Error(`Fehler bei der Entschlüsselung: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }

  /**
   * @deprecated Use adminDecryptDocumentServerSide instead
   * This method is kept for backwards compatibility but should not be used
   */
  async getAdminDecryptionKey(userId: string, adminUserId: string): Promise<string> {
    console.warn('⚠️ DEPRECATED: getAdminDecryptionKey should not be used. Use adminDecryptDocumentServerSide instead.');
    throw new Error('Diese Methode ist veraltet. Bitte verwenden Sie die Server-seitige Entschlüsselung.');
  }
  
  /**
   * Clear key cache (for logout, etc.)
   */
  clearCache(): void {
    this.userKeyCache.clear();
  }
}

export default KeyManagementService;
