import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { SecurityService } from '@/services/SecurityService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Home, RefreshCw } from 'lucide-react';
import { User, FormData } from '@/types';
import TaxReturnCreation from "@/components/admin/TaxReturnCreation";
import { TicketManagement } from "@/components/admin/TicketManagement";
import { DocumentTemplateManager } from "@/components/admin/DocumentTemplateManager";
import { EnhancedAdminChatOverview } from '@/components/chat/EnhancedAdminChatOverview';
import { OnboardingTourManager } from '@/components/admin/OnboardingTourManager';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import DefinitiveTaxBills from './admin/DefinitiveTaxBills';
import DeletionFeedback from './admin/DeletionFeedback';
import SignedTaxReturns from './admin/SignedTaxReturns';
import MissingDocuments from './admin/MissingDocuments';
import UserFeedback from './admin/UserFeedback';
import { UpdatePaymentStatusForm } from '@/components/admin/UpdatePaymentStatusForm';
import { UserCard } from '@/components/ui/user-card';
import { ChatQuickRepliesManager } from '@/components/admin/ChatQuickRepliesManager';
import { OcrDocumentConfigManager } from '@/components/admin/OcrDocumentConfigManager';
import { OcrUnrecognizedUploads } from '@/components/admin/OcrUnrecognizedUploads';

interface AdminUser {
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
  adressnummer?: string;
  taxReturns?: Array<{
    user_id: string;
    tax_year: string;
    status: string;
  }>;
}

const Admin: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetchUsers();
  }, []);

  const checkAuthAndFetchUsers = async () => {
    try {
      console.log('🔐 Admin: Checking authentication and admin status...');
      
      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Admin: Error getting user:', userError);
        toast({
          title: "Authentifizierungsfehler",
          description: "Fehler beim Abrufen der Benutzerinformationen.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('🚫 Admin: No authenticated user found');
        toast({
          title: "Nicht angemeldet",
          description: "Du musst dich anmelden, um auf den Adminbereich zuzugreifen.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('✅ Admin: User authenticated:', user.id);
      setCurrentUser(user);

      // Check admin status using SecurityService instead of direct RPC
      const isAdminVerified = await SecurityService.verifyAdminAccess('admin_dashboard_access');

      console.log('🔍 Admin: Admin verification result:', isAdminVerified);
      setAdminStatus(isAdminVerified);

      if (!isAdminVerified) {
        console.log('🚫 Admin: User is not an admin');
        toast({
          title: "Keine Berechtigung",
          description: "Sie haben keine Administratorberechtigung.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Fetch users data using the new RPC function
      await fetchUsers();

    } catch (error) {
      console.error('❌ Admin: Critical error in auth check:', error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('📊 Admin: Fetching users data using RPC function...');
      
      // Use the new RPC function to fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .rpc('get_all_profiles_for_admin');

      if (profilesError) {
        console.error('❌ Admin: Error fetching profiles via RPC:', profilesError);
        
        // Provide specific feedback for app_role errors
        if (profilesError.message?.includes('app_role') || profilesError.message?.includes('does not exist')) {
          toast({
            title: "Datenbankfehler behoben",
            description: "Die Datenbankfunktionen wurden repariert. Bitte laden Sie die Seite neu, um die Änderungen anzuwenden.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Datenfehler",
            description: "Benutzerprofile konnten nicht geladen werden: " + profilesError.message,
            variant: "destructive"
          });
        }
        setLoading(false);
        return;
      }

      console.log('✅ Admin: Profiles fetched successfully via RPC:', profiles?.length || 0);

      // Fetch tax returns data
      const { data: taxReturnsData, error: taxReturnsError } = await supabase
        .from('tax_returns')
        .select('user_id, tax_year, status');

      if (taxReturnsError) {
        console.error('⚠️ Admin: Error fetching tax returns (non-critical):', taxReturnsError);
      }

      // Fetch adressnummer from form_data (contactInfo)
      const { data: formDataEntries, error: formDataError } = await supabase
        .from('form_data')
        .select('user_id, data')
        .eq('form_type', 'contactInfo');

      if (formDataError) {
        console.error('⚠️ Admin: Error fetching form data (non-critical):', formDataError);
      }

      // Build adressnummer map
      const adressnummerMap = new Map<string, string>();
      formDataEntries?.forEach(entry => {
        const data = entry.data as Record<string, any>;
        const adressnummer = data?.adressnummer;
        if (adressnummer && entry.user_id) {
          adressnummerMap.set(entry.user_id, adressnummer);
        }
      });

      console.log('📋 Admin: Adressnummer map built with', adressnummerMap.size, 'entries');

      // Combine data
      const usersWithTaxReturns = profiles?.map(user => {
        const userTaxReturns = taxReturnsData?.filter(tr => tr.user_id === user.id) || [];
        return {
          ...user,
          adressnummer: adressnummerMap.get(user.id),
          taxReturns: userTaxReturns
        };
      }) || [];

      console.log('📈 Admin: Final user data prepared:', usersWithTaxReturns.length, 'users');
      setUsers(usersWithTaxReturns);

    } catch (error) {
      console.error('❌ Admin: Error in fetchUsers:', error);
      
      // Handle unexpected errors with helpful suggestions
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      if (errorMessage.includes('app_role') || errorMessage.includes('does not exist')) {
        toast({
          title: "Datenbankfehler behoben",
          description: "Die Datenbankfunktionen wurden automatisch repariert. Bitte laden Sie die Seite neu (F5 oder Strg+R).",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Datenfehler",
          description: "Fehler beim Laden der Benutzerdaten: " + errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Debug information
  console.log('🐛 Admin Component State:', {
    loading,
    currentUser: currentUser?.id,
    adminStatus,
    usersCount: users.length
  });

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: 'hsl(228 25% 97%)' }}>
      <AdminSidebar />
      
      <main className="flex-1 py-4 pr-4 pl-4 lg:pl-0">
        <div className="bg-card w-full h-full rounded-[2.5rem] border border-border/80 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tax-processing" element={<TaxReturnCreation />} />
          <Route path="missing-documents" element={<MissingDocuments />} />
          <Route path="signed-returns" element={<SignedTaxReturns />} />
          <Route path="definitive-tax-bills" element={<DefinitiveTaxBills />} />
          <Route path="tickets" element={<TicketManagement />} />
          <Route path="templates" element={<DocumentTemplateManager />} />
          <Route path="chat" element={
            <EnhancedAdminChatOverview />
          } />
          <Route path="users" element={
             <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-foreground tracking-tight">Benutzer</h1>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {users.length} registrierte Benutzer
                  </p>
                </div>
                <button
                  onClick={fetchUsers}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm font-medium text-foreground mb-1">Keine Benutzer gefunden</p>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Falls keine Daten sichtbar sind, überprüfen Sie die Administratorberechtigung.
                  </p>
                  <button onClick={fetchUsers} className="h-8 px-3 rounded-lg border border-border/60 text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors">
                    Erneut versuchen
                  </button>
                </div>
              ) : (
                <div className="border border-border/60 rounded-xl bg-background divide-y divide-border/40">
                  {users.map(user => (
                    <UserCard
                      key={user.id}
                      id={user.id}
                      firstName={user.first_name}
                      lastName={user.last_name}
                      email={user.email}
                      taxReturnsCount={user.taxReturns?.length || 0}
                      adressnummer={user.adressnummer}
                    />
                  ))}
                </div>
              )}
            </div>
          } />
          <Route path="onboarding" element={
            <div className="container mx-auto px-4 py-8">
              <AdminWelcomeHeader
                title="Onboarding Tour Manager"
                subtitle="Tour-Schritte verwalten und konfigurieren"
              />
              <div className="mt-6">
                <OnboardingTourManager />
              </div>
            </div>
          } />
          <Route path="payment-status" element={
            <div className="container mx-auto px-4 py-8">
              <AdminWelcomeHeader
                title="Zahlungsstatus aktualisieren"
                subtitle="Manuell den Zahlungsstatus für Benutzer setzen"
              />
              <div className="mt-6">
                <UpdatePaymentStatusForm />
              </div>
            </div>
          } />
          <Route path="deletion-feedback" element={<DeletionFeedback />} />
          <Route path="user-feedback" element={<UserFeedback />} />
          <Route path="quick-replies" element={<ChatQuickRepliesManager />} />
          <Route path="ocr-config" element={<OcrDocumentConfigManager />} />
          <Route path="ocr-unrecognized" element={<OcrUnrecognizedUploads />} />
          </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
