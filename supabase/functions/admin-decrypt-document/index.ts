import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AES-256-GCM decryption using Web Crypto API
async function decryptData(
  encryptedData: ArrayBuffer,
  keyBase64: string,
  ivBase64: string
): Promise<ArrayBuffer> {
  // Convert base64 key and IV to ArrayBuffer
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    cryptoKey,
    encryptedData
  );
  
  return decryptedData;
}

// Generate user-specific key from master key (matches client-side logic)
async function generateUserKey(userId: string, masterKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = encoder.encode(userId);
  
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
  const keyArray = new Uint8Array(exportedKey);
  
  // Convert to base64
  let binary = '';
  for (let i = 0; i < keyArray.length; i++) {
    binary += String.fromCharCode(keyArray[i]);
  }
  return btoa(binary);
}

// Decrypt metadata
async function decryptMetadata(
  encryptedMetadata: string,
  keyBase64: string,
  ivBase64: string
): Promise<any> {
  const encryptedBytes = Uint8Array.from(atob(encryptedMetadata), c => c.charCodeAt(0));
  const decryptedBuffer = await decryptData(encryptedBytes.buffer, keyBase64, ivBase64);
  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      throw new Error('AUTHENTICATION_REQUIRED')
    }

    // Parse request body
    const { documentId, justification } = await req.json()
    
    if (!documentId) {
      throw new Error('MISSING_DOCUMENT_ID')
    }

    // Create a Supabase client with user's auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      console.error('No user found from token')
      throw new Error('AUTHENTICATION_REQUIRED')
    }

    // Verify admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('verify_admin_role')
    if (roleError) {
      console.error('Error verifying admin role:', roleError)
      throw new Error('ACCESS_DENIED')
    }

    if (!isAdmin) {
      console.warn(`Unauthorized document decryption attempt by user: ${user.id}`)
      // Log security incident
      await supabaseClient.from('security_audit_logs').insert({
        user_id: user.id,
        action: 'UNAUTHORIZED_DOCUMENT_DECRYPT',
        resource: `document:${documentId}`,
        success: false,
        error_message: 'User attempted document decryption without admin privileges'
      })
      throw new Error('ACCESS_DENIED')
    }

    // Create service role client for storage access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get document metadata
    const { data: document, error: docError } = await supabaseAdmin
      .from('uploaded_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error('Document not found:', docError)
      throw new Error('DOCUMENT_NOT_FOUND')
    }

    const metadata = document.metadata as {
      encrypted?: boolean;
      iv?: string;
      encryptedMetadata?: string;
      metadataIv?: string;
      integrity_hash?: string;
    }

    // If document is not encrypted, download and return directly
    if (!metadata || !metadata.encrypted) {
      console.log('Document is not encrypted, downloading directly')
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('documents')
        .download(document.file_path)

      if (downloadError || !fileData) {
        console.error('Download error:', downloadError)
        throw new Error('DOWNLOAD_FAILED')
      }

      // Log successful access
      await supabaseClient.from('security_audit_logs').insert({
        user_id: user.id,
        action: 'ADMIN_DOCUMENT_ACCESS',
        resource: `document:${documentId}`,
        success: true
      })

      await supabaseClient.from('admin_access_logs').insert({
        admin_user_id: user.id,
        accessed_user_id: document.user_id,
        document_id: documentId,
        action: 'document_download_unencrypted'
      })

      // Return file as base64
      const buffer = await fileData.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

      return new Response(
        JSON.stringify({
          success: true,
          data: base64,
          fileName: document.file_name,
          fileType: document.file_type,
          encrypted: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get master key from environment
    const masterKey = Deno.env.get('DOCUMENT_MASTER_KEY')
    if (!masterKey) {
      console.error('DOCUMENT_MASTER_KEY not configured')
      await supabaseClient.from('security_audit_logs').insert({
        user_id: user.id,
        action: 'MASTER_KEY_CONFIG_ERROR',
        resource: `document:${documentId}`,
        success: false,
        error_message: 'Master key not configured'
      })
      throw new Error('SERVICE_UNAVAILABLE')
    }

    // Generate user-specific key from master key (server-side)
    const userKey = await generateUserKey(document.user_id, masterKey)
    console.log('Generated user key for document owner:', document.user_id)

    // Download encrypted file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      throw new Error('DOWNLOAD_FAILED')
    }

    console.log('Downloaded encrypted file, size:', fileData.size)

    // Decrypt the file
    const encryptedBuffer = await fileData.arrayBuffer()
    const decryptedBuffer = await decryptData(encryptedBuffer, userKey, metadata.iv!)
    console.log('Decrypted file, size:', decryptedBuffer.byteLength)

    // Get original file name and type
    let fileName = document.file_name
    let fileType = document.file_type

    if (metadata.encryptedMetadata && metadata.metadataIv) {
      try {
        const originalMetadata = await decryptMetadata(
          metadata.encryptedMetadata,
          userKey,
          metadata.metadataIv
        )
        fileName = originalMetadata.original_name || fileName
        fileType = originalMetadata.original_type || fileType
        console.log('Decrypted metadata:', { fileName, fileType })
      } catch (err) {
        console.warn('Could not decrypt metadata, using fallback values:', err)
      }
    }

    // Log successful access
    await supabaseClient.from('security_audit_logs').insert({
      user_id: user.id,
      action: 'ADMIN_DOCUMENT_DECRYPT_SUCCESS',
      resource: `document:${documentId}`,
      success: true,
      metadata: { justification }
    })

    await supabaseClient.from('admin_access_logs').insert({
      admin_user_id: user.id,
      accessed_user_id: document.user_id,
      document_id: documentId,
      action: 'document_decrypt_server_side'
    })

    console.log(`Admin ${user.id} successfully decrypted document ${documentId}`)

    // Return decrypted file as base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(decryptedBuffer)))

    return new Response(
      JSON.stringify({
        success: true,
        data: base64,
        fileName,
        fileType,
        encrypted: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'INTERNAL_ERROR'
    console.error('Error in admin-decrypt-document function:', error)

    const errorMap: Record<string, { message: string; status: number }> = {
      'AUTHENTICATION_REQUIRED': { message: 'Authentication required', status: 401 },
      'ACCESS_DENIED': { message: 'Access denied', status: 403 },
      'MISSING_DOCUMENT_ID': { message: 'Document ID is required', status: 400 },
      'DOCUMENT_NOT_FOUND': { message: 'Document not found', status: 404 },
      'DOWNLOAD_FAILED': { message: 'Failed to download document', status: 500 },
      'SERVICE_UNAVAILABLE': { message: 'Service temporarily unavailable', status: 503 },
      'INTERNAL_ERROR': { message: 'An error occurred', status: 500 }
    }

    const errorResponse = errorMap[errorMessage] || errorMap['INTERNAL_ERROR']

    return new Response(
      JSON.stringify({ error: errorResponse.message, code: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorResponse.status,
      }
    )
  }
})
