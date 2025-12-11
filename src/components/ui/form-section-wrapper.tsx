
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldResetButton } from '@/components/ui/field-reset-button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useI18n } from '@/contexts/I18nContext';

interface FormSectionWrapperProps {
  title: string;
  children: React.ReactNode;
  onResetSection?: () => void;
  showResetButton?: boolean;
  hasContent?: boolean;
}

const FormSectionWrapper: React.FC<FormSectionWrapperProps> = ({
  title,
  children,
  onResetSection,
  showResetButton = true,
  hasContent = false
}) => {
  const { t } = useI18n();
  
  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-black">{title}</CardTitle>
        
        {showResetButton && hasContent && onResetSection && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <div>
                <FieldResetButton
                  onReset={() => {}}
                  variant="section"
                  size="sm"
                />
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white/95 backdrop-blur-md">
              <AlertDialogHeader>
                <AlertDialogTitle>{t.forms.resetSection}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.forms.resetConfirm} "{title}"? {t.forms.resetConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.forms.cancel}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={onResetSection}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {t.forms.resetButton}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export { FormSectionWrapper };
