import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useFormContext } from '@/contexts';
import { FormSectionKey } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImportWizardProps {
  section: FormSectionKey;
  sectionName: string;
  taxYear: string;
  onComplete: () => void;
}

type Step = 'import' | 'changes';

export const ImportWizard: React.FC<ImportWizardProps> = ({
  section,
  sectionName,
  taxYear,
  onComplete,
}) => {
  const { importFromPreviousYear, updateFormProgress } = useFormContext();
  const [step, setStep] = useState<Step>('import');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  const closeAndRun = useCallback((fn: () => void) => {
    setDrawerOpen(false);
    setTimeout(fn, 350);
  }, []);
  
  const previousYear = parseInt(taxYear) - 1;

  const handleImportClick = () => {
    setStep('changes');
  };

  const handleSkipImport = () => {
    closeAndRun(() => onComplete());
  };

  const handleNoChanges = async () => {
    setIsImporting(true);
    
    try {
      await importFromPreviousYear(section);
      
      // Explicitly save the imported data with _completed: true and markComplete flag
      // This ensures the section is persisted as completed even if the previous year
      // data didn't have _completed set
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Update form_data to ensure _completed is true
        const { data: currentData } = await supabase
          .from('form_data')
          .select('id, data')
          .eq('user_id', session.user.id)
          .eq('tax_year', taxYear)
          .eq('form_type', section)
          .maybeSingle();
        
        if (currentData) {
          const updatedData = { ...(currentData.data as Record<string, any>), _completed: true };
          await supabase
            .from('form_data')
            .update({ data: updatedData, updated_at: new Date().toISOString() })
            .eq('id', currentData.id);
        }
        
        // Also update form_progress table
        const { data: existing } = await supabase
          .from('form_progress')
          .select('id, form_sections')
          .eq('user_id', session.user.id)
          .eq('tax_year', taxYear)
          .maybeSingle();
        
        const existingSections = existing?.form_sections as Record<string, boolean> || {};
        const mergedSections = { ...existingSections, [section]: true };
        
        if (existing) {
          await supabase
            .from('form_progress')
            .update({ form_sections: mergedSections, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('form_progress')
            .insert({
              user_id: session.user.id,
              tax_year: taxYear,
              form_sections: mergedSections
            });
        }
      }
      
      updateFormProgress(section, true);
      toast.success(`${sectionName} erfolgreich aus ${previousYear} übernommen`);
      closeAndRun(() => navigate(`/form?year=${taxYear}`));
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der Daten');
    } finally {
      setIsImporting(false);
    }
  };

  const handleWithChanges = async () => {
    setIsImporting(true);
    
    try {
      await importFromPreviousYear(section);
      toast.success('Daten übernommen. Du kannst sie jetzt bearbeiten.');
      closeAndRun(() => onComplete());
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der Daten');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Drawer open={drawerOpen} onOpenChange={(open) => { if (!open) closeAndRun(() => onComplete()); }}>
      <DrawerContent variant="bottom-sheet" className="px-6 pb-8 pt-2 overflow-hidden">
        <div className="mb-6" />
        
        <div className="relative">
          {/* Step 1: Import question */}
          <div
            className="transition-all duration-300 ease-in-out"
            style={{
              opacity: step === 'import' ? 1 : 0,
              transform: step === 'import' ? 'translateX(0)' : 'translateX(-100%)',
              position: step === 'import' ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: step === 'import' ? 'auto' : 'none',
            }}
          >
            <div className="text-center space-y-2 mb-6">
              <DrawerTitle className="text-xl font-bold text-foreground">
                Daten aus {previousYear} übernehmen?
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground">
                Du hast bereits Daten für &quot;{sectionName}&quot; aus dem Jahr {previousYear} eingegeben.
              </DrawerDescription>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={handleImportClick} disabled={isImporting}>
                <Download className="w-5 h-5" />
                Daten aus {previousYear} übernehmen
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleSkipImport} disabled={isImporting}>
                <Edit className="w-5 h-5" />
                Neu eingeben
              </Button>
            </div>
          </div>

          {/* Step 2: Changes question */}
          <div
            className="transition-all duration-300 ease-in-out"
            style={{
              opacity: step === 'changes' ? 1 : 0,
              transform: step === 'changes' ? 'translateX(0)' : 'translateX(100%)',
              position: step === 'changes' ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              right: 0,
              pointerEvents: step === 'changes' ? 'auto' : 'none',
            }}
          >
            <div className="text-center space-y-2 mb-6">
              <DrawerTitle className="text-xl font-bold text-foreground">
                Gibt es Änderungen?
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground">
                Haben sich deine Daten seit dem letzten Jahr geändert?
              </DrawerDescription>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={handleNoChanges} disabled={isImporting}>
                <Download className="w-5 h-5" />
                Nein, keine Änderungen
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleWithChanges} disabled={isImporting}>
                <Edit className="w-5 h-5" />
                Ja, ich möchte Änderungen vornehmen
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
