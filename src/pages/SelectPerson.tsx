import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaxFiler, TaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { User, Plus, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ditaxLogoFull from '@/assets/ditax-logo.svg';

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

  const handleSelectPerson = (filer: TaxFiler) => {
    console.log('🎯 SelectPerson: Selected filer:', filer.id, filer.first_name);
    setActiveTaxFilerId(filer.id);
    confirmSelection();
    // Navigate with state to trigger data refresh
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
    <div className="min-h-screen bg-white antialiased">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img src={ditaxLogoFull} alt="ditax" className="h-8" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            {t.taxFilers?.selectPerson || 'Für wen möchtest du arbeiten?'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t.taxFilers?.addPersonHint || 'Wähle eine Person aus, um fortzufahren'}
          </p>
        </motion.div>

        {/* Person Cards */}
        <div className="space-y-3">
          {taxFilers.map((filer, index) => (
            <motion.button
              key={filer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              onClick={() => handleSelectPerson(filer)}
              className="w-full group relative flex items-center gap-4 p-4 bg-background rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>

              {/* Info */}
              <div className="flex-1 text-left">
                <h3 className="text-lg font-medium text-foreground">
                  {filer.first_name} {filer.last_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getRelationshipLabel(filer.relationship, t)}
                  {filer.is_primary && (
                    <span className="ml-2 text-primary">
                      • {t.taxFilers?.primary || 'Primär'}
                    </span>
                  )}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight 
                className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" 
                strokeWidth={1.5} 
              />
            </motion.button>
          ))}

          {/* Add Person Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: taxFilers.length * 0.1 }}
            onClick={handleAddPerson}
            className="w-full flex items-center gap-4 p-4 bg-muted/50 rounded-2xl border border-dashed border-border hover:border-primary/50 hover:bg-muted transition-all duration-200"
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0">
              <Plus className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
            </div>

            {/* Text */}
            <div className="flex-1 text-left">
              <h3 className="text-base font-medium text-muted-foreground">
                {t.taxFilers?.addPerson || 'Person hinzufügen'}
              </h3>
              <p className="text-sm text-muted-foreground/70">
                {t.taxFilers?.addDescription || 'Kind, Ehepartner oder andere'}
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SelectPerson;
