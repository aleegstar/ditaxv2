import React from "react";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UnifiedAlertDialog,
  UnifiedAlertDialogAction,
  UnifiedAlertDialogCancel,
  UnifiedAlertDialogContent,
  UnifiedAlertDialogDescription,
  UnifiedAlertDialogFooter,
  UnifiedAlertDialogHeader,
  UnifiedAlertDialogIcon,
  UnifiedAlertDialogTitle,
} from "@/components/ui/unified-alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { FramerButton } from "@/components/ui/framer-button";
import { Card, CardContent } from "@/components/ui/card";
import { TaxReturnProgressTracker } from "@/components/ui/tax-return-progress-tracker";
import { TaxReturnActionDialog } from "@/components/ui/tax-return-action-dialog";
import { useI18n } from "@/contexts/I18nContext";

interface TaxYearCardProps {
  id: string;
  taxYear: string;
  lastUpdated: string;
  paymentStatus?: string;
  status?: string;
  paymentDate?: string;
  progress?: number;
  workflowStep?: string;
  completedTaxReturn?: {
    id: string;
    file_name: string;
    file_path: string;
    signed_pdf_path?: string | null;
    upload_date: string;
  };
  isCompleted?: boolean;
  userId?: string;
  definitiveTaxBill?: any;
  onDelete: (id: string) => void;
}

export function TaxYearCard({
  id,
  taxYear,
  lastUpdated,
  paymentStatus = 'pending',
  userId,
  definitiveTaxBill,
  status = 'draft',
  paymentDate,
  progress = 0,
  workflowStep = 'data_collection',
  completedTaxReturn,
  isCompleted = false,
  onDelete
}: TaxYearCardProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showActionDialog, setShowActionDialog] = React.useState(false);
  const isMobile = useIsMobile();
  const { t, language } = useI18n();
  const isPaid = paymentStatus === 'paid';

  const handleEdit = () => {
    if (isCompleted && completedTaxReturn) {
      setShowActionDialog(true);
    } else if (!isPaid) {
      navigate(`/form?year=${taxYear}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
    setShowDeleteDialog(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(false);
  };

  const handleViewDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActionDialog(true);
  };

  return <>
    <Card className={`w-full transition-all duration-300 shadow-lg ${!isPaid || isCompleted ? 'cursor-pointer hover:shadow-xl' : ''} group`} style={{
      background: 'hsl(0, 0%, 95.7%)',
      border: '1px solid rgb(238, 238, 238)',
      borderRadius: '20px'
    }} onClick={isCompleted || !isPaid ? handleEdit : undefined}>
        <CardContent className="p-6 relative overflow-hidden" style={{
        borderRadius: '20px'
      }}>
          <div className="relative z-10">
            {/* Show dropdown menu for drafts and completed tax returns */}
            {(!isPaid || isCompleted) && <div className="absolute top-0 right-0 m-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 backdrop-blur-sm rounded-full transition-all duration-200" style={{
                  backgroundColor: '#ffffffd4',
                  color: '#333'
                }} onClick={e => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="backdrop-blur-md bg-white/10 border-white/20">
                    {isCompleted ? (
                      // Menu items for completed tax returns
                      <DropdownMenuItem onClick={handleViewDownload}>
                        <Eye className="mr-2 h-4 w-4" />
                        {language === 'de' ? 'Ansehen/Herunterladen' : 'View/Download'}
                      </DropdownMenuItem>
                    ) : (
                      // Menu items for draft tax returns
                      <>
                        <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          handleEdit();
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t.common.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-400 hover:text-red-300" onClick={handleDeleteClick}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t.common.delete}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>}

            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col items-start">
                <Badge variant="secondary" style={{
                  background: isCompleted ? 'rgba(34, 197, 94, 0.2)' : isPaid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  borderColor: isCompleted ? 'rgba(34, 197, 94, 0.3)' : isPaid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  color: '#000000'
                }} className="mb-3 border border-white/20 backdrop-blur-sm bg-[#5298e4]/[0.28]">
                  {isCompleted ? (language === 'de' ? 'Abgeschlossen' : 'Completed') : isPaid ? (language === 'de' ? 'In Bearbeitung' : 'Processing') : (language === 'de' ? 'Entwurf' : 'Draft')}
                </Badge>
                
                <h2 className="text-3xl font-bold text-black mb-4">{taxYear}</h2>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-gray-500">Status</span>
                    <span className="text-[#1D64FF] font-medium">
                      {isCompleted ? (language === 'de' ? 'Abgeschlossen' : 'Completed') : isPaid ? (language === 'de' ? 'In Bearbeitung' : 'Processing') : (language === 'de' ? 'Entwurf' : 'Draft')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-gray-500">Frist</span>
                    <span className="text-black font-medium">31. März {parseInt(taxYear) + 1}</span>
                  </div>
                </div>
              </div>
              
              {isPaid && !isCompleted ? (
                <div className="w-full max-w-[120px]">
                  <TaxReturnProgressTracker currentStep={workflowStep} taxYear={taxYear} className="max-w-sm mx-auto" />
                </div>
              ) : (
                <AnimatedCircularProgressBar 
                  max={100} 
                  min={0} 
                  value={isCompleted ? 100 : progress} 
                  gaugePrimaryColor="#1D64FF" 
                  gaugeSecondaryColor="#E9ECF1" 
                  className="size-16 text-xs drop-shadow-lg" 
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between w-full text-sm border-t border-gray-200 pt-4 mt-4 relative z-10">
            <div className="text-xs text-gray-500">
              {language === 'de' ? 'Zuletzt bearbeitet' : 'Last updated'}: {lastUpdated}
            </div>
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">→</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Only show delete dialog for drafts */}
      {!isPaid && !isCompleted && <UnifiedAlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <UnifiedAlertDialogContent showCloseButton onClose={() => setShowDeleteDialog(false)} onClick={e => e.stopPropagation()}>
            <UnifiedAlertDialogHeader>
              <UnifiedAlertDialogIcon variant="delete">
                <Trash2 className="w-8 h-8 text-red-500" />
              </UnifiedAlertDialogIcon>
              <UnifiedAlertDialogTitle>
                {taxYear} {t.common.delete}
              </UnifiedAlertDialogTitle>
              <UnifiedAlertDialogDescription>
                {language === 'de' 
                  ? `Bist du sicher, dass du die Steuererklärung für das Jahr ${taxYear} komplett löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.`
                  : `Are you sure you want to completely delete the tax return for the year ${taxYear}? This action cannot be undone.`
                }
              </UnifiedAlertDialogDescription>
            </UnifiedAlertDialogHeader>
            <UnifiedAlertDialogFooter>
              <UnifiedAlertDialogAction 
                onClick={handleConfirmDelete} 
                variant="destructive"
              >
                {language === 'de' ? 'Alles löschen' : 'Delete everything'}
              </UnifiedAlertDialogAction>
              <UnifiedAlertDialogCancel onClick={handleCancelDelete}>
                {t.common.cancel}
              </UnifiedAlertDialogCancel>
            </UnifiedAlertDialogFooter>
          </UnifiedAlertDialogContent>
         </UnifiedAlertDialog>}

      {/* Tax Return Action Dialog for completed returns */}
      {isCompleted && completedTaxReturn && userId && <TaxReturnActionDialog isOpen={showActionDialog} onClose={() => setShowActionDialog(false)} fileName={completedTaxReturn.file_name} filePath={completedTaxReturn.signed_pdf_path || completedTaxReturn.file_path} taxYear={taxYear} completedTaxReturnId={completedTaxReturn.id} userId={userId} definitiveTaxBill={definitiveTaxBill} onTaxBillUpload={() => window.location.reload()} />}
    </>;
}
