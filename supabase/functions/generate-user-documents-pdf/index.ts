import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1';
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const documentsRequestSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  tax_year: z.string().regex(/^20\d{2}$/, 'Invalid tax year format')
})

// Memory limits and configuration
const MAX_FILE_SIZE_MB = 3; // Max 3MB per file
const MAX_TOTAL_SIZE_MB = 15; // Max 15MB total
const MAX_IMAGE_DIMENSION = 1200; // Max width/height for images

// Crypto utility functions for decryption
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const decryptFile = async (encryptedData: ArrayBuffer, encryptionKey: string, iv: string): Promise<ArrayBuffer> => {
  const keyBuffer = base64ToArrayBuffer(encryptionKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    'AES-GCM',
    false,
    ['decrypt']
  );
  
  const ivBuffer = base64ToArrayBuffer(iv);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer
    },
    key,
    encryptedData
  );
  
  return decrypted;
};

const decryptMetadata = async (encryptedMetadata: string, encryptionKey: string, iv: string): Promise<any> => {
  try {
    const keyBuffer = base64ToArrayBuffer(encryptionKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    const ivBuffer = base64ToArrayBuffer(iv);
    const encryptedBuffer = base64ToArrayBuffer(encryptedMetadata);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer
      },
      key,
      encryptedBuffer
    );
    
    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decrypted);
    return JSON.parse(decryptedText);
  } catch (error) {
    console.error('❌ Error decrypting metadata:', error);
    return null;
  }
};

const generateUserKey = async (userId: string, masterKey: string): Promise<string> => {
  console.log('🔑 Generating user key for user:', userId);
  
  const encoder = new TextEncoder();
  const baseSalt = 'ditax-local-encryption-2024';
  const combinedSalt = encoder.encode(baseSalt + userId);
  
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
  const userKey = arrayBufferToBase64(exported);
  
  return userKey;
};

// Helper function to detect file type from binary data
const detectFileType = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  
  if (bytes.length >= 4) {
    // JPEG
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    // PNG
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }
    
    // PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'application/pdf';
    }
  }
  
  return 'application/octet-stream';
};

// Resize image to reduce memory footprint
const resizeImage = async (imageBuffer: ArrayBuffer, maxDimension: number): Promise<ArrayBuffer> => {
  try {
    // For now, we'll just validate the size and skip resize
    // In production, you'd use an image processing library
    const sizeMB = imageBuffer.byteLength / (1024 * 1024);
    console.log(`📐 Image size: ${sizeMB.toFixed(2)}MB`);
    
    if (sizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(`Image too large: ${sizeMB.toFixed(2)}MB (max: ${MAX_FILE_SIZE_MB}MB)`);
    }
    
    return imageBuffer;
  } catch (error) {
    console.error('❌ Image resize error:', error);
    throw error;
  }
};

// Add error page for failed documents
const addErrorPage = (pdfDoc: any, originalName: string, reason: string, fileSize?: number): void => {
  const errorPage = pdfDoc.addPage([595, 842]);
  
  errorPage.drawText(`Dokument: ${originalName}`, {
    x: 50,
    y: 750,
    size: 16,
    color: rgb(0.8, 0, 0),
  });
  
  errorPage.drawText('Verarbeitung fehlgeschlagen', {
    x: 50,
    y: 720,
    size: 14,
    color: rgb(0.8, 0, 0),
  });
  
  errorPage.drawText(`Grund: ${reason}`, {
    x: 50,
    y: 690,
    size: 12,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  if (fileSize) {
    errorPage.drawText(`Dateigröße: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`, {
      x: 50,
      y: 660,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  errorPage.drawText('Das Dokument wurde übersprungen.', {
    x: 50,
    y: 630,
    size: 12,
    color: rgb(0.5, 0.5, 0.5),
  });
};

// Process PDF document with memory optimization
const processPdfDocument = async (
  pdfDoc: any,
  fileBuffer: ArrayBuffer,
  displayName: string
): Promise<boolean> => {
  try {
    console.log(`📄 Processing PDF: ${displayName}`);
    
    const uint8Array = new Uint8Array(fileBuffer);
    
    // Load with minimal options for memory efficiency
    const existingPdf = await PDFDocument.load(uint8Array, { 
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
    
    const pageCount = existingPdf.getPageCount();
    console.log(`📄 PDF has ${pageCount} pages`);
    
    if (pageCount === 0) {
      throw new Error('PDF has no pages');
    }
    
    // Limit to first 10 pages to save memory
    const maxPages = Math.min(pageCount, 10);
    const pageIndices = Array.from({ length: maxPages }, (_, i) => i);
    
    const pages = await pdfDoc.copyPages(existingPdf, pageIndices);
    
    pages.forEach((page: any) => {
      pdfDoc.addPage(page);
    });
    
    // Add note if pages were limited
    if (pageCount > maxPages) {
      const notePage = pdfDoc.addPage([595, 842]);
      notePage.drawText(`Hinweis zu: ${displayName}`, {
        x: 50,
        y: 750,
        size: 14,
        color: rgb(0, 0, 0),
      });
      notePage.drawText(`Nur ${maxPages} von ${pageCount} Seiten angezeigt`, {
        x: 50,
        y: 720,
        size: 12,
        color: rgb(0.5, 0.5, 0.5),
      });
      notePage.drawText('(Aus Speichergründen limitiert)', {
        x: 50,
        y: 700,
        size: 10,
        color: rgb(0.7, 0.7, 0.7),
      });
    }
    
    console.log(`✅ Successfully embedded PDF: ${displayName}`);
    return true;
  } catch (error) {
    console.error(`❌ PDF processing error for ${displayName}:`, error);
    
    // Try to add a simple reference page instead
    try {
      const refPage = pdfDoc.addPage([595, 842]);
      refPage.drawText(`Dokument: ${displayName}`, {
        x: 50,
        y: 750,
        size: 16,
        color: rgb(0, 0, 0),
      });
      refPage.drawText('PDF-Verarbeitung fehlgeschlagen', {
        x: 50,
        y: 720,
        size: 12,
        color: rgb(0.8, 0, 0),
      });
      refPage.drawText(`Fehler: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        x: 50,
        y: 690,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });
      return true;
    } catch (refError) {
      console.error(`❌ Could not create reference page for ${displayName}:`, refError);
      return false;
    }
  }
};

// Process image document with memory optimization
const processImageDocument = async (
  pdfDoc: any,
  fileBuffer: ArrayBuffer,
  displayName: string,
  finalType: string
): Promise<boolean> => {
  try {
    console.log(`🖼️ Processing image: ${displayName} (${(fileBuffer.byteLength / 1024).toFixed(0)}KB)`);
    
    // Resize if needed
    const resizedBuffer = await resizeImage(fileBuffer, MAX_IMAGE_DIMENSION);
    const uint8Array = new Uint8Array(resizedBuffer);
    
    let image;
    
    if (finalType === 'image/jpeg' || finalType === 'image/jpg') {
      image = await pdfDoc.embedJpg(uint8Array);
    } else if (finalType === 'image/png') {
      image = await pdfDoc.embedPng(uint8Array);
    } else {
      throw new Error(`Unsupported image format: ${finalType}`);
    }
    
    const imagePage = pdfDoc.addPage([595, 842]);
    const { width, height } = image.scale(1);
    
    // Scale image to fit page with margin
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 50;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2);
    
    const scale = Math.min(availableWidth / width, availableHeight / height, 1);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    // Center the image
    const x = (pageWidth - scaledWidth) / 2;
    const y = (pageHeight - scaledHeight) / 2;

    imagePage.drawImage(image, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
    
    console.log(`✅ Successfully embedded image: ${displayName}`);
    return true;
  } catch (error) {
    console.error(`❌ Image processing error for ${displayName}:`, error);
    return false;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse and validate request body
    const body = await req.json();
    
    let validatedData
    try {
      validatedData = documentsRequestSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('❌ Validation error:', validationError.errors)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid input', 
            details: validationError.errors 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      throw validationError
    }

    const { user_id, tax_year } = validatedData;

    console.log(`📋 Generating PDF for user ${user_id}, tax year ${tax_year}`);

    // Get user profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all documents for this user
    const { data: documents, error: docsError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', user_id)
      .in('status', ['active', 'assigned'])
      .order('upload_date', { ascending: true });

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Found ${documents.length} documents`);

    // Get master key for decryption
    const masterKey = Deno.env.get('DOCUMENT_MASTER_KEY');
    if (!masterKey) {
      console.error('❌ Master key not configured');
      return new Response(
        JSON.stringify({ error: 'Master key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate user encryption key
    const userEncryptionKey = await generateUserKey(user_id, masterKey);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add cover page
    const coverPage = pdfDoc.addPage([595, 842]);
    
    coverPage.drawText('Steuerunterlagen', {
      x: 50,
      y: 750,
      size: 24,
      color: rgb(0, 0, 0),
    });

    coverPage.drawText(`Name: ${profile.first_name} ${profile.last_name}`, {
      x: 50,
      y: 700,
      size: 16,
      color: rgb(0, 0, 0),
    });

    coverPage.drawText(`Steuerjahr: ${tax_year}`, {
      x: 50,
      y: 670,
      size: 16,
      color: rgb(0, 0, 0),
    });

    coverPage.drawText(`Anzahl Dokumente: ${documents.length}`, {
      x: 50,
      y: 640,
      size: 16,
      color: rgb(0, 0, 0),
    });

    coverPage.drawText(`Erstellt am: ${new Date().toLocaleDateString('de-CH')}`, {
      x: 50,
      y: 610,
      size: 16,
      color: rgb(0, 0, 0),
    });

    // Process statistics
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let totalSize = 0;

    // Process each document with memory optimization
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      let displayName = doc.file_name;
      let finalType = doc.file_type;
      
      console.log(`\n📄 Processing document ${i + 1}/${documents.length}: ${displayName}`);

      try {
        // Step 1: Get metadata and display name
        if (doc.metadata?.encryptedMetadata && doc.metadata?.metadataIv) {
          const decryptedMetadata = await decryptMetadata(
            doc.metadata.encryptedMetadata,
            userEncryptionKey,
            doc.metadata.metadataIv
          );
          
          if (decryptedMetadata) {
            displayName = decryptedMetadata.original_name || doc.file_name;
            finalType = decryptedMetadata.original_type || doc.file_type;
          }
        } else if (doc.metadata?.original_name) {
          displayName = doc.metadata.original_name;
          finalType = doc.metadata.original_type || doc.file_type;
        }

        // Step 2: Download and decrypt file
        let fileBuffer: ArrayBuffer | null = null;
        
        // Try encrypted bucket first
        if (doc.encrypted_metadata && doc.metadata_iv && doc.file_iv) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('tax-documents')
              .download(doc.file_path);

            if (!downloadError && fileData) {
              const encryptedBuffer = await fileData.arrayBuffer();
              
              // Check size before decryption
              const sizeMB = encryptedBuffer.byteLength / (1024 * 1024);
              if (sizeMB > MAX_FILE_SIZE_MB) {
                throw new Error(`File too large: ${sizeMB.toFixed(2)}MB (max: ${MAX_FILE_SIZE_MB}MB)`);
              }
              
              fileBuffer = await decryptFile(encryptedBuffer, userEncryptionKey, doc.file_iv);
              
              // Get type from decrypted metadata
              const decryptedMetadata = await decryptMetadata(doc.encrypted_metadata, userEncryptionKey, doc.metadata_iv);
              if (decryptedMetadata) {
                finalType = decryptedMetadata.original_type;
              }
            }
          } catch (encryptedError) {
            console.log(`⚠️ Encrypted download failed: ${encryptedError instanceof Error ? encryptedError.message : 'Unknown error'}`);
          }
        }
        
        // Fallback to unencrypted bucket
        if (!fileBuffer) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(doc.file_path);

          if (downloadError || !fileData) {
            throw new Error(`Download failed: ${downloadError?.message || 'File not found'}`);
          }

          fileBuffer = await fileData.arrayBuffer();
          
          // Check size
          const sizeMB = fileBuffer.byteLength / (1024 * 1024);
          if (sizeMB > MAX_FILE_SIZE_MB) {
            throw new Error(`File too large: ${sizeMB.toFixed(2)}MB (max: ${MAX_FILE_SIZE_MB}MB)`);
          }
        }

        // Check total size limit
        totalSize += fileBuffer.byteLength;
        if (totalSize / (1024 * 1024) > MAX_TOTAL_SIZE_MB) {
          console.log(`⚠️ Total size limit reached (${MAX_TOTAL_SIZE_MB}MB), skipping remaining documents`);
          addErrorPage(pdfDoc, displayName, 'Gesamtgrößen-Limit erreicht', fileBuffer.byteLength);
          skippedCount++;
          break;
        }

        // Detect file type if needed
        if (!finalType || finalType === 'application/octet-stream') {
          finalType = detectFileType(fileBuffer);
        }

        // Step 3: Process based on file type
        let success = false;
        
        if (finalType === 'application/pdf') {
          success = await processPdfDocument(pdfDoc, fileBuffer, displayName);
        } else if (finalType?.startsWith('image/')) {
          success = await processImageDocument(pdfDoc, fileBuffer, displayName, finalType);
        } else {
          console.warn(`⚠️ Unsupported file type: ${finalType}`);
          addErrorPage(pdfDoc, displayName, `Nicht unterstützter Dateityp: ${finalType}`, fileBuffer.byteLength);
          success = true; // We handled it with an error page
        }

        if (success) {
          successCount++;
        } else {
          errorCount++;
          addErrorPage(pdfDoc, displayName, 'Verarbeitungsfehler', fileBuffer.byteLength);
        }

        // Clean up memory after each document
        fileBuffer = null;
        
      } catch (error) {
        console.error(`❌ Error processing document ${displayName}:`, error);
        errorCount++;
        addErrorPage(pdfDoc, displayName, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Add summary page
    const summaryPage = pdfDoc.addPage([595, 842]);
    summaryPage.drawText('Verarbeitungszusammenfassung', {
      x: 50,
      y: 750,
      size: 18,
      color: rgb(0, 0, 0),
    });

    summaryPage.drawText(`Erfolgreich verarbeitet: ${successCount}`, {
      x: 50,
      y: 700,
      size: 14,
      color: rgb(0, 0.6, 0),
    });

    summaryPage.drawText(`Fehler: ${errorCount}`, {
      x: 50,
      y: 670,
      size: 14,
      color: rgb(0.8, 0, 0),
    });

    if (skippedCount > 0) {
      summaryPage.drawText(`Übersprungen: ${skippedCount}`, {
        x: 50,
        y: 640,
        size: 14,
        color: rgb(0.8, 0.5, 0),
      });
    }

    summaryPage.drawText(`Gesamtgröße: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`, {
      x: 50,
      y: 610,
      size: 12,
      color: rgb(0.5, 0.5, 0.5),
    });

    console.log(`\n📊 Processing complete: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);

    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Steuerunterlagen_${profile.last_name}_${tax_year}.pdf"`,
      },
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
