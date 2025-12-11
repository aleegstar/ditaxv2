import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';
import { ArrowLeft, User, MapPin, FileText, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChildrenRepeater } from './ChildrenRepeater';

interface MultiStepContactFormProps {
  onSave: () => void;
  embedded?: boolean;
}

const steps = [
  { id: 1, title: 'Persönliche Daten', description: 'Name, Geburtsdatum, Religion, Zivilstand', icon: User },
  { id: 2, title: 'Aktuelle Adresse', description: 'Strasse, PLZ, Stadt, Kanton', icon: MapPin },
  { id: 3, title: 'Zusätzliche Angaben', description: 'Adresse per 31.12., Feuerwehrdienst', icon: FileText },
  { id: 4, title: 'Familie', description: 'Ehepartner und Kinder', icon: Users }
];

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
    spouseReligion
  }), [
    adressnummer, firstName, lastName, address, postalCode, city,
    kanton, birthDate, religion, maritalStatus, firefighterService, hasChildren,
    children, hadDifferentAddressEnd, endYearAddress, endYearAdressnummer,
    endYearPostalCode, endYearCity, endYearKanton, spouseFirstName, spouseLastName, spouseReligion
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
        title: "Pflichtfelder ausfüllen",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive"
      });
      return;
    }

    try {
      await saveSection('contactInfo', currentContactData);
      updateFormProgress('contactInfo', true);
      
      const checkboxFields = ['firefighterService', 'hasChildren'];
      const hasCheckboxChanges = checkboxFields.some(field => 
        currentContactData[field] !== formData.contactInfo?.[field]
      );
      
      if (hasCheckboxChanges) {
        generateChecklist();
      }

      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });

      if (currentStep < steps.length) {
        setCurrentFormStep(currentStep + 1);
      } else {
        // Final step completed - redirect to tax year overview
        if (embedded) {
          setCurrentStep(1); // Move to income section
        } else {
          // Navigate back to tax year overview
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


  // Dark theme classes
  const darkInputClass = "min-h-[56px] px-6 py-4 text-base rounded-xl bg-[#0a0f1a] border-white/10 text-white placeholder:text-zinc-500 focus:border-[#1D64FF] focus:ring-[#1D64FF]/20";
  const darkSelectTriggerClass = "min-h-[56px] px-6 py-4 text-base rounded-xl bg-[#0a0f1a] border-white/10 text-white";
  const darkLabelClass = "block mb-3 text-zinc-400 text-base font-medium";

  return (
    <div className="min-h-screen bg-[#020408] relative overflow-hidden flex justify-center">
      {/* Blue ambient glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(29, 100, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />

      <div className="relative z-10 px-6 py-8 w-full max-w-[500px] md:max-w-2xl">
        {/* Header with back arrow and centered title */}
        {!embedded && (
          <div className="relative flex items-center justify-between mb-8">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-medium text-white absolute left-1/2 transform -translate-x-1/2">Kontaktangaben</h1>
            <div className="w-10 h-10" /> {/* Spacer for centering */}
          </div>
        )}

        {/* 4-Segment Progress Bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index < currentStep ? "bg-[#1D64FF]" : "bg-white/10"
              )}
            />
          ))}
        </div>

        {/* Section Heading */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">
            {steps.find(step => step.id === currentStep)?.title || 'Kontaktdaten'}
          </h2>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
                    <Label htmlFor="firstName" className={darkLabelClass}>{t.contact.firstName}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t.contact.firstNamePlaceholder}
                      className={darkInputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className={darkLabelClass}>{t.contact.lastName}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t.contact.lastNamePlaceholder}
                      className={darkInputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="birthDate" className={darkLabelClass}>{t.contact.birthDate}</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={darkInputClass}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="religion" className={darkLabelClass}>Religion</Label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger className={darkSelectTriggerClass}>
                      <SelectValue placeholder="Religion auswählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0f1a] border-white/10">
                      <SelectItem value="catholic" className="text-white hover:bg-white/10">Katholisch</SelectItem>
                      <SelectItem value="reformed" className="text-white hover:bg-white/10">Reformiert</SelectItem>
                      <SelectItem value="christCatholic" className="text-white hover:bg-white/10">Christkatholisch</SelectItem>
                      <SelectItem value="other" className="text-white hover:bg-white/10">Andere</SelectItem>
                      <SelectItem value="none" className="text-white hover:bg-white/10">Keine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maritalStatus" className={darkLabelClass}>{t.contact.maritalStatus}</Label>
                  <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                    <SelectTrigger className={darkSelectTriggerClass}>
                      <SelectValue placeholder={t.contact.maritalStatus} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0f1a] border-white/10">
                      <SelectItem value="ledig" className="text-white hover:bg-white/10">Ledig</SelectItem>
                      <SelectItem value="verheiratet" className="text-white hover:bg-white/10">Verheiratet</SelectItem>
                      <SelectItem value="geschieden" className="text-white hover:bg-white/10">Geschieden</SelectItem>
                      <SelectItem value="verwitwet" className="text-white hover:bg-white/10">Verwitwet</SelectItem>
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
                    <Label htmlFor="address" className={darkLabelClass}>Strasse</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Musterstrasse"
                      className={darkInputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="adressnummer" className={darkLabelClass}>Nr.</Label>
                    <Input
                      id="adressnummer"
                      value={adressnummer}
                      onChange={(e) => setAdressnummer(e.target.value)}
                      placeholder="123"
                      className={darkInputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode" className={darkLabelClass}>{t.contact.postalCode}</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder={t.contact.postalCodePlaceholder}
                      className={darkInputClass}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className={darkLabelClass}>{t.contact.city}</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t.contact.cityPlaceholder}
                      className={darkInputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="kanton" className={darkLabelClass}>Kanton</Label>
                  <Select value={kanton} onValueChange={setKanton}>
                    <SelectTrigger className={darkSelectTriggerClass}>
                      <SelectValue placeholder="Kanton auswählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0f1a] border-white/10 max-h-[300px]">
                      <SelectItem value="AG" className="text-white hover:bg-white/10">Aargau (AG)</SelectItem>
                      <SelectItem value="AI" className="text-white hover:bg-white/10">Appenzell Innerrhoden (AI)</SelectItem>
                      <SelectItem value="AR" className="text-white hover:bg-white/10">Appenzell Ausserrhoden (AR)</SelectItem>
                      <SelectItem value="BE" className="text-white hover:bg-white/10">Bern (BE)</SelectItem>
                      <SelectItem value="BL" className="text-white hover:bg-white/10">Basel-Landschaft (BL)</SelectItem>
                      <SelectItem value="BS" className="text-white hover:bg-white/10">Basel-Stadt (BS)</SelectItem>
                      <SelectItem value="FR" className="text-white hover:bg-white/10">Freiburg (FR)</SelectItem>
                      <SelectItem value="GE" className="text-white hover:bg-white/10">Genf (GE)</SelectItem>
                      <SelectItem value="GL" className="text-white hover:bg-white/10">Glarus (GL)</SelectItem>
                      <SelectItem value="GR" className="text-white hover:bg-white/10">Graubünden (GR)</SelectItem>
                      <SelectItem value="JU" className="text-white hover:bg-white/10">Jura (JU)</SelectItem>
                      <SelectItem value="LU" className="text-white hover:bg-white/10">Luzern (LU)</SelectItem>
                      <SelectItem value="NE" className="text-white hover:bg-white/10">Neuenburg (NE)</SelectItem>
                      <SelectItem value="NW" className="text-white hover:bg-white/10">Nidwalden (NW)</SelectItem>
                      <SelectItem value="OW" className="text-white hover:bg-white/10">Obwalden (OW)</SelectItem>
                      <SelectItem value="SG" className="text-white hover:bg-white/10">St. Gallen (SG)</SelectItem>
                      <SelectItem value="SH" className="text-white hover:bg-white/10">Schaffhausen (SH)</SelectItem>
                      <SelectItem value="SO" className="text-white hover:bg-white/10">Solothurn (SO)</SelectItem>
                      <SelectItem value="SZ" className="text-white hover:bg-white/10">Schwyz (SZ)</SelectItem>
                      <SelectItem value="TG" className="text-white hover:bg-white/10">Thurgau (TG)</SelectItem>
                      <SelectItem value="TI" className="text-white hover:bg-white/10">Tessin (TI)</SelectItem>
                      <SelectItem value="UR" className="text-white hover:bg-white/10">Uri (UR)</SelectItem>
                      <SelectItem value="VD" className="text-white hover:bg-white/10">Waadt (VD)</SelectItem>
                      <SelectItem value="VS" className="text-white hover:bg-white/10">Wallis (VS)</SelectItem>
                      <SelectItem value="ZG" className="text-white hover:bg-white/10">Zug (ZG)</SelectItem>
                      <SelectItem value="ZH" className="text-white hover:bg-white/10">Zürich (ZH)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Zusätzliche Angaben */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className={darkLabelClass}>Adresse per 31.12.{taxYear}</Label>
                  <CustomCheckbox
                    checked={hadDifferentAddressEnd === true}
                    onCheckedChange={(checked) => setHadDifferentAddressEnd(checked === true ? true : undefined)}
                    label="Andere Adresse per 31.12."
                  />
                </div>

                {hadDifferentAddressEnd && (
                  <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="endYearAddress" className={darkLabelClass}>Strasse per 31.12.</Label>
                        <Input
                          id="endYearAddress"
                          value={endYearAddress}
                          onChange={(e) => setEndYearAddress(e.target.value)}
                          placeholder="Strasse"
                          className={darkInputClass}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endYearAdressnummer" className={darkLabelClass}>Nr.</Label>
                        <Input
                          id="endYearAdressnummer"
                          value={endYearAdressnummer}
                          onChange={(e) => setEndYearAdressnummer(e.target.value)}
                          placeholder="123"
                          className={darkInputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="endYearPostalCode" className={darkLabelClass}>PLZ</Label>
                        <Input
                          id="endYearPostalCode"
                          value={endYearPostalCode}
                          onChange={(e) => setEndYearPostalCode(e.target.value)}
                          placeholder="1234"
                          className={darkInputClass}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endYearCity" className={darkLabelClass}>Ort</Label>
                        <Input
                          id="endYearCity"
                          value={endYearCity}
                          onChange={(e) => setEndYearCity(e.target.value)}
                          placeholder="Musterort"
                          className={darkInputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="endYearKanton" className={darkLabelClass}>Kanton</Label>
                      <Select value={endYearKanton} onValueChange={setEndYearKanton}>
                        <SelectTrigger className={darkSelectTriggerClass}>
                          <SelectValue placeholder="Kanton auswählen" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0f1a] border-white/10">
                          <SelectItem value="AG" className="text-white hover:bg-white/10">Aargau (AG)</SelectItem>
                          <SelectItem value="ZH" className="text-white hover:bg-white/10">Zürich (ZH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <Label className={darkLabelClass}>Feuerwehrdienst</Label>
                  <CustomCheckbox
                    checked={firefighterService === true}
                    onCheckedChange={(checked) => setFirefighterService(checked === true ? true : undefined)}
                    label="Ich leiste Feuerwehrdienst"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Familie */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {maritalStatus === 'verheiratet' && (
                  <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="text-lg font-medium text-white">Ehepartner/in</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="spouseFirstName" className={darkLabelClass}>Vorname</Label>
                        <Input
                          id="spouseFirstName"
                          value={spouseFirstName}
                          onChange={(e) => setSpouseFirstName(e.target.value)}
                          placeholder="Vorname"
                          className={darkInputClass}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="spouseLastName" className={darkLabelClass}>Nachname</Label>
                        <Input
                          id="spouseLastName"
                          value={spouseLastName}
                          onChange={(e) => setSpouseLastName(e.target.value)}
                          placeholder="Nachname"
                          className={darkInputClass}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="spouseReligion" className={darkLabelClass}>Religion</Label>
                      <Select value={spouseReligion} onValueChange={setSpouseReligion}>
                        <SelectTrigger className={darkSelectTriggerClass}>
                          <SelectValue placeholder="Religion auswählen" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0f1a] border-white/10">
                          <SelectItem value="catholic" className="text-white hover:bg-white/10">Katholisch</SelectItem>
                          <SelectItem value="reformed" className="text-white hover:bg-white/10">Reformiert</SelectItem>
                          <SelectItem value="christCatholic" className="text-white hover:bg-white/10">Christkatholisch</SelectItem>
                          <SelectItem value="other" className="text-white hover:bg-white/10">Andere</SelectItem>
                          <SelectItem value="none" className="text-white hover:bg-white/10">Keine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <Label className={darkLabelClass}>Kinder</Label>
                  <CustomCheckbox
                    checked={hasChildren === true}
                    onCheckedChange={(checked) => setHasChildren(checked === true ? true : undefined)}
                    label="Ich habe Kinder"
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
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 && !embedded}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-medium px-6 py-3 h-14 text-base rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span>Zurück</span>
            </button>

            <button
              type="submit"
              disabled={!validateCurrentStep()}
              className="bg-[#1D64FF] text-white hover:bg-[#1D64FF]/90 rounded-full px-6 py-3 h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-1"
              style={{ boxShadow: 'rgba(29, 100, 255, 0.3) 0px 8px 20px 0px' }}
            >
              <span>{currentStep === steps.length ? 'Abschliessen' : 'Weiter'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiStepContactForm;