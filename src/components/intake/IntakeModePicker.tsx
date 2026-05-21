import React from "react";
import { Pen, ArrowRight, Zap, Upload, Star } from "lucide-react";
import type { IntakeMode } from "./IntakeModeSheet";
import { Button } from "@/components/ui/button";
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

      <div className="flex flex-col gap-5 w-full" data-tour="intake-mode-picker">
        <div data-tour="intake-upload-card">
          <ModeCard
            recommended
            image={uploadImg}
            imageAlt="Zwei Personen am Laptop bei der Steuererklärung"
            badgeIcon={<Star className="w-3 h-3 text-white fill-white" strokeWidth={2} />}
            badge="Empfohlen"
            title={priorTitle}
            desc={priorDesc}
            cta={priorCta}
            ctaIcon={<Upload className="w-4 h-4" strokeWidth={2} />}
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
            badgeIcon={<Pen className="w-3 h-3 text-emerald-700" strokeWidth={2} />}
            badge="Manuell"
            badgeVariant="success"
            title="Daten manuell erfassen"
            desc="Wir führen dich begleitet durch alle Bereiche – ideal beim ersten Mal oder wenn sich vieles geändert hat."
            cta="Manuell starten"
            ctaVariant="outline"
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
  badgeIcon: React.ReactNode;
  badge: string;
  badgeVariant?: "primary" | "success";
  title: string;
  desc: string;
  cta: string;
  ctaIcon?: React.ReactNode;
  ctaVariant?: "default" | "outline";
  onClick: () => void;
}> = ({ recommended, image, imageAlt, badgeIcon, badge, badgeVariant = "primary", title, desc, cta, ctaIcon, ctaVariant = "default", onClick }) => {
  const badgeStyles =
    badgeVariant === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-primary text-primary-foreground border-primary";

  return (
    <div
      className={`group relative w-full text-left rounded-2xl bg-card overflow-hidden transition-all flex flex-col sm:flex-row ${
        recommended
          ? "border-2 border-[#1450dc] shadow-[0_10px_40px_-12px_rgba(20,80,220,0.18)]"
          : "border border-border"
      }`}
    >
      {/* Image */}
      <div className="relative h-44 sm:h-auto sm:w-[220px] sm:flex-shrink-0 w-full overflow-hidden bg-muted sm:m-3 sm:rounded-xl">
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${badgeStyles}`}>
          {badgeIcon}
          <span className="text-[11px] font-semibold">{badge}</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative p-5 sm:p-6 flex flex-col flex-1 sm:justify-center">
        <h3 className="text-[17px] sm:text-[18px] font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{desc}</p>
        <div className="mt-4">
          {ctaVariant === "outline" ? (
            <Button
              type="button"
              variant="outline"
              onClick={onClick}
              className="h-10 px-4 rounded-xl text-[13px] font-medium"
            >
              {cta}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onClick}
              className="h-11 px-5 rounded-xl text-[14px] font-medium"
            >
              {ctaIcon}
              <span className={ctaIcon ? "ml-2" : ""}>{cta}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
