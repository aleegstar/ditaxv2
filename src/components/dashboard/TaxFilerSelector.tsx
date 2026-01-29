import React from 'react';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TaxFilerSelectorProps {
  className?: string;
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
    <div className={cn('flex items-center', className)}>
      <Select 
        value={activeTaxFilerId || ''} 
        onValueChange={handleFilerChange}
        disabled={isLoading}
      >
        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-1">
          <SelectValue placeholder={t.taxFilers?.selectPerson || 'Person wählen'}>
            {activeFiler && (
              <span className="text-sm font-medium text-foreground">
                {activeFiler.first_name} {activeFiler.last_name}
                <span className="text-muted-foreground font-normal ml-2">
                  ({getRelationshipLabel(activeFiler.relationship, t)})
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white border-border rounded-xl shadow-lg min-w-[200px]">
          {taxFilers.map((filer) => (
            <SelectItem 
              key={filer.id} 
              value={filer.id}
              className="rounded-lg cursor-pointer py-2"
            >
              <span className="font-medium">{filer.first_name} {filer.last_name}</span>
              <span className="text-muted-foreground ml-2">
                ({getRelationshipLabel(filer.relationship, t)})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TaxFilerSelector;
