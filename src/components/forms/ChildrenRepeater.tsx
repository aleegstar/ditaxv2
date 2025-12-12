import React from 'react';
import { Button } from '@/components/ui/button';
import { SecureFormInput } from '@/components/ui/secure-form-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { MobileFriendlyDateInput } from '@/components/ui/mobile-friendly-date-input';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  religion: string;
  deduction: string;
}

interface ChildrenRepeaterProps {
  children: Child[];
  onChange: (children: Child[]) => void;
}

export const ChildrenRepeater: React.FC<ChildrenRepeaterProps> = ({
  children,
  onChange
}) => {
  const { t } = useI18n();

  const addChild = () => {
    const newChild: Child = {
      id: `child-${Date.now()}`,
      firstName: '',
      lastName: '',
      birthDate: '',
      religion: '',
      deduction: ''
    };
    onChange([...children, newChild]);
  };

  const removeChild = (id: string) => {
    onChange(children.filter(child => child.id !== id));
  };

  const updateChild = (id: string, field: keyof Child, value: string) => {
    onChange(children.map(child => 
      child.id === id ? { ...child, [field]: value } : child
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-zinc-400 text-base font-medium">
          {t.contactForm.childrenSection}
        </Label>
        <Button
          type="button"
          onClick={addChild}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-[#1D64FF] text-white border-[#1D64FF] hover:bg-[#1D64FF]/90 hover:text-white"
        >
          <Plus className="w-4 h-4" />
          {t.contactForm.addChild}
        </Button>
      </div>

      {children.map((child, index) => (
        <div key={child.id} className="space-y-6 p-6 bg-[#0A0C10] rounded-xl border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">
              Kind {index + 1}
            </h4>
            <Button
              type="button"
              onClick={() => removeChild(child.id)}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block mb-3 text-zinc-400 text-base font-medium">
                {t.contactForm.childFirstName}
              </Label>
              <SecureFormInput
                value={child.firstName}
                onChange={(e) => updateChild(child.id, 'firstName', e.target.value)}
                placeholder={t.contactForm.firstNamePlaceholder}
                className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-white/[0.08] bg-[#0A0C10] text-white placeholder:text-zinc-500 shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#1D64FF]"
                validationOptions={{
                  maxLength: 100,
                  strictMode: true,
                  contextType: 'name'
                }}
                sanitizeOnBlur={true}
              />
            </div>

            <div>
              <Label className="block mb-3 text-zinc-400 text-base font-medium">
                {t.contactForm.childLastName}
              </Label>
              <SecureFormInput
                value={child.lastName}
                onChange={(e) => updateChild(child.id, 'lastName', e.target.value)}
                placeholder={t.contactForm.lastNamePlaceholder}
                className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-white/[0.08] bg-[#0A0C10] text-white placeholder:text-zinc-500 shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#1D64FF]"
                validationOptions={{
                  maxLength: 100,
                  strictMode: true,
                  contextType: 'name'
                }}
                sanitizeOnBlur={true}
              />
            </div>
          </div>

          <div>
            <MobileFriendlyDateInput
              value={child.birthDate}
              onChange={(value) => updateChild(child.id, 'birthDate', value)}
              label={t.contactForm.childBirthDate}
              defaultYear={2010}
              className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-white/[0.08] bg-[#0A0C10] text-white placeholder:text-zinc-500 shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#1D64FF]"
            />
          </div>

          <div>
            <Label className="block mb-3 text-zinc-400 text-base font-medium">
              {t.contactForm.childReligion}
            </Label>
            <Select 
              value={child.religion} 
              onValueChange={(value) => updateChild(child.id, 'religion', value)}
            >
              <SelectTrigger className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-white/[0.08] bg-[#0A0C10] text-white shadow-none focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:border-[#1D64FF]">
                <SelectValue placeholder="Religion auswählen" className="text-zinc-500" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0C10] border border-white/[0.08] z-50">
                <SelectItem value="catholic" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.religionOptions.catholic}</SelectItem>
                <SelectItem value="reformed" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.religionOptions.reformed}</SelectItem>
                <SelectItem value="christCatholic" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.religionOptions.christCatholic}</SelectItem>
                <SelectItem value="other" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.religionOptions.other}</SelectItem>
                <SelectItem value="none" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.religionOptions.none}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block mb-3 text-zinc-400 text-base font-medium">
              {t.contactForm.childDeduction}
            </Label>
            <Select 
              value={child.deduction} 
              onValueChange={(value) => updateChild(child.id, 'deduction', value)}
            >
              <SelectTrigger className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-white/[0.08] bg-[#0A0C10] text-white shadow-none focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:border-[#1D64FF]">
                <SelectValue placeholder="Abzugsregelung auswählen" className="text-zinc-500" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0C10] border border-white/[0.08] z-50">
                <SelectItem value="fatherHigher" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.childDeductionOptions.fatherHigher}</SelectItem>
                <SelectItem value="motherHigher" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.childDeductionOptions.motherHigher}</SelectItem>
                <SelectItem value="childSelf" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.childDeductionOptions.childSelf}</SelectItem>
                <SelectItem value="differentHousehold" className="text-white hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white">{t.contactForm.childDeductionOptions.differentHousehold}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}

      {children.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          <p className="mb-4">Keine Kinder hinzugefügt</p>
          <Button
            type="button"
            onClick={addChild}
            variant="outline"
            className="flex items-center gap-2 bg-transparent border-white/[0.08] text-white hover:bg-white/[0.08] hover:text-white"
          >
            <Plus className="w-4 h-4" />
            Erstes Kind hinzufügen
          </Button>
        </div>
      )}

      {/* Add another button at the bottom when there are children */}
      {children.length > 0 && (
        <Button
          type="button"
          onClick={addChild}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-dashed border-2 border-white/[0.08] text-zinc-400 bg-transparent hover:border-[#1D64FF] hover:text-[#1D64FF] hover:bg-[#1D64FF]/5"
        >
          <Plus className="w-5 h-5" />
          Weiteres Kind hinzufügen
        </Button>
      )}
    </div>
  );
};
