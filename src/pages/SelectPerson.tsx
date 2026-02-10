import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaxFiler, TaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { useProfile } from '@/hooks/useProfile';
import { Plus, ChevronRight } from 'lucide-react';
import ditaxLogoFull from '@/assets/ditax-logo.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

const SelectPerson: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { taxFilers, setActiveTaxFilerId, confirmSelection, isLoading } = useTaxFiler();
  const { profile } = useProfile();

  const getAvatarUrl = (filer: TaxFiler): string | undefined => {
    if (filer.avatar_url) return filer.avatar_url;
    if (filer.is_primary && profile?.avatar_url) return profile.avatar_url;
    return undefined;
  };

  const handleSelectPerson = (filer: TaxFiler) => {
    console.log('🎯 SelectPerson: Selected filer:', filer.id, filer.first_name);
    setActiveTaxFilerId(filer.id);
    confirmSelection(filer.id);
    navigate('/', { state: { personSelected: true, filerId: filer.id } });
  };

  const handleAddPerson = () => {
    navigate('/tax-filers');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background antialiased">
      <div className="max-w-lg mx-auto px-5 pt-10 pb-12">
        {/* Logo */}
        <div className="flex justify-center mb-14">
          <img src={ditaxLogoFull} alt="ditax" className="h-9" />
        </div>

        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-[1.85rem] leading-[1.15] font-medium text-foreground tracking-tight mb-3">
            {t.taxFilers?.selectPerson || 'Für wen möchtest du arbeiten?'}
          </h1>
          <p className="text-[1.1rem] leading-relaxed text-muted-foreground">
            {t.taxFilers?.addPersonHint || 'Wähle eine Person aus, um fortzufahren'}
          </p>
        </div>

        {/* Person Cards */}
        <div className="space-y-4">
          {taxFilers.map((filer, index) => (
            <button
              key={filer.id}
              onClick={() => handleSelectPerson(filer)}
              className="w-full group relative overflow-hidden bg-[#FDFDFD] ring-black/5 ring-1 rounded-[2.2rem] p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-5">
                <Avatar className="w-16 h-16 ring-1 ring-primary/10 flex-shrink-0">
                  <AvatarImage
                    src={getAvatarUrl(filer)}
                    alt={`${filer.first_name} ${filer.last_name}`}
                    className="object-cover"
                  />
                  <AvatarFallback
                    className="text-xl font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 100%)',
                      color: 'hsl(var(--primary))'
                    }}
                  >
                    {filer.first_name.charAt(0)}{filer.last_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-left">
                  <h3 className="text-[1.25rem] font-medium text-foreground tracking-tight mb-1">
                    {filer.first_name} {filer.last_name}
                  </h3>
                  <p className="text-[0.95rem] text-muted-foreground font-medium tracking-wide">
                    {getRelationshipLabel(filer.relationship, t)}
                    {filer.is_primary && (
                      <span className="ml-2 text-primary">
                        • {t.taxFilers?.primary || 'Primär'}
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-primary/5 rounded-full w-10 h-10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <ChevronRight
                    className="w-5 h-5 text-primary group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </button>
          ))}

          {/* Add Person Button */}
          <button
            onClick={handleAddPerson}
            className="w-full overflow-hidden rounded-[2.2rem] p-7 border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${taxFilers.length * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <Plus className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-[1.1rem] font-medium text-muted-foreground tracking-tight mb-1">
                  {t.taxFilers?.addPerson || 'Person hinzufügen'}
                </h3>
                <p className="text-[0.9rem] text-muted-foreground/70">
                  {'Füge jemanden hinzu, für den du Steuern erledigen möchtest'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectPerson;
