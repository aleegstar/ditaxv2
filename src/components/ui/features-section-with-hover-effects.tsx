import { cn } from "@/lib/utils";
import { UserIcon, BriefcaseIcon, Coins, Receipt } from 'lucide-react';

export function FeaturesSectionWithHoverEffects() {
  const features = [{
    title: "Kontaktangaben",
    description: "Deine persönlichen Daten und Kontaktinformationen für die Steuererklärung.",
    icon: <UserIcon className="h-14 w-14 rounded-full p-3 text-blue-500 bg-blue-50" />
  }, {
    title: "Einkommen",
    description: "Einnahmen aus Arbeit, Vermietung und andere Einkommensquellen.",
    icon: <BriefcaseIcon className="h-14 w-14 rounded-full p-3 text-tax-blue bg-blue-50" />
  }, {
    title: "Vermögen",
    description: "Deine Vermögenswerte wie Immobilien, Aktien und Bankguthaben.",
    icon: <Coins className="h-14 w-14 rounded-full p-3 text-teal-500 bg-teal-50" />
  }, {
    title: "Abzüge",
    description: "Steuerlich abzugsfähige Ausgaben, die deine Steuerlast reduzieren.",
    icon: <Receipt className="h-14 w-14 rounded-full p-3 text-indigo-500 bg-indigo-50" />
  }];
  
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 max-w-7xl mx-auto py-8 mt-8">
      {features.map((feature, index) => <Feature key={feature.title} {...feature} index={index} />)}
    </div>;
}

const Feature = ({
  title,
  description,
  icon,
  index
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return <div className={cn("flex flex-col lg:border-r  py-10 relative group/feature dark:border-neutral-800", (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800", index < 4 && "lg:border-b dark:border-neutral-800")}>
      {index < 4 && <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />}
      {index >= 4 && <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>;
};
