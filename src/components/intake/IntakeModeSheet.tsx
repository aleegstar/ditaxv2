import React from "react";
import { Pencil, FileUp, ArrowRight, Check } from "lucide-react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription,
} from "@/components/ui/app-dialog";
import uploadImg from "@/assets/intake-upload.webp";
import manualImg from "@/assets/intake-manual.webp";

export type IntakeMode = "guided" | "prior_year_upload";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode?: IntakeMode | null;
  onSelect: (mode: IntakeMode) => void;
  taxYear: string;
  hasInternalPriorYear?: boolean;
}

export const IntakeModeSheet: React.FC<Props> = ({ open, onOpenChange, currentMode, onSelect, taxYear, hasInternalPriorYear }) => {
  const prev = Number(taxYear) - 1;
  const priorTitle = hasInternalPriorYear
    ? `Vorjahres-Daten aus Ditax übernehmen`
    : `Steuererklärung ${prev} hochladen`;
  const priorDesc = hasInternalPriorYear
    ? `Wir kennen deine Steuererklärung ${prev} schon. Du musst nur noch bestätigen, was sich geändert hat – kein Upload nötig.`
    : "Lade deine letzte Steuererklärung hoch. Wir erstellen daraus eine persönliche Checkliste – du bestätigst nur Änderungen.";
  const priorBadge = hasInternalPriorYear ? "In Sekunden" : "In Minuten";
  const priorCta = hasInternalPriorYear ? "Daten übernehmen" : "Vorjahr hochladen";
  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" className="p-6">
        <AppDialogHeader>
          <AppDialogTitle>Wie möchtest du starten?</AppDialogTitle>
          <AppDialogDescription>
            Du kannst den Modus jederzeit wechseln – deine Daten bleiben erhalten.
          </AppDialogDescription>
        </AppDialogHeader>

        <div className="grid gap-4 sm:grid-cols-2 mt-2">
          <ModeCard
            rainbow
            active={currentMode === "prior_year_upload"}
            image={uploadImg}
            imageAlt="Zwei Personen am Laptop bei der Steuererklärung"
            icon={<FileUp className="w-4 h-4 text-primary" strokeWidth={1.75} />}
            badge={priorBadge}
            title={priorTitle}
            desc={priorDesc}
            cta={priorCta}
            onClick={() => onSelect("prior_year_upload")}
          />

          <ModeCard
            active={currentMode === "guided"}
            image={manualImg}
            imageAlt="Person denkt über die Steuererklärung nach"
            icon={<Pencil className="w-4 h-4 text-primary" strokeWidth={1.75} />}
            badge="Schritt für Schritt"
            title="Daten manuell erfassen"
            desc="Wir führen dich begleitet durch alle Bereiche – ideal beim ersten Mal oder wenn sich vieles geändert hat."
            cta="Manuell starten"
            onClick={() => onSelect("guided")}
          />
        </div>
      </AppDialogContent>
    </AppDialog>
  );
};

const ModeCard: React.FC<{
  rainbow?: boolean;
  active?: boolean;
  image: string;
  imageAlt: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}> = ({ rainbow, active, image, imageAlt, icon, badge, title, desc, cta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative text-left rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-[0_8px_24px_rgba(15,27,61,0.08)] focus:outline-none focus:ring-2 focus:ring-primary/30 flex flex-col ${
      active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
    }`}
  >
    {rainbow && (
      <>
        {/* Outer halo around the entire card */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[2px] rounded-[18px] rainbow-gradient animate-rainbow opacity-60 blur-2xl"
        />
        {/* Inner edge glow — bright at borders, fading toward center (Apple Intelligence style) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl rainbow-gradient animate-rainbow opacity-50 blur-2xl"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse at center, transparent 35%, black 100%)",
            maskImage:
              "radial-gradient(ellipse at center, transparent 35%, black 100%)",
          }}
        />
      </>
    )}
    <div className="relative h-32 w-full overflow-hidden bg-muted">
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/60">
        {icon}
        <span className="text-[11px] font-medium text-foreground">{badge}</span>
      </div>
      {active && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
        </div>
      )}
    </div>
    <div className="relative p-5 flex flex-col flex-1">
      <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed flex-1">{desc}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
        {cta}
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  </button>
);
