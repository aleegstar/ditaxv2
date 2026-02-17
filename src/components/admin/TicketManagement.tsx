import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ticket, Search, Filter, MessageSquare, User, Calendar, FileText, ExternalLink } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateStoragePath } from '@/utils/fileValidation';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { AdminWelcomeHeader } from './AdminWelcomeHeader';

interface TicketData {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  tax_year: string;
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  user_id: string;
  message_count: number;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin_message: boolean;
  created_at: string;
  sender_name: string;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
  }>;
}

const openUserInNewTab = (userId: string) => {
  window.open(`/user-detail/${userId}`, '_blank');
};

// Helper to get signed URL for ticket attachments
const getSignedUrl = async (filePath: string): Promise<string | null> => {
  if (!validateStoragePath(filePath)) {
    console.error('Invalid storage path detected');
    return null;
  }
  try {
    const { data, error } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
};

export const TicketManagement = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<Array<{ id: string; file_name: string; file_path: string; file_type: string; signedUrl?: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showTicketDetail, setShowTicketDetail] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, yearFilter]);

  const fetchTickets = async () => {
    try {
      console.log('Starting to fetch tickets...');
      
      // Step 1: Fetch all support tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      console.log('Fetched tickets:', ticketsData?.length || 0);

      if (!ticketsData || ticketsData.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      // Step 2: Get unique completed_tax_return_ids and user_ids
      const taxReturnIds = [...new Set(ticketsData.map(ticket => ticket.completed_tax_return_id))];
      const userIds = [...new Set(ticketsData.map(ticket => ticket.user_id))];

      console.log('Tax return IDs:', taxReturnIds.length);
      console.log('User IDs:', userIds.length);

      // Step 3: Fetch completed tax returns
      const { data: taxReturnsData, error: taxReturnsError } = await supabase
        .from('completed_tax_returns')
        .select('id, tax_year')
        .in('id', taxReturnIds);

      if (taxReturnsError) {
        console.error('Error fetching tax returns:', taxReturnsError);
        // Continue without tax year data
      }

      console.log('Fetched tax returns:', taxReturnsData?.length || 0);

      // Step 4: Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue without user data
      }

      console.log('Fetched profiles:', profilesData?.length || 0);

      // Step 5: Combine data
      const formattedTickets: TicketData[] = ticketsData.map((ticket) => {
        const taxReturn = taxReturnsData?.find(tr => tr.id === ticket.completed_tax_return_id);
        const profile = profilesData?.find(p => p.id === ticket.user_id);

        return {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.created_at,
          tax_year: taxReturn?.tax_year || 'Unbekannt',
          user_first_name: profile?.first_name || 'Unbekannt',
          user_last_name: profile?.last_name || '',
          user_email: profile?.email || 'Keine E-Mail',
          user_id: ticket.user_id,
          message_count: 0 // Will be updated when needed
        };
      });

      console.log('Formatted tickets:', formattedTickets.length);
      setTickets(formattedTickets);
      
      toast({
        title: "Tickets geladen",
        description: `${formattedTickets.length} Tickets erfolgreich geladen.`
      });

    } catch (error) {
      console.error('Error in fetchTickets:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Tickets konnten nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${ticket.user_first_name} ${ticket.user_last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    if (yearFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.tax_year === yearFilter);
    }

    setFilteredTickets(filtered);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: newStatus,
          ...(newStatus === 'resolved' && { resolved_at: new Date().toISOString() })
        })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      ));

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }

      toast({
        title: "Status aktualisiert",
        description: `Ticket-Status wurde auf "${newStatus}" geändert.`
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden."
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: newMessage,
          is_admin_message: true
        });

      if (error) throw error;

      setNewMessage('');
      fetchTicketMessages(selectedTicket.id);

      toast({
        title: "Nachricht gesendet",
        description: "Deine Antwort wurde versendet."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden."
      });
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          id,
          message,
          is_admin_message,
          created_at,
          profiles!inner(first_name, last_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch attachments for all messages
      const messageIds = data.map((msg: any) => msg.id);
      const { data: attachmentsData } = await supabase
        .from('ticket_attachments')
        .select('id, file_name, file_path, file_type, message_id')
        .in('message_id', messageIds);

      // Get signed URLs for all attachments
      const attachmentsWithUrls = await Promise.all(
        (attachmentsData || []).map(async (att) => ({
          ...att,
          signedUrl: await getSignedUrl(att.file_path)
        }))
      );

      const formattedMessages = data.map((msg: any) => ({
        id: msg.id,
        message: msg.message,
        is_admin_message: msg.is_admin_message,
        created_at: msg.created_at,
        sender_name: msg.is_admin_message ? 'Admin' : `${msg.profiles.first_name} ${msg.profiles.last_name}`,
        attachments: attachmentsWithUrls.filter(att => att.message_id === msg.id) || []
      }));

      setTicketMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchTicketAttachments = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('id, file_name, file_path, file_type, message_id')
        .eq('ticket_id', ticketId);

      if (error) throw error;

      // Filter to ticket-level attachments (not message-level) and get signed URLs
      const ticketLevelAttachments = (data || []).filter((att: any) => !att.message_id);
      const attachmentsWithUrls = await Promise.all(
        ticketLevelAttachments.map(async (att) => ({
          ...att,
          signedUrl: await getSignedUrl(att.file_path)
        }))
      );

      setTicketAttachments(attachmentsWithUrls);
    } catch (error) {
      console.error('Error fetching ticket attachments:', error);
      setTicketAttachments([]);
    }
  };

  const openTicketDetail = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
    fetchTicketAttachments(ticket.id);
    setShowTicketDetail(true);
  };

  const getUniqueYears = () => {
    const years = [...new Set(tickets.map(ticket => ticket.tax_year))];
    return years.sort((a, b) => b.localeCompare(a));
  };

  if (loading) {
    return (
      <div className="text-center py-8 border border-border bg-card rounded-xl">
        <div className="text-foreground">Lade Tickets...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 bg-background min-h-screen">
      <AdminWelcomeHeader
        title="Support Tickets"
        subtitle="Kundenanfragen verwalten und bearbeiten"
        badge={{
          text: `${filteredTickets.length} Tickets`,
          variant: 'secondary'
        }}
        onRefresh={fetchTickets}
      />

      {/* Filters */}
      <Card className="border border-border bg-card rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground">Filter & Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Titel, Beschreibung oder Nutzer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Erledigt</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Steuerjahr" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Jahre</SelectItem>
                {getUniqueYears().map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="grid gap-4">
        {filteredTickets.map((ticket) => (
          <Card 
            key={ticket.id} 
            className="border border-border bg-card rounded-xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 cursor-pointer group"
            onClick={() => openTicketDetail(ticket)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                      {ticket.title}
                    </h3>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <p className="text-muted-foreground mb-3 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span 
                      className="flex items-center cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/admin/user/${ticket.user_id}`, '_blank');
                      }}
                    >
                      <User className="mr-1 h-3 w-3" />
                      {ticket.user_first_name} {ticket.user_last_name}
                    </span>
                    <span className="flex items-center">
                      <FileText className="mr-1 h-3 w-3" />
                      {ticket.tax_year}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-foreground transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={showTicketDetail} onOpenChange={setShowTicketDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl">
          {selectedTicket && (
            <>
              <DialogHeader className="text-center pb-6">
                <DialogTitle className="text-foreground text-xl font-semibold">
                  {selectedTicket.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Ticket Info - Centered Layout */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-full max-w-md p-4 border border-border bg-card rounded-xl">
                    <div className="text-center mb-4">
                      <span className="text-muted-foreground text-sm font-medium">Status:</span>
                      <div className="mt-2">
                        <Select
                          value={selectedTicket.status}
                          onValueChange={(value) => updateTicketStatus(selectedTicket.id, value as 'open' | 'in_progress' | 'resolved' | 'closed')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Offen</SelectItem>
                            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                            <SelectItem value="resolved">Erledigt</SelectItem>
                            <SelectItem value="closed">Geschlossen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-md p-4 border border-border bg-card rounded-xl">
                    <div className="text-center">
                      <span className="text-muted-foreground text-sm font-medium mb-2 block">Nutzer:</span>
                      <div 
                        className="cursor-pointer hover:bg-muted p-3 rounded-lg transition-colors group"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/admin/user/${selectedTicket.user_id}`, '_blank');
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-center">
                            <p className="text-foreground group-hover:text-blue-600 transition-colors font-medium">
                              {selectedTicket.user_first_name} {selectedTicket.user_last_name}
                            </p>
                            <p className="text-muted-foreground text-sm group-hover:text-blue-600/70 transition-colors">
                              {selectedTicket.user_email}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Original Description - Centered */}
                <div className="flex justify-center">
                  <div className="w-full max-w-md p-4 border border-border bg-card rounded-xl">
                    <h4 className="text-foreground font-medium mb-2 text-center">Ursprüngliche Beschreibung:</h4>
                    <p className="text-muted-foreground text-center">{selectedTicket.description}</p>
                </div>
                </div>

                {ticketAttachments.length > 0 && (
                  <div className="flex justify-center">
                    <div className="w-full max-w-md p-4 border border-border bg-card rounded-xl">
                      <h4 className="text-foreground font-medium mb-2 text-center">Anhänge</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {ticketAttachments.map((att) => (
                          <div key={att.id} className="text-center">
                            {att.file_type.startsWith('image/') && att.signedUrl ? (
                              <img
                                src={att.signedUrl}
                                alt={att.file_name}
                                className="mx-auto max-w-full h-auto rounded-lg border border-white/30"
                                style={{ maxHeight: '300px' }}
                              />
                            ) : att.signedUrl ? (
                              <a
                                href={att.signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                              >
                                <FileText className="h-4 w-4" />
                                {att.file_name}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">{att.file_name} (Wird geladen...)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages - Centered Container */}
                <div className="flex justify-center">
                  <div className="w-full max-w-md space-y-2 max-h-96 overflow-y-auto">
                    {ticketMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 border border-border rounded-lg ${
                          message.is_admin_message 
                            ? 'bg-blue-50' 
                            : 'bg-card'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-muted-foreground text-sm font-medium">
                            {message.sender_name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(message.created_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        <p className="text-foreground mb-2">{message.message}</p>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment: any) => (
                              <div key={attachment.id}>
                                {attachment.file_type.startsWith('image/') && attachment.signedUrl ? (
                                  <img
                                    src={attachment.signedUrl}
                                    alt={attachment.file_name}
                                    className="max-w-full h-auto rounded-lg border border-white/30"
                                    style={{ maxHeight: '300px' }}
                                  />
                                ) : attachment.signedUrl ? (
                                  <a
                                    href={attachment.signedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    <FileText className="h-4 w-4" />
                                    {attachment.file_name}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-sm">{attachment.file_name} (Wird geladen...)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Section - Centered */}
                <div className="flex justify-center">
                  <div className="w-full max-w-md space-y-3">
                    <Textarea
                      placeholder="Antwort schreiben..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="w-full"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Antworten
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
