import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import { User, MapPin, FileText, Users } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChildrenRepeater } from './ChildrenRepeater';
import { MobileFriendlyDateInput } from '@/components/ui/mobile-friendly-date-input';

interface MultiStepContactFormProps {
  onSave: () => void;
  embedded?: boolean;
}

// Steps are now dynamically generated based on translations

// Shallow comparison helper
const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (!obj1 || !obj2) return obj1 === obj2;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every(key => obj1[key] === obj2[key]);
};

const MultiStepContactForm = ({
  onSave,
  embedded = false
}: MultiStepContactFormProps) => {
  const {
    formData,
    updateFormData,
    saveSection,
    updateFormProgress,
    generateChecklist,
    setCurrentStep,
    taxYear,
    isDataLoading,
    isSwitchingTaxYear
  } = useFormContext();
  const { t } = useI18n();

  // Steps with translated content
  const steps = [
    { id: 1, title: t.multiStepContactForm.personalData, description: t.multiStepContactForm.personalDataDescription, icon: User },
    { id: 2, title: t.multiStepContactForm.currentAddress, description: t.multiStepContactForm.currentAddressDescription, icon: MapPin },
    { id: 3, title: t.multiStepContactForm.additionalInfo, description: t.multiStepContactForm.additionalInfoDescription, icon: FileText },
    { id: 4, title: t.multiStepContactForm.family, description: t.multiStepContactForm.familyDescription, icon: Users }
  ];
  // Step state
  const [currentStep, setCurrentFormStep] = useState(1);

  // Form states
  const [adressnummer, setAdressnummer] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [kanton, setKanton] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [religion, setReligion] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [firefighterService, setFirefighterService] = useState<boolean | undefined>(undefined);
  const [hasChildren, setHasChildren] = useState<boolean | undefined>(undefined);
  const [children, setChildren] = useState<any[]>([]);
  const [hadDifferentAddressEnd, setHadDifferentAddressEnd] = useState<boolean | undefined>(undefined);
  const [endYearAddress, setEndYearAddress] = useState('');
  const [endYearAdressnummer, setEndYearAdressnummer] = useState('');
  const [endYearPostalCode, setEndYearPostalCode] = useState('');
  const [endYearCity, setEndYearCity] = useState('');
  const [endYearKanton, setEndYearKanton] = useState('');
  const [spouseFirstName, setSpouseFirstName] = useState('');
  const [spouseLastName, setSpouseLastName] = useState('');
  const [spouseBirthDate, setSpouseBirthDate] = useState('');
  const [spouseReligion, setSpouseReligion] = useState('');

  const currentContactData = React.useMemo(() => ({
    adressnummer,
    firstName,
    lastName,
    address,
    postalCode,
    city,
    kanton,
    birthDate,
    religion,
    maritalStatus,
    firefighterService,
    hasChildren,
    children,
    hadDifferentAddressEnd,
    endYearAddress,
    endYearAdressnummer,
    endYearPostalCode,
    endYearCity,
    endYearKanton,
    spouseFirstName,
    spouseLastName,
    spouseBirthDate,
    spouseReligion
  }), [
    adressnummer, firstName, lastName, address, postalCode, city,
    kanton, birthDate, religion, maritalStatus, firefighterService, hasChildren,
    children, hadDifferentAddressEnd, endYearAddress, endYearAdressnummer,
    endYearPostalCode, endYearCity, endYearKanton, spouseFirstName, spouseLastName, spouseBirthDate, spouseReligion
  ]);


  // Load existing data
  useEffect(() => {
    if (formData?.contactInfo) {
      setAdressnummer(formData.contactInfo.adressnummer || '');
      setFirstName(formData.contactInfo.firstName || '');
      setLastName(formData.contactInfo.lastName || '');
      setAddress(formData.contactInfo.address || '');
      setPostalCode(formData.contactInfo.postalCode || '');
      setCity(formData.contactInfo.city || '');
      setKanton(formData.contactInfo.kanton || '');
      setBirthDate(formData.contactInfo.birthDate || '');
      setReligion(formData.contactInfo.religion || '');
      setMaritalStatus(formData.contactInfo.maritalStatus || '');
      setFirefighterService(formData.contactInfo.firefighterService);
      setHasChildren(formData.contactInfo.hasChildren);
      setChildren(formData.contactInfo.children || []);
      setHadDifferentAddressEnd(formData.contactInfo.hadDifferentAddressEnd);
      setEndYearAddress(formData.contactInfo.endYearAddress || '');
      setEndYearAdressnummer(formData.contactInfo.endYearAdressnummer || '');
      setEndYearPostalCode(formData.contactInfo.endYearPostalCode || '');
      setEndYearCity(formData.contactInfo.endYearCity || '');
      setEndYearKanton(formData.contactInfo.endYearKanton || '');
      setSpouseFirstName(formData.contactInfo.spouseFirstName || '');
      setSpouseLastName(formData.contactInfo.spouseLastName || '');
      setSpouseBirthDate(formData.contactInfo.spouseBirthDate || '');
      setSpouseReligion(formData.contactInfo.spouseReligion || '');
    }
  }, [formData]);


  // Validation function
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return firstName.trim() !== '' && lastName.trim() !== '' && birthDate !== '';
      case 2:
        return address.trim() !== '' && postalCode.trim() !== '' && city.trim() !== '';
      case 3:
        return true; // Additional fields are optional
      case 4:
        if (maritalStatus === 'verheiratet') {
          return spouseFirstName.trim() !== '' && spouseLastName.trim() !== '';
        }
        return true;
      default:
        return false;
    }
  };

  const isStepCompleted = (step: number) => {
    switch (step) {
      case 1:
        return firstName.trim() !== '' && lastName.trim() !== '' && birthDate !== '';
      case 2:
        return address.trim() !== '' && postalCode.trim() !== '' && city.trim() !== '';
      case 3:
        // Step 3 is completed only if the user has interacted with it (visited the step)
        return step < currentStep;
      case 4:
        if (maritalStatus === 'verheiratet') {
          return spouseFirstName.trim() !== '' && spouseLastName.trim() !== '';
        }
        // Step 4 is completed only if the user has interacted with it (visited the step)
        return step < currentStep;
      default:
        return false;
    }
  };

  const handleStepClick = (step: number) => {
    // Allow navigation only to completed steps or next step
    if (step <= currentStep || isStepCompleted(currentStep)) {
      setCurrentFormStep(step);
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      toast({
        title: t.multiStepContactForm.fillRequired,
        description: t.multiStepContactForm.fillRequiredDescription,
        variant: "destructive"
      });
      return;
    }

    try {
      const checkboxFields = ['firefighterService', 'hasChildren'];
      const hasCheckboxChanges = checkboxFields.some(field => 
        currentContactData[field] !== formData.contactInfo?.[field]
      );
      
      if (currentStep < steps.length) {
        // Intermediate step - save without _completed flag, just advance
        await saveSection('contactInfo', currentContactData);
        
        if (hasCheckboxChanges) {
          generateChecklist();
        }
        setCurrentFormStep(currentStep + 1);
      } else {
        // Final step completed - save WITH _completed: true flag
        await saveSection('contactInfo', { ...currentContactData, _completed: true });
        
        if (hasCheckboxChanges) {
          generateChecklist();
        }
        updateFormProgress('contactInfo', true);
        toast({
          title: t.forms.savedSuccessfully,
          description: t.forms.savedSuccessfullyDescription
        });
        if (embedded) {
          setCurrentStep(1);
        } else {
          window.location.href = `/form?year=${taxYear}`;
        }
      }
    } catch (error) {
      console.error('Error saving contact info:', error);
      toast({
        title: t.forms.saveError,
        description: t.forms.saveErrorDescription,
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentFormStep(currentStep - 1);
    } else if (embedded) {
      // Go back to section selection
      setCurrentStep(-1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNext();
  };


  // Liquid glass theme classes
  const lightInputClass = "min-h-[52px] px-5 py-3.5 text-[15px] rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-2 focus:ring-primary/10 focus:bg-white/80 transition-all duration-300 shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.06),inset_0_1px_0_0_rgba(255,255,255,0.8)]";
  const lightSelectTriggerClass = "min-h-[52px] px-5 py-3.5 text-[15px] rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 text-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.06),inset_0_1px_0_0_rgba(255,255,255,0.8)] transition-all duration-300 hover:bg-white/80";
  const lightLabelClass = "block mb-2.5 text-muted-foreground text-sm font-medium tracking-wide";

  return (
    <div className="min-h-screen relative overflow-hidden flex justify-center" style={{ background: 'linear-gradient(145deg, hsl(var(--background)) 0%, hsl(var(--muted)) 50%, hsl(var(--background)) 100%)' }}>
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.07] animate-pulse" style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)', animationDuration: '6s' }} />
        <div className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)', animationDuration: '8s' }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Header with back arrow and centered title */}
        {!embedded && (
          <SubpageHeader
            title={t.multiStepContactForm.title}
            onBack={() => window.history.back()}
          />
        )}

        <div className="px-6 pt-6">

        {/* 4-Segment Progress Bar — glass style */}
        <div className="flex gap-2.5 mb-10">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                index < currentStep 
                  ? "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" 
                  : "bg-foreground/[0.08]"
              )}
            />
          ))}
        </div>

        {/* Section Heading */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            {steps.find(step => step.id === currentStep)?.title || t.multiStepContactForm.title}
          </h2>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Persönliche Daten */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className={lightLabelClass}>{t.contact.firstName}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t.contact.firstNamePlaceholder}
                      className={lightInputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className={lightLabelClass}>{t.contact.lastName}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t.contact.lastNamePlaceholder}
                      className={lightInputClass}
                      required
                    />
                  </div>
                </div>

                <MobileFriendlyDateInput
                  id="birthDate"
                  value={birthDate}
                  onChange={setBirthDate}
                  label={t.contact.birthDate}
                  defaultYear={1990}
                  required
                />

                <div>
                  <Label htmlFor="religion" className={lightLabelClass}>Religion</Label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger className={lightSelectTriggerClass}>
                      <SelectValue placeholder="Religion auswählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50 rounded-xl shadow-xl">
                      <SelectItem value="catholic" className="text-foreground hover:bg-muted/60 rounded-lg">Katholisch</SelectItem>
                      <SelectItem value="reformed" className="text-foreground hover:bg-muted/60 rounded-lg">Reformiert</SelectItem>
                      <SelectItem value="christCatholic" className="text-foreground hover:bg-muted/60 rounded-lg">Christkatholisch</SelectItem>
                      <SelectItem value="other" className="text-foreground hover:bg-muted/60 rounded-lg">Andere</SelectItem>
                      <SelectItem value="none" className="text-foreground hover:bg-muted/60 rounded-lg">Keine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maritalStatus" className={lightLabelClass}>{t.contact.maritalStatus}</Label>
                  <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                    <SelectTrigger className={lightSelectTriggerClass}>
                      <SelectValue placeholder={t.contact.maritalStatus} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="ledig" className="text-slate-800 hover:bg-slate-100">Ledig</SelectItem>
                      <SelectItem value="verheiratet" className="text-slate-800 hover:bg-slate-100">Verheiratet</SelectItem>
                      <SelectItem value="geschieden" className="text-slate-800 hover:bg-slate-100">Geschieden</SelectItem>
                      <SelectItem value="verwitwet" className="text-slate-800 hover:bg-slate-100">Verwitwet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Aktuelle Adresse */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="address" className={lightLabelClass}>{t.multiStepContactForm.street}</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Musterstrasse"
                      className={lightInputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="adressnummer" className={lightLabelClass}>{t.multiStepContactForm.streetNumber}</Label>
                    <Input
                      id="adressnummer"
                      value={adressnummer}
                      onChange={(e) => setAdressnummer(e.target.value)}
                      placeholder="123"
                      className={lightInputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode" className={lightLabelClass}>{t.contact.postalCode}</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder={t.contact.postalCodePlaceholder}
                      className={lightInputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className={lightLabelClass}>{t.contact.city}</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t.contact.cityPlaceholder}
                      className={lightInputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="kanton" className={lightLabelClass}>Kanton</Label>
                  <Select value={kanton} onValueChange={setKanton}>
                    <SelectTrigger className={lightSelectTriggerClass}>
                      <SelectValue placeholder={t.multiStepContactForm.selectCanton} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-[300px]">
                      <SelectItem value="AG" className="text-slate-800 hover:bg-slate-100">Aargau (AG)</SelectItem>
                      <SelectItem value="ZH" className="text-slate-800 hover:bg-slate-100">Zürich (ZH)</SelectItem>
                      <SelectItem value="AI" disabled className="text-slate-400 cursor-not-allowed">Appenzell Innerrhoden (AI) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="AR" disabled className="text-slate-400 cursor-not-allowed">Appenzell Ausserrhoden (AR) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="BE" disabled className="text-slate-400 cursor-not-allowed">Bern (BE) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="BL" disabled className="text-slate-400 cursor-not-allowed">Basel-Landschaft (BL) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="BS" disabled className="text-slate-400 cursor-not-allowed">Basel-Stadt (BS) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="FR" disabled className="text-slate-400 cursor-not-allowed">Freiburg (FR) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="GE" disabled className="text-slate-400 cursor-not-allowed">Genf (GE) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="GL" disabled className="text-slate-400 cursor-not-allowed">Glarus (GL) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="GR" disabled className="text-slate-400 cursor-not-allowed">Graubünden (GR) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="JU" disabled className="text-slate-400 cursor-not-allowed">Jura (JU) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="LU" disabled className="text-slate-400 cursor-not-allowed">Luzern (LU) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="NE" disabled className="text-slate-400 cursor-not-allowed">Neuenburg (NE) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="NW" disabled className="text-slate-400 cursor-not-allowed">Nidwalden (NW) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="OW" disabled className="text-slate-400 cursor-not-allowed">Obwalden (OW) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="SG" disabled className="text-slate-400 cursor-not-allowed">St. Gallen (SG) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="SH" disabled className="text-slate-400 cursor-not-allowed">Schaffhausen (SH) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="SO" disabled className="text-slate-400 cursor-not-allowed">Solothurn (SO) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="SZ" disabled className="text-slate-400 cursor-not-allowed">Schwyz (SZ) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="TG" disabled className="text-slate-400 cursor-not-allowed">Thurgau (TG) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="TI" disabled className="text-slate-400 cursor-not-allowed">Tessin (TI) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="UR" disabled className="text-slate-400 cursor-not-allowed">Uri (UR) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="VD" disabled className="text-slate-400 cursor-not-allowed">Waadt (VD) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="VS" disabled className="text-slate-400 cursor-not-allowed">Wallis (VS) - noch nicht verfügbar</SelectItem>
                      <SelectItem value="ZG" disabled className="text-slate-400 cursor-not-allowed">Zug (ZG) - noch nicht verfügbar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Zusätzliche Angaben */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className={lightLabelClass}>{t.multiStepContactForm.addressAsOf}{taxYear}</Label>
                  <CustomCheckbox
                    checked={hadDifferentAddressEnd === true}
                    onCheckedChange={(checked) => setHadDifferentAddressEnd(checked === true ? true : undefined)}
                    label={t.multiStepContactForm.differentAddressAsOf}
                  />
                </div>

                {hadDifferentAddressEnd && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="endYearAddress" className={lightLabelClass}>Strasse per 31.12.</Label>
                        <Input
                          id="endYearAddress"
                          value={endYearAddress}
                          onChange={(e) => setEndYearAddress(e.target.value)}
                          placeholder="Strasse"
                          className={lightInputClass}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endYearAdressnummer" className={lightLabelClass}>Nr.</Label>
                        <Input
                          id="endYearAdressnummer"
                          value={endYearAdressnummer}
                          onChange={(e) => setEndYearAdressnummer(e.target.value)}
                          placeholder="123"
                          className={lightInputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="endYearPostalCode" className={lightLabelClass}>PLZ</Label>
                        <Input
                          id="endYearPostalCode"
                          value={endYearPostalCode}
                          onChange={(e) => setEndYearPostalCode(e.target.value)}
                          placeholder="1234"
                          className={lightInputClass}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endYearCity" className={lightLabelClass}>Ort</Label>
                        <Input
                          id="endYearCity"
                          value={endYearCity}
                          onChange={(e) => setEndYearCity(e.target.value)}
                          placeholder="Musterort"
                          className={lightInputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="endYearKanton" className={lightLabelClass}>Kanton</Label>
                      <Select value={endYearKanton} onValueChange={setEndYearKanton}>
                        <SelectTrigger className={lightSelectTriggerClass}>
                          <SelectValue placeholder="Kanton auswählen" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="AG" className="text-slate-800 hover:bg-slate-100">Aargau (AG)</SelectItem>
                          <SelectItem value="ZH" className="text-slate-800 hover:bg-slate-100">Zürich (ZH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <Label className={lightLabelClass}>{t.multiStepContactForm.firefighterLabel}</Label>
                  <CustomCheckbox
                    checked={firefighterService === true}
                    onCheckedChange={(checked) => setFirefighterService(checked === true ? true : undefined)}
                    label={t.multiStepContactForm.iDoFirefighterService}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Familie */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {maritalStatus === 'verheiratet' && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-medium text-slate-800">{t.multiStepContactForm.spouseTitle}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="spouseFirstName" className={lightLabelClass}>Vorname</Label>
                        <Input
                          id="spouseFirstName"
                          value={spouseFirstName}
                          onChange={(e) => setSpouseFirstName(e.target.value)}
                          placeholder="Vorname"
                          className={lightInputClass}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="spouseLastName" className={lightLabelClass}>Nachname</Label>
                        <Input
                          id="spouseLastName"
                          value={spouseLastName}
                          onChange={(e) => setSpouseLastName(e.target.value)}
                          placeholder="Nachname"
                          className={lightInputClass}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="spouseReligion" className={lightLabelClass}>Religion</Label>
                      <Select value={spouseReligion} onValueChange={setSpouseReligion}>
                        <SelectTrigger className={lightSelectTriggerClass}>
                          <SelectValue placeholder="Religion auswählen" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="catholic" className="text-slate-800 hover:bg-slate-100">Katholisch</SelectItem>
                          <SelectItem value="reformed" className="text-slate-800 hover:bg-slate-100">Reformiert</SelectItem>
                          <SelectItem value="christCatholic" className="text-slate-800 hover:bg-slate-100">Christkatholisch</SelectItem>
                          <SelectItem value="other" className="text-slate-800 hover:bg-slate-100">Andere</SelectItem>
                          <SelectItem value="none" className="text-slate-800 hover:bg-slate-100">Keine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <MobileFriendlyDateInput
                      id="spouseBirthDate"
                      value={spouseBirthDate}
                      onChange={setSpouseBirthDate}
                      label="Geburtsdatum"
                      defaultYear={1990}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <Label className={lightLabelClass}>{t.multiStepContactForm.childrenLabel}</Label>
                  <CustomCheckbox
                    checked={hasChildren === true}
                    onCheckedChange={(checked) => setHasChildren(checked === true ? true : undefined)}
                    label={t.multiStepContactForm.iHaveChildren}
                  />
                </div>

                {hasChildren && (
                  <ChildrenRepeater
                    children={children}
                    onChange={(updatedChildren) => setChildren(updatedChildren)}
                  />
                )}
              </div>
            )}
          </motion.div>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-3 pt-6">
            <Button
              type="button"
              onClick={handleNext}
              size="lg"
              className="w-full"
            >
              {currentStep === steps.length ? t.multiStepContactForm.finish : t.multiStepContactForm.continue}
            </Button>

            {(currentStep > 1 || embedded) && (
              <button
                type="button"
                onClick={handleBack}
                className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors duration-200"
              >
                {t.multiStepContactForm.back}
              </button>
            )}
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default MultiStepContactForm;