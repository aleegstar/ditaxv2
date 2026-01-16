
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Eye, EyeOff } from "lucide-react";
import { useId, useMemo, useState, useEffect } from "react";

interface PasswordInputProps {
  value?: string;
  onChange?: (value: string) => void;
}

function Component({ value, onChange }: PasswordInputProps) {
  const id = useId();
  const [password, setPassword] = useState(value || "");
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  // Synchronize with parent component when value changes
  useEffect(() => {
    if (value !== undefined && value !== password) {
      setPassword(value);
    }
  }, [value]);

  // Notify parent component about password changes
  useEffect(() => {
    if (onChange && password !== value) {
      onChange(password);
    }
  }, [password, onChange, value]);

  const checkStrength = (pass: string) => {
    const requirements = [
      { regex: /.{8,}/, text: "Mindestens 8 Zeichen" },
      { regex: /[0-9]/, text: "Mindestens 1 Zahl" },
      { regex: /[a-z]/, text: "Mindestens 1 Kleinbuchstabe" },
      { regex: /[A-Z]/, text: "Mindestens 1 Großbuchstabe" },
    ];

    return requirements.map((req) => ({
      met: req.regex.test(pass),
      text: req.text,
    }));
  };

  const strength = checkStrength(password);

  const strengthScore = useMemo(() => {
    return strength.filter((req) => req.met).length;
  }, [strength]);

  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-border";
    if (score <= 1) return "bg-red-500";
    if (score <= 2) return "bg-orange-500";
    if (score === 3) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return "Gib ein Passwort ein";
    if (score <= 2) return "Schwaches Passwort";
    if (score === 3) return "Mittleres Passwort";
    return "Starkes Passwort";
  };

  return (
    <div className="min-w-[300px]">
      <div className="space-y-2">
        <div className="relative">
          <Input
            id={id}
            className="pe-9"
            placeholder="Passwort"
            type={isVisible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={strengthScore < 4}
            aria-describedby={`${id}-description`}
          />
          <button
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={toggleVisibility}
            aria-label={isVisible ? "Passwort verbergen" : "Passwort anzeigen"}
            aria-pressed={isVisible}
          >
            {isVisible ? (
              <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Eye size={16} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div
        className="mb-4 mt-3 h-1 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={strengthScore}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label="Passwortstärke"
      >
        <div
          className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
          style={{ width: `${(strengthScore / 4) * 100}%` }}
        ></div>
      </div>

      <p id={`${id}-description`} className="mb-2 text-sm font-medium text-foreground">
        {getStrengthText(strengthScore)}. Muss enthalten:
      </p>

      <ul className="space-y-1.5" aria-label="Passwortanforderungen">
        {strength.map((req, index) => (
          <li key={index} className="flex items-center gap-2">
            {req.met ? (
              <Check size={16} className="text-emerald-500" aria-hidden="true" />
            ) : (
              <Check size={16} className="text-muted-foreground/80" aria-hidden="true" />
            )}
            <span className={`text-xs ${req.met ? "text-emerald-600" : "text-muted-foreground"}`}>
              {req.text}
              <span className="sr-only">
                {req.met ? " - Anforderung erfüllt" : " - Anforderung nicht erfüllt"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { Component };
