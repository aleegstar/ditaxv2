import { supabase } from '@/integrations/supabase/client';

interface PdfDownloadOptions {
  userId: string;
  taxYear: string;
  userName: string;
  timeout?: number;
  retries?: number;
}

export class PdfDownloadError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'PdfDownloadError';
  }
}

export const downloadFormDataPdf = async (options: PdfDownloadOptions): Promise<ArrayBuffer> => {
  const { userId, taxYear, userName, timeout = 30000, retries = 2 } = options;
  
  console.log('🎯 Starting PDF download with options:', options);
  
  // Get authentication token
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    throw new PdfDownloadError('Authentication required - please login again');
  }

  const attemptDownload = async (attempt: number): Promise<ArrayBuffer> => {
    console.log(`📡 Attempt ${attempt + 1}/${retries + 1} to download PDF`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Use Supabase client for proper authentication
      const { data, error } = await supabase.functions.invoke('generate-form-data-pdf', {
        body: {
          userId,
          taxYear,
          userName
        },
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (!data || data.byteLength === 0) {
        throw new Error('Empty response received from server');
      }
      
      console.log('✅ PDF downloaded successfully, size:', data.byteLength);
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new PdfDownloadError(`Request timeout after ${timeout}ms`, error);
      }
      
      throw error;
    }
  };

  // Retry logic
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await attemptDownload(attempt);
    } catch (error) {
      lastError = error as Error;
      console.warn(`❌ Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new PdfDownloadError(
    `PDF download failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    lastError
  );
};

export const triggerPdfDownload = (data: ArrayBuffer, fileName: string) => {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  console.log('🎉 PDF download triggered:', fileName);
};