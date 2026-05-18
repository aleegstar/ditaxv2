import React from "react";
import { FileUp, Pencil, ArrowRight } from "lucide-react";
import type { IntakeMode } from "./IntakeModeSheet";

interface Props {
  taxYear: string;
  onSelect: (mode: IntakeMode) => void;
}

/**
 * Initial mode picker shown on the tax year dashboard when the user
 * hasn't chosen between guided manual entry and prior-year upload yet.
 */
export const IntakeModePicker: React.FC<Props> = ({ taxYear, onSelect }) => {
  const prev = Number(taxYear) - 1;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="text-[20px] font-semibold text-foreground tracking-tight">
          Wie möchtest du starten?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Wähle den Weg, der für dich am einfachsten ist. Du kannst jederzeit wechseln.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          icon={<FileUp className="w-5 h-5 text-primary" strokeWidth={1.75} />}
          badge="In Minuten"
          title={`Steuererklärung ${prev} hochladen`}
          desc="Lade deine letzte Steuererklärung hoch. Wir erstellen daraus eine persönliche Checkliste – du bestätigst nur Änderungen."
          cta="Vorjahr hochladen"
          onClick={() => onSelect("prior_year_upload")}
        />
        <ModeCard
          icon={<Pencil className="w-5 h-5 text-primary" strokeWidth={1.75} />}
          badge="Schritt für Schritt"
          title="Daten manuell erfassen"
          desc="Wir führen dich begleitet durch alle Bereiche – ideal beim ersten Mal oder wenn sich vieles geändert hat."
          cta="Manuell starten"
          onClick={() => onSelect("guided")}
        />
      </div>
    </div>
  );
};

const ModeCard: React.FC<{
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}> = ({ icon, badge, title, desc, cta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group text-left rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-[0_8px_24px_rgba(15,27,61,0.06)] hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30 flex flex-col"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
        {badge}
      </span>
    </div>
    <h3 className="text-[16px] font-semibold text-foreground tracking-tight">{title}</h3>
    <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed flex-1">{desc}</p>
    <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
      {cta}
      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
    </div>
  </button>
);
