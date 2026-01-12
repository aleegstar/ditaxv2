import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, Play, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/modern-alert-dialog";
import { BorderBeam } from "@/components/ui/border-beam";
import ditaxLogoIcon from "@/assets/ditax-logo.svg";
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

  // Get description based on progress
  const getDescription = () => {
    if (progress >= 100) return "Deine Steuererklärung ist vollständig ausgefüllt.";
    if (progress >= 75) return "Fast geschafft. Überprüfe die letzten Details.";
    if (progress >= 50) return "Du bist auf einem guten Weg.";
    return "Beginne damit deine Angaben zu erfassen.";
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
      <div className="mb-8 relative blue-tax-year-card" data-tour="tax-year-card">
        {/* Background Transparent Card (Overall Progress) */}
        <div className="shadow-black/5 z-0 border-white/10 border rounded-[2.5rem] mx-1 pt-6 px-7 pb-32 relative shadow-lg backdrop-blur-xl translate-y-11 bg-primary">
          <div className="flex flex-col gap-3 text-white">
            <div className="flex items-center justify-between">
              <span className="text-[1.05rem] font-medium tracking-wide text-white/95">
                Fortschritt
              </span>
              <span className="text-[1.05rem] font-medium tracking-wide text-white/95">
                {progress}%
              </span>
            </div>
            {/* Animated Progress Bar */}
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700 ease-out" style={{
              width: `${progress}%`
            }} />
            </div>
          </div>
        </div>

        {/* Main Card Wrapper for Border Effect */}
        <div className="z-10 -mt-[54px] relative rounded-[2.2rem]">
          {/* Orange animated border for unsubmitted tax returns */}
          <BorderBeam 
            size={300} 
            duration={8} 
            colorFrom="#F97316" 
            colorTo="#FBBF24" 
            borderWidth={2}
          />
          {/* Main Card */}
          <div className="overflow-hidden bg-[#FDFDFD] ring-black/5 ring-1 rounded-[2.2rem] p-7 relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
          {/* Three Dots Menu - Top Right */}
          <div className="absolute top-5 right-5 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                  <MoreVertical className="h-4 w-4" />
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

          {/* Header of Card */}
          <div className="flex justify-between items-center mb-5">
            <span className="text-[0.95rem] font-medium text-slate-400 tracking-wide">
              Steuererklärung
            </span>
            <img 
              src={ditaxLogoIcon} 
              alt="Ditax" 
              className="w-8 h-8 object-contain" 
            />
          </div>

          {/* Title & Desc */}
          <h2 className="text-[1.85rem] leading-[1.15] font-medium text-slate-900 tracking-tight mb-4">
            {taxYear}
          </h2>
          <p className="text-[1.1rem] leading-relaxed text-slate-500 mb-8">
            {getDescription()}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button onClick={handleContinue} className="flex shadow-[#1d64ff]/25 hover:scale-[1.02] active:scale-95 transition-transform group text-white bg-[#1d64ff] rounded-full py-4 pr-6 pl-5 shadow-xl space-x-3 items-center">
              <div className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play className="w-3 h-3 fill-white text-white ml-0.5" strokeWidth={1.5} />
              </div>
              <span className="text-[0.95rem] font-medium">
                Fortsetzen
              </span>
            </button>
            <div className="flex items-center text-slate-400 space-x-2 mr-1">
              <Clock className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-[0.95rem] font-medium">2h</span>
            </div>
          </div>
        </div>
        </div>
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
    </>;
}