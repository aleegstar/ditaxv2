import React from 'react';
import { useTaxFiler, TaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserPlus, Users } from 'lucide-react';
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
  const {
    taxFilers,
    activeTaxFilerId,
    setActiveTaxFilerId,
    isLoading
  } = useTaxFiler();
  const {
    t
  } = useI18n();
  const navigate = useNavigate();

  // Don't render if only one tax filer (the primary)
  if (taxFilers.length <= 1 && !showManageButton) {
    return null;
  }
  const handleFilerChange = (filerId: string) => {
    setActiveTaxFilerId(filerId);
  };
  const handleManageClick = () => {
    navigate('/tax-filers');
  };
  const getDisplayName = (filer: TaxFiler) => {
    const name = `${filer.first_name} ${filer.last_name}`.trim();
    if (filer.is_primary) {
      return `${name} (${t.taxFilers?.primary || 'Primär'})`;
    }
    return `${name} (${getRelationshipLabel(filer.relationship, t)})`;
  };
  if (variant === 'compact') {
    return <div className={cn('flex items-center gap-2', className)}>
        <Users className="h-4 w-4 text-muted-foreground" />
        <Select value={activeTaxFilerId || ''} onValueChange={handleFilerChange} disabled={isLoading}>
          <SelectTrigger className="h-8 w-auto min-w-[150px] text-sm">
            <SelectValue placeholder={t.taxFilers?.selectPerson || 'Person wählen'} />
          </SelectTrigger>
          <SelectContent>
            {taxFilers.map(filer => <SelectItem key={filer.id} value={filer.id}>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>{getDisplayName(filer)}</span>
                </div>
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>;
  }
  return <div className={cn('bg-card border border-border rounded-xl p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          
          <h3 className="font-medium text-foreground">
            {t.taxFilers?.title || 'Steuerpflichtiger'}
          </h3>
        </div>
        {showManageButton && <Button variant="ghost" size="sm" onClick={handleManageClick} className="text-xs">
            <UserPlus className="h-4 w-4 mr-1" />
            {t.taxFilers?.manage || 'Verwalten'}
          </Button>}
      </div>

      <Select value={activeTaxFilerId || ''} onValueChange={handleFilerChange} disabled={isLoading}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t.taxFilers?.selectPerson || 'Person wählen'} />
        </SelectTrigger>
        <SelectContent>
          {taxFilers.map(filer => <SelectItem key={filer.id} value={filer.id}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">{filer.first_name} {filer.last_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getRelationshipLabel(filer.relationship, t)}
                  </span>
                </div>
              </div>
            </SelectItem>)}
        </SelectContent>
      </Select>

      {taxFilers.length === 1 && <p className="text-xs text-muted-foreground mt-2">
          {t.taxFilers?.addPersonHint || 'Sie können weitere Personen hinzufügen, um deren Steuererklärungen zu verwalten.'}
        </p>}
    </div>;
};
export default TaxFilerSelector;