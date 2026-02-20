
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaxYearData {
  taxReturns: any[];
  formProgress: Record<string, any>;
  formData: Record<string, any[]>;
  uploadedDocuments: Record<string, any[]>;
  completedTaxReturns: Record<string, any>;
  definitiveTaxBills: Record<string, any>;
  supportTickets: Record<string, any[]>;
  loading: boolean;
  error: string | null;
}

export const useTaxYearData = (userId: string | null, taxFilerId: string | null) => {
  const [data, setData] = useState<TaxYearData>({
    taxReturns: [],
    formProgress: {},
    formData: {},
    uploadedDocuments: {},
    completedTaxReturns: {},
    definitiveTaxBills: {},
    supportTickets: {},
    loading: true,
    error: null
  });
  
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const previousTaxFilerIdRef = useRef<string | null>(null);

  // Reset data when taxFilerId changes to avoid showing stale data
  // Also triggers on null-to-value transitions to prevent race condition
  useEffect(() => {
    if (previousTaxFilerIdRef.current !== taxFilerId && (previousTaxFilerIdRef.current !== null || taxFilerId !== null)) {
      console.log('🔄 TaxFilerId changed, resetting data...', previousTaxFilerIdRef.current, '->', taxFilerId);
      setData({
        taxReturns: [],
        formProgress: {},
        formData: {},
        uploadedDocuments: {},
        completedTaxReturns: {},
        definitiveTaxBills: {},
        supportTickets: {},
        loading: true,
        error: null
      });
      // Reset loading ref to allow immediate reload
      loadingRef.current = false;
    }
    previousTaxFilerIdRef.current = taxFilerId;
  }, [taxFilerId]);

  const loadTaxYearData = useCallback(async () => {
    if (!userId || !taxFilerId) {
      // Keep loading: true when taxFilerId is null — prevents premature "no data" state
      // that would cause the consent screen to flash for existing users
      return;
    }
    if (loadingRef.current) return; // Prevent concurrent loads
    
    loadingRef.current = true;

    try {
      if (mountedRef.current) {
        setData(prev => ({ ...prev, loading: true, error: null }));
      }

      // Load all data in parallel with Promise.allSettled for better error handling
      const results = await Promise.allSettled([
        supabase
          .from('tax_returns')
          .select('*')
          .eq('user_id', userId)
          .eq('tax_filer_id', taxFilerId)
          .order('tax_year', { ascending: false }),
        
        supabase
          .from('form_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('tax_filer_id', taxFilerId),
        
        supabase
          .from('form_data')
          .select('tax_year, form_type, data')
          .eq('user_id', userId)
          .eq('tax_filer_id', taxFilerId),
        
        supabase
          .from('uploaded_documents')
          .select('*')
          .eq('user_id', userId)
          .eq('tax_filer_id', taxFilerId)
          .eq('status', 'active'),
        
        supabase
          .from('completed_tax_returns')
          .select('*')
          .eq('user_id', userId)
          .eq('tax_filer_id', taxFilerId),
        
        supabase
          .from('definitive_tax_bills')
          .select('*')
          .eq('user_id', userId),
        
        supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', userId)
      ]);

      if (!mountedRef.current) return;

      // Extract results with individual error handling
      const getResult = (result: PromiseSettledResult<any>, name: string) => {
        if (result.status === 'rejected') {
          console.error(`Failed to load ${name}:`, result.reason);
          return { data: [], error: result.reason };
        }
        if (result.value.error) {
          console.error(`Error in ${name}:`, result.value.error);
          return { data: [], error: result.value.error };
        }
        return { data: result.value.data || [], error: null };
      };

      const taxReturnsResult = getResult(results[0], 'tax_returns');
      const progressResult = getResult(results[1], 'form_progress');
      const formDataResult = getResult(results[2], 'form_data');
      const documentsResult = getResult(results[3], 'uploaded_documents');
      const completedResult = getResult(results[4], 'completed_tax_returns');
      const billsResult = getResult(results[5], 'definitive_tax_bills');
      const ticketsResult = getResult(results[6], 'support_tickets');

      // Check if any critical queries failed
      const criticalErrors = [taxReturnsResult.error].filter(Boolean);
      if (criticalErrors.length > 0) {
        throw criticalErrors[0];
      }

      // Process form progress by tax year
      const progressByYear: Record<string, any> = {};
      progressResult.data.forEach((p: any) => {
        progressByYear[p.tax_year] = p;
      });

      // Process form data by tax year
      const formDataByYear: Record<string, any[]> = {};
      formDataResult.data.forEach((record: any) => {
        if (!formDataByYear[record.tax_year]) {
          formDataByYear[record.tax_year] = [];
        }
        formDataByYear[record.tax_year].push({
          form_type: record.form_type,
          data: record.data
        });
      });

      // Process uploaded documents by tax year (if tax_year field exists)
      const documentsByYear: Record<string, any[]> = {};
      documentsResult.data.forEach((doc: any) => {
        const year = doc.tax_year || 'unknown';
        if (!documentsByYear[year]) {
          documentsByYear[year] = [];
        }
        documentsByYear[year].push(doc);
      });

      // Process completed tax returns by tax year
      const completedByYear: Record<string, any> = {};
      completedResult.data.forEach((completed: any) => {
        completedByYear[completed.tax_year] = completed;
      });

      // Process definitive tax bills by tax year
      const billsByYear: Record<string, any> = {};
      billsResult.data.forEach((bill: any) => {
        billsByYear[bill.tax_year] = bill;
      });

      // Process support tickets by completed_tax_return_id
      const ticketsByReturnId: Record<string, any[]> = {};
      ticketsResult.data.forEach((ticket: any) => {
        const returnId = ticket.completed_tax_return_id;
        if (returnId) {
          if (!ticketsByReturnId[returnId]) {
            ticketsByReturnId[returnId] = [];
          }
          ticketsByReturnId[returnId].push(ticket);
        }
      });

      if (mountedRef.current) {
        setData({
          taxReturns: taxReturnsResult.data,
          formProgress: progressByYear,
          formData: formDataByYear,
          uploadedDocuments: documentsByYear,
          completedTaxReturns: completedByYear,
          definitiveTaxBills: billsByYear,
          supportTickets: ticketsByReturnId,
          loading: false,
          error: null
        });
      }

    } catch (error: any) {
      console.error('Error loading tax year data:', error);
      if (mountedRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: error?.message || 'Fehler beim Laden der Daten'
        }));
        toast.error('Fehler beim Laden der Steuerdaten');
      }
    } finally {
      loadingRef.current = false;
    }
  }, [userId, taxFilerId]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (userId && taxFilerId) {
      loadTaxYearData();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [userId, taxFilerId, loadTaxYearData]);

  return {
    ...data,
    refetch: loadTaxYearData
  };
};
