import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Import } from 'lucide-react';
import { useFormContext } from '@/contexts/FormContext';
import { FormSectionKey } from '@/types';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useI18n } from '@/contexts/I18nContext';

interface ImportFromPreviousYearProps {
  section: FormSectionKey;
  sectionName: string;
}

const ImportFromPreviousYear: React.FC<ImportFromPreviousYearProps> = ({ 
  section, 
  sectionName 
}) => {
  const { 
    taxYear, 
    importFromPreviousYear, 
    hasDataForPreviousYear,
    loading 
  } = useFormContext();
  
  const [hasData, setHasData] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const { t } = useI18n();

  // Check if data exists for previous year
  useEffect(() => {
    const checkData = async () => {
      try {
        setIsCheckingData(true);
        const hasPreviousData = await hasDataForPreviousYear(section);
        console.log(`Data check for ${section} from previous year:`, hasPreviousData);
        setHasData(hasPreviousData);
      } catch (error) {
        console.error('Error checking previous year data:', error);
        setHasData(false);
      } finally {
        setIsCheckingData(false);
      }
    };

    if (taxYear) {
      checkData();
    }
  }, [taxYear, section, hasDataForPreviousYear]);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      console.log(`Starting import for ${section} from previous year`);
      
      await importFromPreviousYear(section);
      
      toast({
        title: t.forms.importSuccessful,
        description: t.forms.importSuccessfulDescription.replace('{section}', sectionName).replace('{year}', (parseInt(taxYear) - 1).toString())
      });
      
      console.log(`Import completed successfully for ${section}`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t.forms.importFailed,
        description: error.message || t.forms.importFailedDescription,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Don't render if checking data or no data available
  if (isCheckingData || !hasData) {
    return null;
  }

  const previousYear = parseInt(taxYear) - 1;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={loading || isImporting}
          className="flex items-center gap-2"
        >
          {isImporting ? (
            null
          ) : (
            <Import className="h-4 w-4" />
          )}
          {t.forms.importFromPreviousYear.replace('{year}', previousYear.toString())}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.forms.importConfirm.replace('{year}', previousYear.toString())}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.forms.importConfirmDescription.replace('{section}', sectionName).replace('{year}', previousYear.toString())}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.forms.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
                <>
                  <span className="ml-2">{t.forms.importing}</span>
                </>
            ) : (
              t.forms.import
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ImportFromPreviousYear;
