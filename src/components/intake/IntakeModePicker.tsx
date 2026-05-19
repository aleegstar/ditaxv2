import React from "react";
import { FileUp, Pencil, ArrowRight } from "lucide-react";
import type { IntakeMode } from "./IntakeModeSheet";
import uploadImg from "@/assets/intake-upload.webp";
import manualImg from "@/assets/intake-manual.webp";

interface Props {
  taxYear: string;
  onSelect: (mode: IntakeMode) => void;
}

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
          dark
          image={uploadImg}
          imageAlt="Zwei Personen am Laptop bei der Steuererklärung"
          icon={<FileUp className="w-4 h-4 text-white" strokeWidth={1.75} />}
          badge="In Minuten"
          title={`Steuererklärung ${prev} hochladen`}
          desc="Lade deine letzte Steuererklärung hoch. Wir erstellen daraus eine persönliche Checkliste – du bestätigst nur Änderungen."
          cta="Vorjahr hochladen"
          onClick={() => onSelect("prior_year_upload")}
        />
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
  );
};

const ModeCard: React.FC<{
  dark?: boolean;
  image: string;
  imageAlt: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}> = ({ dark, image, imageAlt, icon, badge, title, desc, cta, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative text-left rounded-2xl border overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 flex flex-col ${
      dark
        ? "bg-[#0F1B3D] border-[#1E3A5F] hover:shadow-[0_12px_32px_rgba(15,27,61,0.35)]"
        : "bg-card border-border hover:shadow-[0_8px_24px_rgba(15,27,61,0.08)] hover:border-primary/30"
    }`}
  >
    {dark && (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -inset-x-10 -bottom-16 h-48 rainbow-gradient animate-rainbow opacity-60 blur-[44px]" />
      </div>
    )}
    <div className={`relative h-36 w-full overflow-hidden ${dark ? "bg-[#0F1B3D]" : "bg-muted"}`}>
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-sm border ${
        dark ? "bg-white/10 border-white/20" : "bg-card/90 border-border/60"
      }`}>
        {icon}
        <span className={`text-[11px] font-medium ${dark ? "text-white" : "text-foreground"}`}>{badge}</span>
      </div>
    </div>
    <div className="relative p-5 flex flex-col flex-1">
      <h3 className={`text-[16px] font-semibold tracking-tight ${dark ? "text-white" : "text-foreground"}`}>{title}</h3>
      <p className={`text-[13px] mt-1.5 leading-relaxed flex-1 ${dark ? "text-white/70" : "text-muted-foreground"}`}>{desc}</p>
      <div className={`mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium ${dark ? "text-white" : "text-primary"}`}>
        {cta}
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  </button>
);
