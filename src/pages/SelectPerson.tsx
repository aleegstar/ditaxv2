import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaxFiler, TaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { useProfile } from '@/hooks/useProfile';
import { Plus } from 'lucide-react';
import ditaxLogoFull from '@/assets/ditax-logo.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

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

  // No fullscreen spinner — avoids flash between PageTransition and content.
  // Cards render once taxFilers is available; empty state during initial load.
  return (
    <div className="min-h-screen antialiased relative">
      <div className="relative z-10 max-w-lg mx-auto px-5 pt-10 pb-12">
        {/* Logo */}
        <div className="flex justify-center mb-14">
          <img src={ditaxLogoFull} alt="ditax" className="h-9" />
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[1.85rem] leading-[1.15] font-medium text-foreground tracking-[-0.02em] mb-3">
            {t.taxFilers?.selectPerson || 'Für wen möchtest du arbeiten?'}
          </h1>
          <p className="leading-relaxed text-muted-foreground text-xs text-center">
            {t.taxFilers?.addPersonHint || 'Wähle eine Person aus, um fortzufahren'}
          </p>
        </div>

        {/* Person Cards */}
        {!isLoading && (
          <div className="space-y-3">
            {taxFilers.map((filer) => (
              <button
                key={filer.id}
                onClick={() => handleSelectPerson(filer)}
                className="w-full group relative text-left cursor-pointer bg-white border border-black/[0.06] rounded-2xl px-7 py-6 shadow-[0_1px_2px_rgba(15,27,61,0.04),0_4px_16px_-12px_rgba(15,27,61,0.08)] transition-all duration-200 hover:border-black/[0.12] hover:shadow-[0_2px_4px_rgba(15,27,61,0.05),0_8px_24px_-12px_rgba(15,27,61,0.10)] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full w-fit mb-3">
                      <span className="text-xs font-medium text-primary">
                        {getRelationshipLabel(filer.relationship, t)}
                        {filer.is_primary && ` · ${t.taxFilers?.primary || 'Primär'}`}
                      </span>
                    </div>
                    <h3 className="tracking-tight text-foreground leading-tight text-lg font-medium">
                      {filer.first_name} {filer.last_name}
                    </h3>
                  </div>

                  <Avatar className="w-14 h-14 ring-1 ring-foreground/[0.06] flex-shrink-0">
                    <AvatarImage
                      src={getAvatarUrl(filer)}
                      alt={`${filer.first_name} ${filer.last_name}`}
                      className="object-cover"
                    />
                    <AvatarFallback
                      className="text-lg font-semibold"
                      style={{
                        background: 'hsla(var(--primary) / 0.08)',
                        color: 'hsl(var(--primary))',
                      }}
                    >
                      {filer.first_name.charAt(0)}{filer.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </button>
            ))}

            {/* Add Person Button */}
            <button
              onClick={handleAddPerson}
              className="w-full bg-white border border-dashed border-black/[0.14] rounded-2xl px-7 py-6 transition-all duration-200 hover:border-black/[0.22] hover:bg-foreground/[0.015] active:scale-[0.99]"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                  <Plus className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-[1.05rem] font-medium text-foreground tracking-[-0.01em] mb-0.5">
                    {t.taxFilers?.addPerson || 'Person hinzufügen'}
                  </h3>
                  <p className="text-[0.85rem] text-muted-foreground/70">
                    {'Füge jemanden hinzu, für den du Steuern erledigen möchtest'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectPerson;
