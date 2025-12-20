
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
   * Get master key from Supabase secrets (admin only)
   */
  private async getMasterKey(): Promise<string> {
    console.log('🔑 Attempting to retrieve master key from edge function');
    
    // Step 1: Validate and refresh session if needed
    console.log('🔄 Validating auth session before edge function call');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session validation failed:', sessionError);
        throw new Error(`Session-Validierung fehlgeschlagen: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('❌ No active session found');
        throw new Error('Keine aktive Session gefunden - bitte erneut anmelden');
      }
      
      console.log('✅ Session validated, access token present');
    } catch (error) {
      console.error('❌ Session validation error:', error);
      throw new Error(`Session-Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
    
    // Step 2: Try edge function with enhanced error handling
    try {
      console.log('📤 Invoking get-master-key edge function');
      const { data, error } = await supabase.functions.invoke('get-master-key', {
        body: {},
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('❌ Edge function invoke error:', error);
        console.log('🔄 Attempting direct fetch fallback...');
        return await this.getMasterKeyDirectFetch();
      }

      if (!data?.masterKey) {
        console.warn('⚠️ No master key in response, data received:', data);
        console.log('🔄 Attempting direct fetch fallback...');
        return await this.getMasterKeyDirectFetch();
      }

      console.log('✅ Master key retrieved successfully via invoke');
      console.log('🔍 Master key length:', data.masterKey.length);
      console.log('🔍 Master key starts with:', data.masterKey.substring(0, 8) + '...');
      
      return data.masterKey;
    } catch (error) {
      console.error('❌ Error getting master key via invoke:', error);
      console.log('🔄 Final fallback: attempting direct fetch...');
      try {
        return await this.getMasterKeyDirectFetch();
      } catch (fetchError) {
        console.error('❌ Direct fetch also failed:', fetchError);
        throw new Error(`Fehler beim Abrufen des Master-Schlüssels: ${error instanceof Error ? error.message : 'Unbekannt'}`);
      }
    }
  }

  /**
   * Fallback method using Supabase client
   */
  private async getMasterKeyDirectFetch(): Promise<string> {
    console.log('📡 Using Supabase client to get master key...');
    
    const { data, error } = await supabase.functions.invoke('get-master-key', {
      body: {}
    });

    if (error) {
      console.error('❌ Supabase client error:', error);
      throw new Error(`Client error: ${error.message}`);
    }

    if (!data || !data.masterKey) {
      throw new Error('Master key not found in response');
    }

    console.log('✅ Master key retrieved successfully via Supabase client');
    console.log('🔍 Master key length (direct fetch):', data.masterKey.length);
    console.log('🔍 Master key starts with (direct fetch):', data.masterKey.substring(0, 8) + '...');
    
    return data.masterKey;
  }
  
  /**
   * Admin function to get user key for decryption using master key
   * This allows admins to decrypt any user's documents
   */
  async getAdminDecryptionKey(userId: string, adminUserId: string): Promise<string> {
    try {
      // Use robust admin verification from SecurityService
      const { SecurityService } = await import('./SecurityService');
      
      console.log('🔐 Verifying admin access for user:', adminUserId);
      const isAdmin = await SecurityService.verifyAdminAccess('document_decryption');
      
      if (!isAdmin) {
        console.error('❌ Admin verification failed for user:', adminUserId);
        throw new Error('Keine Admin-Berechtigung für Dokument-Entschlüsselung');
      }
      
      console.log('✅ Admin access verified for user:', adminUserId);
      
      // Log admin access
      try {
        await supabase
          .from('admin_access_logs')
          .insert({
            admin_user_id: adminUserId,
            accessed_user_id: userId,
            action: 'key_access',
            timestamp: new Date().toISOString()
          });
      } catch (logError) {
        console.warn('⚠️ Failed to log admin access:', logError);
        // Continue execution - logging shouldn't block the process
      }
      
      console.log('🔑 Retrieving master key for user decryption...');
      // Get master key and derive user key
      const masterKey = await this.getMasterKey();
      
      console.log('🔐 Generating user key from master key...');
      console.log('🔍 Using master key of length:', masterKey.length);
      console.log('🔍 For user ID:', userId);
      
      const userKey = await this.cryptoService.generateUserKey(userId, masterKey);
      
      console.log('✅ Successfully generated admin decryption key for user:', userId);
      console.log('🔍 Generated user key length:', userKey.length);
      
      return userKey;
    } catch (error) {
      console.error('❌ Error in getAdminDecryptionKey:', error);
      
      // Re-throw with more context
      if (error.message?.includes('Keine Admin-Berechtigung')) {
        throw error; // Keep original admin error
      }
      
      throw new Error(`Fehler beim Abrufen des Admin-Entschlüsselungsschlüssels: ${error.message || 'Unbekannter Fehler'}`);
    }
  }
  
  /**
   * Clear key cache (for logout, etc.)
   */
  clearCache(): void {
    this.userKeyCache.clear();
  }
}

export default KeyManagementService;
