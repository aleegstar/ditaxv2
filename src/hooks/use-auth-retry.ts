
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
};

export function useAuthRetry(config: Partial<RetryConfig> = {}) {
  const { maxRetries, baseDelay, maxDelay } = { ...defaultConfig, ...config };
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const delay = useCallback((ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }, []);

  const calculateDelay = useCallback((attempt: number) => {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    return Math.min(exponentialDelay, maxDelay);
  }, [baseDelay, maxDelay]);

  const retryWithBackoff = useCallback(async <T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        
        if (attempt > 0) {
          setIsRetrying(true);
          const delayTime = calculateDelay(attempt - 1);
          console.log(`Auth retry attempt ${attempt}/${maxRetries}, waiting ${delayTime}ms`);
          await delay(delayTime);
        }
        
        const result = await operation();
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`Auth operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          break;
        }
      }
    }
    
    setIsRetrying(false);
    throw lastError;
  }, [maxRetries, calculateDelay, delay]);

  const sendOTPWithRetry = useCallback(async (email: string) => {
    return retryWithBackoff(
      async () => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (error) {
          throw error;
        }
        
        return { success: true };
      },
      (error) => {
        // Retry on timeout, network, or server errors
        return error.message?.includes('timeout') ||
               error.message?.includes('504') ||
               error.message?.includes('deadline exceeded') ||
               error.message?.includes('network') ||
               error.message?.includes('fetch failed');
      }
    );
  }, [retryWithBackoff]);

  const verifyOTPWithRetry = useCallback(async (email: string, token: string) => {
    return retryWithBackoff(
      async () => {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email'
        });
        
        if (error) {
          throw error;
        }
        
        return { success: true };
      },
      (error) => {
        // Don't retry on invalid code errors
        if (error.message?.includes('invalid') || error.message?.includes('expired')) {
          return false;
        }
        
        // Retry on timeout, network, or server errors
        return error.message?.includes('timeout') ||
               error.message?.includes('504') ||
               error.message?.includes('deadline exceeded') ||
               error.message?.includes('network') ||
               error.message?.includes('fetch failed');
      }
    );
  }, [retryWithBackoff]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retryCount,
    isRetrying,
    sendOTPWithRetry,
    verifyOTPWithRetry,
    reset
  };
}
