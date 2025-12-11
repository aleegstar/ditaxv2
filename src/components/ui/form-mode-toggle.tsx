import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, List } from 'lucide-react';
import { motion } from 'framer-motion';

interface FormModeToggleProps {
  mode: 'standard' | 'yesno';
  onModeChange: (mode: 'standard' | 'yesno') => void;
  className?: string;
}

export const FormModeToggle: React.FC<FormModeToggleProps> = ({
  mode,
  onModeChange,
  className
}) => {
  return (
    <Card className={`bg-card/30 backdrop-blur-sm border-border/50 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-center text-muted-foreground">
            Ausfüll-Modus wählen
          </h3>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'yesno' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('yesno')}
              className="flex-1 h-10"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Ja/Nein
            </Button>
            
            <Button
              type="button"
              variant={mode === 'standard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('standard')}
              className="flex-1 h-10"
            >
              <List className="w-4 h-4 mr-2" />
              Experten-Modus
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            {mode === 'yesno' 
              ? 'Einzelne Fragen mit Ja/Nein beantworten'
              : 'Alle Felder auf einmal ausfüllen'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};