import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { toast } from '../../hooks/use-toast';
import { defaultFormData } from './defaults';
import { FormData, FormProgressType, FormContextType, QuestionProgressType } from './types';
import { ChecklistItem, FormSectionKey } from '../../types';
import { generateChecklistItems } from './checklistGenerator';
import { documentService } from '../../services/DocumentService';
import { androidDebug, safeClone } from '../../utils/androidDebug';
import { useTaxFiler } from '../TaxFilerContext';
import { useAuth } from '../AuthContext';

// Production-safe logging - only log in development
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

const getTaxYear = () => {
  return (new Date().getFullYear() - 1).toString();
};

const calculateCurrentStep = (formProgress: FormProgressType, formDataLoaded: boolean): number => {
  if (!formDataLoaded) return 0;
  
  const progressValues = Object.values(formProgress);
  const hasAnyProgress = progressValues.some(Boolean);
  
  if (!hasAnyProgress) return 0;
  
  if (formProgress.contactInfo && !formProgress.income) return 1;
  if (formProgress.income && !formProgress.assets) return 2;
  if (formProgress.assets && !formProgress.deductions) return 3;
  if (formProgress.deductions) return 4;
  
  return 0;
};

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider: React.FC<{ children: React.ReactNode; taxYear?: string }> = ({ children, taxYear: propTaxYear }) => {
  // Get auth state from central AuthContext
  const { userId, isValid: isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  // Get active tax filer from TaxFilerContext
  const { activeTaxFilerId, activeTaxFiler, isLoading: isTaxFilerLoading } = useTaxFiler();
  
  // Stable refs to prevent unnecessary re-renders
  const loadingRef = useRef<boolean>(false);
  const taxYearSwitchRef = useRef<boolean>(false);
  const initialLoadCompletedRef = useRef<boolean>(false);
  const previousTaxFilerIdRef = useRef<string | null>(null);
  
  // Core state
  const [formData, setFormData] = useState<FormData>(() => JSON.parse(JSON.stringify(defaultFormData)));
  const [formProgress, setFormProgress] = useState<FormProgressType>({
    contactInfo: false,
    contact: false,
    income: false,
    assets: false,
    deductions: false,
    summary: false,
    documents: false,
    submit: false
  });
  const [questionProgress, setQuestionProgress] = useState<QuestionProgressType>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [isSwitchingTaxYear, setIsSwitchingTaxYear] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [taxYear, setTaxYear] = useState<string>(propTaxYear || getTaxYear());
  const [formDataLoaded, setFormDataLoaded] = useState<boolean>(false);
  const [isManualNavigation, setIsManualNavigation] = useState<boolean>(false);
  
  // Update taxYear when propTaxYear changes
  useEffect(() => {
    if (propTaxYear && propTaxYear !== taxYear) {
      console.log('📅 Tax year changed from', taxYear, 'to', propTaxYear);
      setTaxYear(propTaxYear);
    }
  }, [propTaxYear]);
  
  
  // Document state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [lastChecklistUpdate, setLastChecklistUpdate] = useState<Date | null>(null);
  const [uploadedMap, setUploadedMap] = useState<Record<string, boolean>>({});

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // Chat history state
  const [chatHistory, setChatHistory] = useState<Array<{
    stepId: string;
    question: string;
    answer: any;
    stepType: 'text' | 'boolean' | 'select' | 'address' | 'repeater';
    explanation?: string;
  }>>([]);

  // Development logging - disabled by default to prevent console spam
  // Uncomment for debugging:
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('FormContext render:', { taxYear, formDataLoaded, isSwitchingTaxYear });
  // }

  // No more local session listener — AuthContext handles auth state centrally

  // Enhanced form data loading with session-aware approach
  const loadFormDataFromDatabase = useCallback(async (yearToLoad: string) => {
    if (loadingRef.current || taxYearSwitchRef.current) {
      console.log('⚠️ Skipping load - operation in progress');
      return;
    }
    
    // Wait for tax filer to be available
    if (!activeTaxFilerId) {
      console.log('⚠️ No active tax filer, skipping load');
      return;
    }
    
    androidDebug.log(`Starting loadFormDataFromDatabase for year: ${yearToLoad}, taxFilerId: ${activeTaxFilerId}`);
    console.log(`🔄 [LOAD] Loading form data for year: ${yearToLoad}, tax filer: ${activeTaxFilerId}`);
    loadingRef.current = true;
    setIsDataLoading(true);
    
    try {
      if (!userId) {
        androidDebug.log('Not authenticated, using default data');
        devLog('Not authenticated, using default data');
        const freshDefaults = androidDebug.isAndroid() ? safeClone(defaultFormData) : JSON.parse(JSON.stringify(defaultFormData));
        setFormData(freshDefaults);
        setFormProgress({
          contactInfo: false,
          contact: false,
          income: false,
          assets: false,
          deductions: false,
          summary: false,
          documents: false,
          submit: false
        });
        setFormDataLoaded(true);
        return;
      }

      androidDebug.log('Authenticated, loading form data from database');

      // Load data with cached session - filter by tax_filer_id
      const { data, error } = await supabase
        .from('form_data')
        .select('form_type, data')
        .eq('tax_year', yearToLoad)
        .eq('user_id', userId)
        .eq('tax_filer_id', activeTaxFilerId)
        .not('form_type', 'like', '%_progress');

      if (error) {
        androidDebug.criticalError('Error loading form data', error);
        console.error('Error loading form data:', error);
        throw error;
      }

      androidDebug.log(`Loaded ${data?.length || 0} form data entries`, data);
      console.log(`📊 [LOAD] Loaded ${data?.length || 0} form data entries for year ${yearToLoad}:`, data);

      // Always start with fresh defaults to prevent data bleeding - use safe cloning for Android
      const newFormData = androidDebug.isAndroid() ? safeClone(defaultFormData) : JSON.parse(JSON.stringify(defaultFormData));
      const newFormProgress: FormProgressType = {
        contactInfo: false,
        contact: false,
        income: false,
        assets: false,
        deductions: false,
        summary: false,
        documents: false,
        submit: false
      };

      androidDebug.log('Created new form data structure');

      // Apply data if it exists
      if (data && data.length > 0) {
        // Valid form types that exist in defaultFormData
        const validFormTypes = Object.keys(defaultFormData) as Array<keyof FormData>;
        androidDebug.log('Valid form types', validFormTypes);
        
        data.forEach((item: any) => {
          try {
            if (item.form_type && item.data) {
              // Only apply data for known form types
              if (validFormTypes.includes(item.form_type as keyof FormData)) {
                androidDebug.log(`Applying ${item.form_type} data`);
                console.log(`📝 [LOAD] Applying ${item.form_type} data for year ${yearToLoad}:`, item.data);
                
                // Safe merge for Android
                if (androidDebug.isAndroid()) {
                  newFormData[item.form_type as keyof FormData] = {
                    ...safeClone(newFormData[item.form_type as keyof FormData]),
                    ...safeClone(item.data)
                  };
                } else {
                  newFormData[item.form_type as keyof FormData] = {
                    ...newFormData[item.form_type as keyof FormData],
                    ...item.data
                  };
                }
                
                // For multi-step yes/no sections, only mark complete if _completed flag is set
                const multiStepSections = ['income', 'assets', 'deductions', 'contactInfo'];
                if (multiStepSections.includes(item.form_type)) {
                  newFormProgress[item.form_type as keyof FormProgressType] = item.data._completed === true;
                } else {
                  newFormProgress[item.form_type as keyof FormProgressType] = true;
                }
                
                // Sync contact and contactInfo
                if (item.form_type === 'contactInfo') {
                  newFormProgress.contact = item.data._completed === true;
                }
              } else if (item.form_type === 'summary' && item.data?.confirmed === true) {
                // Special handling for summary confirmation status
                androidDebug.log('📌 Summary progress restored from DB');
                console.log('📌 [LOAD] Summary progress restored from DB for year', yearToLoad);
                newFormProgress.summary = true;
              } else {
                androidDebug.log(`Ignoring unknown form_type: ${item.form_type}`);
                console.warn(`⚠️ [LOAD] Ignoring unknown form_type: ${item.form_type}`);
              }
            }
          } catch (itemError) {
            androidDebug.criticalError(`Error processing form item ${item.form_type}`, itemError);
            console.error(`Error processing form item ${item.form_type}:`, itemError);
          }
        });
      } else {
        androidDebug.log('No existing data found, using fresh defaults');
        console.log(`📋 [LOAD] No existing data found for year ${yearToLoad}, using fresh defaults`);
      }

      androidDebug.log('Data processing complete, updating state');
      setFormData(newFormData);
      setFormProgress(newFormProgress);
      setFormDataLoaded(true);
      
      console.log(`✅ [LOAD] Form data loaded successfully for year ${yearToLoad}`, {
        formData: newFormData,
        formProgress: newFormProgress
      });

      androidDebug.log('State updated successfully');

    } catch (error) {
      androidDebug.criticalError('Unexpected error in loadFormDataFromDatabase', error);
      console.error('❌ Error loading form data:', error);
      // Use fresh defaults on error - safe for Android
      const freshDefaults = androidDebug.isAndroid() ? safeClone(defaultFormData) : JSON.parse(JSON.stringify(defaultFormData));
      setFormData(freshDefaults);
      setFormProgress({
        contactInfo: false,
        contact: false,
        income: false,
        assets: false,
        deductions: false,
        summary: false,
        documents: false,
        submit: false
      });
      setFormDataLoaded(true);
    } finally {
      loadingRef.current = false;
      setIsDataLoading(false);
    }
  }, [userId, activeTaxFilerId]);

  // Enhanced tax year switching with complete isolation
  const switchTaxYear = useCallback(async (newTaxYear: string) => {
    if (newTaxYear === taxYear || loading || isSwitchingTaxYear || taxYearSwitchRef.current) {
      console.log('⚠️ Tax year switch ignored:', { newTaxYear, taxYear, loading, isSwitchingTaxYear });
      return;
    }
    
    console.log(`🔄 Switching to tax year ${newTaxYear} from ${taxYear}`);
    
    // Prevent concurrent operations
    taxYearSwitchRef.current = true;
    initialLoadCompletedRef.current = false; // Reset for new tax year
    setLoading(true);
    setIsSwitchingTaxYear(true);
    
    try {
      // Complete state reset
      console.log('🧹 Performing complete state reset');
      setFormDataLoaded(false);
      setIsManualNavigation(false);
      setCurrentStep(0);
      
      // Clear all document-related state
      setChecklistItems([]);
      setUploadedDocuments([]);
      setUploadedMap({});
      setLastChecklistUpdate(null);
      
      // Clear validation errors
      setValidationErrors({});
      
      // Reset question progress
      setQuestionProgress({});
      
      // Reset form data and progress to fresh defaults
      const freshDefaults = JSON.parse(JSON.stringify(defaultFormData));
      setFormData(freshDefaults);
      setFormProgress({
        contactInfo: false,
        contact: false,
        income: false,
        assets: false,
        deductions: false,
        summary: false,
        documents: false,
        submit: false
      });
      
      console.log('🔄 State reset complete, updating tax year');
      
      // Update tax year
      setTaxYear(newTaxYear);
      
      // Small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Load new data for the target year
      console.log(`📥 Loading data for new year: ${newTaxYear}`);
      await loadFormDataFromDatabase(newTaxYear);
      
      // Load documents for the new tax year
      if (userId) {
        console.log(`📄 Loading documents for new tax year: ${newTaxYear}`);
        await loadDocuments();
      }
      
      console.log(`✅ Tax year switch completed: ${newTaxYear}`);
      
    } catch (error) {
      console.error('❌ Error switching tax year:', error);
      toast({
        title: "Fehler",
        description: "Beim Wechseln des Steuerjahres ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    } finally {
      taxYearSwitchRef.current = false;
      setLoading(false);
      setIsSwitchingTaxYear(false);
    }
  }, [taxYear, loading, isSwitchingTaxYear, loadFormDataFromDatabase]);

  // Navigation functions
  const handleNext = useCallback(() => {
    if (currentStep < 5) {
      setIsManualNavigation(true);
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setIsManualNavigation(true);
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Validation functions
  const updateValidationErrors = useCallback((formType: FormSectionKey, errors: string[]) => {
    setValidationErrors(prev => ({
      ...prev,
      [formType]: errors
    }));
  }, []);

  const clearValidationErrors = useCallback((formType: FormSectionKey) => {
    setValidationErrors(prev => ({
      ...prev,
      [formType]: []
    }));
  }, []);

  const hasValidationError = useCallback((formType: FormSectionKey, fieldName: string) => {
    return validationErrors[formType]?.includes(fieldName) || false;
  }, [validationErrors]);

  // Form data operations
  const updateFormData = useCallback((section: FormSectionKey, data: Record<string, any>) => {
    setFormData(prevData => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        ...data
      }
    }));
  }, []);

  const updateFormProgress = useCallback((section: FormSectionKey, completed: boolean) => {
    setFormProgress(prev => {
      if (prev[section] === completed) return prev;
      return { ...prev, [section]: completed };
    });
  }, []);

  const updateQuestionProgress = useCallback(async (section: 'income' | 'assets' | 'deductions', questionIndex: number) => {
    // Update local state immediately
    setQuestionProgress(prev => ({
      ...prev,
      [section]: questionIndex
    }));
    
    // Save to database if we have a session, tax year and tax filer
    if (userId && taxYear && activeTaxFilerId) {
      try {
        const { data: existingData, error: checkError } = await supabase
          .from('form_data')
          .select('id, data')
          .eq('user_id', userId)
          .eq('tax_year', taxYear)
          .eq('tax_filer_id', activeTaxFilerId)
          .eq('form_type', `${section}_progress`);

        if (checkError) {
          console.error('Error checking existing question progress:', checkError);
          return;
        }

        const progressData = { questionIndex };

        if (existingData && existingData.length > 0) {
          await supabase
            .from('form_data')
            .update({ 
              data: progressData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingData[0].id);
        } else {
          await supabase
            .from('form_data')
            .insert({
              user_id: userId,
              tax_year: taxYear,
              tax_filer_id: activeTaxFilerId,
              form_type: `${section}_progress`,
              data: progressData
            });
        }
      } catch (error) {
        console.error('Error saving question progress:', error);
      }
    }
  }, [userId, taxYear, activeTaxFilerId]);

  // Reset field functionality
  const resetFormField = useCallback((section: FormSectionKey, fieldName: string) => {
    console.log(`Resetting field ${fieldName} in section ${section}`);
    
    const defaultValue = defaultFormData[section][fieldName];
    
    setFormData(prevData => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [fieldName]: defaultValue
      }
    }));

    toast({
      title: "Feld zurückgesetzt",
      description: `${fieldName} wurde auf den Standardwert zurückgesetzt.`,
    });
  }, []);

  // Reset entire section functionality
  const resetFormSection = useCallback((section: FormSectionKey) => {
    console.log(`Resetting entire section: ${section}`);
    
    const defaultSectionData = defaultFormData[section];
    
    setFormData(prevData => ({
      ...prevData,
      [section]: JSON.parse(JSON.stringify(defaultSectionData))
    }));

    setFormProgress(prev => ({
      ...prev,
      [section]: false
    }));

    toast({
      title: "Sektion zurückgesetzt",
      description: `Die ${section} Sektion wurde komplett zurückgesetzt.`,
    });
  }, []);

  // Fixed checklist generation - prevent during loading and reduce dependencies
  const lastFormDataHash = useRef<string>('');
  const lastFormProgressHash = useRef<string>('');
  
  const generateChecklist = useMemo(() => {
    return () => {
      // Skip checklist generation during data loading or tax year switching
      if (!formDataLoaded || isDataLoading || isSwitchingTaxYear || loadingRef.current || taxYearSwitchRef.current) {
        return checklistItems; // Return existing items instead of regenerating
      }

      // Create hashes of form data and progress to detect actual changes
      const formDataHash = JSON.stringify({ contactInfo: formData.contactInfo, income: formData.income, assets: formData.assets, deductions: formData.deductions });
      const formProgressHash = JSON.stringify(formProgress);
      
      // Only regenerate if data actually changed
      if (formDataHash === lastFormDataHash.current && formProgressHash === lastFormProgressHash.current) {
        return checklistItems;
      }
      
      lastFormDataHash.current = formDataHash;
      lastFormProgressHash.current = formProgressHash;
      
      try {
        const items = generateChecklistItems(formData, formProgress);
        
        const updatedItems = items.map(item => ({
          ...item,
          uploaded: uploadedMap[item.id] || false
        }));
        
        setChecklistItems(updatedItems);
        setLastChecklistUpdate(new Date());
        return updatedItems;
      } catch (error) {
        console.error('❌ Error generating checklist:', error);
        return [];
      }
    };
  }, [formData, formProgress, uploadedMap, formDataLoaded, isDataLoading, isSwitchingTaxYear, checklistItems]);

  // Document management
  const addDocument = useCallback((doc: any) => {
    setUploadedDocuments(prev => [...prev, doc]);
  }, []);

  const removeDocument = useCallback((docId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
  }, []);

  // Document progress checking - stabilized with refs
  const lastProgressCheckRef = useRef<{ checklist: number, uploaded: number, progress: boolean }>({ checklist: 0, uploaded: 0, progress: false });
  
  const updateDocumentProgress = useCallback(() => {
    if (!formDataLoaded) {
      return;
    }

    // If checklist is empty, verify if it's truly empty or just not generated yet
    if (checklistItems.length === 0) {
      // Defensive check: verify that formData doesn't have data requiring documents
      const hasIncomeData = formData.income?.hasSalary || 
                           formData.income?.hasRental || 
                           formData.income?.hasDividends || 
                           formData.income?.hasFreelance || 
                           formData.income?.hasPension ||
                           formData.income?.hasGiftInheritance ||
                           formData.income?.hasPensionPayout ||
                           formData.income?.hasOtherIncome;
      
      const hasAssetsData = formData.assets?.hasDepositAccount ||
                           formData.assets?.hasCrypto ||
                           formData.assets?.hasMortgage ||
                           formData.assets?.hasProperty ||
                           formData.assets?.hasDebt ||
                           formData.assets?.hasVehicle;
      
      const hasDeductionsData = formData.deductions?.hasPillar3a ||
                               formData.deductions?.hasBVGPurchase ||
                               formData.deductions?.hasEducationExpenses ||
                               formData.deductions?.hasDonations ||
                               formData.deductions?.hasPropertyMaintenance ||
                               formData.deductions?.hasChildcare ||
                               formData.deductions?.hasSupportedPersons ||
                               formData.deductions?.hasMaintenancePayments;
      
      // Only mark documents as complete if genuinely no documents are required
      if (!hasIncomeData && !hasAssetsData && !hasDeductionsData) {
        const mainSectionsComplete = formProgress.contactInfo && 
                                   formProgress.income && 
                                   formProgress.deductions && 
                                   formProgress.assets && 
                                   formProgress.summary;
        
        if (mainSectionsComplete && !formProgress.documents) {
          console.log('📝 No documents required (verified), marking documents section as complete');
          updateFormProgress('documents', true);
        }
      } else {
        console.log('⚠️ Checklist empty but formData suggests documents are required - waiting for checklist generation');
      }
      return;
    }

    const requiredDocuments = checklistItems.filter(item => item.required);
    const uploadedRequiredDocuments = requiredDocuments.filter(item => item.uploaded);
    
    // If no required documents exist, documents section should be marked as complete
    // If all required documents are uploaded, also mark as complete
    const allRequiredDocumentsUploaded = requiredDocuments.length === 0 || 
      (requiredDocuments.length > 0 && uploadedRequiredDocuments.length === requiredDocuments.length);

    // Check if anything actually changed to prevent loops
    const lastCheck = lastProgressCheckRef.current;
    if (lastCheck.checklist === requiredDocuments.length && 
        lastCheck.uploaded === uploadedRequiredDocuments.length && 
        lastCheck.progress === formProgress.documents) {
      return; // No changes, skip update
    }

    // Update ref with current values
    lastProgressCheckRef.current = {
      checklist: requiredDocuments.length,
      uploaded: uploadedRequiredDocuments.length,
      progress: allRequiredDocumentsUploaded
    };

    // Only update if the status has changed
    if (formProgress.documents !== allRequiredDocumentsUploaded) {
      console.log(`📝 Updating document progress: ${requiredDocuments.length} required, ${uploadedRequiredDocuments.length} uploaded, complete: ${allRequiredDocumentsUploaded}`);
      updateFormProgress('documents', allRequiredDocumentsUploaded);
    }
  }, [checklistItems, formProgress, formDataLoaded, updateFormProgress]);

  const markUploaded = useCallback((itemId: string, uploaded: boolean) => {
    setUploadedMap(prev => ({
      ...prev,
      [itemId]: uploaded
    }));
    
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, uploaded } : item
      )
    );
    
    // Trigger document progress check after marking uploaded status - debounced
    setTimeout(() => {
      updateDocumentProgress();
    }, 100);
  }, [updateDocumentProgress]);

  const clearDocuments = useCallback(() => {
    setUploadedDocuments([]);
    setUploadedMap({});
  }, []);

  // Enhanced save section with detailed logging and cached session
  const saveSection = async (section: FormSectionKey, data: any, markComplete: boolean = false) => {
    if (!taxYear || taxYearSwitchRef.current || isSwitchingTaxYear) {
      console.log("⚠️ [SAVE] Skipping save during tax year operations", {
        noTaxYear: !taxYear,
        switchInProgress: taxYearSwitchRef.current,
        isSwitching: isSwitchingTaxYear
      });
      return;
    }

    if (!userId) {
      devLog("⚠️ [SAVE] Not authenticated - data will be saved when user logs in");
      // Still update local state
      updateFormData(section, data);
      updateFormProgress(section, true);
      return;
    }

    if (!activeTaxFilerId) {
      console.log("⚠️ [SAVE] No active tax filer - cannot save");
      return;
    }

    console.log(`💾 [SAVE] Saving section ${section} for year ${taxYear}, tax filer ${activeTaxFilerId} with data:`, data);

    try {
      setLoading(true);

      // Use cached session directly - filter by tax_filer_id
      const { data: existingData, error: checkError } = await supabase
        .from('form_data')
        .select('id')
        .eq('user_id', userId)
        .eq('tax_year', taxYear)
        .eq('tax_filer_id', activeTaxFilerId)
        .eq('form_type', section);

      if (checkError) {
        console.error('❌ [SAVE] Error checking existing data:', checkError);
        throw checkError;
      }

      // Update local state
      updateFormData(section, data);
      
      // Only mark as complete if explicitly requested
      if (markComplete) {
        updateFormProgress(section, true);
        generateChecklist();
      }

      let result;
      if (existingData && existingData.length > 0) {
        console.log(`🔄 [SAVE] Updating existing record for ${section}`);
        result = await supabase
          .from('form_data')
          .update({ 
            data,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData[0].id);
      } else {
        console.log(`➕ [SAVE] Creating new record for ${section}`);
        result = await supabase
          .from('form_data')
          .insert({
            user_id: userId,
            tax_year: taxYear,
            tax_filer_id: activeTaxFilerId,
            form_type: section,
            data
          });
      }

      if (result.error) {
        console.error('❌ [SAVE] Database save error:', result.error);
        throw result.error;
      }

      console.log(`✅ [SAVE] Successfully saved ${section} data to database for year ${taxYear}, tax filer ${activeTaxFilerId}`);

    } catch (error: any) {
      console.error('❌ [SAVE] Error saving form data:', error);
      toast({
        title: "Speicherfehler",
        description: `Fehler beim Speichern: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Import functions for previous year data
  // Use a ref for userId to stabilize the callback reference
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const hasDataForPreviousYear = useCallback(async (section: FormSectionKey): Promise<boolean> => {
    try {
      const currentUserId = userIdRef.current;
      if (!currentUserId || !activeTaxFilerId) return false;

      const previousYear = (parseInt(taxYear) - 1).toString();
      
      const { data, error } = await supabase
        .from('form_data')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('tax_year', previousYear)
        .eq('tax_filer_id', activeTaxFilerId)
        .eq('form_type', section)
        .limit(1);

      if (error) {
        console.error('Error checking previous year data:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in hasDataForPreviousYear:', error);
      return false;
    }
  }, [taxYear, activeTaxFilerId]);

  const importFromPreviousYear = useCallback(async (section: FormSectionKey) => {
    try {
      if (!userId) {
        throw new Error('Nicht authentifiziert');
      }
      
      if (!activeTaxFilerId) {
        throw new Error('Keine Person ausgewählt');
      }

      const previousYear = (parseInt(taxYear) - 1).toString();
      
      // Get data from previous year for the same tax filer
      const { data: previousData, error: fetchError } = await supabase
        .from('form_data')
        .select('data')
        .eq('user_id', userId)
        .eq('tax_year', previousYear)
        .eq('tax_filer_id', activeTaxFilerId)
        .eq('form_type', section)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching previous year data:', fetchError);
        throw new Error('Keine Daten aus dem Vorjahr gefunden');
      }

      if (!previousData || !previousData.data) {
        throw new Error('Keine Daten aus dem Vorjahr gefunden');
      }

      // Merge with default values to ensure all fields are present
      const defaultSectionData = defaultFormData[section];
      const importedData = previousData.data as Record<string, any>;
      
      const mergedData = {
        ...defaultSectionData,           // All default fields
        ...importedData,                  // Overwrite with previous year data
        // Ensure arrays are never undefined
        ...(section === 'income' && {
          employers: importedData.employers || [],
          rentalIncomes: importedData.rentalIncomes || [],
          dividends: importedData.dividends || [],
          freelanceIncome: importedData.freelanceIncome || []
        }),
        ...(section === 'assets' && {
          vehicles: importedData.vehicles || [],
          properties: importedData.properties || [],
          debts: importedData.debts || []
        }),
        ...(section === 'deductions' && {
          supportedPersons: importedData.supportedPersons || [],
          maintenancePayments: importedData.maintenancePayments || []
        }),
        ...(section === 'contactInfo' && {
          children: importedData.children || []
        })
      };

      // Save the merged data for the current year
      await saveSection(section, mergedData);

      console.log(`✅ Import completed for ${section}:`, {
        imported_fields: Object.keys(importedData),
        missing_fields: Object.keys(defaultSectionData).filter(
          key => !(key in importedData)
        ),
        total_fields: Object.keys(mergedData).length,
        merged_data: mergedData
      });
    } catch (error: any) {
      console.error('Error importing from previous year:', error);
      throw error;
    }
  }, [taxYear, userId, activeTaxFilerId, saveSection]);

  // Placeholder functions for compatibility
  const addChild = useCallback((childData: any) => {
    console.log('Adding child:', childData);
  }, []);

  const removeChild = useCallback((childId: string) => {
    console.log('Removing child:', childId);
  }, []);

  const updateChild = useCallback((childId: string, data: any) => {
    console.log('Updating child:', childId, data);
  }, []);

  const isItemUploaded = useCallback((id: string): boolean => {
    return uploadedMap[id] || false;
  }, [uploadedMap]);

  const calculateProgress = useCallback((): number => {
    const completedSections = Object.values(formProgress).filter(Boolean).length;
    return (completedSections / Object.keys(formProgress).length) * 100;
  }, [formProgress]);

  const loadFormProgress = useCallback(() => {
    return loadFormDataFromDatabase(taxYear);
  }, [taxYear, loadFormDataFromDatabase]);

  const loadDocuments = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      console.log('Not authenticated for loading documents');
      return;
    }
    
    if (!activeTaxFilerId) {
      console.log('No active tax filer for loading documents');
      return;
    }
    
    try {
      // Clear DocumentService cache when forced to ensure truly fresh data
      if (forceRefresh) {
        documentService.clearCache();
        console.log(`🔄 [loadDocuments] Force refresh - cache cleared`);
      }
      console.log(`Loading documents for tax year: ${taxYear}, tax filer: ${activeTaxFilerId}`);
      const docs = await documentService.fetchDocuments(true, taxYear, activeTaxFilerId);
      
      console.log(`📄 Documents loaded in FormContext for year ${taxYear}, tax filer ${activeTaxFilerId}:`, docs.length);
      
      // Update document status in FormContext
      const newUploadedMap: Record<string, boolean> = {};
      docs.forEach(doc => {
        if (doc.checklistItemId && doc.status === 'active') {
          newUploadedMap[doc.checklistItemId] = true;
        }
      });
      
      setUploadedDocuments(docs);
      setUploadedMap(newUploadedMap);
      
      // Update checklist items with upload status
      setChecklistItems(prev => 
        prev.map(item => ({
          ...item,
          uploaded: newUploadedMap[item.id] || false
        }))
      );
      
      // Trigger document progress check after loading - debounced
      setTimeout(() => {
        updateDocumentProgress();
      }, 200);
      
    } catch (error) {
      console.error('Error loading documents in FormContext:', error);
    }
  }, [taxYear, userId, activeTaxFilerId, updateDocumentProgress]);

  // Chat history functions
  const saveChatMessage = useCallback(async (stepId: string, messageType: 'question' | 'answer', content: string, stepIndex: number) => {
    try {
      if (!userId) {
        console.warn("Not authenticated for saving chat message");
        return;
      }

      const { error } = await supabase
        .from('form_chat_history')
        .insert({
          user_id: userId,
          tax_year: taxYear,
          tax_filer_id: activeTaxFilerId,
          step_id: stepId,
          message_type: messageType,
          content,
          step_index: stepIndex,
          timestamp: Date.now()
        });

      if (error) {
        console.error('Error saving chat message:', error);
      }
    } catch (error) {
      console.error('Error in saveChatMessage:', error);
    }
  }, [taxYear, userId, activeTaxFilerId]);

  const loadChatHistory = useCallback(async () => {
    try {
      if (!userId || !activeTaxFilerId) return;

      const { data, error } = await supabase
        .from('form_chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('tax_year', taxYear)
        .eq('tax_filer_id', activeTaxFilerId)
        .order('step_index', { ascending: true })
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      // Transform database records to chat history format
      const history = data.reduce((acc: any[], record) => {
        if (record.message_type === 'question') {
          // Find corresponding answer
          const answerRecord = data.find(d => 
            d.step_id === record.step_id && 
            d.message_type === 'answer' &&
            d.step_index === record.step_index
          );

          if (answerRecord) {
            acc.push({
              stepId: record.step_id,
              question: record.content,
              answer: answerRecord.content,
              stepType: 'text',
              explanation: undefined
            });
          }
        }
        return acc;
      }, []);

      setChatHistory(history);
      console.log('Loaded chat history:', history);
    } catch (error) {
      console.error('Error in loadChatHistory:', error);
    }
  }, [taxYear, userId, activeTaxFilerId]);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  // Load question progress from database
  const loadQuestionProgress = useCallback(async () => {
    if (!userId || !taxYear || !activeTaxFilerId) return;

    try {
      const { data, error } = await supabase
        .from('form_data')
        .select('form_type, data')
        .eq('user_id', userId)
        .eq('tax_year', taxYear)
        .eq('tax_filer_id', activeTaxFilerId)
        .in('form_type', ['income_progress', 'assets_progress', 'deductions_progress']);

      if (error) {
        console.error('Error loading question progress:', error);
        return;
      }

      const progress: QuestionProgressType = {};
      data?.forEach(item => {
        const section = item.form_type.replace('_progress', '') as 'income' | 'assets' | 'deductions';
        if (item.data && typeof item.data === 'object' && 'questionIndex' in item.data) {
          const questionIndex = (item.data as any).questionIndex;
          if (typeof questionIndex === 'number') {
            progress[section] = questionIndex;
          }
        }
      });

      setQuestionProgress(progress);
      console.log('Loaded question progress:', progress);
    } catch (error) {
      console.error('Error in loadQuestionProgress:', error);
    }
  }, [userId, taxYear, activeTaxFilerId]);

  // Initial load effect - wait for session and tax filer to be loaded
  useEffect(() => {
    // Prevent multiple loads for the same session/tax filer combination
    if (initialLoadCompletedRef.current && previousTaxFilerIdRef.current === activeTaxFilerId) {
      return;
    }
    
    // Reload when tax filer changes
    if (previousTaxFilerIdRef.current !== activeTaxFilerId && activeTaxFilerId) {
      console.log(`🔄 Tax filer changed from ${previousTaxFilerIdRef.current} to ${activeTaxFilerId}, reloading data`);
      initialLoadCompletedRef.current = false;
      setFormDataLoaded(false);
      previousTaxFilerIdRef.current = activeTaxFilerId;
    }
    
    if (!isAuthLoading && taxYear && activeTaxFilerId && !formDataLoaded && !loading && !taxYearSwitchRef.current && !isTaxFilerLoading) {
      initialLoadCompletedRef.current = true;
      previousTaxFilerIdRef.current = activeTaxFilerId;
      devLog(`🚀 Initial load for tax year: ${taxYear}, tax filer: ${activeTaxFilerId} with auth:`, userId ? 'Authenticated' : 'Not authenticated');
      loadFormDataFromDatabase(taxYear);
      loadQuestionProgress();
      // Load documents automatically on initialization
      if (userId) {
        devLog('🚀 Auto-loading documents on FormContext initialization');
        loadDocuments();
      }
    }

    // Fallback: If session is loaded but no activeTaxFilerId after TaxFiler loading is done
    if (!isAuthLoading && !activeTaxFilerId && !isTaxFilerLoading && !formDataLoaded && !loading) {
      console.warn('No activeTaxFilerId available, using defaults');
      setFormDataLoaded(true);
    }
  }, [isAuthLoading, taxYear, activeTaxFilerId, formDataLoaded, loading, userId, isTaxFilerLoading]);

  // Safety timeout: force formDataLoaded after 10s to prevent infinite loading
  useEffect(() => {
    if (formDataLoaded) return;
    const timer = setTimeout(() => {
      if (!formDataLoaded) {
        console.warn('Safety timeout: formDataLoaded forced to true after 10s');
        setFormDataLoaded(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [formDataLoaded]);

  // Removed auto-generate checklist to prevent infinite loops

  // Regenerate checklist after formData or formProgress updates (after data loading completes)
  useEffect(() => {
    if (formDataLoaded && !isDataLoading && !isSwitchingTaxYear && !loadingRef.current && !taxYearSwitchRef.current) {
      console.log('🔄 Regenerating checklist after formData/formProgress update');
      const newChecklist = generateChecklist();
      if (newChecklist.length > 0 || checklistItems.length > 0) {
        // Only update if there's a change to prevent unnecessary re-renders
        const hasChanged = newChecklist.length !== checklistItems.length || 
                          newChecklist.some((item, i) => item.id !== checklistItems[i]?.id);
        if (hasChanged) {
          console.log(`✅ Checklist updated: ${newChecklist.length} items`);
        }
      }
    }
  }, [formData, formProgress, formDataLoaded, isDataLoading, isSwitchingTaxYear, generateChecklist, checklistItems]);

  // Check document progress when checklist items change - optimized to prevent loops
  const checklistLengthRef = useRef(0);
  const formDataLoadedRef = useRef(false);
  const uploadedCountRef = useRef(0);
  
  // Calculate the number of uploaded items for dependency tracking
  const uploadedItemsCount = checklistItems.filter(item => item.uploaded).length;
  
  useEffect(() => {
    if (formDataLoaded && checklistItems.length > 0) {
      // Trigger if checklist length changed, form data just loaded, or uploaded count changed
      const shouldUpdate = checklistItems.length !== checklistLengthRef.current || 
                          formDataLoaded !== formDataLoadedRef.current ||
                          uploadedItemsCount !== uploadedCountRef.current;
      
      if (shouldUpdate) {
        checklistLengthRef.current = checklistItems.length;
        formDataLoadedRef.current = formDataLoaded;
        uploadedCountRef.current = uploadedItemsCount;
        console.log(`📋 Triggering document progress update: ${checklistItems.length} checklist items, ${uploadedItemsCount} uploaded`);
        updateDocumentProgress();
      }
    } else if (formDataLoaded && checklistItems.length === 0) {
      // Also trigger when checklist is empty but form data is loaded
      console.log('📋 Form data loaded but no checklist items, checking document progress');
      updateDocumentProgress();
    }
  }, [formDataLoaded, checklistItems.length, uploadedItemsCount, updateDocumentProgress]);

  // Set current step based on form progress
  useEffect(() => {
    if (formDataLoaded && !isManualNavigation && !isSwitchingTaxYear) {
      const calculatedStep = calculateCurrentStep(formProgress, formDataLoaded);
      setCurrentStep(calculatedStep);
    }
  }, [formDataLoaded, formProgress, isManualNavigation, isSwitchingTaxYear]);

  // Reset manual navigation flag when form data is loaded
  useEffect(() => {
    if (formDataLoaded) {
      setIsManualNavigation(false);
    }
  }, [formDataLoaded]);

  // Context value
  const value: FormContextType = useMemo(() => ({
    formData,
    updateFormData,
    formProgress, 
    updateFormProgress,
    questionProgress,
    updateQuestionProgress,
    loading,
    isDataLoading,
    isSwitchingTaxYear,
    saveSection,
    currentStep,
    setCurrentStep: (step: number) => {
      setIsManualNavigation(true);
      setCurrentStep(step);
    },
    taxYear,
    setTaxYear: switchTaxYear,
    formDataLoaded,
    checklistItems,
    generateChecklist,
    uploadedDocuments,
    addDocument,
    removeDocument,
    markUploaded,
    clearDocuments,
    lastChecklistUpdate,
    handleNext,
    handleBack,
    isItemUploaded,
    calculateProgress,
    loadFormProgress,
    loadDocuments,
    checklist: checklistItems,
    uploadedDocs: uploadedDocuments,
    documents: uploadedDocuments,
    addChild,
    removeChild,
    updateChild,
    validationErrors,
    updateValidationErrors,
    clearValidationErrors,
    hasValidationError,
    hasDataForPreviousYear,
    importFromPreviousYear,
    resetFormField,
    resetFormSection,
    // Chat history functions
    chatHistory,
    saveChatMessage,
    loadChatHistory,
    clearChatHistory,
    updateDocumentProgress
  }), [
    formData,
    updateFormData,
    formProgress,
    updateFormProgress,
    questionProgress,
    updateQuestionProgress,
    loading,
    isDataLoading,
    isSwitchingTaxYear,
    saveSection,
    currentStep,
    taxYear,
    switchTaxYear,
    formDataLoaded,
    checklistItems,
    generateChecklist,
    uploadedDocuments,
    addDocument,
    removeDocument,
    markUploaded,
    clearDocuments,
    lastChecklistUpdate,
    handleNext,
    handleBack,
    isItemUploaded,
    calculateProgress,
    loadFormProgress,
    loadDocuments,
    addChild,
    removeChild,
    updateChild,
    validationErrors,
    updateValidationErrors,
    clearValidationErrors,
    hasValidationError,
    hasDataForPreviousYear,
    importFromPreviousYear,
    resetFormField,
    resetFormSection,
    chatHistory,
    saveChatMessage,
    loadChatHistory,
    clearChatHistory,
    updateDocumentProgress
  ]);

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

export const useFormContext = (): FormContextType => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};
