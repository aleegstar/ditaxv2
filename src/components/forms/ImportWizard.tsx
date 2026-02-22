import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubpageHeader } from '@/components/ui/subpage-header';
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

export const ImportWizard: React.FC<ImportWizardProps> = ({
  section,
  sectionName,
  taxYear,
  onComplete,
}) => {
  const { importFromPreviousYear, updateFormProgress } = useFormContext();
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  // Safety cleanup: remove any leftover vaul overlays on unmount
  useEffect(() => {
    return () => {
      setTimeout(() => {
        document.querySelectorAll('[data-vaul-overlay]').forEach(el => el.remove());
        document.querySelectorAll('[data-vaul-drawer]').forEach(el => el.remove());
      }, 50);
    };
  }, []);

  const closeAllAndRun = useCallback((fn: () => void) => {
    setDrawerOpen(false);
    setShowChangesDialog(false);
    setTimeout(fn, 350);
  }, []);
  
  const previousYear = parseInt(taxYear) - 1;

  const handleImportClick = () => {
    setShowChangesDialog(true);
  };

  const handleSkipImport = () => {
    closeAllAndRun(() => onComplete());
  };

  const handleNoChanges = async () => {
    setIsImporting(true);
    
    try {
      // Import data from previous year
      await importFromPreviousYear(section);
      
      // Mark section as completed
      updateFormProgress(section, true);
      
      // Save to database with merge logic
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Load existing form_progress
        const { data: existing } = await supabase
          .from('form_progress')
          .select('form_sections')
          .eq('user_id', session.user.id)
          .eq('tax_year', taxYear)
          .single();
        
        // 2. Merge with new section
        const existingSections = existing?.form_sections as Record<string, boolean> || {};
        const mergedSections = {
          ...existingSections,
          [section]: true
        };
        
        // 3. Upsert with merged sections
        await supabase
          .from('form_progress')
          .upsert({
            user_id: session.user.id,
            tax_year: taxYear,
            form_sections: mergedSections
          });
      }
      
      toast.success(`${sectionName} erfolgreich aus ${previousYear} übernommen`);
      
      // Close drawers first, then navigate
      closeAllAndRun(() => navigate(`/form?year=${taxYear}`));
      
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
      // Import data from previous year
      await importFromPreviousYear(section);
      
      toast.success('Daten übernommen. Du kannst sie jetzt bearbeiten.');
      
      // Close drawers first, then proceed
      closeAllAndRun(() => onComplete());
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der Daten');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with back button */}
      <SubpageHeader 
        title={sectionName}
        onBack={() => navigate(`/form?year=${taxYear}`)}
      />
      
      {/* Import bottom sheet - shown immediately */}
      <Drawer open={drawerOpen} onOpenChange={(open) => { if (!open) closeAllAndRun(() => navigate(`/form?year=${taxYear}`)); }}>
        <DrawerContent variant="bottom-sheet" className="px-6 pb-8 pt-2">
          <div className="mb-6" />
          <div className="text-center space-y-2 mb-6">
            <DrawerTitle className="text-xl font-bold text-foreground">
              Daten aus {previousYear} übernehmen?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Du hast bereits Daten für "{sectionName}" aus dem Jahr {previousYear} eingegeben.
            </DrawerDescription>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              <Download className="w-5 h-5" />
              Daten aus {previousYear} übernehmen
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSkipImport}
              disabled={isImporting}
            >
              <Edit className="w-5 h-5" />
              Neu eingeben
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      
      {/* Changes bottom sheet */}
      <Drawer open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <DrawerContent variant="bottom-sheet" className="px-6 pb-8 pt-2">
          <div className="mb-6" />
          <div className="text-center space-y-2 mb-6">
            <DrawerTitle className="text-xl font-bold text-foreground">
              Gibt es Änderungen?
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Haben sich deine Daten seit dem letzten Jahr geändert?
            </DrawerDescription>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={handleNoChanges}
              disabled={isImporting}
            >
              <Download className="w-5 h-5" />
              Nein, keine Änderungen
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleWithChanges}
              disabled={isImporting}
            >
              <Edit className="w-5 h-5" />
              Ja, ich möchte Änderungen vornehmen
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
