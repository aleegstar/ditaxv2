import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { SecurityService } from '@/services/SecurityService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Home } from 'lucide-react';
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
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-6">
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
            <div className="-m-6 h-[calc(100vh-3rem)] overflow-hidden rounded-3xl">
              <EnhancedAdminChatOverview />
            </div>
          } />
          <Route path="users" element={
            <div className="container mx-auto px-4 py-8">
              <AdminWelcomeHeader
                title="Benutzer"
                subtitle="Alle registrierten Benutzer verwalten"
                badge={{
                  text: `${users.length} Benutzer`,
                  variant: 'secondary'
                }}
                onRefresh={fetchUsers}
                showStats={true}
              />

              {loading ? (
                <div className="text-center py-8">
                  <div className="mb-4">Lädt Benutzerdaten...</div>
                  <div className="text-sm text-gray-600">
                    Aktueller Status: {currentUser ? 'Angemeldet' : 'Nicht angemeldet'} | 
                    Admin: {adminStatus === null ? 'Prüfung läuft...' : adminStatus ? 'Ja' : 'Nein'}
                  </div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mb-4">Keine Benutzerdaten gefunden</div>
                  <div className="text-sm text-gray-600">
                    RLS-Policies wurden bereinigt. Falls weiterhin keine Daten sichtbar sind, überprüfen Sie die Administratorberechtigung.
                  </div>
                  <Button onClick={fetchUsers} variant="outline" className="mt-4">
                    Erneut versuchen
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </Routes>
      </main>
    </div>
  );
};

export default Admin;
