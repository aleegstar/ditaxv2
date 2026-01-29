import React from 'react';
import { useTaxFiler, TaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, UserPlus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TaxFilerSelectorProps {
  className?: string;
  variant?: 'default' | 'compact';
  showManageButton?: boolean;
}

const getRelationshipLabel = (relationship: string, t: any): string => {
  const labels: Record<string, string> = {
    self: t.taxFilers?.relationships?.self || 'Ich selbst',
    child: t.taxFilers?.relationships?.child || 'Kind',
    spouse: t.taxFilers?.relationships?.spouse || 'Ehepartner',
    parent: t.taxFilers?.relationships?.parent || 'Elternteil',
    other: t.taxFilers?.relationships?.other || 'Andere'
  };
  return labels[relationship] || relationship;
};

const TaxFilerSelector: React.FC<TaxFilerSelectorProps> = ({ 
  className, 
  variant = 'default',
  showManageButton = true 
}) => {
  const { taxFilers, activeTaxFilerId, setActiveTaxFilerId, isLoading } = useTaxFiler();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Only show selector if there are multiple tax filers
  if (taxFilers.length <= 1) {
    return null;
  }

  const handleFilerChange = (filerId: string) => {
    setActiveTaxFilerId(filerId);
  };

  const handleManageClick = () => {
    navigate('/tax-filers');
  };

  const activeFiler = taxFilers.find(f => f.id === activeTaxFilerId);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>Für:</span>
      </div>
      
      <Select 
        value={activeTaxFilerId || ''} 
        onValueChange={handleFilerChange}
        disabled={isLoading}
      >
        <SelectTrigger className="h-9 w-auto min-w-[180px] bg-card border-border rounded-xl text-sm font-medium shadow-sm hover:bg-muted transition-colors">
          <SelectValue placeholder={t.taxFilers?.selectPerson || 'Person wählen'}>
            {activeFiler && (
              <div className="flex items-center gap-2">
                <span>{activeFiler.first_name} {activeFiler.last_name}</span>
                <span className="text-xs text-muted-foreground">
                  ({getRelationshipLabel(activeFiler.relationship, t)})
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white border-border rounded-xl shadow-lg">
          {taxFilers.map((filer) => (
            <SelectItem 
              key={filer.id} 
              value={filer.id}
              className="rounded-lg cursor-pointer"
            >
              <div className="flex items-center gap-2 py-0.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{filer.first_name} {filer.last_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getRelationshipLabel(filer.relationship, t)}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showManageButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManageClick}
          className="text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg h-9 px-3"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          {t.taxFilers?.manage || 'Verwalten'}
        </Button>
      )}
    </div>
  );
};

export default TaxFilerSelector;
