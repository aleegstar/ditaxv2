
import { useCallback, useState, useRef } from 'react';
import { toast } from './use-toast';

interface UseAutoSaveOptions {
  delay?: number;
  onSave: (data: any) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  enabled?: boolean;
  isDataLoading?: boolean;
  isSwitchingTaxYear?: boolean;
  hasSession?: boolean;
}

export function useAutoSave({
  delay = 800,
  onSave,
  onSuccess,
  onError,
  showSuccessToast = false,
  enabled = true,
  isDataLoading = false,
  isSwitchingTaxYear = false,
  hasSession = true
}: UseAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveInProgressRef = useRef(false);
  const lastSaveDataRef = useRef<any>(null);

  // Enhanced save operation with session awareness
  const performSave = useCallback(async (data: any) => {
    // Enhanced pre-save checks
    if (saveInProgressRef.current || !enabled || isDataLoading || isSwitchingTaxYear || !hasSession) {
      console.log('💾 Auto-save skipped:', { 
        saveInProgress: saveInProgressRef.current,
        enabled, 
        isDataLoading, 
        isSwitchingTaxYear,
        hasSession
      });
      return;
    }

    // Skip save if data hasn't changed
    if (lastSaveDataRef.current) {
      try {
        const currentDataStr = JSON.stringify(data);
        const lastDataStr = JSON.stringify(lastSaveDataRef.current);
        if (currentDataStr === lastDataStr) {
          console.log('💾 Auto-save skipped - data unchanged');
          return;
        }
      } catch (error) {
        console.warn('💾 Data comparison failed, proceeding with save:', error);
      }
    }

    try {
      saveInProgressRef.current = true;
      setIsSaving(true);
      
      console.log('💾 Performing auto-save with data:', data);
      await onSave(data);
      
      // Store last saved data for comparison
      try {
        lastSaveDataRef.current = JSON.parse(JSON.stringify(data));
      } catch (error) {
        console.warn('💾 Failed to store last save data for comparison:', error);
        lastSaveDataRef.current = data;
      }
      
      setLastSaved(new Date());
      onSuccess?.();
      
      if (showSuccessToast) {
        toast({
          title: "Automatisch gespeichert",
          description: "Ihre Daten wurden erfolgreich gespeichert."
        });
      }
      
      console.log('✅ Auto-save completed successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unbekannter Fehler');
      console.error('❌ Auto-save failed:', err);
      onError?.(err);
      
      // Only show error toast for actual errors
      if (!err.message.includes('cancelled') && !err.message.includes('aborted')) {
        toast({
          title: "Speicherfehler",
          description: `Fehler beim Speichern: ${err.message}`,
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, [onSave, onSuccess, onError, showSuccessToast, enabled, isDataLoading, isSwitchingTaxYear, hasSession]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Enhanced debounced save
  const debouncedSave = useCallback(async (data: any) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Don't schedule new saves during operations
    if (isSwitchingTaxYear || !hasSession) {
      console.log('💾 Debounced save cancelled due to conditions');
      return;
    }
    
    timeoutRef.current = setTimeout(() => {
      // Double-check conditions before executing save
      if (!isSwitchingTaxYear && hasSession) {
        performSave(data);
      } else {
        console.log('💾 Save cancelled at execution due to conditions');
      }
    }, delay);
  }, [performSave, delay, isSwitchingTaxYear, hasSession]);

  // Enhanced trigger save with better validation
  const triggerSave = useCallback((data: any) => {
    if (enabled && !isDataLoading && !isSwitchingTaxYear && hasSession) {
      console.log('🚀 Triggering debounced auto-save');
      debouncedSave(data);
    } else {
      console.log('🚀 Auto-save trigger ignored due to conditions:', {
        enabled,
        isDataLoading,
        isSwitchingTaxYear,
        hasSession
      });
    }
  }, [debouncedSave, enabled, isDataLoading, isSwitchingTaxYear, hasSession]);

  // Enhanced cancel save
  const cancelSave = useCallback(() => {
    console.log('🚫 Cancelling auto-save');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    saveInProgressRef.current = false;
    setIsSaving(false);
  }, []);

  // Enhanced force save
  const forceSave = useCallback(async (data: any) => {
    if (enabled && hasSession) {
      console.log('🚨 Force saving data immediately');
      // Cancel any pending debounced saves
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      await performSave(data);
    } else {
      console.log('🚨 Force save ignored due to conditions');
    }
  }, [performSave, enabled, hasSession]);

  return {
    triggerSave,
    forceSave,
    cancelSave,
    isSaving,
    lastSaved
  };
}
