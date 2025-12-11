import React from 'react';
import { Calendar, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { BorderBeam } from '@/components/ui/border-beam';

interface PaymentTaxYearCardProps {
  taxYear: string;
  expressService: boolean;
  onExpressChange: (value: boolean) => void;
}

export function PaymentTaxYearCard({ 
  taxYear, 
  expressService, 
  onExpressChange 
}: PaymentTaxYearCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 mb-6 text-white"
         style={{
           background: 'url("/lovable-uploads/Group_1_26.png") center center / cover no-repeat, linear-gradient(135deg, #1d64ff 0%, #0ea5e9 100%)'
         }}>
      <BorderBeam 
        size={120} 
        duration={10} 
        anchor={90} 
        borderWidth={2} 
        colorFrom="#ffffff" 
        colorTo="#ffffff" 
        delay={0} 
        className="rounded-[24px]"
      />
      
      {/* Main Tax Year Section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-white/70 text-sm font-medium">Steuerjahr</p>
          <h2 className="text-white text-2xl font-bold tracking-tight">{taxYear}</h2>
        </div>
      </div>

      {/* Express Service Section */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-orange-300" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Express-Service</p>
              <p className="text-white/60 text-xs">Erstellung innert 10 Tagen (+CHF 100)</p>
            </div>
          </div>
          <Switch
            checked={expressService}
            onCheckedChange={onExpressChange}
          />
        </div>
      </div>
    </div>
  );
}