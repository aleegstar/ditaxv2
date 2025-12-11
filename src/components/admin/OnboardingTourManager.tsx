import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Users, UserCheck, UserX, Search, RotateCcw } from 'lucide-react';
import { debug } from '@/utils/debug';

interface TourStats {
  total_users: number;
  tour_completed: number;
  tour_pending: number;
  completion_rate: number;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  onboarding_tour_completed: boolean;
  onboarding_tour_completed_at: string | null;
}

export const OnboardingTourManager: React.FC = () => {
  const [stats, setStats] = useState<TourStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { isValid, userId } = useAuthValidation();

  // Check if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!userId) return;
      
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();
        
        setIsAdmin(data?.role === 'admin');
      } catch (error) {
        debug.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [userId]);

  // Load tour statistics
  const loadStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_onboarding_tour_stats');
      
      if (error) throw error;
      
      // Parse the JSON result properly
      const statsData = typeof data === 'string' ? JSON.parse(data) : data;
      setStats(statsData as TourStats);
    } catch (error) {
      debug.error('Error loading tour stats:', error);
      toast.error('Fehler beim Laden der Statistiken');
    } finally {
      setLoading(false);
    }
  };

  // Load users with tour status
  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, onboarding_tour_completed, onboarding_tour_completed_at')
        .order('onboarding_tour_completed', { ascending: true })
        .order('first_name', { ascending: true });
      
      if (error) throw error;
      
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      debug.error('Error loading users:', error);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Reset tour for selected users
  const resetTourForUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Benutzer aus');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('reset_onboarding_tour', {
        user_ids: selectedUsers
      });
      
      if (error) throw error;
      
      toast.success(`Tour für ${data} Benutzer zurückgesetzt`);
      
      // Reload data
      await Promise.all([loadStats(), loadUsers()]);
      setSelectedUsers([]);
      
    } catch (error) {
      debug.error('Error resetting tour:', error);
      toast.error('Fehler beim Zurücksetzen der Tour');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (isValid && isAdmin) {
      loadStats();
      loadUsers();
    }
  }, [isValid, isAdmin]);

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Select all pending users
  const selectAllPending = () => {
    const pendingUserIds = filteredUsers
      .filter(user => !user.onboarding_tour_completed)
      .map(user => user.id);
    setSelectedUsers(pendingUserIds);
  };

  if (!isValid || !isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Admin-Berechtigung erforderlich
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Benutzer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tour Abgeschlossen</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.tour_completed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tour Ausstehend</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.tour_pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abschlussrate</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.completion_rate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tour-Verwaltung</CardTitle>
          <CardDescription>
            Verwalten Sie den Status der Onboarding-Tour für alle Benutzer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Benutzer suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button 
              onClick={selectAllPending}
              variant="outline"
              size="sm"
            >
              Alle Ausstehend auswählen
            </Button>
            <Button 
              onClick={resetTourForUsers}
              disabled={selectedUsers.length === 0 || loading}
              variant="destructive"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Tour zurücksetzen ({selectedUsers.length})
            </Button>
            <Button 
              onClick={() => Promise.all([loadStats(), loadUsers()])}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-8 p-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(filteredUsers.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">E-Mail</th>
                    <th className="text-left p-2">Tour Status</th>
                    <th className="text-left p-2">Abgeschlossen am</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-muted/50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                        />
                      </td>
                      <td className="p-2">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="p-2">
                        <Badge 
                          variant={user.onboarding_tour_completed ? "default" : "secondary"}
                        >
                          {user.onboarding_tour_completed ? "Abgeschlossen" : "Ausstehend"}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm text-muted-foreground">
                        {user.onboarding_tour_completed_at 
                          ? new Date(user.onboarding_tour_completed_at).toLocaleDateString('de-DE')
                          : "-"
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Keine Benutzer gefunden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};