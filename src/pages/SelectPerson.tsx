import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaxFiler, TaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { useProfile } from '@/hooks/useProfile';
import { Plus, ChevronRight, Users } from 'lucide-react';
import ditaxLogoFull from '@/assets/ditax-logo.svg';
import selectPersonHero from '@/assets/select-person-hero.webp';
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

  // No fullscreen spinner — avoids flash between PageTransition and content.
  // Cards render once taxFilers is available; empty state during initial load.
  return (
    <div className="min-h-screen antialiased relative bg-white">
      <div className="relative z-10 max-w-[440px] md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-6 md:px-10 pt-10 pb-16">
        {/* Logo */}
        <div className="flex justify-center mb-6 md:hidden">
          <img src={ditaxLogoFull} alt="Ditax" className="h-6 opacity-90" />
        </div>

        {/* Hero card — same pattern as dashboard mode switcher */}
        <div className="mb-6 relative rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
          <div className="relative h-32 md:h-48 w-full overflow-hidden bg-muted">
            <img
              src={selectPersonHero}
              alt="Personen arbeiten gemeinsam an der Steuererklärung"
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/60">
              <Users className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
              <span className="text-[11px] font-medium text-foreground">Profil wählen</span>
            </div>
          </div>
          <div className="p-4 md:p-6">
            <h1 className="text-[15px] md:text-lg font-semibold text-foreground tracking-tight">
              {t.taxFilers?.selectPerson || 'Für wen möchtest du arbeiten?'}
            </h1>
            <p className="text-[12.5px] md:text-sm text-muted-foreground mt-1 leading-relaxed">
              {t.taxFilers?.addPersonHint || 'Wähle ein Profil aus, um fortzufahren.'}
            </p>
          </div>
        </div>

        {/* Section label */}
        <div className="flex items-center justify-between px-1 mb-2.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
            Profile
          </span>
          <span className="text-[10.5px] font-medium text-muted-foreground/45 tabular-nums">
            {taxFilers.length}
          </span>
        </div>

        {/* Profile list — grouped surface with hairline dividers */}
        {!isLoading && (
          <>
            <div className="bg-white border border-black/[0.07] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,27,61,0.03),0_4px_16px_-12px_rgba(15,27,61,0.06)] divide-y divide-black/[0.05]">
              {taxFilers.map((filer) => {
                const initials = `${filer.first_name.charAt(0)}${filer.last_name.charAt(0)}`.toUpperCase();
                const relationshipLabel = getRelationshipLabel(filer.relationship, t);
                return (
                  <button
                    key={filer.id}
                    onClick={() => handleSelectPerson(filer)}
                    className="w-full group relative text-left cursor-pointer flex items-center gap-4 md:gap-5 px-5 py-4 md:py-5 transition-colors duration-150 hover:bg-foreground/[0.022] active:bg-foreground/[0.04] focus:outline-none focus-visible:bg-foreground/[0.03]"
                  >
                    <Avatar className="w-10 h-10 md:w-12 md:h-12 ring-1 ring-black/[0.06] flex-shrink-0">
                      <AvatarImage
                        src={getAvatarUrl(filer)}
                        alt={`${filer.first_name} ${filer.last_name}`}
                        className="object-cover"
                      />
                      <AvatarFallback
                        className="text-[13px] md:text-sm font-semibold tracking-tight"
                        style={{
                          background: 'hsla(var(--primary) / 0.07)',
                          color: 'hsl(var(--primary))',
                        }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[14.5px] md:text-base font-medium text-foreground tracking-[-0.005em]">
                          {filer.first_name} {filer.last_name}
                        </h3>
                        {filer.is_primary && (
                          <span className="shrink-0 text-[10px] md:text-xs font-semibold uppercase tracking-[0.08em] text-primary/80 bg-primary/[0.07] px-1.5 py-0.5 rounded-md">
                            {t.taxFilers?.primary || 'Primär'}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] md:text-[13px] text-muted-foreground/65 truncate mt-0.5">
                        {relationshipLabel}
                      </p>
                    </div>

                    <ChevronRight
                      className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0"
                      strokeWidth={2}
                    />
                  </button>
                );
              })}
            </div>

            {/* Add Person — secondary action card */}
            <button
              onClick={handleAddPerson}
              className="w-full mt-3 group flex items-center gap-4 md:gap-5 px-5 py-4 md:py-5 bg-white border border-dashed border-black/[0.14] rounded-2xl transition-all duration-150 hover:border-foreground/30 hover:bg-foreground/[0.018] active:scale-[0.995] focus:outline-none focus-visible:border-foreground/30"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-foreground/[0.04] border border-black/[0.05] group-hover:bg-foreground/[0.06] transition-colors">
                <Plus className="w-4 h-4 md:w-5 md:h-5 text-foreground/70" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <h3 className="text-[14.5px] md:text-base font-medium text-foreground tracking-[-0.005em]">
                  {t.taxFilers?.addPerson || 'Person hinzufügen'}
                </h3>
                <p className="text-[12px] md:text-[13px] text-muted-foreground/65 mt-0.5 truncate">
                  Für Partner, Kinder oder Angehörige
                </p>
              </div>
              <ChevronRight
                className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0"
                strokeWidth={2}
              />
            </button>

            {/* Trust footnote */}
            <p className="text-center text-[11px] text-muted-foreground/45 mt-8 tracking-tight">
              Alle Daten werden Ende-zu-Ende verschlüsselt gespeichert.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SelectPerson;
