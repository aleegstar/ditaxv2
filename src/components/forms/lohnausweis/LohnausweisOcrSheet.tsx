import React, { useState } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  extractLohnausweisFromFile,
  type LohnausweisFields,
} from '@/services/LohnausweisOcrService';

interface LohnausweisOcrSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fields: LohnausweisFields) => void;
}

// Nur Felder, die wir tatsächlich für den AG eTax / eCH-0119 Export benötigen.
const FIELD_LABELS: Array<{ key: keyof LohnausweisFields; label: string; type: 'number' | 'text' | 'date' | 'bool' }> = [
  { key: 'employer_name', label: 'Arbeitgeber', type: 'text' },
  { key: 'period_from', label: 'Anstellung von', type: 'date' },
  { key: 'period_to', label: 'Anstellung bis', type: 'date' },
  { key: 'gross_total', label: 'Ziff. 8 Bruttolohn total', type: 'number' },
  { key: 'bvg_ordinary', label: 'Ziff. 10.1 BVG ordentlich', type: 'number' },
  { key: 'bvg_purchase', label: 'Ziff. 10.2 BVG-Einkauf', type: 'number' },
  { key: 'withholding_tax', label: 'Ziff. 12 Quellensteuer', type: 'number' },
  { key: 'capital_payments', label: 'Ziff. 4 Kapitalleistungen', type: 'number' },
  { key: 'shift_days', label: 'Schichttage (falls vorhanden)', type: 'number' },
];

const CHECKBOX_FIELDS: Array<{ key: keyof LohnausweisFields; letter: string; label: string }> = [
  { key: 'free_transport', letter: 'F', label: 'Unentgeltliche Beförderung Wohn-/Arbeitsort' },
  { key: 'free_meals', letter: 'G', label: 'Kantinenverpflegung / Lunch-Checks' },
];

export const LohnausweisOcrSheet: React.FC<LohnausweisOcrSheetProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [stage, setStage] = useState<'upload' | 'loading' | 'review'>('upload');
  const [fields, setFields] = useState<LohnausweisFields>({});

  const reset = () => {
    setStage('upload');
    setFields({});
  };

  const handleFile = async (file: File) => {
    setStage('loading');
    try {
      const extracted = await extractLohnausweisFromFile(file);
      setFields(extracted);
      setStage('review');
    } catch (e: any) {
      console.error('[Lohnausweis OCR] failed', e);
      toast({
        title: 'OCR fehlgeschlagen',
        description: e?.message ?? 'Bitte erneut versuchen.',
        variant: 'destructive',
      });
      setStage('upload');
    }
  };

  const updateField = (key: keyof LohnausweisFields, value: string) => {
    setFields((prev) => {
      const next = { ...prev };
      const def = FIELD_LABELS.find((f) => f.key === key);
      if (!def) return prev;
      if (def.type === 'number') {
        const num = value === '' ? undefined : Number(value);
        (next as any)[key] = Number.isFinite(num as number) ? num : undefined;
      } else {
        (next as any)[key] = value || undefined;
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(fields);
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTimeout(reset, 300);
      }}
    >
      <DrawerContent variant="bottom-sheet">
        <div className="flex flex-col max-h-[85vh]">
          <div className="px-6 pt-4 pb-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Lohnausweis hochladen
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {stage === 'upload' && 'Wir lesen die Daten automatisch aus.'}
              {stage === 'loading' && 'Daten werden ausgelesen…'}
              {stage === 'review' && 'Bitte prüfe und ergänze die Werte.'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {stage === 'upload' && (
              <label className="block">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 px-6 cursor-pointer hover:border-[#1D64FF] hover:bg-blue-50/40 transition">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <div className="text-sm font-medium text-slate-700">
                    PDF oder Foto auswählen
                  </div>
                  <div className="text-xs text-slate-500">
                    Maximal 5 MB · PDF, JPG, PNG
                  </div>
                </div>
              </label>
            )}

            {stage === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-[#1D64FF] animate-spin" />
                <div className="text-sm text-slate-600">
                  Lohnausweis wird analysiert…
                </div>
              </div>
            )}

            {stage === 'review' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <FileText className="w-4 h-4" />
                  Daten erkannt – bitte überprüfen
                </div>
                {FIELD_LABELS.map(({ key, label, type }) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`lohn-${key}`} className="text-xs text-slate-600">
                      {label}
                    </Label>
                    <Input
                      id={`lohn-${key}`}
                      type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                      value={(fields as any)[key] ?? ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="bg-white border-slate-200 rounded-xl h-10"
                    />
                  </div>
                ))}

                <div className="pt-3 mt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Felder F & G (wichtig für Berufsauslagen)
                  </div>
                  <div className="space-y-2">
                    {CHECKBOX_FIELDS.map(({ key, letter, label }) => {
                      const checked = Boolean((fields as any)[key]);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFields((prev) => ({ ...prev, [key]: !checked }))}
                          className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            checked ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-900 text-white text-xs font-bold">
                            {letter}
                          </span>
                          <span
                            className={`flex items-center justify-center w-6 h-6 rounded border-2 ${
                              checked ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked ? <Check className="w-4 h-4" /> : null}
                          </span>
                          <span className="text-sm text-slate-700 flex-1">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {stage === 'review' && (
            <div className="px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-4 py-3 font-semibold text-sm tracking-tight text-white transition-all hover:brightness-110 active:scale-[0.97]"
              >
                <Check className="w-4 h-4" />
                Daten übernehmen
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default LohnausweisOcrSheet;
