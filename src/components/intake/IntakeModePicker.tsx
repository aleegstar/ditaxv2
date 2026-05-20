import React from "react";
import { Pencil, ArrowRight, Zap } from "lucide-react";
import type { IntakeMode } from "./IntakeModeSheet";
import uploadImg from "@/assets/intake-upload.webp";
import manualImg from "@/assets/intake-manual.webp";

interface Props {
  taxYear: string;
  onSelect: (mode: IntakeMode) => void;
  /** When true, the prior-year tile carries Ditax-internal data over without an upload. */
  hasInternalPriorYear?: boolean;
}

export const IntakeModePicker: React.FC<Props> = ({ taxYear, onSelect, hasInternalPriorYear }) => {
  const prev = Number(taxYear) - 1;

  const priorTitle = hasInternalPriorYear
    ? `Vorjahres-Daten aus Ditax übernehmen`
    : `Steuererklärung ${prev} hochladen`;
  const priorDesc = hasInternalPriorYear
    ? `Wir kennen deine Steuererklärung ${prev} schon. Du musst nur noch bestätigen, was sich geändert hat – kein Upload nötig.`
    : "Lade deine letzte Steuererklärung hoch. Wir erstellen daraus eine persönliche Checkliste – du bestätigst nur Änderungen.";
  // priorBadge no longer used – recommended card always shows "Empfohlen"
  const priorCta = hasInternalPriorYear ? "Daten übernehmen" : "Vorjahr hochladen";

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

      <div className="flex flex-col gap-5 max-w-xl mx-auto w-full" data-tour="intake-mode-picker">
        <div data-tour="intake-upload-card">
        <ModeCard
          recommended
          image={uploadImg}
          imageAlt="Zwei Personen am Laptop bei der Steuererklärung"
          icon={<Zap className="w-4 h-4 text-primary fill-primary" strokeWidth={1.75} />}
          badge="Empfohlen"
          title={priorTitle}
          desc={priorDesc}
          cta={priorCta}
          onClick={() => onSelect("prior_year_upload")}
        />
        </div>

        {/* "oder" divider */}
        <div aria-hidden className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">oder</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div data-tour="intake-manual-card">
        <ModeCard
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
      </div>
    </div>
  );
};

const ModeCard: React.FC<{
  recommended?: boolean;
  image: string;
  imageAlt: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}> = ({ recommended, image, imageAlt, icon, badge, title, desc, cta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative h-full w-full text-left rounded-2xl bg-card overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 flex flex-col ${
      recommended
        ? "border-2 border-blue-600 shadow-[0_8px_28px_-8px_rgb(37_99_235_/_0.25)] hover:shadow-[0_12px_32px_-8px_rgb(37_99_235_/_0.35)]"
        : "border border-border hover:shadow-[0_8px_24px_rgba(15,27,61,0.08)] hover:border-primary/30"
    }`}
  >
    <div className="relative h-36 w-full overflow-hidden bg-muted">
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-sm border ${
        recommended
          ? "bg-blue-600/10 border-blue-600/30 text-blue-600"
          : "bg-card/90 border-border/60 text-foreground"
      }`}>
        {recommended ? <Zap className="w-4 h-4 text-blue-600 fill-blue-600" strokeWidth={1.75} /> : icon}
        <span className="text-[11px] font-semibold">{badge}</span>
      </div>
    </div>
    <div className="relative p-5 flex flex-col flex-1">
      <h3 className="text-[16px] font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed flex-1">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
        {cta}
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  </button>
);

