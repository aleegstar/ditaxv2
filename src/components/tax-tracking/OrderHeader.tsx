import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderHeaderProps {
  orderId: string;
  placedDate: string;
  taxYear: string;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({ orderId, placedDate, taxYear }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Steuererklärung {taxYear}</h1>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Auftrag</p>
            <p className="text-lg font-semibold text-gray-900">#{orderId}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Eingereicht am</p>
            <p className="text-base text-gray-900">{placedDate}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/payment')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Rechnungsdetails
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
