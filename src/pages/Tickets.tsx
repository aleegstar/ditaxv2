import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Ticket } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { SubpageHeader } from "@/components/ui/subpage-header";

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  tax_year: string;
}

const Tickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          completed_tax_returns!inner(tax_year)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTickets = data?.map(ticket => ({
        ...ticket,
        tax_year: ticket.completed_tax_returns.tax_year
      })) || [];

      setTickets(formattedTickets);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Tickets konnten nicht geladen werden."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020408]">
        <SubpageHeader 
          title="Meine Support-Tickets"
          onBack={() => navigate(-1)}
        />
        <div className="container mx-auto p-6 text-center text-zinc-400">
          Lade Tickets...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020408]">
      <SubpageHeader 
        title="Meine Support-Tickets"
        onBack={() => navigate(-1)}
      />
      
      <div className="container mx-auto p-6 max-w-4xl">
        {tickets.length === 0 ? (
          <Card className="bg-[#0A0C10] border border-white/[0.08]">
            <CardContent className="p-8 text-center">
              <Ticket className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Keine Tickets vorhanden</h3>
              <p className="text-zinc-500">Du hast noch keine Support-Tickets erstellt.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Deine Tickets</h2>
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="bg-[#0A0C10] border border-white/[0.08]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white truncate">{ticket.title}</h3>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Steuerjahr: {ticket.tax_year}</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
