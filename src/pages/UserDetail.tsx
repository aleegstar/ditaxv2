import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, FileIcon, Calendar, AlertCircle } from 'lucide-react';
import { SecurityService } from '@/services/SecurityService';
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
  console.log('🔗 URL search params:', Object.fromEntries(searchParams.entries()));
  console.log('🔗 URL year parameter:', urlYear);
  
  const [user, setUser] = useState<DatabaseUser | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [completedTaxReturns, setCompletedTaxReturns] = useState<CompletedTaxReturn[]>([]);
  const [formData, setFormData] = useState<any[]>([]);
  const [taxReturns, setTaxReturns] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(urlYear || new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [missingItemDialogOpen, setMissingItemDialogOpen] = useState(false);
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

  const handleDownloadCompletedTaxReturn = async (taxReturn: CompletedTaxReturn) => {
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
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">Lädt Benutzerdaten...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <div>Benutzer nicht gefunden</div>
            <div className="mt-2 text-sm text-gray-500">
              Debug: UserId={userId}, User={user ? 'exists' : 'null'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Transform form data array into FormData structure for components that need it
  const transformFormDataArray = (formDataArray: any[]) => {
    console.log('🔍 transformFormDataArray called with:', formDataArray);
    console.log('🔍 Selected year:', selectedYear);
    
    // Start with default form data to ensure all required properties exist
    const merged = { ...defaultFormData };

    if (formDataArray && formDataArray.length > 0) {
      // Filter by selected year first
      const yearFilteredData = formDataArray.filter(item => {
        const matches = item.tax_year === selectedYear;
        console.log(`📅 Form item tax_year: ${item.tax_year}, matches ${selectedYear}: ${matches}`);
        return matches;
      });

      console.log('📅 Year filtered data:', yearFilteredData);

      // Merge actual form data with defaults
      yearFilteredData.forEach(item => {
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

  // Transform documents to match UploadedDocument interface and filter by year
  const transformDocuments = (docs: Document[]) => {
    console.log('🔍 transformDocuments called with:', docs);
    console.log('🔍 Selected year for documents:', selectedYear);
    
    // Filter documents by tax year - only show documents with matching tax_year
    const yearFilteredDocs = docs.filter(doc => {
      if (!doc.tax_year) {
        console.log('📄 Document has no tax_year, excluding:', doc.file_name);
        return false; // Exclude documents without tax_year
      }
      return doc.tax_year === selectedYear;
    });

    console.log('📄 Filtered documents for year', selectedYear, ':', yearFilteredDocs);

    return yearFilteredDocs.map(doc => ({
      id: doc.id,
      checklistItemId: doc.checklist_item_id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      url: doc.file_path,
      uploadDate: new Date(doc.upload_date),
      metadata: (doc as any).metadata || {}, // Preserve the actual metadata from the database
      tax_year: doc.tax_year // Preserve tax_year field
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

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: 'rgb(244 244 244 / var(--tw-bg-opacity, 1))' }}>
      <AdminSidebar />
      
      <main className="flex-1 p-6">
        <div className="bg-white rounded-3xl shadow-sm min-h-[calc(100vh-3rem)] p-6">
          {/* Modern Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Link to="/admin">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück zum Dashboard
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center border-2 border-primary/20">
                  <span className="text-2xl font-bold text-primary">
                    {user.first_name?.charAt(0)?.toUpperCase() || 'U'}
                    {user.last_name?.charAt(0)?.toUpperCase() || ''}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {user.first_name} {user.last_name}
                    </h1>
                    {transformedUser.formData?.contactInfo?.adressnummer && (
                      <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                        Nr. {transformedUser.formData.contactInfo.adressnummer}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-lg">
                    {user.email || 'Keine E-Mail verfügbar'}
                  </p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
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
                  documentCount={documents.length}
                />
                <CoverLetterDownloader
                  userId={user.id}
                  userName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                />
              </div>
            </div>
            
            {/* Status Changer for Admin */}
            <div className="mt-4 pt-4 border-t">
              <TaxReturnStatusChanger
                userId={user.id}
                taxYear={selectedYear}
                currentStatus={taxReturns.find(tr => tr.tax_year === selectedYear)?.status || null}
                onStatusChanged={fetchUserData}
              />
            </div>
          </div>

          {/* Missing Items Request Button */}
          <div className="mb-6">
            <Button
              onClick={() => setMissingItemDialogOpen(true)}
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full px-[20px] py-[10px] font-medium border-0 transition-colors duration-200 gap-2"
              style={{ boxShadow: 'rgba(249, 115, 22, 0.3) 0px 3px 10px 0px' }}
            >
              <AlertCircle className="h-4 w-4" />
              Fehlende Unterlagen anfordern
            </Button>
          </div>

          {/* Main Content */}
          <UserTabs
            user={transformedUser}
            taxReturns={taxReturns}
            onTaxReturnClick={handleTaxReturnClick}
            onUploadClick={handleUploadClick}
            userId={user.id}
            allFormData={formData}
            onYearChange={handleYearChange}
            initialNotes={user.admin_notes || ''}
            selectedYear={selectedYear}
            completedTaxReturns={completedTaxReturns}
            onCompletedTaxReturnsRefresh={fetchUserData}
          />
        </div>

        {/* Missing Item Request Dialog */}
        <CreateMissingItemRequestDialog
          open={missingItemDialogOpen}
          onOpenChange={setMissingItemDialogOpen}
          userId={user.id}
          taxReturnId={taxReturns.find(tr => tr.tax_year === selectedYear)?.id}
          onSuccess={() => {
            toast({
              title: "Anfrage erstellt",
              description: "Die Anfrage für fehlende Unterlagen wurde erfolgreich erstellt."
            });
          }}
        />
      </main>
    </div>
  );
};

export default UserDetail;
