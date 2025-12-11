
import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock } from 'lucide-react';

import { useI18n } from '@/contexts/I18nContext';

interface SaveStatusProps {
  isSaving: boolean;
  lastSaved: Date | null;
  className?: string;
}

export const SaveStatus: React.FC<SaveStatusProps> = ({
  isSaving,
  lastSaved,
  className
}) => {
  const { t } = useI18n();
  
  if (isSaving) {
    return <div className={cn("flex items-center text-sm text-blue-600", className)}>
        {t.forms.saving}
      </div>;
  }
  if (lastSaved) {
    return <div className={cn("flex items-center text-sm text-green-600", className)}>
        <Check className="mr-1 h-3 w-3" />
        {t.forms.savedAt} {lastSaved.toLocaleTimeString()}
      </div>;
  }
  return null;
};
