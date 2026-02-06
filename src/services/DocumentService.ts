import { supabase } from '@/integrations/supabase/client';

export interface DocumentMetadata {
  id: string;
  checklistItemId: string;
  fileName: string;
  fileType: string;
  url?: string;
  status: 'active' | 'deleted' | 'processing' | 'error';
  uploadDate: Date;
  metadata?: {
    originalName?: string;
    size?: number;
    uploadRequestId?: string;
    uploadTimestamp?: string;
    taxYear?: string;
    [key: string]: any;
  };
}

export class DocumentService {
  private static instance: DocumentService;
  private documentCache: Map<string, DocumentMetadata[]> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30000;

  private constructor() {}

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  private async checkAuth(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session?.user?.id) {
      throw new Error('Nicht authentifiziert');
    }
    
    return data.session.user.id;
  }

  async fetchDocuments(forceRefresh: boolean = false, taxYear: string, taxFilerId?: string): Promise<DocumentMetadata[]> {
    const now = Date.now();
    const cacheKey = `documents:${taxYear}:${taxFilerId || 'all'}`;
    const lastFetch = this.lastFetchTime.get(cacheKey) || 0;
    
    if (!forceRefresh && this.documentCache.has(cacheKey) && (now - lastFetch) < this.CACHE_DURATION) {
      console.log(`[DocumentService] Returning cached documents for year ${taxYear}, filer ${taxFilerId || 'all'}`);
      return this.documentCache.get(cacheKey) || [];
    }

    console.log(`[DocumentService] Fetching documents from server for year ${taxYear}, filer ${taxFilerId || 'all'}`);
    const userId = await this.checkAuth();

    let query = supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('tax_year', taxYear);
    
    // Filter by tax_filer_id if provided, but also include documents without tax_filer_id
    // This ensures we find documents that were uploaded before tax_filer_id was set
    if (taxFilerId) {
      query = query.or(`tax_filer_id.eq.${taxFilerId},tax_filer_id.is.null`);
    }
    
    const { data, error } = await query.order('upload_date', { ascending: false });

    if (error) throw error;

  const documents: DocumentMetadata[] = (data || []).map(doc => ({
    id: doc.id,
    checklistItemId: doc.checklist_item_id || '',
    fileName: doc.file_name,
    fileType: doc.file_type,
    status: (doc.status as 'active' | 'deleted' | 'processing' | 'error') || 'active',
    uploadDate: new Date(doc.upload_date),
    metadata: { 
      ...(doc.metadata as Record<string, any> || {}),
      taxYear,
      taxFilerId
    }
  }));

    this.documentCache.set(cacheKey, documents);
    this.lastFetchTime.set(cacheKey, now);

    return documents;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const userId = await this.checkAuth();

    // Fetch document with explicit user_id check for RLS
    const { data: doc, error: fetchError } = await supabase
      .from('uploaded_documents')
      .select('file_path, tax_year, user_id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('[DocumentService] Error fetching document for delete:', fetchError);
      throw new Error('Dokument nicht gefunden oder keine Berechtigung');
    }
    
    if (!doc?.file_path) {
      throw new Error('Dokument-Pfad nicht gefunden');
    }

    // Delete from storage (continue even if this fails - file might already be gone)
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.file_path]);
    
    if (storageError) {
      console.warn('[DocumentService] Storage delete warning (continuing):', storageError);
    }

    // Delete from database with explicit user_id check
    const { error: dbError } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('[DocumentService] DB delete error:', dbError);
      throw new Error('Dokument konnte nicht aus der Datenbank gelöscht werden');
    }
    
    console.log('[DocumentService] Document deleted successfully:', documentId);

    // Update cache
    if (doc.tax_year) {
      const cacheKey = `documents:${doc.tax_year}`;
      const cached = this.documentCache.get(cacheKey) || [];
      this.documentCache.set(cacheKey, cached.filter(d => d.id !== documentId));
    }
  }

  clearCache(): void {
    this.documentCache.clear();
    this.lastFetchTime.clear();
  }

  async healthCheck() {
    const health = { storage: false, database: false, auth: false };
    
    try {
      const { data } = await supabase.auth.getSession();
      health.auth = !!data?.session;
      
      if (health.auth) {
        const { error: dbError } = await supabase.from('uploaded_documents').select('id').limit(1);
        health.database = !dbError;
        
        const { error: storageError } = await supabase.storage.listBuckets();
        health.storage = !storageError;
      }
    } catch (error) {
      console.error('Health check error:', error);
    }
    
    return health;
  }

  async refreshDocumentUrl(documentId: string): Promise<string> {
    await this.checkAuth();

    const { data: doc, error } = await supabase
      .from('uploaded_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (error || !doc?.file_path) {
      throw new Error('Dokument nicht gefunden');
    }

    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);

    if (!urlData?.signedUrl) {
      throw new Error('URL konnte nicht erstellt werden');
    }

    return urlData.signedUrl;
  }
}

export const documentService = DocumentService.getInstance();
