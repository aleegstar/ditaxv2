import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/modern-alert-dialog";

interface CompletedTaxYearCardProps {
  id: string;
  taxYear: string;
  completedTaxReturn?: any;
  definitiveTaxBill?: any;
  supportTickets?: any[];
  userId?: string;
  onDelete?: (id: string) => void;
}

export function CompletedTaxYearCard({
  id,
  taxYear,
  completedTaxReturn,
  definitiveTaxBill,
  supportTickets = [],
  userId,
  onDelete
}: CompletedTaxYearCardProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleClick = () => {
    navigate(`/tax-return-actions/${id}?year=${taxYear}`);
  };

  return (
    <>
      <div 
        className="relative w-full bg-white rounded-[2rem] p-7 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100/80 transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        onClick={handleClick}
      >
        {/* Three Dots Menu - Top Right */}
        <div className="absolute top-5 right-16 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={e => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }} 
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[0.85rem] font-medium text-slate-400 tracking-wide">
            Steuererklärung
          </span>
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
            <Check className="w-4 h-4" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">
          {taxYear}
        </h3>

        {/* Description */}
        <p className="text-[0.95rem] text-slate-500 leading-relaxed mb-6">
          Deine Veranlagung ist eingetroffen und wurde geprüft.
        </p>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Steuererklärung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Steuererklärung für {taxYear} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
            <AlertDialogCancel className="w-full bg-white hover:bg-gray-50 border border-[rgb(230,230,230)] font-medium h-12 rounded-full" style={{
              color: 'rgb(26, 32, 44)'
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onDelete?.(id);
              setShowDeleteDialog(false);
            }} className="w-full h-12 bg-red-500 hover:bg-red-600 text-white border-0 rounded-full font-medium">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
