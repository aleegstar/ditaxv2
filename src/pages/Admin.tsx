import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { SecurityService } from '@/services/SecurityService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Home, RefreshCw, Sparkles, Search, Users as UsersIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import adminUsersHero from '@/assets/admin-users-hero.jpg';
import { User, FormData } from '@/types';
import TaxReturnCreation from "@/components/admin/TaxReturnCreation";
import { TicketManagement } from "@/components/admin/TicketManagement";
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
import Newsletter from './admin/Newsletter';
import PromoCodes from './admin/PromoCodes';
import DevAgXml from './DevAgXml';
import DevAgImport from './DevAgImport';

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
  lastLoginAt?: string | null;
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
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive' | 'with-returns'>('all');
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

      // Fetch last login per user from user_sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .select('user_id, login_time')
        .order('login_time', { ascending: false });

      if (sessionError) {
        console.error('⚠️ Admin: Error fetching user sessions (non-critical):', sessionError);
      }

      const lastLoginMap = new Map<string, string>();
      sessionData?.forEach(s => {
        if (s.user_id && !lastLoginMap.has(s.user_id)) {
          lastLoginMap.set(s.user_id, s.login_time);
        }
      });

      // Combine data
      const usersWithTaxReturns = profiles?.map(user => {
        const userTaxReturns = taxReturnsData?.filter(tr => tr.user_id === user.id) || [];
        return {
          ...user,
          adressnummer: adressnummerMap.get(user.id),
          lastLoginAt: lastLoginMap.get(user.id) || null,
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
    <div className="md:flex md:h-screen md:w-full md:bg-[#F8F9FB] md:overflow-hidden">
      <AdminSidebar />
      <div className="md:flex-1 md:min-w-0 md:bg-background md:overflow-y-auto md:border-l md:border-slate-200/50">
          <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tax-processing" element={<TaxReturnCreation />} />
          <Route path="missing-documents" element={<MissingDocuments />} />
          <Route path="signed-returns" element={<SignedTaxReturns />} />
          <Route path="definitive-tax-bills" element={<DefinitiveTaxBills />} />
          <Route path="tickets" element={<TicketManagement />} />
          <Route path="chat" element={
            <EnhancedAdminChatOverview />
          } />
          <Route path="users" element={
          <Route path="users" element={(() => {
            const now = Date.now();
            const isActive = (u: AdminUser) => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime()) < 1000 * 60 * 60 * 24 * 30;
            const activeCount = users.filter(isActive).length;
            const withReturnsCount = users.filter(u => (u.taxReturns?.length || 0) > 0).length;
            const q = userSearch.trim().toLowerCase();
            const filtered = users.filter(u => {
              if (userFilter === 'active' && !isActive(u)) return false;
              if (userFilter === 'inactive' && isActive(u)) return false;
              if (userFilter === 'with-returns' && (u.taxReturns?.length || 0) === 0) return false;
              if (!q) return true;
              const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
              return name.includes(q) || (u.email || '').toLowerCase().includes(q) || (u.adressnummer || '').toLowerCase().includes(q);
            });
            const filters: { id: typeof userFilter; label: string; count: number }[] = [
              { id: 'all', label: 'Alle', count: users.length },
              { id: 'active', label: 'Aktiv', count: activeCount },
              { id: 'with-returns', label: 'Mit Erklärung', count: withReturnsCount },
              { id: 'inactive', label: 'Inaktiv', count: users.length - activeCount },
            ];
            return (
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-6">
              {/* Hero card */}
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.04)]">
                <div className="grid md:grid-cols-[1.4fr_1fr] gap-0">
                  <div className="p-6 md:p-8 flex flex-col justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/[0.045] text-[11px] font-semibold uppercase tracking-wider text-foreground/70 mb-3">
                        <Sparkles className="h-3 w-3" />
                        Benutzerverwaltung
                      </div>
                      <h1 className="text-[26px] md:text-[30px] font-semibold text-foreground tracking-[-0.02em] leading-tight">
                        Benutzer
                      </h1>
                      <p className="text-[13.5px] text-muted-foreground mt-2 max-w-md leading-relaxed">
                        Übersicht aller registrierten Konten – einsehen, filtern und in die Steuerakten eintauchen.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Gesamt', value: users.length },
                        { label: 'Aktiv', value: activeCount },
                        { label: 'Mit Erklärung', value: withReturnsCount },
                      ].map(s => (
                        <div key={s.label} className="rounded-2xl bg-foreground/[0.025] border border-border/60 px-3 py-2.5">
                          <div className="text-[20px] font-semibold tabular-nums text-foreground tracking-tight">{s.value}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative h-44 md:h-auto min-h-[220px] overflow-hidden">
                    <img src={adminUsersHero} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_25%]" />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-card/10 to-card md:bg-gradient-to-l md:from-transparent md:to-card/80" />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-foreground/[0.045] overflow-x-auto">
                  {filters.map(f => {
                    const active = userFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setUserFilter(f.id)}
                        className={cn(
                          'shrink-0 px-3.5 h-8 rounded-full text-xs transition-all duration-200 inline-flex items-center gap-1.5',
                          active ? 'bg-white text-foreground font-semibold shadow-sm' : 'text-muted-foreground/70 hover:text-foreground/85'
                        )}
                      >
                        {f.label}
                        <span className={cn('tabular-nums text-[10.5px]', active ? 'text-foreground/55' : 'text-muted-foreground/50')}>{f.count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Name, E-Mail oder Nr."
                      className="w-full h-9 pl-9 pr-8 rounded-full bg-foreground/[0.04] border border-transparent focus:bg-white focus:border-border focus:outline-none text-[13px] text-foreground placeholder:text-muted-foreground/60 transition"
                    />
                    {userSearch && (
                      <button onClick={() => setUserSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-foreground/5">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="h-9 px-3 rounded-full border border-border text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Aktualisieren</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 bg-card border border-border rounded-2xl">
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-foreground/[0.04] flex items-center justify-center mb-3">
                    <UsersIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Keine Benutzer gefunden</p>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    {q || userFilter !== 'all' ? 'Passe Suche oder Filter an.' : 'Falls keine Daten sichtbar sind, überprüfe die Berechtigungen.'}
                  </p>
                  <button onClick={fetchUsers} className="h-8 px-3 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors">
                    Erneut versuchen
                  </button>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(15,27,61,0.03)] divide-y divide-border overflow-hidden">
                  {filtered.map(user => (
                    <UserCard
                      key={user.id}
                      id={user.id}
                      firstName={user.first_name}
                      lastName={user.last_name}
                      email={user.email}
                      taxReturnsCount={user.taxReturns?.length || 0}
                      adressnummer={user.adressnummer}
                      lastLoginAt={user.lastLoginAt}
                    />
                  ))}
                </div>
              )}
            </div>
            );
          })()} />
          <Route path="onboarding" element={
            <div className="max-w-6xl mx-auto px-8 py-10">
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
            <div className="max-w-6xl mx-auto px-8 py-10">
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
          <Route path="newsletter" element={<Newsletter />} />
          <Route path="promo-codes" element={<PromoCodes />} />
          <Route path="ag-xml" element={<DevAgXml />} />
          <Route path="ag-import" element={<DevAgImport />} />
          </Routes>
      </div>
    </div>
  );
};

export default Admin;
