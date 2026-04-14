import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

interface BlueTaxYearCardProps {
  id: string;
  taxYear: string;
  progress: number;
  status?: string;
  paymentStatus?: string;
  isCompleted?: boolean;
  completedTaxReturn?: any;
  definitiveTaxBill?: any;
  supportTickets?: any[];
  userId?: string;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function BlueTaxYearCard({
  id,
  taxYear,
  progress,
  status = 'draft',
  paymentStatus = 'pending',
  isCompleted = false,
  completedTaxReturn,
  definitiveTaxBill,
  supportTickets = [],
  userId,
  onEdit,
  onDelete,
  isLoading = false
}: BlueTaxYearCardProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const totalSteps = 6;
  const completedSteps = Math.round((progress / 100) * totalSteps);

  const getStatusLabel = () => {
    if (isCompleted || status === 'completed' || status === 'success') return "Abgeschlossen";
    if (paymentStatus === 'paid') return "In Bearbeitung";
    return "In Erfassung";
  };

  const handleContinue = () => {
    if ((status === 'success' || status === 'completed') && completedTaxReturn) {
      navigate(`/tax-return-actions/${id}?year=${taxYear}`);
      return;
    }
    if (paymentStatus === 'paid' && (status === 'processing' || status === 'in_creation')) {
      navigate(`/tax-return-tracking/${id}?year=${taxYear}`);
      return;
    }
    if (onEdit) {
      onEdit();
    } else {
      navigate(`/form?year=${taxYear}`);
    }
  };

  return <>
      <div
        className="mb-4 relative blue-tax-year-card cursor-pointer group"
        data-tour="tax-year-card"
        onClick={handleContinue}
      >
        <div className="bg-white rounded-2xl p-6 pr-5 border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] active:scale-[0.98] relative">
          {/* Three Dots Menu - Top Right */}
          <div className="absolute top-4 right-4 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted rounded-full">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={e => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }} className="text-red-600 hover:text-red-700">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4">
            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Status label */}
              <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">
                {getStatusLabel()}
              </span>

              {/* Year */}
              <h2 className="text-3xl font-semibold tracking-tight text-foreground mt-1 mb-3">
                {taxYear}
              </h2>

              {/* Progress text */}
              <p className="text-sm text-muted-foreground mb-2.5">
                {completedSteps} von {totalSteps} Schritten abgeschlossen
              </p>

              {/* Progress bar */}
              <div className="h-[3px] w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Chevron */}
            <div className="flex-shrink-0 pl-2">
              <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      <UnifiedAlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <UnifiedAlertDialogContent showCloseButton onClose={() => setShowDeleteDialog(false)}>
          <UnifiedAlertDialogHeader>
            <UnifiedAlertDialogIcon variant="delete">
              <Trash2 className="w-8 h-8 text-red-500" />
            </UnifiedAlertDialogIcon>
            <UnifiedAlertDialogTitle>Steuererklärung löschen?</UnifiedAlertDialogTitle>
            <UnifiedAlertDialogDescription>
              Möchtest du die Steuererklärung für {taxYear} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </UnifiedAlertDialogDescription>
          </UnifiedAlertDialogHeader>
          <UnifiedAlertDialogFooter>
            <UnifiedAlertDialogAction 
              onClick={() => {
                onDelete?.(id);
                setShowDeleteDialog(false);
              }} 
              variant="destructive"
            >
              Löschen
            </UnifiedAlertDialogAction>
            <UnifiedAlertDialogCancel>
              Abbrechen
            </UnifiedAlertDialogCancel>
          </UnifiedAlertDialogFooter>
        </UnifiedAlertDialogContent>
      </UnifiedAlertDialog>
    </>;
}
