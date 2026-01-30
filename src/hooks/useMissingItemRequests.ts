import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MissingItemRequest {
  id: string;
  user_id: string;
  tax_return_id: string;
  admin_id: string;
  request_type: 'document' | 'information';
  title: string;
  description: string | null;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  reminder_count: number;
  last_reminder_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  admin_name?: string;
  responses?: MissingItemResponse[];
}

export interface MissingItemResponse {
  id: string;
  request_id: string;
  user_id: string;
  response_type: 'text' | 'file';
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

export interface CreateMissingItemRequestInput {
  user_id: string;
  tax_return_id: string;
  tax_filer_id?: string | null;
  request_type: 'document' | 'information';
  title: string;
  description?: string;
}

export const useMissingItemRequests = (userId?: string, taxReturnId?: string) => {
  const [requests, setRequests] = useState<MissingItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('missing_item_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (taxReturnId) {
        query = query.eq('tax_return_id', taxReturnId);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Fetch responses for all requests
      const requestIds = requestsData.map(r => r.id);
      const { data: responsesData, error: responsesError } = await supabase
        .from('missing_item_responses')
        .select('*')
        .in('request_id', requestIds);

      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
      }

      // Fetch admin names
      const adminIds = [...new Set(requestsData.map(r => r.admin_id))];
      const { data: adminsData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', adminIds);

      // Combine data
      const combined = requestsData.map(request => {
        const admin = adminsData?.find(a => a.id === request.admin_id);
        const responses = responsesData?.filter(r => r.request_id === request.id) || [];
        
        return {
          ...request,
          request_type: request.request_type as 'document' | 'information',
          status: request.status as 'pending' | 'submitted' | 'approved' | 'rejected',
          admin_name: admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() : 'Admin',
          responses: responses as MissingItemResponse[],
        };
      });

      setRequests(combined);
    } catch (err) {
      console.error('Error fetching missing item requests:', err);
      setError('Fehler beim Laden der Anfragen');
    } finally {
      setLoading(false);
    }
  }, [userId, taxReturnId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Create multiple requests at once (for admin)
  const createRequests = async (items: CreateMissingItemRequestInput[], taxYear?: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const requestsToInsert = items.map(item => ({
        user_id: item.user_id,
        tax_return_id: item.tax_return_id,
        tax_filer_id: item.tax_filer_id || null,
        admin_id: user.id,
        request_type: item.request_type,
        title: item.title,
        description: item.description || null,
        status: 'pending',
      }));

      const { error } = await supabase
        .from('missing_item_requests')
        .insert(requestsToInsert);

      if (error) throw error;

      // Update tax_return status
      const statusToSet = items[0].request_type === 'document' ? 'missing_documents' : 'missing_information';
      await supabase
        .from('tax_returns')
        .update({ status: statusToSet, updated_at: new Date().toISOString() })
        .eq('id', items[0].tax_return_id);

      // Send email notification to user
      try {
        await supabase.functions.invoke('missing-items-notification', {
          body: {
            userId: items[0].user_id,
            items: items.map(item => ({
              title: item.title,
              description: item.description,
              request_type: item.request_type,
            })),
            taxYear,
          },
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast.success(`${items.length} Anfrage(n) erfolgreich erstellt`);
      return true;
    } catch (err) {
      console.error('Error creating requests:', err);
      toast.error('Fehler beim Erstellen der Anfragen');
      return false;
    }
  };

  // Submit response to a request (for user)
  const submitResponse = async (
    requestId: string,
    responseType: 'text' | 'file',
    textContent?: string,
    file?: { path: string; name: string; size: number }
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const responseData = {
        request_id: requestId,
        user_id: user.id,
        response_type: responseType,
        text_content: textContent || null,
        file_path: file?.path || null,
        file_name: file?.name || null,
        file_size: file?.size || null,
      };

      const { error } = await supabase
        .from('missing_item_responses')
        .insert(responseData);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error submitting response:', err);
      toast.error('Fehler beim Speichern der Antwort');
      return false;
    }
  };

  // Submit all responses and mark requests as submitted (for user)
  const submitAllResponses = async (requestIds: string[]): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('missing_item_requests')
        .update({ status: 'submitted', updated_at: new Date().toISOString() })
        .in('id', requestIds);

      if (error) throw error;

      toast.success('Alle Angaben erfolgreich eingereicht');
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Error submitting all responses:', err);
      toast.error('Fehler beim Einreichen');
      return false;
    }
  };

  // Approve a request (for admin)
  const approveRequest = async (requestId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('missing_item_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Anfrage genehmigt');
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Fehler beim Genehmigen');
      return false;
    }
  };

  // Reject a request with reason (for admin)
  const rejectRequest = async (requestId: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('missing_item_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Anfrage abgelehnt');
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Fehler beim Ablehnen');
      return false;
    }
  };

  // Approve all submitted requests and update tax return status (for admin)
  const approveAllAndComplete = async (taxReturnId: string): Promise<boolean> => {
    try {
      // Get all submitted requests for this tax return
      const { data: submittedRequests } = await supabase
        .from('missing_item_requests')
        .select('id')
        .eq('tax_return_id', taxReturnId)
        .eq('status', 'submitted');

      if (!submittedRequests || submittedRequests.length === 0) {
        toast.error('Keine eingereichten Anfragen gefunden');
        return false;
      }

      const requestIds = submittedRequests.map(r => r.id);

      // Approve all requests
      const { error: approveError } = await supabase
        .from('missing_item_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .in('id', requestIds);

      if (approveError) throw approveError;

      // Update tax return status to processing
      const { error: updateError } = await supabase
        .from('tax_returns')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', taxReturnId);

      if (updateError) throw updateError;

      toast.success('Alle Unterlagen bestätigt - Status auf "In Bearbeitung" gesetzt');
      await fetchRequests();
      return true;
    } catch (err) {
      console.error('Error approving all:', err);
      toast.error('Fehler beim Bestätigen');
      return false;
    }
  };

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
    createRequests,
    submitResponse,
    submitAllResponses,
    approveRequest,
    rejectRequest,
    approveAllAndComplete,
  };
};

// Hook specifically for fetching pending requests for a user (for chat display)
export const usePendingMissingItems = (userId?: string, taxFilerId?: string | null) => {
  const [pendingRequests, setPendingRequests] = useState<MissingItemRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingRequests = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let query = supabase
        .from('missing_item_requests')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'rejected']);

      if (taxFilerId) {
        query = query.eq('tax_filer_id', taxFilerId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch any existing responses
      if (data && data.length > 0) {
        const requestIds = data.map(r => r.id);
        const { data: responses } = await supabase
          .from('missing_item_responses')
          .select('*')
          .in('request_id', requestIds);

        const combined = data.map(request => ({
          ...request,
          request_type: request.request_type as 'document' | 'information',
          status: request.status as 'pending' | 'submitted' | 'approved' | 'rejected',
          responses: (responses?.filter(r => r.request_id === request.id) || []) as MissingItemResponse[],
        }));

        setPendingRequests(combined);
      } else {
        setPendingRequests([]);
      }
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, taxFilerId]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  return {
    pendingRequests,
    loading,
    refetch: fetchPendingRequests,
  };
};

// Hook for admin to see submitted items to review
export const useSubmittedMissingItems = () => {
  const [submittedItems, setSubmittedItems] = useState<{
    tax_return_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    tax_year: string;
    requests: MissingItemRequest[];
    submitted_at: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmittedItems = useCallback(async () => {
    try {
      setLoading(true);

      // Get all submitted requests
      const { data: requests, error } = await supabase
        .from('missing_item_requests')
        .select('*')
        .eq('status', 'submitted')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!requests || requests.length === 0) {
        setSubmittedItems([]);
        return;
      }

      // Get unique tax_return_ids
      const taxReturnIds = [...new Set(requests.map(r => r.tax_return_id))];
      const userIds = [...new Set(requests.map(r => r.user_id))];

      // Fetch tax returns
      const { data: taxReturns } = await supabase
        .from('tax_returns')
        .select('id, tax_year')
        .in('id', taxReturnIds);

      // Fetch users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      // Fetch responses
      const requestIds = requests.map(r => r.id);
      const { data: responses } = await supabase
        .from('missing_item_responses')
        .select('*')
        .in('request_id', requestIds);

      // Group by tax_return_id
      const grouped = taxReturnIds.map(taxReturnId => {
        const taxReturnRequests = requests.filter(r => r.tax_return_id === taxReturnId);
        const userId = taxReturnRequests[0]?.user_id;
        const user = users?.find(u => u.id === userId);
        const taxReturn = taxReturns?.find(tr => tr.id === taxReturnId);

        const requestsWithResponses = taxReturnRequests.map(req => ({
          ...req,
          request_type: req.request_type as 'document' | 'information',
          status: req.status as 'pending' | 'submitted' | 'approved' | 'rejected',
          responses: (responses?.filter(r => r.request_id === req.id) || []) as MissingItemResponse[],
        }));

        return {
          tax_return_id: taxReturnId,
          user_id: userId,
          user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unbekannt',
          user_email: user?.email || '',
          tax_year: taxReturn?.tax_year || '',
          requests: requestsWithResponses,
          submitted_at: taxReturnRequests[0]?.updated_at || '',
        };
      });

      setSubmittedItems(grouped);
    } catch (err) {
      console.error('Error fetching submitted items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmittedItems();
  }, [fetchSubmittedItems]);

  return {
    submittedItems,
    loading,
    refetch: fetchSubmittedItems,
  };
};
