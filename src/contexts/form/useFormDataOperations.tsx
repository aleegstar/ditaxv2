import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FormData, FormProgressType } from './types';
import { ChecklistItem, FormSectionKey } from '../../types';

// Document cache to prevent redundant loading
interface DocumentCache {
  documents: any[];
  checklist: ChecklistItem[];
  uploadedItems: Record<string, boolean>;
  timestamp: number;
  taxYear: string | null;
}

// Hook for data loading operations
export const useFormDataOperations = (
  taxYear: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  setFormProgress: React.Dispatch<React.SetStateAction<FormProgressType>>,
  setFormDataLoaded: React.Dispatch<React.SetStateAction<boolean>>,
  generateChecklist: () => ChecklistItem[],
  setChecklistItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>,
  defaultFormData: FormData,
  resetFormState?: () => void
) => {
  const [uploadedItems, setUploadedItems] = useState<Record<string, boolean>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [checklistItems, setLocalChecklistItems] = useState<ChecklistItem[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [documentCache, setDocumentCache] = useState<DocumentCache | null>(null);
  const [lastLoadAttempt, setLastLoadAttempt] = useState<number>(0);
  const isLoadingDocumentsRef = useRef(false);
  const lastDocumentLoadTime = useRef<number>(0);

  // Cache validity duration (5 minutes)
  const CACHE_VALIDITY_DURATION = 5 * 60 * 1000;
  
  // Clear cache when tax year changes
  const clearCache = useCallback(() => {
    console.log('Clearing document cache for tax year change');
    setDocumentCache(null);
    setUploadedItems({});
    setUploadedDocuments([]);
    setLocalChecklistItems([]);
    setLastLoadAttempt(0);
  }, []);

  // Retry operation with refresh attempt
  const retryOperation = async <T,>(operation: () => Promise<T>, maxRetries = 2): Promise<T> => {
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        console.error(`Operation failed (attempt ${retries + 1}/${maxRetries + 1}):`, error);
        
        // If we're out of retries, or it's not an auth error, just throw
        if (retries >= maxRetries || !error.message?.includes('JWT')) {
          throw error;
        }
        
        // Try to refresh the session before the next retry
        console.log("Trying to refresh session before retry...");
        await refreshSession();
        retries++;
      }
    }
    
    throw new Error("Operation failed after multiple retries");
  };

  // Improved session refresh function
  const refreshSession = async (): Promise<boolean> => {
    try {
      console.log("Refreshing auth session in form operations...");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        setAuthError(error.message);
        console.error("Failed to refresh session:", error);
        return false;
      }
      
      setAuthError(null);
      return true;
    } catch (error: any) {
      console.error("Error refreshing session:", error);
      setAuthError(error.message);
      return false;
    }
  };

  // Load form progress
  const loadFormProgress = async () => {
    if (!taxYear) {
      console.log("No tax year provided, skipping form load");
      return;
    }
    
    // Clear cache for new tax year to prevent data bleeding
    clearCache();
    
    console.log("Loading form data for tax year:", taxYear);
    
    try {
      setLoading(true);
      
      // Refresh auth session first to ensure valid tokens
      await refreshSession();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Achtung",
          description: "Bitte melden Sie sich an, um Ihre Steuererklärung zu bearbeiten.",
          variant: "destructive"
        });
        return;
      }
      
      // Query with explicit typing for database results
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('form_data')
          .select('form_type, data')
          .eq('tax_year', taxYear)
          .eq('user_id', session.user.id);
      });
      
      if (error) {
        console.error('Error loading form data:', error);
        
        // Handle row-level security errors
        if (error.message.includes('violates row-level security policy')) {
          const refreshed = await refreshSession();
          if (!refreshed) {
            toast({
              title: "Authentifizierungsfehler",
              description: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
              variant: "destructive"
            });
            return;
          }
          
          // Try again after refresh
          return loadFormProgress();
        }
        
        toast({
          title: "Fehler",
          description: `Beim Laden Ihrer Daten ist ein Fehler aufgetreten: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      console.log("Form data loaded from Supabase:", data?.length || 0, "items for tax year:", taxYear);
      
      if (data && data.length > 0) {
        // Clone default data to avoid reference issues
        const newFormData = JSON.parse(JSON.stringify(defaultFormData));
        const newFormProgress: FormProgressType = {
          contactInfo: false,
          contact: false,
          income: false,
          assets: false, 
          deductions: false,
          documents: false,
          submit: false
        };
        
        // Process each form type independently
        data.forEach((item: any) => {
          if (!item || !item.form_type || !item.data) return;
          
          console.log(`Processing loaded data for ${item.form_type} in tax year ${taxYear}:`, item.data);
          
          // Handle each section with explicit typing
          if (item.form_type === 'contactInfo') {
            newFormData.contactInfo = { 
              ...newFormData.contactInfo, 
              ...item.data 
            };
            newFormProgress.contactInfo = item.data._completed === true;
            newFormProgress.contact = item.data._completed === true; // Sync contact alias
          }
          else if (item.form_type === 'income') {
            newFormData.income = { 
              ...newFormData.income, 
              ...item.data 
            };
            newFormProgress.income = item.data._completed === true;
          }
          else if (item.form_type === 'assets') {
            newFormData.assets = { 
              ...newFormData.assets, 
              ...item.data 
            };
            newFormProgress.assets = item.data._completed === true;
          }
          else if (item.form_type === 'deductions') {
            newFormData.deductions = { 
              ...newFormData.deductions, 
              ...item.data 
            };
            newFormProgress.deductions = item.data._completed === true;
          }
        });
        
        console.log(`Setting form data from load for tax year ${taxYear}:`, newFormData);
        console.log(`Setting form progress from load for tax year ${taxYear}:`, newFormProgress);
        
        // Update state with data from database
        setFormData(newFormData);
        setFormProgress(newFormProgress);
        
        // Checklist will be regenerated by useEffect in FormContext after state updates
      } else {
        console.log("No form data found for tax year:", taxYear, "- this is a new/empty tax year");
        
        // Reset to default data for new tax year
        setFormData(JSON.parse(JSON.stringify(defaultFormData)));
        setFormProgress({
          contactInfo: false,
          contact: false,
          income: false,
          assets: false,
          deductions: false,
          documents: false,
          submit: false
        });
        
        console.log("Set default form progress for new tax year:", taxYear);
        
        // Checklist will be regenerated by useEffect in FormContext after state updates
      }
      
      // IMPORTANT: Mark form data as loaded regardless of whether data was found
      setFormDataLoaded(true);
      console.log(`Form data loading completed for tax year ${taxYear}, formDataLoaded set to true`);
      
    } catch (error) {
      console.error('Error loading form progress:', error);
      toast({
        title: "Fehler",
        description: "Beim Laden Ihrer Daten ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
      
      // Even on error, mark as loaded to prevent infinite loading
      setFormDataLoaded(true);
      console.log("Form data loading failed, but formDataLoaded set to true to prevent infinite loading");
    } finally {
      setLoading(false);
    }
  };

  // Check if storage buckets have the right permissions
  const checkStorageAccess = useCallback(async (): Promise<boolean> => {
    try {
      // First check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No valid session for storage access check");
        return false;
      }
      
      // Test if we can list the bucket contents
      const { data: bucketData, error: bucketErr } = await supabase.storage
        .from('documents')
        .list(session.user.id);
        
      if (bucketErr) {
        console.error('Error checking storage access:', bucketErr);
        
        // Try to fix storage access using our edge function
        try {
          const { error: fixError } = await supabase.functions.invoke('fix_storage_bucket', {});
          
          if (fixError) {
            console.error('Error fixing storage bucket:', fixError);
            return false;
          }
          
          // Try accessing again after fix
          const { error: retryError } = await supabase.storage
            .from('documents')
            .list(session.user.id);
            
          return !retryError;
        } catch (fixAttemptError) {
          console.error('Error during fix attempt:', fixAttemptError);
          return false;
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error checking storage access:', err);
      return false;
    }
  }, []);

  // Optimized document loading with better throttling and loop prevention
  const loadDocuments = useCallback(async (forceRefresh = false) => {
    if (!taxYear) return;
    
    // Prevent concurrent loading
    if (isLoadingDocumentsRef.current) {
      console.log('⏳ [loadDocuments] Already loading, skipping...');
      return;
    }

    const now = Date.now();

    // Enhanced throttling - minimum 3 seconds between calls (skip if forceRefresh)
    if (!forceRefresh && now - lastDocumentLoadTime.current < 3000) {
      console.log('⏱️ [loadDocuments] Throttled - too soon since last load');
      return;
    }

    lastDocumentLoadTime.current = now;
    isLoadingDocumentsRef.current = true;
    setLastLoadAttempt(now);
    
    // Check if we can use cached documents (skip if forceRefresh)
    if (!forceRefresh && documentCache && 
        documentCache.taxYear === taxYear && 
        (now - documentCache.timestamp < CACHE_VALIDITY_DURATION)) {
      console.log(`Using cached documents for tax year ${taxYear}:`, documentCache.documents.length);
      setUploadedDocuments(documentCache.documents);
      setUploadedItems(documentCache.uploadedItems);
      setChecklistItems(documentCache.checklist);
      return;
    }
    
    // Clear cache if tax year doesn't match
    if (documentCache && documentCache.taxYear !== taxYear) {
      console.log(`Tax year changed from ${documentCache.taxYear} to ${taxYear}, clearing cache`);
      clearCache();
    }
    
    try {
      setLoading(true);
      
      // Refresh session first
      await refreshSession();
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Achtung",
          description: "Bitte melden Sie sich an, um Ihre Dokumente zu laden.",
          variant: "destructive"
        });
        return;
      }
      
      // Check if storage bucket exists and we have access
      const hasStorageAccess = await checkStorageAccess();
      if (!hasStorageAccess) {
        toast({
          title: "Storage-Problem",
          description: "Es gab ein Problem beim Zugriff auf den Dokumentenspeicher. Bitte versuchen Sie es später erneut.",
          variant: "default"
        });
      }
      
      // Fetch uploaded documents from Supabase - filter by tax year
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('uploaded_documents')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('tax_year', taxYear)
          .eq('status', 'active')
          .order('upload_date', { ascending: false });
      });
        
      if (error) {
        console.error('Error loading documents:', error);
        
        // Handle RLS policy errors
        if (error.message.includes('violates row-level security policy')) {
          const refreshed = await refreshSession();
          if (!refreshed) {
            toast({
              title: "Authentifizierungsfehler",
              description: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
              variant: "destructive"
            });
            return;
          }
          
          // Try again after refresh
          return loadDocuments();
        }
        
        toast({
          title: "Fehler",
          description: `Beim Laden Ihrer Dokumente ist ein Fehler aufgetreten: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      if (data && data.length > 0) {
        // Process documents and update state
        const newUploadedItems: Record<string, boolean> = {};
        
        // Create paths array for batch URL creation
        const filePaths = data.map((doc: any) => doc.file_path);
        const docMap: Record<string, any> = {};
        
        // Store documents by file path for easy lookup
        data.forEach((doc: any) => {
          docMap[doc.file_path] = doc;
          // Mark checklist item as uploaded
          newUploadedItems[doc.checklist_item_id] = true;
        });
        
        // Get signed URLs in batch
        const { data: signedUrlsData, error: signedUrlsError } = await supabase.storage
          .from('documents')
          .createSignedUrls(filePaths, 60 * 60 * 24); // Valid for 24 hours
          
        if (signedUrlsError) {
          console.error('Error creating signed URLs:', signedUrlsError);
        }
        
        // Process all documents with their URLs
        const documents = data.map((doc: any, index: number) => {
          const signedUrlInfo = signedUrlsData?.[index];
          
          // Defensive check: warn if document tax_year doesn't match current context
          if (doc.tax_year && doc.tax_year !== taxYear) {
            console.warn(`⚠️ Document ${doc.id} has tax_year ${doc.tax_year} but current context is ${taxYear}`);
          }
          
          return {
            id: doc.id,
            checklistItemId: doc.checklist_item_id,
            fileName: doc.file_name,
            fileType: doc.file_type,
            url: signedUrlInfo?.signedUrl || '',
            uploadDate: new Date(doc.upload_date),
            taxYear: doc.tax_year
          };
        });
        
        // Update state with loaded documents
        setUploadedDocuments(documents);
        setUploadedItems(newUploadedItems);
        
        console.log(`Documents loaded for tax year ${taxYear}:`, documents.length);
        
        // Generate checklist with updated upload status
        const newChecklist = generateChecklist().map(item => ({
          ...item,
          uploaded: !!newUploadedItems[item.id]
        }));
        
        setChecklistItems(newChecklist);
        
        // Cache the documents with tax year
        setDocumentCache({
          documents,
          checklist: newChecklist,
          uploadedItems: newUploadedItems,
          timestamp: now,
          taxYear
        });
      } else {
        console.log(`No documents found for tax year ${taxYear}`);
        // Generate checklist anyway
        const newChecklist = generateChecklist();
        setChecklistItems(newChecklist);
        
        // Cache empty results too with tax year
        setDocumentCache({
          documents: [],
          checklist: newChecklist,
          uploadedItems: {},
          timestamp: now,
          taxYear
        });
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast({
        title: "Fehler",
        description: `Beim Laden Ihrer Dokumente ist ein Fehler aufgetreten: ${error.message || "Unbekannt"}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      isLoadingDocumentsRef.current = false;
    }
  }, [taxYear, lastLoadAttempt, documentCache, checkStorageAccess, generateChecklist, setChecklistItems, clearCache]);

  return {
    loadFormProgress,
    loadDocuments,
    uploadedItems,
    uploadedDocuments,
    refreshSession,
    authError,
    retryOperation,
    checkStorageAccess,
    clearCache
  };
};

export default useFormDataOperations;
