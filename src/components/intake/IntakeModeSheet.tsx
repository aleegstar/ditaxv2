import React from "react";
import { Sparkles, FileUp } from "lucide-react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription,
} from "@/components/ui/app-dialog";

export type IntakeMode = "guided" | "prior_year_upload";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode?: IntakeMode | null;
  onSelect: (mode: IntakeMode) => void;
  taxYear: string;
}

export const IntakeModeSheet: React.FC<Props> = ({ open, onOpenChange, currentMode, onSelect, taxYear }) => {
  const prev = Number(taxYear) - 1;
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" className="p-6">
        <AppDialogHeader>
          <AppDialogTitle>Wie möchtest du starten?</AppDialogTitle>
          <AppDialogDescription>
            Du kannst den Modus jederzeit wechseln – deine Daten bleiben erhalten.
          </AppDialogDescription>
        </AppDialogHeader>

        <div className="grid gap-3">
          <ModeCard
            active={currentMode === "guided"}
            icon={<Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            title="Begleitet"
            desc="Wir führen dich Schritt für Schritt durch alle Bereiche – ideal beim ersten Mal."
            onClick={() => onSelect("guided")}
          />
          <ModeCard
            active={currentMode === "prior_year_upload"}
            icon={<FileUp className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            title="Vorjahres-Upload"
            desc={`Lade deine Steuererklärung ${prev} hoch. Wir erstellen daraus eine persönliche Checkliste – du bestätigst nur Änderungen.`}
            onClick={() => onSelect("prior_year_upload")}
          />
        </div>
      </AppDialogContent>
    </AppDialog>
  );
};

const ModeCard: React.FC<{
  active?: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}> = ({ active, icon, title, desc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-2xl border p-5 transition-all bg-card hover:shadow-md ${
      active ? "border-primary ring-2 ring-primary/20" : "border-border"
    }`}
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  </button>
);
