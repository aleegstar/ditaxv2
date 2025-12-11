import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExpressUpgradeCardProps {
  taxReturnId: string;
  currentExpressService: boolean;
  className?: string;
}

export const ExpressUpgradeCard: React.FC<ExpressUpgradeCardProps> = ({
  taxReturnId,
  currentExpressService,
  className
}) => {
  const navigate = useNavigate();

  if (currentExpressService) {
    return null;
  }

  const handleUpgrade = () => {
    navigate(`/payment?upgrade=true&returnId=${taxReturnId}`);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-yellow-500" />
          Express-Service
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            Möchtest du deine Steuererklärung schneller erhalten? Mit unserem Express-Service wird deine Steuererklärung bevorzugt bearbeitet.
          </p>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <p className="text-sm text-gray-500">Standardlieferung</p>
              <p className="font-semibold text-gray-900">Variierende Bearbeitungszeit</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Express-Lieferung</p>
              <p className="font-semibold text-primary">Innert 10 Tagen</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Upgrade-Preis</span>
              <span className="text-lg font-bold text-gray-900">CHF 100.00</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleUpgrade}
          className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-5 py-3 h-14 text-base font-medium border-0 transition-colors duration-200 flex items-center justify-center gap-2"
          style={{
            boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
          }}
        >
          Jetzt auf Express upgraden
        </Button>
      </CardContent>
    </Card>
  );
};
