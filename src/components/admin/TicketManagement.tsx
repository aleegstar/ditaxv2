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

export const TicketManagement = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<Array<{ id: string; file_name: string; file_path: string; file_type: string }>>([]);
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

      const formattedMessages = data.map((msg: any) => ({
        id: msg.id,
        message: msg.message,
        is_admin_message: msg.is_admin_message,
        created_at: msg.created_at,
        sender_name: msg.is_admin_message ? 'Admin' : `${msg.profiles.first_name} ${msg.profiles.last_name}`,
        attachments: attachmentsData?.filter(att => att.message_id === msg.id) || []
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

      setTicketAttachments((data || []).filter((att: any) => !att.message_id));
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
      <div 
        className="text-center py-8 border-2 border-white shadow-lg"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.43)',
          borderRadius: '20px',
          backdropFilter: 'blur(15px)'
        }}
      >
        <div className="text-black">Lade Tickets...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 bg-white min-h-screen">
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
      <Card 
        className="border-2 border-white transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.43)',
          backdropFilter: 'blur(25px)',
          borderRadius: '20px'
        }}
      >
        <CardHeader>
          <CardTitle className="text-black">Filter & Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-black/50" />
              <Input
                placeholder="Suche nach Titel, Beschreibung oder Nutzer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/20 border-gray-300 text-black placeholder:text-black/50 focus:bg-white/30 transition-all"
                style={{ borderRadius: '12px' }}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger 
                className="bg-white/20 border-gray-300 text-black hover:bg-white/30 transition-all"
                style={{ borderRadius: '12px' }}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: '12px' }}>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Erledigt</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger 
                className="bg-white/20 border-gray-300 text-black hover:bg-white/30 transition-all"
                style={{ borderRadius: '12px' }}
              >
                <SelectValue placeholder="Steuerjahr" />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: '12px' }}>
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
            className="border-2 border-white shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer group" 
            style={{
              background: 'rgba(255, 255, 255, 0.43)',
              backdropFilter: 'blur(25px)',
              borderRadius: '20px'
            }}
            onClick={() => openTicketDetail(ticket)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-black group-hover:text-blue-600 transition-colors">
                      {ticket.title}
                    </h3>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <p className="text-black/70 mb-3 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-sm text-black/60">
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
                  className="text-black/70 hover:text-black hover:bg-white/20 transition-all"
                  style={{ borderRadius: '12px' }}
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
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-[25px] border-2 border-white shadow-lg"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.43)',
            borderRadius: '20px'
          }}
        >
          {selectedTicket && (
            <>
              <DialogHeader className="text-center pb-6">
                <DialogTitle className="text-black text-xl font-semibold">
                  {selectedTicket.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Ticket Info - Centered Layout */}
                <div className="flex flex-col items-center space-y-4">
                  <div 
                    className="w-full max-w-md p-4 backdrop-blur-[25px] border-2 border-white shadow-lg"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.43)',
                      borderRadius: '20px'
                    }}
                  >
                    <div className="text-center mb-4">
                      <span className="text-black/70 text-sm font-medium">Status:</span>
                      <div className="mt-2">
                        <Select
                          value={selectedTicket.status}
                          onValueChange={(value) => updateTicketStatus(selectedTicket.id, value as 'open' | 'in_progress' | 'resolved' | 'closed')}
                        >
                          <SelectTrigger 
                            className="bg-white/20 border-gray-300 text-black hover:bg-white/30 transition-all"
                            style={{ borderRadius: '12px' }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent style={{ borderRadius: '12px' }}>
                            <SelectItem value="open">Offen</SelectItem>
                            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                            <SelectItem value="resolved">Erledigt</SelectItem>
                            <SelectItem value="closed">Geschlossen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div 
                    className="w-full max-w-md p-4 backdrop-blur-[25px] border-2 border-white shadow-lg"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.43)',
                      borderRadius: '20px'
                    }}
                  >
                    <div className="text-center">
                      <span className="text-black/70 text-sm font-medium mb-2 block">Nutzer:</span>
                      <div 
                        className="cursor-pointer hover:bg-white/20 p-3 rounded-lg transition-colors group"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/admin/user/${selectedTicket.user_id}`, '_blank');
                        }}
                        style={{ borderRadius: '12px' }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-center">
                            <p className="text-black group-hover:text-blue-600 transition-colors font-medium">
                              {selectedTicket.user_first_name} {selectedTicket.user_last_name}
                            </p>
                            <p className="text-black/70 text-sm group-hover:text-blue-600/70 transition-colors">
                              {selectedTicket.user_email}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-black/50 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Original Description - Centered */}
                <div className="flex justify-center">
                  <div 
                    className="w-full max-w-md p-4 backdrop-blur-[25px] border-2 border-white shadow-lg"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.43)',
                      borderRadius: '20px'
                    }}
                  >
                    <h4 className="text-black font-medium mb-2 text-center">Ursprüngliche Beschreibung:</h4>
                    <p className="text-black/80 text-center">{selectedTicket.description}</p>
                </div>
                </div>

                {ticketAttachments.length > 0 && (
                  <div className="flex justify-center">
                    <div 
                      className="w-full max-w-md p-4 backdrop-blur-[25px] border-2 border-white shadow-lg"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.43)',
                        borderRadius: '20px'
                      }}
                    >
                      <h4 className="text-black font-medium mb-2 text-center">Anhänge</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {ticketAttachments.map((att) => (
                          <div key={att.id} className="text-center">
                            {att.file_type.startsWith('image/') ? (
                              <img
                                src={`https://gqbhilftduwxjszznnzy.supabase.co/storage/v1/object/public/ticket-attachments/${att.file_path}`}
                                alt={att.file_name}
                                className="mx-auto max-w-full h-auto rounded-lg border border-white/30"
                                style={{ maxHeight: '300px' }}
                              />
                            ) : (
                              <a
                                href={`https://gqbhilftduwxjszznnzy.supabase.co/storage/v1/object/public/ticket-attachments/${att.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                              >
                                <FileText className="h-4 w-4" />
                                {att.file_name}
                              </a>
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
                        className={`p-3 backdrop-blur-[25px] border-2 border-white shadow-lg ${
                          message.is_admin_message 
                            ? 'bg-blue-100/50' 
                            : 'bg-white/30'
                        }`}
                        style={{ borderRadius: '12px' }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-black/70 text-sm font-medium">
                            {message.sender_name}
                          </span>
                          <span className="text-black/50 text-xs">
                            {new Date(message.created_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        <p className="text-black mb-2">{message.message}</p>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id}>
                                {attachment.file_type.startsWith('image/') ? (
                                  <img
                                    src={`https://gqbhilftduwxjszznnzy.supabase.co/storage/v1/object/public/ticket-attachments/${attachment.file_path}`}
                                    alt={attachment.file_name}
                                    className="max-w-full h-auto rounded-lg border border-white/30"
                                    style={{ maxHeight: '300px' }}
                                  />
                                ) : (
                                  <a
                                    href={`https://gqbhilftduwxjszznnzy.supabase.co/storage/v1/object/public/ticket-attachments/${attachment.file_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    <FileText className="h-4 w-4" />
                                    {attachment.file_name}
                                  </a>
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
                      className="bg-white/20 border-gray-300 text-black placeholder:text-black/50 backdrop-blur-[25px] border-2 border-white shadow-lg"
                      style={{ borderRadius: '12px' }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 transition-all duration-200 backdrop-blur-[25px] border-2 border-white shadow-lg"
                      style={{ borderRadius: '12px' }}
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
