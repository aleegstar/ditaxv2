import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, FileIcon, Calendar, AlertCircle, Users } from 'lucide-react';
import { SecurityService } from '@/services/SecurityService';
import { validateStoragePath } from '@/utils/fileValidation';
import { CreateMissingItemRequestDialog } from '@/components/admin/CreateMissingItemRequestDialog';

import UserInfoCard from '@/components/user-detail/UserInfoCard';
import FormDataDisplay from '@/components/user-detail/FormDataDisplay';
import DocumentCard from '@/components/user-detail/DocumentCard';
import AdminNotesCard from '@/components/user-detail/AdminNotesCard';
import UserTabs from '@/components/user-detail/UserTabs';
import FormDataPdfDownloader from '@/components/user-detail/FormDataPdfDownloader';
import DocumentsPdfDownloader from '@/components/user-detail/DocumentsPdfDownloader';
import { CoverLetterDownloader } from '@/components/user-detail/CoverLetterDownloader';
import { TaxReturnStatusChanger } from '@/components/user-detail/TaxReturnStatusChanger';
import { defaultFormData } from '@/contexts/form/defaults';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

// Local interface for the raw database user
interface DatabaseUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  admin_notes: string | null;
  date_of_birth: string | null;
  privacy_preferences: any;
  updated_at: string | null;
}

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  upload_date: string;
  checklist_item_id: string;
  tax_year?: string;
  tax_filer_id?: string;
}

interface TaxFiler {
  id: string;
  first_name: string;
  last_name: string;
  is_primary: boolean;
  relationship: string | null;
}

interface CompletedTaxReturn {
  id: string;
  tax_year: string;
  file_name: string;
  file_path: string;
  upload_date: string;
  status: string;
}

const UserDetail: React.FC = () => {
  // IMMEDIATE DEBUG LOG - THIS SHOULD ALWAYS APPEAR
  console.log('🚀 UserDetail component is being rendered/initialized');
  console.log('🌐 Current URL:', window.location.href);
  console.log('🗺️ Current pathname:', window.location.pathname);
  
  const { id: userId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  // DEBUG PARAMS EXTRACTION
  console.log('🎯 useParams result:', { id: userId });
  console.log('🎯 Extracted userId:', userId);
  console.log('🎯 Type of userId:', typeof userId);
  console.log('🎯 Is userId truthy:', !!userId);
  
  // DEBUG URL PARAMS
  const urlYear = searchParams.get('year');
  const urlTaxFilerId = searchParams.get('filer');
  console.log('🔗 URL search params:', Object.fromEntries(searchParams.entries()));
  console.log('🔗 URL year parameter:', urlYear);
  console.log('🔗 URL tax filer parameter:', urlTaxFilerId);
  
  const [user, setUser] = useState<DatabaseUser | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [completedTaxReturns, setCompletedTaxReturns] = useState<CompletedTaxReturn[]>([]);
  const [formData, setFormData] = useState<any[]>([]);
  const [taxReturns, setTaxReturns] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(urlYear || new Date().getFullYear().toString());
  const [taxFilers, setTaxFilers] = useState<TaxFiler[]>([]);
  const [selectedTaxFilerId, setSelectedTaxFilerId] = useState<string | null>(urlTaxFilerId);
  const [loading, setLoading] = useState(true);
  const [missingItemDialogOpen, setMissingItemDialogOpen] = useState(false);
  const [missingItemsCount, setMissingItemsCount] = useState(0);
  const [pendingMissingItemsCount, setPendingMissingItemsCount] = useState(0);
  const { toast } = useToast();

  const fetchUserData = async () => {
    if (!userId) {
      console.log('❌ No userId provided');
      setLoading(false);
      return;
    }

    console.log('🔍 Starting to fetch user data for userId:', userId);
    setLoading(true);

    try {
      // Check authentication and admin access using SecurityService
      console.log('🔐 Checking authentication and admin access...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('❌ No authenticated session found');
        toast({
          title: "Authentifizierung erforderlich",
          description: "Bitte melden Sie sich als Administrator an.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('✅ Session found, verifying admin access...');
      
      // Use SecurityService for consistent admin validation
      const isAdmin = await SecurityService.verifyAdminAccess('user_detail_access');

      if (!isAdmin) {
        console.error('❌ User is not admin or verification failed');
        toast({
          title: "Zugriff verweigert",
          description: "Sie haben keine Berechtigung, diese Seite anzuzeigen.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('✅ Admin access verified successfully');

      // Fetch user profile directly from profiles table
      console.log('📞 Querying profiles table for userId:', userId);
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('📞 Profiles query response - userData:', userData);
      console.log('📞 Profiles query response - error:', userError);

      if (userError) {
        console.error('❌ Error fetching user profile:', userError);
        toast({
          title: "Fehler",
          description: `Benutzer konnte nicht geladen werden: ${userError.message}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!userData) {
        console.error('❌ No user data returned from profiles query');
        toast({
          title: "Fehler",
          description: "Benutzerdaten nicht gefunden.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('✅ User profile fetched successfully:', userData);
      setUser(userData);

      // Fetch tax filers for this user
      console.log('👥 Fetching tax filers for user:', userId);
      const { data: taxFilersData, error: taxFilersError } = await supabase
        .from('tax_filers')
        .select('id, first_name, last_name, is_primary, relationship')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (taxFilersError) {
        console.error('❌ Error fetching tax filers:', taxFilersError);
      } else {
        console.log('✅ Tax filers fetched:', taxFilersData);
        setTaxFilers(taxFilersData || []);
        
        // Set selected tax filer: use URL param, or fall back to primary
        if (urlTaxFilerId) {
          console.log('🎯 Using URL tax filer ID:', urlTaxFilerId);
          setSelectedTaxFilerId(urlTaxFilerId);
        } else if (taxFilersData && taxFilersData.length > 0) {
          const primary = taxFilersData.find(f => f.is_primary);
          const defaultFilerId = primary?.id || taxFilersData[0].id;
          console.log('🎯 No URL filer param, using default:', defaultFilerId);
          setSelectedTaxFilerId(defaultFilerId);
        }
      }

      // Fetch user's active documents (consistent with user view)
      const { data: documentsData, error: documentsError } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('upload_date', { ascending: false });

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
      } else {
        setDocuments(documentsData || []);
      }

      // Fetch completed tax returns
      const { data: completedReturnsData, error: completedReturnsError } = await supabase
        .from('completed_tax_returns')
        .select('*')
        .eq('user_id', userId)
        .order('upload_date', { ascending: false });

      if (completedReturnsError) {
        console.error('Error fetching completed tax returns:', completedReturnsError);
      } else {
        setCompletedTaxReturns(completedReturnsData || []);
      }

      // Fetch tax returns
      const { data: taxReturnsData, error: taxReturnsError } = await supabase
        .from('tax_returns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (taxReturnsError) {
        console.error('Error fetching tax returns:', taxReturnsError);
      } else {
        setTaxReturns(taxReturnsData || []);
      }

      // Fetch form data
      console.log('📊 Fetching form data for user:', userId);
      const { data: formDataResponse, error: formDataError } = await supabase
        .from('form_data')
        .select('*')
        .eq('user_id', userId);

      console.log('📊 Form data response:', formDataResponse);
      console.log('📊 Form data error:', formDataError);

      if (formDataError) {
        console.error('❌ Error fetching form data:', formDataError);
      } else {
        console.log('✅ Form data fetched successfully:', formDataResponse);
        setFormData(formDataResponse || []);
        
        // Only set selected year intelligently if no URL parameter was provided
        if (!urlYear && formDataResponse && formDataResponse.length > 0) {
          console.log('🎯 No URL year parameter, using intelligent year selection');
          // Get all available years from form data, tax returns, and completed returns
          const allAvailableYears = new Set<string>();
          
          // Add years from form data
          formDataResponse.forEach(item => {
            if (item.tax_year) {
              allAvailableYears.add(item.tax_year);
            }
          });
          
          // Add years from tax returns (if any)
          if (taxReturnsData && taxReturnsData.length > 0) {
            taxReturnsData.forEach(tr => {
              if (tr.tax_year) {
                allAvailableYears.add(tr.tax_year);
              }
            });
          }
          
          // Add years from completed returns (if any)
          if (completedReturnsData && completedReturnsData.length > 0) {
            completedReturnsData.forEach(cr => {
              if (cr.tax_year) {
                allAvailableYears.add(cr.tax_year);
              }
            });
          }
          
          const yearsArray = Array.from(allAvailableYears).sort((a, b) => parseInt(b) - parseInt(a));
          console.log('🗓️ Available years for intelligent selection:', yearsArray);
          
          if (yearsArray.length > 0) {
            // Count data entries per year to find the year with most data
            const yearDataCounts = yearsArray.map(year => {
              const formDataCount = formDataResponse.filter(fd => fd.tax_year === year).length;
              const taxReturnCount = taxReturnsData ? taxReturnsData.filter(tr => tr.tax_year === year).length : 0;
              const completedReturnCount = completedReturnsData ? completedReturnsData.filter(cr => cr.tax_year === year).length : 0;
              const totalCount = formDataCount + taxReturnCount + completedReturnCount;
              
              console.log(`🗓️ Year ${year}: ${formDataCount} form data, ${taxReturnCount} tax returns, ${completedReturnCount} completed returns = ${totalCount} total`);
              return { year, count: totalCount };
            });
            
            // Sort by count (most data first), then by year (newest first)
            yearDataCounts.sort((a, b) => {
              if (a.count !== b.count) {
                return b.count - a.count; // Most data first
              }
              return parseInt(b.year) - parseInt(a.year); // Newest year first if same count
            });
            
            const bestYear = yearDataCounts[0].year;
            console.log('🎯 Intelligently selected year:', bestYear);
            setSelectedYear(bestYear);
          } else {
            // Fallback to current year if no data found and no URL parameter
            const currentYear = new Date().getFullYear().toString();
            console.log('🎯 No data found, falling back to current year:', currentYear);
            setSelectedYear(currentYear);
          }
        } else if (urlYear) {
          console.log('🎯 Using URL year parameter:', urlYear);
          setSelectedYear(urlYear);
        } else {
          console.log('📊 No form data found, keeping current selectedYear:', selectedYear);
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Fehler",
        description: "Benutzerdaten konnten nicht geladen werden.",
        variant: "destructive"
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Fetch missing items on mount and when userId changes
  useEffect(() => {
    const fetchMissingItems = async () => {
      if (!userId) return;
      
      const { data, error } = await supabase
        .from('missing_item_requests')
        .select('id, status')
        .eq('user_id', userId);
      
      if (!error && data) {
        setMissingItemsCount(data.length);
        setPendingMissingItemsCount(data.filter(item => item.status === 'pending').length);
      }
    };
    
    fetchMissingItems();
  }, [userId]);

  const handleDownloadCompletedTaxReturn = async (taxReturn: CompletedTaxReturn) => {
    if (!validateStoragePath(taxReturn.file_path)) {
      toast({ title: 'Fehler', description: 'Ungültiger Dateipfad.', variant: 'destructive' });
      return;
    }
    try {
      console.log('Admin downloading completed tax return:', taxReturn.file_path);
      
      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .download(taxReturn.file_path);

      if (error) {
        console.error('Download error:', error);
        toast({
          title: "Download-Fehler",
          description: `Die Datei konnte nicht heruntergeladen werden: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = taxReturn.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download erfolgreich",
        description: `${taxReturn.file_name} wurde heruntergeladen.`
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download-Fehler",
        description: `Die Datei konnte nicht heruntergeladen werden: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleTaxReturnClick = (taxReturn: any) => {
    console.log('Tax return clicked:', taxReturn);
  };

  const handleUploadClick = () => {
    console.log('Upload clicked');
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };

  // Fetch admin notes from secure admin_notes_internal table
  const [currentAdminNotes, setCurrentAdminNotes] = useState('');
  
  useEffect(() => {
    const fetchAdminNotes = async () => {
      const targetTable = selectedTaxFilerId ? 'tax_filers' : 'profiles';
      const targetId = selectedTaxFilerId || userId;
      
      if (!targetId) return;
      
      const { data } = await supabase
        .from('admin_notes_internal')
        .select('note')
        .eq('target_table', targetTable)
        .eq('target_id', targetId)
        .maybeSingle();
      
      setCurrentAdminNotes(data?.note || '');
    };
    
    fetchAdminNotes();
  }, [selectedTaxFilerId, userId]);

  // DEBUG RENDER STATE
  console.log('🎨 UserDetail render state:', {
    loading,
    userExists: !!user,
    userId,
    documentsCount: documents.length,
    formDataCount: formData.length,
    selectedYear
  });

  if (loading) {
    return (
      <div className="flex min-h-screen w-full" style={{ background: 'linear-gradient(to bottom right, hsl(225, 60%, 97%), hsl(240, 20%, 98%), hsl(270, 30%, 97%))' }}>
        <AdminSidebar />
        <main className="flex-1 py-4 pr-4 pl-4 lg:pl-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground animate-pulse">Lädt Benutzerdaten...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen w-full" style={{ background: 'linear-gradient(to bottom right, hsl(225, 60%, 97%), hsl(240, 20%, 98%), hsl(270, 30%, 97%))' }}>
        <AdminSidebar />
        <main className="flex-1 py-4 pr-4 pl-4 lg:pl-0">
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm font-medium text-foreground">Benutzer nicht gefunden</p>
            <Link 
              to="/admin/users" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Zurück zur Übersicht
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Transform form data array into FormData structure for components that need it
  const transformFormDataArray = (formDataArray: any[]) => {
    console.log('🔍 transformFormDataArray called with:', formDataArray);
    console.log('🔍 Selected year:', selectedYear);
    console.log('🔍 Selected tax filer ID:', selectedTaxFilerId);
    
    // Start with default form data to ensure all required properties exist
    const merged = { ...defaultFormData };

    if (formDataArray && formDataArray.length > 0) {
      // Filter by selected year AND tax_filer_id
      const filteredData = formDataArray.filter(item => {
        const yearMatch = item.tax_year === selectedYear;
        const filerMatch = !selectedTaxFilerId || item.tax_filer_id === selectedTaxFilerId;
        console.log(`📅 Form item tax_year: ${item.tax_year}, tax_filer_id: ${item.tax_filer_id}, yearMatch: ${yearMatch}, filerMatch: ${filerMatch}`);
        return yearMatch && filerMatch;
      });

      console.log('📅 Filtered data (year + filer):', filteredData);

      // Merge actual form data with defaults
      filteredData.forEach(item => {
        if (item.form_type && item.data) {
          console.log(`📝 Processing form_type: ${item.form_type}, data:`, item.data);
          merged[item.form_type as keyof typeof merged] = {
            ...merged[item.form_type as keyof typeof merged],
            ...item.data
          };
        }
      });
    }

    console.log('✅ Final merged data:', merged);
    return merged;
  };

  // Transform documents to match UploadedDocument interface and filter by year and tax filer
  const transformDocuments = (docs: Document[]) => {
    // NO filtering here - pass all documents through
    // Filtering is done in UserTabs.tsx to avoid double filtering
    return docs.map(doc => ({
      id: doc.id,
      checklistItemId: doc.checklist_item_id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      url: doc.file_path,
      uploadDate: new Date(doc.upload_date),
      metadata: (doc as any).metadata || {},
      tax_year: doc.tax_year,
      tax_filer_id: doc.tax_filer_id  // Include tax_filer_id for filtering in UserTabs
    }));
  };

  // Transform user data to match UserInfoCard expectations
  const transformedUser = {
    id: user.id,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    email: user.email || '',
    status: 'pending' as any, // Default status
    documents: transformDocuments(documents),
    taxReturns: taxReturns.map(tr => ({
      ...tr,
      taxYear: tr.tax_year
    })),
    formData: transformFormDataArray(formData),
    role: 'user'
  };

  // Debug info for the selected year
  console.log('🔍 Selected year in render:', selectedYear);
  console.log('🔍 All form data:', formData);
  console.log('🔍 Transformed form data:', transformedUser.formData);
  console.log('🔍 All documents:', documents);
  console.log('🔍 Transformed documents:', transformedUser.documents);

  // Get current tax return status
  const currentTaxReturn = taxReturns.find(tr => tr.tax_year === selectedYear && tr.tax_filer_id === selectedTaxFilerId);
  const currentStatus = currentTaxReturn?.status;
  const isMissingDocuments = currentStatus === 'missing_documents' || currentStatus === 'missing_information';

  return (
    <div className="flex min-h-screen w-full" style={{ background: 'linear-gradient(to bottom right, hsl(225, 60%, 97%), hsl(240, 20%, 98%), hsl(270, 30%, 97%))' }}>
      <AdminSidebar />
      
      <main className="flex-1 py-4 pr-4 pl-4 lg:pl-0">
        {/* User Profile Header Card - Gradient style matching TaxYearCard */}
        <div 
          className="rounded-[20px] p-6 mb-4 relative overflow-hidden shadow-lg"
          style={{
            background: 'linear-gradient(135deg, hsla(280, 60%, 85%, 1) 0%, hsla(20, 70%, 88%, 1) 15%, hsla(0, 0%, 97%, 1) 30%, hsla(190, 70%, 85%, 1) 50%, hsla(185, 60%, 82%, 1) 70%, hsla(280, 50%, 87%, 1) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        >
          <div className="relative z-10">
            {/* Top Row: Back + Actions */}
            <div className="flex items-center justify-between mb-5">
              <Link 
                to="/admin" 
                className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-sm border border-white/60 flex items-center justify-center hover:bg-white/80 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </Link>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setMissingItemDialogOpen(true)}
                  className="h-9 rounded-full px-4 font-medium gap-1.5 bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] hover:brightness-[1.04] text-white text-xs shadow-sm border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Unterlagen anfordern
                </Button>
                <div className="flex items-center gap-0.5 border-l border-black/10 pl-2 ml-1">
                  <FormDataPdfDownloader 
                    userId={user.id} 
                    taxYear={selectedYear}
                    userName={`${user.first_name || ''} ${user.last_name || ''}`.trim()} 
                    userEmail={user.email || undefined}
                  />
                  <DocumentsPdfDownloader 
                    userId={user.id} 
                    taxYear={selectedYear}
                    userName={`${user.first_name} ${user.last_name}`}
                    documentCount={documents.filter(d => d.tax_year === selectedYear).length}
                  />
                  <CoverLetterDownloader
                    userId={user.id}
                    userName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                  />
                </div>
              </div>
            </div>
            
            {/* User Identity */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-700">
                  {user.first_name?.charAt(0)?.toUpperCase() || 'U'}
                  {user.last_name?.charAt(0)?.toUpperCase() || ''}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-black tracking-tight">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-sm text-gray-500">
                  {user.email || 'Keine E-Mail'}
                </p>
              </div>
              {transformedUser.formData?.contactInfo?.adressnummer && (
                <span className="text-[10px] font-mono text-gray-500 bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/50 ml-auto">
                  ID: {transformedUser.formData.contactInfo.adressnummer}
                </span>
              )}
            </div>
            
            {/* Status Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tax Filer Selector */}
              {taxFilers.length > 1 && (
                <div className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 text-gray-600">
                  <Users className="h-3.5 w-3.5" />
                  <select
                    value={selectedTaxFilerId || ''}
                    onChange={(e) => setSelectedTaxFilerId(e.target.value)}
                    className="text-xs font-medium bg-transparent border-none outline-none cursor-pointer"
                  >
                    {taxFilers.map(filer => (
                      <option key={filer.id} value={filer.id}>
                        {filer.first_name} {filer.last_name}
                        {filer.is_primary ? ' (Hauptperson)' : filer.relationship ? ` (${filer.relationship})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Year Selector */}
              <div className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 text-gray-600">
                <Calendar className="h-3.5 w-3.5" />
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="text-xs font-medium bg-transparent border-none outline-none cursor-pointer"
                >
                  {Array.from(new Set([
                    ...formData.map(fd => fd.tax_year),
                    ...taxReturns.map(tr => tr.tax_year),
                    ...completedTaxReturns.map(cr => cr.tax_year),
                    new Date().getFullYear().toString()
                  ])).filter(Boolean).sort((a, b) => parseInt(b) - parseInt(a)).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {/* Status Chip */}
              <TaxReturnStatusChanger
                userId={user.id}
                taxYear={selectedYear}
                currentStatus={currentStatus || null}
                onStatusChanged={fetchUserData}
              />
              
              {/* Missing Items Warning */}
              {pendingMissingItemsCount > 0 && (
                <div className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {pendingMissingItemsCount} offen
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[20px] shadow-sm p-4" style={{ border: '1px solid rgba(255, 255, 255, 0.6)' }}>
          <UserTabs
            user={transformedUser}
            taxReturns={taxReturns}
            onTaxReturnClick={handleTaxReturnClick}
            onUploadClick={handleUploadClick}
            userId={user.id}
            allFormData={formData}
            onYearChange={handleYearChange}
            initialNotes={currentAdminNotes}
            selectedYear={selectedYear}
            selectedTaxFilerId={selectedTaxFilerId}
            completedTaxReturns={completedTaxReturns}
            onCompletedTaxReturnsRefresh={fetchUserData}
          />
        </div>

        {/* Missing Item Request Dialog */}
        <CreateMissingItemRequestDialog
          open={missingItemDialogOpen}
          onOpenChange={setMissingItemDialogOpen}
          userId={user.id}
          taxReturnId={taxReturns.find(tr => tr.tax_year === selectedYear && tr.tax_filer_id === selectedTaxFilerId)?.id}
          taxFilerId={selectedTaxFilerId}
          userName={(() => {
            const filer = taxFilers.find(f => f.id === selectedTaxFilerId);
            return filer ? `${filer.first_name} ${filer.last_name}` : `${user.first_name || ''} ${user.last_name || ''}`.trim();
          })()}
          taxYear={selectedYear}
          onSuccess={() => {
            toast({
              title: "Anfrage erstellt",
              description: "Die Anfrage für fehlende Unterlagen wurde erfolgreich erstellt."
            });
            // Refresh missing items count
            const fetchMissingItems = async () => {
              const { data } = await supabase
                .from('missing_item_requests')
                .select('id, status')
                .eq('user_id', user.id);
              if (data) {
                setMissingItemsCount(data.length);
                setPendingMissingItemsCount(data.filter(item => item.status === 'pending').length);
              }
            };
            fetchMissingItems();
          }}
        />
      </main>
    </div>
  );
};

export default UserDetail;
