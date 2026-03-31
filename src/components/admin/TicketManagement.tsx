import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageSquare, User, Calendar, FileText, ExternalLink, RefreshCw, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateStoragePath } from '@/utils/fileValidation';
import { cn } from '@/lib/utils';

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Offen';
      case 'in_progress': return 'In Bearbeitung';
      case 'resolved': return 'Erledigt';
      case 'closed': return 'Geschlossen';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-sm text-muted-foreground text-center py-20">Lade Tickets...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Support Tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredTickets.length} Tickets
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 rounded-lg bg-background border-border/60 text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'open', label: 'Offen' },
            { key: 'in_progress', label: 'Bearbeitung' },
            { key: 'resolved', label: 'Erledigt' },
            { key: 'closed', label: 'Geschlossen' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                statusFilter === f.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {getUniqueYears().length > 0 && (
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px] h-9 text-xs rounded-lg border-border/60">
              <SelectValue placeholder="Jahr" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Jahre</SelectItem>
              {getUniqueYears().map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Keine Tickets</p>
          <p className="text-xs text-muted-foreground">Keine Tickets gefunden.</p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm overflow-hidden divide-y divide-white/30">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => openTicketDetail(ticket)}
              className="p-5 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {ticket.title}
                    </h3>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                      ticket.status === 'open'
                        ? "bg-foreground/[0.08] text-foreground"
                        : ticket.status === 'in_progress'
                        ? "bg-foreground/[0.06] text-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.user_first_name} {ticket.user_last_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {ticket.tax_year}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.created_at).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                </div>
                <MessageSquare className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={showTicketDetail} onOpenChange={setShowTicketDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {selectedTicket.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-5 mt-4">
                {/* Info row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => window.open(`/admin/user/${selectedTicket.user_id}`, '_blank')}
                  >
                    <User className="h-3 w-3" />
                    {selectedTicket.user_first_name} {selectedTicket.user_last_name}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                  <span>{selectedTicket.user_email}</span>
                  <span>{selectedTicket.tax_year}</span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => updateTicketStatus(selectedTicket.id, value as any)}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
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

                {/* Description */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Beschreibung</h4>
                  <p className="text-sm text-foreground">{selectedTicket.description}</p>
                </div>

                {/* Attachments */}
                {ticketAttachments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Anhänge</h4>
                    <div className="space-y-2">
                      {ticketAttachments.map((att) => (
                        <div key={att.id}>
                          {att.file_type.startsWith('image/') && att.signedUrl ? (
                            <img src={att.signedUrl} alt={att.file_name} className="max-w-full h-auto rounded-lg border border-border/60" style={{ maxHeight: '200px' }} />
                          ) : att.signedUrl ? (
                            <a href={att.signedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-foreground hover:underline">
                              <FileText className="h-3 w-3" />
                              {att.file_name}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">{att.file_name}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {ticketMessages.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Nachrichten</h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {ticketMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "p-3 rounded-lg text-sm",
                            message.is_admin_message
                              ? "bg-foreground/[0.04] border border-border/40"
                              : "bg-muted/50"
                          )}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-foreground">{message.sender_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(message.created_at).toLocaleString('de-CH')}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80">{message.message}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment: any) => (
                                <div key={attachment.id}>
                                  {attachment.file_type.startsWith('image/') && attachment.signedUrl ? (
                                    <img src={attachment.signedUrl} alt={attachment.file_name} className="max-w-full h-auto rounded-lg border border-border/40" style={{ maxHeight: '200px' }} />
                                  ) : attachment.signedUrl ? (
                                    <a href={attachment.signedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-foreground hover:underline">
                                      <FileText className="h-3 w-3" />
                                      {attachment.file_name}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">{attachment.file_name}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Antwort schreiben..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="text-sm min-h-[80px] rounded-lg"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white hover:brightness-[1.04] disabled:opacity-50 transition-all"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Antworten
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
