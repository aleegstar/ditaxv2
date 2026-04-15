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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen antialiased relative overflow-hidden">

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-10 pb-12">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-14"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img src={ditaxLogoFull} alt="ditax" className="h-9" />
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-[1.85rem] leading-[1.15] font-medium text-foreground tracking-[-0.02em] mb-3">
            {t.taxFilers?.selectPerson || 'Für wen möchtest du arbeiten?'}
          </h1>
          <p className="text-[1.05rem] leading-relaxed text-muted-foreground">
            {t.taxFilers?.addPersonHint || 'Wähle eine Person aus, um fortzufahren'}
          </p>
        </motion.div>

        {/* Person Cards */}
        <div className="space-y-3.5">
          {taxFilers.map((filer, index) => (
            <motion.button
              key={filer.id}
              onClick={() => handleSelectPerson(filer)}
              className="w-full group relative overflow-hidden text-left transition-all duration-300 cursor-pointer active:scale-[0.98]"
              style={{
                background: 'rgba(255, 255, 255, 0.40)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                border: '1px solid rgba(255, 255, 255, 0.60)',
                borderRadius: '2rem',
                padding: '2rem 2.5rem',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.08 }}
            >
              <div className="flex items-center justify-between">
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
            </motion.button>
          ))}

          {/* Add Person Button */}
          <motion.button
            onClick={handleAddPerson}
            className="w-full overflow-hidden transition-all duration-300 active:scale-[0.98]"
            style={{
              background: 'rgba(255, 255, 255, 0.20)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              border: '1px dashed rgba(255, 255, 255, 0.60)',
              borderRadius: '2rem',
              padding: '2rem 2.5rem',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + taxFilers.length * 0.08 }}
          >
            <div className="flex items-center gap-5">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255, 255, 255, 0.30)' }}
              >
                <Plus className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-[1.05rem] font-medium text-muted-foreground tracking-[-0.01em] mb-0.5">
                  {t.taxFilers?.addPerson || 'Person hinzufügen'}
                </h3>
                <p className="text-[0.85rem] text-muted-foreground/60">
                  {'Füge jemanden hinzu, für den du Steuern erledigen möchtest'}
                </p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SelectPerson;
