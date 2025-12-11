
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TicketButtonProps {
  completedTaxReturnId: string;
  taxYear: string;
}

export const TicketButton = ({ completedTaxReturnId, taxYear }: TicketButtonProps) => {
  const navigate = useNavigate();

  const handleCreateTicket = () => {
    navigate(`/create-ticket/${completedTaxReturnId}/${taxYear}`);
  };

  return (
    <Button
      onClick={handleCreateTicket}
      variant="outline"
      size="sm"
      className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border-orange-500/30"
    >
      <AlertTriangle className="mr-2 h-4 w-4" />
      Problem melden
    </Button>
  );
};
