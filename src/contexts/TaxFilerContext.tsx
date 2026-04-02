import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TaxFiler {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  relationship: 'self' | 'child' | 'spouse' | 'parent' | 'other';
  ahv_number: string | null;
  is_primary: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxFilerInput {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  relationship: 'self' | 'child' | 'spouse' | 'parent' | 'other';
  ahv_number?: string | null;
}

interface TaxFilerContextType {
  taxFilers: TaxFiler[];
  activeTaxFiler: TaxFiler | null;
  activeTaxFilerId: string | null;
  setActiveTaxFilerId: (id: string | null) => void;
  isLoading: boolean;
  dataFetched: boolean;
  error: string | null;
  loadTaxFilers: () => Promise<void>;
  createTaxFiler: (input: TaxFilerInput) => Promise<TaxFiler | null>;
  updateTaxFiler: (id: string, input: Partial<TaxFilerInput>) => Promise<TaxFiler | null>;
  deleteTaxFiler: (id: string) => Promise<boolean>;
  getPrimaryTaxFiler: () => TaxFiler | null;
  hasMultipleFilers: boolean;
  selectionConfirmed: boolean;
  confirmSelection: (filerId?: string) => void;
  resetSelection: () => void;
}

const TaxFilerContext = createContext<TaxFilerContextType | undefined>(undefined);

const SESSION_KEY = 'ditax_selected_tax_filer';

export const TaxFilerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, isLoading: authLoading } = useAuth();

  const [taxFilers, setTaxFilers] = useState<TaxFiler[]>([]);
  const [activeTaxFilerId, setActiveTaxFilerId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SESSION_KEY);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionConfirmed, setSelectionConfirmed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SESSION_KEY) !== null;
    }
    return false;
  });

  // Refs to avoid stale closures
  const activeTaxFilerIdRef = useRef(activeTaxFilerId);
  const taxFilersRef = useRef(taxFilers);
  const userIdRef = useRef(userId);

  useEffect(() => { activeTaxFilerIdRef.current = activeTaxFilerId; }, [activeTaxFilerId]);
  useEffect(() => { taxFilersRef.current = taxFilers; }, [taxFilers]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Reset on logout
  useEffect(() => {
    if (!authLoading && !userId) {
      setTaxFilers([]);
      setActiveTaxFilerId(null);
      setSelectionConfirmed(false);
      setDataFetched(false);
      sessionStorage.removeItem(SESSION_KEY);
      setIsLoading(false);
    }
  }, [userId, authLoading]);

  // Load tax filers — called directly with userId from AuthContext
  const loadTaxFilers = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) {
      console.log('No userId, skipping tax filers load');
      setIsLoading(false);
      return;
    }

    // Only show full-screen loading on initial load (no filers yet)
    if (taxFilersRef.current.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tax_filers')
        .select('*')
        .eq('user_id', currentUserId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error loading tax filers:', fetchError);
        setError(fetchError.message);
        return;
      }

      const filers = (data || []) as TaxFiler[];
      setTaxFilers(filers);

      // Set active tax filer to primary if not set and no stored selection
      const storedFilerId = sessionStorage.getItem(SESSION_KEY);
      const currentActiveId = activeTaxFilerIdRef.current;
      if (!currentActiveId && !storedFilerId && filers.length > 0) {
        const primary = filers.find(f => f.is_primary);
        setActiveTaxFilerId(primary?.id || filers[0].id);
      } else if (storedFilerId && filers.some(f => f.id === storedFilerId)) {
        setActiveTaxFilerId(storedFilerId);
        setSelectionConfirmed(true);
      }

      console.log(`✅ Loaded ${filers.length} tax filers`);
    } catch (err) {
      console.error('Unexpected error loading tax filers:', err);
      setError('Failed to load tax filers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load tax filers when userId becomes available from AuthContext
  useEffect(() => {
    if (!authLoading) {
      if (userId) {
        loadTaxFilers();
      } else {
        setIsLoading(false);
      }
    }
  }, [userId, authLoading, loadTaxFilers]);

  // Get active tax filer object
  const activeTaxFiler = useMemo(() => {
    if (!activeTaxFilerId) return null;
    return taxFilers.find(f => f.id === activeTaxFilerId) || null;
  }, [taxFilers, activeTaxFilerId]);

  // Get primary tax filer
  const getPrimaryTaxFiler = useCallback(() => {
    return taxFilers.find(f => f.is_primary) || null;
  }, [taxFilers]);

  // Computed: has multiple filers
  const hasMultipleFilers = useMemo(() => taxFilers.length > 1, [taxFilers]);

  // Confirm selection and persist to sessionStorage
  const confirmSelection = useCallback((filerId?: string) => {
    const idToStore = filerId || activeTaxFilerId;
    setSelectionConfirmed(true);
    if (idToStore) {
      sessionStorage.setItem(SESSION_KEY, idToStore);
    }
  }, [activeTaxFilerId]);

  // Reset selection and clear sessionStorage
  const resetSelection = useCallback(() => {
    setSelectionConfirmed(false);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  // Create new tax filer
  const createTaxFiler = useCallback(async (input: TaxFilerInput): Promise<TaxFiler | null> => {
    if (!userId) {
      toast({
        title: 'Fehler',
        description: 'Sie müssen angemeldet sein.',
        variant: 'destructive'
      });
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('tax_filers')
        .insert({
          user_id: userId,
          first_name: input.first_name,
          last_name: input.last_name,
          date_of_birth: input.date_of_birth || null,
          relationship: input.relationship,
          ahv_number: input.ahv_number || null,
          is_primary: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating tax filer:', insertError);
        toast({
          title: 'Fehler',
          description: 'Person konnte nicht erstellt werden.',
          variant: 'destructive'
        });
        return null;
      }

      const newFiler = data as TaxFiler;
      setTaxFilers(prev => [...prev, newFiler]);

      toast({
        title: 'Erfolg',
        description: `${newFiler.first_name} ${newFiler.last_name} wurde hinzugefügt.`
      });

      return newFiler;
    } catch (err) {
      console.error('Unexpected error creating tax filer:', err);
      return null;
    }
  }, [userId]);

  // Update tax filer
  const updateTaxFiler = useCallback(async (id: string, input: Partial<TaxFilerInput>): Promise<TaxFiler | null> => {
    if (!userId) return null;

    try {
      const { data, error: updateError } = await supabase
        .from('tax_filers')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating tax filer:', updateError);
        toast({
          title: 'Fehler',
          description: 'Person konnte nicht aktualisiert werden.',
          variant: 'destructive'
        });
        return null;
      }

      const updatedFiler = data as TaxFiler;
      setTaxFilers(prev => prev.map(f => f.id === id ? updatedFiler : f));

      toast({
        title: 'Erfolg',
        description: 'Person wurde aktualisiert.'
      });

      return updatedFiler;
    } catch (err) {
      console.error('Unexpected error updating tax filer:', err);
      return null;
    }
  }, [userId]);

  // Delete tax filer
  const deleteTaxFiler = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;

    const filer = taxFilers.find(f => f.id === id);
    if (filer?.is_primary) {
      toast({
        title: 'Fehler',
        description: 'Die primäre Person kann nicht gelöscht werden.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('tax_filers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting tax filer:', deleteError);
        toast({
          title: 'Fehler',
          description: 'Person konnte nicht gelöscht werden.',
          variant: 'destructive'
        });
        return false;
      }

      setTaxFilers(prev => prev.filter(f => f.id !== id));

      // If deleted filer was active, switch to primary
      if (activeTaxFilerId === id) {
        const primary = taxFilers.find(f => f.is_primary && f.id !== id);
        setActiveTaxFilerId(primary?.id || null);
      }

      toast({
        title: 'Erfolg',
        description: 'Person wurde gelöscht.'
      });

      return true;
    } catch (err) {
      console.error('Unexpected error deleting tax filer:', err);
      return false;
    }
  }, [userId, taxFilers, activeTaxFilerId]);

  const value: TaxFilerContextType = {
    taxFilers,
    activeTaxFiler,
    activeTaxFilerId,
    setActiveTaxFilerId,
    isLoading,
    error,
    loadTaxFilers,
    createTaxFiler,
    updateTaxFiler,
    deleteTaxFiler,
    getPrimaryTaxFiler,
    hasMultipleFilers,
    selectionConfirmed,
    confirmSelection,
    resetSelection
  };

  return (
    <TaxFilerContext.Provider value={value}>
      {children}
    </TaxFilerContext.Provider>
  );
};

export const useTaxFiler = (): TaxFilerContextType => {
  const context = useContext(TaxFilerContext);
  if (!context) {
    throw new Error('useTaxFiler must be used within a TaxFilerProvider');
  }
  return context;
};

export default TaxFilerContext;
