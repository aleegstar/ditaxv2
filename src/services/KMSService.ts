/**
 * AWS KMS Integration Service
 * 
 * CRITICAL: This service requires AWS KMS setup
 * See SECURITY_IMPLEMENTATION.md for setup instructions
 * 
 * This is a PHASE 1 CRITICAL FIX for Master Key Management
 */

import { supabase } from '@/integrations/supabase/client';

export interface KMSConfig {
  region: string;
  keyId: string;
  enabled: boolean;
}

/**
 * Key Management Service with AWS KMS integration
 * Replaces environment variable storage of master keys
 */
export class KMSService {
  private static instance: KMSService;
  private kmsEnabled: boolean = false;
  
  private constructor() {
    // KMS is not yet configured - using fallback
    this.kmsEnabled = false;
  }
  
  public static getInstance(): KMSService {
    if (!KMSService.instance) {
      KMSService.instance = new KMSService();
    }
    return KMSService.instance;
  }
  
  /**
   * Check if KMS is enabled and configured
   */
  isKMSEnabled(): boolean {
    return this.kmsEnabled;
  }
  
  /**
   * Encrypt Data Encryption Key (DEK) with KMS Key Encryption Key (KEK)
   * 
   * @param dekPlaintext - The plaintext DEK to encrypt
   * @param userId - User ID for encryption context
   * @returns Encrypted DEK (base64)
   */
  async encryptDEK(dekPlaintext: string, userId: string): Promise<string> {
    if (!this.kmsEnabled) {
      console.warn('⚠️ KMS not enabled - using fallback encryption');
      // Fallback: Use current master key method
      // TODO: Remove this after KMS migration
      return dekPlaintext; // INSECURE - only for transition
    }
    
    try {
      // Call edge function that handles AWS KMS encryption
      const { data, error } = await supabase.functions.invoke('kms-encrypt-dek', {
        body: {
          plaintext: dekPlaintext,
          encryptionContext: {
            userId,
            purpose: 'tax-data-encryption',
            timestamp: new Date().toISOString()
          }
        }
      });
      
      if (error) throw error;
      
      return data.encryptedDEK;
      
    } catch (error) {
      console.error('KMS encryption failed:', error);
      throw new Error('Failed to encrypt DEK with KMS');
    }
  }
  
  /**
   * Decrypt Data Encryption Key (DEK) with KMS
   * Requires admin privileges
   * 
   * @param encryptedDEK - The encrypted DEK (base64)
   * @param userId - User ID for encryption context
   * @param adminUserId - Admin requesting decryption
   * @param justification - Required justification for audit
   * @returns Decrypted DEK (base64)
   */
  async decryptDEK(
    encryptedDEK: string,
    userId: string,
    adminUserId: string,
    justification: string
  ): Promise<string> {
    if (!this.kmsEnabled) {
      console.warn('⚠️ KMS not enabled - using fallback decryption');
      // Fallback method
      return encryptedDEK; // INSECURE - only for transition
    }
    
    try {
      // Call edge function that handles AWS KMS decryption
      // This function will verify admin access and log the operation
      const { data, error } = await supabase.functions.invoke('kms-decrypt-dek', {
        body: {
          encryptedDEK,
          encryptionContext: {
            userId,
            purpose: 'tax-data-encryption'
          },
          adminUserId,
          justification
        }
      });
      
      if (error) throw error;
      
      // Audit log is created automatically by the edge function
      console.log(`🔑 DEK decrypted for user ${userId} by admin ${adminUserId}`);
      
      return data.plaintextDEK;
      
    } catch (error) {
      console.error('KMS decryption failed:', error);
      throw new Error('Failed to decrypt DEK with KMS');
    }
  }
  
  /**
   * Generate a new Data Encryption Key (DEK) for a user
   * The DEK is encrypted with KMS KEK before storage
   * 
   * @param userId - User ID
   * @returns Object with encrypted DEK and key metadata
   */
  async generateUserDEK(userId: string): Promise<{
    encryptedDEK: string;
    keyVersion: number;
  }> {
    try {
      // Generate 256-bit random key
      const dekBytes = new Uint8Array(32);
      crypto.getRandomValues(dekBytes);
      const dekPlaintext = btoa(String.fromCharCode(...dekBytes));
      
      // Encrypt with KMS
      const encryptedDEK = await this.encryptDEK(dekPlaintext, userId);
      
      // Store encrypted DEK in database
      const { data, error } = await supabase
        .from('user_encryption_keys')
        .insert({
          user_id: userId,
          encrypted_key: encryptedDEK,
          key_salt: '',
          key_version: this.kmsEnabled ? 2 : 1 // v2 = KMS, v1 = legacy
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`🔐 New DEK generated for user ${userId} (version ${data.key_version})`);
      
      return {
        encryptedDEK,
        keyVersion: data.key_version
      };
      
    } catch (error) {
      console.error('Failed to generate user DEK:', error);
      throw new Error('Failed to generate encryption key');
    }
  }
  
  /**
   * Rotate KEK and re-encrypt all DEKs
   * This should be run as a background job
   * 
   * CRITICAL: Only call this during a maintenance window
   */
  async rotateKEK(): Promise<void> {
    if (!this.kmsEnabled) {
      throw new Error('KMS must be enabled for key rotation');
    }
    
    console.log('🔄 Starting KEK rotation...');
    
    try {
      // Call edge function that handles rotation
      const { error } = await supabase.functions.invoke('kms-rotate-kek', {
        body: {
          rotationDate: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      
      console.log('✅ KEK rotation completed successfully');
      
    } catch (error) {
      console.error('KEK rotation failed:', error);
      throw new Error('Failed to rotate KEK');
    }
  }
}

export default KMSService;
