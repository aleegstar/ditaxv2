
/**
 * Client-side encryption service for document security
 * Uses AES-256-GCM encryption with Web Crypto API
 */
export class CryptoService {
  private static instance: CryptoService;
  
  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }
  
  /**
   * Generate a local encryption key for a user (without master key)
   * This is used for normal user encryption
   */
  async generateLocalUserKey(userId: string): Promise<string> {
    const encoder = new TextEncoder();
    // Use a fixed salt combined with userId for deterministic key generation
    const baseSalt = 'ditax-local-encryption-2024';
    const combinedSalt = encoder.encode(baseSalt + userId);
    
    // Use WebCrypto to derive a key from the userId
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userId + baseSalt),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: combinedSalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }
  
  /**
   * Generate a user key using master key (for admin decryption)
   * This now uses the SAME method as generateLocalUserKey to ensure compatibility
   */
  async generateUserKey(userId: string, masterKey: string): Promise<string> {
    console.log('🔐 Generating user key with master key validation...');
    console.log('🔍 Master key length:', masterKey.length);
    console.log('🔍 User ID:', userId);
    
    // Use the SAME approach as generateLocalUserKey to ensure identical keys
    const encoder = new TextEncoder();
    const baseSalt = 'ditax-local-encryption-2024';
    const combinedSalt = encoder.encode(baseSalt + userId);
    
    // Use the same key material as local generation (userId + baseSalt)
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userId + baseSalt),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: combinedSalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const exported = await crypto.subtle.exportKey('raw', key);
    const userKey = this.arrayBufferToBase64(exported);
    
    console.log('✅ Generated user key length:', userKey.length);
    console.log('🔍 User key starts with:', userKey.substring(0, 8) + '...');
    
    // Validate that this key matches what generateLocalUserKey would produce
    const localKey = await this.generateLocalUserKey(userId);
    const keysMatch = userKey === localKey;
    console.log('🔍 Keys match validation:', keysMatch ? '✅ MATCH' : '❌ MISMATCH');
    
    if (!keysMatch) {
      console.error('❌ Key mismatch detected! User key != Local key');
      console.log('🔍 Local key starts with:', localKey.substring(0, 8) + '...');
      throw new Error('Key generation mismatch - admin and user keys do not match');
    }
    
    return userKey;
  }
  
  /**
   * Encrypt a pre-read ArrayBuffer (avoids double file.arrayBuffer() calls on mobile)
   */
  async encryptBuffer(buffer: ArrayBuffer, encryptionKey: string): Promise<{
    encryptedData: ArrayBuffer;
    iv: string;
    authTag: string;
  }> {
    const keyBuffer = this.base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      buffer
    );
    
    return {
      encryptedData: encrypted,
      iv: this.arrayBufferToBase64(iv.buffer),
      authTag: '' // GCM includes auth tag in encrypted data
    };
  }

  /**
   * Encrypt file content
   */
  async encryptFile(file: File, encryptionKey: string): Promise<{
    encryptedData: ArrayBuffer;
    iv: string;
    authTag: string;
  }> {
    const fileBuffer = await file.arrayBuffer();
    return this.encryptBuffer(fileBuffer, encryptionKey);
  }
  
  /**
   * Decrypt file content
   */
  async decryptFile(
    encryptedData: ArrayBuffer,
    encryptionKey: string,
    iv: string
  ): Promise<ArrayBuffer> {
    const keyBuffer = this.base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    const ivBuffer = this.base64ToArrayBuffer(iv);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      key,
      encryptedData
    );
    
    return decrypted;
  }
  
  /**
   * Encrypt metadata (filename, etc.)
   */
  async encryptMetadata(metadata: any, encryptionKey: string): Promise<{
    encryptedMetadata: string;
    iv: string;
  }> {
    const keyBuffer = this.base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const metadataBuffer = encoder.encode(JSON.stringify(metadata));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      metadataBuffer
    );
    
    return {
      encryptedMetadata: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer)
    };
  }
  
  /**
   * Decrypt metadata
   */
  async decryptMetadata(
    encryptedMetadata: string,
    encryptionKey: string,
    iv: string
  ): Promise<any> {
    const keyBuffer = this.base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    const ivBuffer = this.base64ToArrayBuffer(iv);
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedMetadata);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      key,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
  
  /**
   * Generate a random initialization vector (IV)
   */
  generateIV(): string {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return this.arrayBufferToBase64(iv.buffer);
  }
  
  /**
   * Encrypt string data (for field-level encryption)
   */
  async encryptData(plaintext: string, encryptionKey: string, iv: string): Promise<string> {
    const keyBuffer = this.base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    const ivBuffer = this.base64ToArrayBuffer(iv);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(plaintext);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      key,
      dataBuffer
    );
    
    return this.arrayBufferToBase64(encrypted);
  }
  
  /**
   * Decrypt string data (for field-level encryption)
   */
  async decryptData(ciphertext: string, encryptionKey: string, iv: string): Promise<string> {
    const keyBuffer = this.base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    const ivBuffer = this.base64ToArrayBuffer(iv);
    const encryptedBuffer = this.base64ToArrayBuffer(ciphertext);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      key,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
  
  /**
   * Generate integrity hash for file
   */
  async generateIntegrityHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }
  
  /**
   * Verify file integrity
   */
  async verifyIntegrity(data: ArrayBuffer, expectedHash: string): Promise<boolean> {
    const actualHash = await this.generateIntegrityHash(data);
    return actualHash === expectedHash;
  }
  
  /**
   * Helper methods for base64 conversion
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default CryptoService;
