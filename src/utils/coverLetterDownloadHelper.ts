import { supabase } from '@/integrations/supabase/client';

interface CoverLetterDownloadOptions {
  userId: string;
  userName?: string;
  timeout?: number;
  maxRetries?: number;
}

export class CoverLetterDownloadError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'CoverLetterDownloadError';
  }
}

export async function downloadCoverLetterPdf(
  options: CoverLetterDownloadOptions
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const { userId, userName, timeout = 30000, maxRetries = 3 } = options;
  
  console.log('Starting cover letter download with options:', { userId, userName, timeout, maxRetries });

  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Authentication error:', sessionError);
    throw new CoverLetterDownloadError('User not authenticated');
  }

  let lastError: any;
  
  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Cover letter download attempt ${attempt}/${maxRetries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Clean and prepare request body - remove undefined values to prevent serialization issues
      const cleanedData: Record<string, any> = {
        userId: userId.trim(),
      };
      
      // Only add userName if it has a valid value
      if (userName && userName.trim()) {
        cleanedData.userName = userName.trim();
      }
      
      // Remove any remaining undefined values
      const requestBody = Object.fromEntries(
        Object.entries(cleanedData).filter(([_, value]) => value !== undefined)
      );
      
      console.log('Sending cleaned request body:', requestBody);
      console.log('Request body string length:', JSON.stringify(requestBody).length);

      // Use Supabase client for proper authentication and API key handling
      const { data: responseData, error: functionError } = await supabase.functions.invoke(
        'generate-cover-letter-pdf',
        {
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      clearTimeout(timeoutId);

      if (functionError) {
        console.error('Function error:', functionError);
        throw new CoverLetterDownloadError(
          `Function error: ${functionError.message}`
        );
      }

      // Check if response is valid
      if (!responseData) {
        throw new CoverLetterDownloadError('Empty response from function');
      }

      // The response should be a base64-encoded buffer or direct buffer
      let documentBuffer: ArrayBuffer;
      if (typeof responseData === 'string') {
        // If it's a base64 string, decode it
        const binaryString = atob(responseData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        documentBuffer = bytes.buffer;
      } else if (responseData instanceof ArrayBuffer) {
        documentBuffer = responseData;
      } else if (responseData.buffer) {
        documentBuffer = responseData.buffer;
      } else {
        throw new CoverLetterDownloadError('Unexpected response format from function');
      }

      // Determine content type from response or default to PDF
      const contentType = responseData.contentType || 'application/pdf';
      
      console.log('Document received successfully, size:', documentBuffer.byteLength, 'type:', contentType);
      return { buffer: documentBuffer, contentType };

    } catch (error: any) {
      lastError = error;
      console.error(`Cover letter download attempt ${attempt} failed:`, error);
      
      if (error.name === 'AbortError') {
        throw new CoverLetterDownloadError('Request timed out');
      }
      
      // Don't retry on authentication errors or client errors
      if (error.message.includes('authenticated') || 
          error.message.includes('400') ||
          error.message.includes('401') ||
          error.message.includes('403')) {
        console.log('Not retrying due to client error:', error.message);
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new CoverLetterDownloadError(
    `Failed to download cover letter after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
    lastError
  );
}

export function triggerCoverLetterDownload(data: ArrayBuffer, fileName: string, contentType: string): void {
  const blob = new Blob([data], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}