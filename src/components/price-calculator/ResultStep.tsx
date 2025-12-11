import React, { useState } from 'react';
import { PriceBreakdown } from '@/utils/priceCalculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
interface ResultStepProps {
  priceBreakdown: PriceBreakdown;
}
export const ResultStep: React.FC<ResultStepProps> = ({
  priceBreakdown
}) => {
  const [expressService, setExpressService] = useState(false);
  const navigate = useNavigate();
  const finalPrice = expressService ? priceBreakdown.totalPrice + 10000 // Add 100 CHF for express
  : priceBreakdown.totalPrice;
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };
  const handleStartTaxReturn = () => {
    window.location.href = 'https://app.ditax.ch';
  };
  return <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Deine Kostenübersicht
        </h2>
        <p className="text-gray-600">
          Transparente Preisgestaltung ohne versteckte Kosten
        </p>
      </div>

      {/* Express Service Toggle */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Express-Service</h3>
                <p className="text-sm text-gray-600">Bearbeitung in 10 Arbeitstagen statt 20</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">+100.00 CHF</span>
              <Switch checked={expressService} onCheckedChange={setExpressService} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Kostenaufschlüsselung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {priceBreakdown.items.map((item, index) => <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <span className="text-gray-700">{item.label}</span>
              <span className="font-medium">CHF {formatPrice(item.amount)}</span>
            </div>)}
          
          {expressService && <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-700">Express-Service (10 Tage)</span>
              <span className="font-medium">CHF 100.00</span>
            </div>}
          
          <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200">
            <span className="text-xl font-bold text-gray-900">Gesamtpreis</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                CHF {formatPrice(finalPrice)}
              </div>
              <div className="text-sm text-gray-500">
                inkl. MwSt.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Was du erhältst:</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">Ausgefüllte Steuererklärung zur Einreichung</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">Ausgefüllte Steuererklärung als PDF</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">Erstellung von einem Experten</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">Optimierung durch einen Experten</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">Persönliche Beratung bei Fragen</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">Maximale Steueroptimierung</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4">
        <Button size="lg" onClick={handleStartTaxReturn} className="text-lg px-8 py-4 h-auto text-white">
          Jetzt Steuererklärung starten
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <Badge variant="outline" className="bg-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Keine Anmeldegebühr
          </Badge>
          
        </div>
      </div>
    </div>;
};