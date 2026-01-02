import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubpageHeader } from '@/components/ui/subpage-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();
  
  const previousYear = parseInt(taxYear) - 1;

  const handleImportClick = () => {
    setShowChangesDialog(true);
  };

  const handleSkipImport = () => {
    onComplete();
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
      
      // Navigate back to dashboard
      navigate(`/form?year=${taxYear}`);
      
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
      
      // Navigate to form for editing
      onComplete();
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der Daten');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with back button */}
      <SubpageHeader 
        title={sectionName}
        onBack={() => navigate(`/form?year=${taxYear}`)}
      />
      
      {/* Main content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-slate-200"
          style={{
            boxShadow: '0 4px 20px -4px rgba(0,0,0,0.1)'
          }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">
              Daten aus {previousYear} übernehmen?
            </h2>
            <p className="text-slate-500">
              Du hast bereits Daten für "{sectionName}" aus dem Jahr {previousYear} eingegeben.
            </p>
          </div>
          
          {/* Import button */}
          <Button
            className="w-full mb-4 bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full h-12 lg:h-14 text-sm lg:text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              boxShadow: '0 0 20px rgba(29, 100, 255, 0.3)'
            }}
            onClick={handleImportClick}
            disabled={isImporting}
          >
            <Download className="w-4 h-4 lg:w-5 lg:h-5" />
            Daten aus {previousYear} übernehmen
          </Button>
          
          {/* Enter new data button */}
          <Button
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium h-12 lg:h-14 text-sm lg:text-base rounded-full transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleSkipImport}
            disabled={isImporting}
          >
            <Edit className="w-4 h-4 lg:w-5 lg:h-5" />
            Neu eingeben
          </Button>
        </motion.div>
      </div>
      
      {/* Changes dialog */}
      <AlertDialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <AlertDialogContent className="bg-white border border-slate-200" style={{ boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800">
              Gibt es Änderungen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Haben sich deine Daten seit dem letzten Jahr geändert?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col mt-4">
            <Button
              onClick={handleNoChanges}
              disabled={isImporting}
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full h-12 lg:h-14 text-sm lg:text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50"
              style={{
                boxShadow: '0 0 20px rgba(29, 100, 255, 0.3)'
              }}
            >
              Nein, keine Änderungen
            </Button>
            <Button
              onClick={handleWithChanges}
              disabled={isImporting}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium h-12 lg:h-14 text-sm lg:text-base rounded-full transition-colors duration-200 disabled:opacity-50"
            >
              Ja, ich möchte Änderungen vornehmen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
