/**
 * Field-Level Encryption Service
 * 
 * PHASE 2 SECURITY ENHANCEMENT
 * Encrypts sensitive fields (SSN, bank details, tax IDs) at field level
 * 
 * Uses envelope encryption:
 * - Each field encrypted with user-specific DEK
 * - DEKs encrypted with master key or KMS
 * - Unique IV per field for security
 */

import CryptoService from './CryptoService';
import { supabase } from '@/integrations/supabase/client';

export interface EncryptedField {
  ciphertext: string;
  iv: string;
  field_name: string;
}

export interface SensitiveFormData {
  // Original plaintext fields
  ssn?: string; // Sozialversicherungsnummer
  bank_account?: string;
  bank_routing?: string;
  tax_id?: string;
  
  // Encrypted storage fields
  ssn_encrypted?: string;
  ssn_iv?: string;
  bank_details_encrypted?: string;
  bank_details_iv?: string;
  tax_id_encrypted?: string;
  tax_id_iv?: string;
}

/**
 * Service for field-level encryption of sensitive data
 */
export class FieldEncryptionService {
  private static instance: FieldEncryptionService;
  private cryptoService: CryptoService;

  private constructor() {
    this.cryptoService = CryptoService.getInstance();
  }

  public static getInstance(): FieldEncryptionService {
    if (!FieldEncryptionService.instance) {
      FieldEncryptionService.instance = new FieldEncryptionService();
    }
    return FieldEncryptionService.instance;
  }

  /**
   * Encrypt a single sensitive field
   */
  async encryptField(
    plaintext: string,
    fieldName: string,
    userDEK: string
  ): Promise<EncryptedField> {
    try {
      // Generate unique IV for this field
      const iv = this.cryptoService.generateIV();
      
      // Encrypt with user's DEK
      const encrypted = await this.cryptoService.encryptData(plaintext, userDEK, iv);
      
      return {
        ciphertext: encrypted,
        iv: iv,
        field_name: fieldName
      };
    } catch (error) {
      console.error(`Failed to encrypt field ${fieldName}:`, error);
      throw new Error(`Verschlüsselung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Decrypt a single sensitive field
   */
  async decryptField(
    ciphertext: string,
    iv: string,
    userDEK: string
  ): Promise<string> {
    try {
      return await this.cryptoService.decryptData(ciphertext, userDEK, iv);
    } catch (error) {
      console.error('Failed to decrypt field:', error);
      throw new Error(`Entschlüsselung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Encrypt all sensitive fields in form data
   * Returns object with encrypted fields ready for database storage
   */
  async encryptSensitiveFormData(
    formData: SensitiveFormData,
    userId: string,
    userDEK: string
  ): Promise<Partial<SensitiveFormData>> {
    const encrypted: Partial<SensitiveFormData> = {};

    try {
      // Encrypt SSN if present
      if (formData.ssn) {
        const ssnEncrypted = await this.encryptField(formData.ssn, 'ssn', userDEK);
        encrypted.ssn_encrypted = ssnEncrypted.ciphertext;
        encrypted.ssn_iv = ssnEncrypted.iv;
        console.log('🔐 SSN encrypted');
      }

      // Encrypt bank details if present
      if (formData.bank_account || formData.bank_routing) {
        const bankDetails = JSON.stringify({
          account: formData.bank_account,
          routing: formData.bank_routing
        });
        const bankEncrypted = await this.encryptField(bankDetails, 'bank_details', userDEK);
        encrypted.bank_details_encrypted = bankEncrypted.ciphertext;
        encrypted.bank_details_iv = bankEncrypted.iv;
        console.log('🔐 Bank details encrypted');
      }

      // Encrypt tax ID if present
      if (formData.tax_id) {
        const taxIdEncrypted = await this.encryptField(formData.tax_id, 'tax_id', userDEK);
        encrypted.tax_id_encrypted = taxIdEncrypted.ciphertext;
        encrypted.tax_id_iv = taxIdEncrypted.iv;
        console.log('🔐 Tax ID encrypted');
      }

      // Store field encryption metadata
      await this.storeFieldEncryptionMetadata(userId, Object.keys(encrypted).filter(k => k.endsWith('_encrypted')));

      return encrypted;
    } catch (error) {
      console.error('Failed to encrypt sensitive form data:', error);
      throw new Error(`Fehler bei der Verschlüsselung: ${error.message}`);
    }
  }

  /**
   * Decrypt all sensitive fields in form data
   */
  async decryptSensitiveFormData(
    encryptedData: SensitiveFormData,
    userDEK: string
  ): Promise<Partial<SensitiveFormData>> {
    const decrypted: Partial<SensitiveFormData> = {};

    try {
      // Decrypt SSN
      if (encryptedData.ssn_encrypted && encryptedData.ssn_iv) {
        decrypted.ssn = await this.decryptField(
          encryptedData.ssn_encrypted,
          encryptedData.ssn_iv,
          userDEK
        );
      }

      // Decrypt bank details
      if (encryptedData.bank_details_encrypted && encryptedData.bank_details_iv) {
        const bankDetailsJson = await this.decryptField(
          encryptedData.bank_details_encrypted,
          encryptedData.bank_details_iv,
          userDEK
        );
        const bankDetails = JSON.parse(bankDetailsJson);
        decrypted.bank_account = bankDetails.account;
        decrypted.bank_routing = bankDetails.routing;
      }

      // Decrypt tax ID
      if (encryptedData.tax_id_encrypted && encryptedData.tax_id_iv) {
        decrypted.tax_id = await this.decryptField(
          encryptedData.tax_id_encrypted,
          encryptedData.tax_id_iv,
          userDEK
        );
      }

      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt sensitive form data:', error);
      throw new Error(`Fehler bei der Entschlüsselung: ${error.message}`);
    }
  }

  /**
   * Store metadata about encrypted fields
   * Helps with key rotation and audit trails
   */
  private async storeFieldEncryptionMetadata(
    userId: string,
    encryptedFields: string[]
  ): Promise<void> {
    try {
      // This would typically store which fields are encrypted
      // For now, we'll just log it
      console.log(`📝 Encrypted fields for user ${userId}:`, encryptedFields);
      
      // In production, you might want to track this:
      // await supabase.from('user_field_encryption_keys').upsert(...)
    } catch (error) {
      console.warn('Failed to store field encryption metadata:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Check if form data has encrypted fields
   */
  hasSensitiveFieldsEncrypted(formData: any): boolean {
    return !!(
      formData.ssn_encrypted ||
      formData.bank_details_encrypted ||
      formData.tax_id_encrypted
    );
  }

  /**
   * Validate sensitive field format before encryption
   */
  validateSensitiveField(fieldName: string, value: string): boolean {
    switch (fieldName) {
      case 'ssn':
        // Swiss AVS number format: 756.XXXX.XXXX.XX
        return /^756\.\d{4}\.\d{4}\.\d{2}$/.test(value);
      
      case 'bank_account':
        // IBAN format (Swiss): CH12 3456 7890 1234 5678 9
        return /^CH\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{1}$/.test(value);
      
      case 'tax_id':
        // Generic validation
        return value.length >= 5 && value.length <= 50;
      
      default:
        return true;
    }
  }
}

export default FieldEncryptionService;
