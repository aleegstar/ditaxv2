import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SecureFormInput } from "@/components/ui/secure-form-input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { MobileFriendlyDateInput } from '@/components/ui/mobile-friendly-date-input';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import ImportFromPreviousYear from '@/components/ui/import-from-previous-year';
import { FramerButton } from '@/components/ui/framer-button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/contexts/I18nContext';
import { ArrowLeft, ChevronDown, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { AnimatedHeader } from '@/components/ui/animated-header';
import { AnimatedFormField } from '@/components/ui/animated-form-field';
import { AnimatedFormSection } from '@/components/ui/animated-form-section';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChildrenRepeater } from './ChildrenRepeater';

interface ContactFormProps {
  onSave: () => void;
  embedded?: boolean;
}

// Light theme input class
const lightInputClass = "w-full h-14 px-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 text-slate-800 placeholder-slate-400 transition-all duration-200";
const lightSelectClass = "w-full h-14 px-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 text-slate-800 appearance-none cursor-pointer transition-all duration-200";
const lightLabelClass = "text-sm font-medium text-slate-600 ml-1";
const lightButtonClass = "w-full h-14 px-4 flex items-center gap-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 text-slate-600 hover:text-slate-700 transition-all duration-200 text-left";

const ContactForm = ({
  onSave,
  embedded = false
}: ContactFormProps) => {
  const {
    formData,
    updateFormData,
    saveSection,
    updateFormProgress,
    generateChecklist,
    setCurrentStep,
    currentStep,
    taxYear
  } = useFormContext();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSection('contactInfo', currentContactData);
      updateFormData('contactInfo', currentContactData);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });
      
      if (!embedded) {
        setSearchParams({});
      } else {
        onSave();
      }
    } catch (error) {
      toast({
        title: t.forms.saveError,
        description: t.forms.saveErrorDescription,
        variant: "destructive"
      });
    }
  };

  const handleNext = async () => {
    try {
      await saveSection('contactInfo', currentContactData);
      updateFormData('contactInfo', currentContactData);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });
      setCurrentStep(1);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
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
    setCurrentStep(-1);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const renderContactForm = () => (
    <div className="min-h-screen bg-white text-slate-800 antialiased flex justify-center selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="min-h-screen md:max-w-2xl w-full max-w-[500px] mr-auto ml-auto relative flex flex-col px-6 md:px-8 py-8 md:py-12">
        {/* Main Content */}
        <div className="relative z-20 w-full flex-1 flex flex-col">
          
          {/* Header / Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => embedded ? handleBack() : setSearchParams({})}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </button>
            <h1 className="font-semibold text-lg tracking-tight text-slate-800">Kontaktdaten</h1>
            <div className="w-9"></div>
          </div>

          {/* Progress Bar */}
          <div className="grid grid-cols-4 gap-2 mb-10">
            <div className="h-1 rounded-full bg-[#1D64FF]"></div>
            <div className="h-1 rounded-full bg-slate-200"></div>
            <div className="h-1 rounded-full bg-slate-200"></div>
            <div className="h-1 rounded-full bg-slate-200"></div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-6 flex-1">
            <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Persönliche Daten</h2>

            {/* Name Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className={lightLabelClass}>Vorname</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Vorname" 
                  className={lightInputClass}
                />
              </div>
              <div className="space-y-2">
                <label className={lightLabelClass}>Nachname</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nachname" 
                  className={lightInputClass}
                />
              </div>
            </div>

            {/* Birth Date */}
            <div className="space-y-2">
              <MobileFriendlyDateInput
                id="birthDate"
                value={birthDate}
                onChange={setBirthDate}
                label="Geburtsdatum"
                defaultYear={1990}
                required
              />
            </div>

            {/* Religion */}
            <div className="space-y-2">
              <label className={lightLabelClass}>Religion</label>
              <div className="relative">
                <select 
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className={cn(lightSelectClass, !religion && "text-slate-400")}
                >
                  <option value="" className="bg-white">Religion auswählen</option>
                  <option value="catholic" className="bg-white">Katholisch</option>
                  <option value="reformed" className="bg-white">Reformiert</option>
                  <option value="christCatholic" className="bg-white">Christkatholisch</option>
                  <option value="other" className="bg-white">Andere</option>
                  <option value="none" className="bg-white">Keine</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Zivilstand */}
            <div className="space-y-2">
              <label className={lightLabelClass}>Zivilstand</label>
              <div className="relative">
                <select 
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className={cn(lightSelectClass, !maritalStatus && "text-slate-400")}
                >
                  <option value="" className="bg-white">Zivilstand</option>
                  <option value="single" className="bg-white">Ledig</option>
                  <option value="married" className="bg-white">Verheiratet</option>
                  <option value="divorced" className="bg-white">Geschieden</option>
                  <option value="widowed" className="bg-white">Verwitwet</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Spouse Section - Conditional */}
            {maritalStatus === 'married' && (
              <div className="space-y-6 pt-4 border-t border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Ehepartner/in</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className={lightLabelClass}>Vorname Ehepartner/in</label>
                    <input 
                      type="text" 
                      value={spouseFirstName}
                      onChange={(e) => setSpouseFirstName(e.target.value)}
                      placeholder="Vorname" 
                      className={lightInputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={lightLabelClass}>Nachname Ehepartner/in</label>
                    <input 
                      type="text" 
                      value={spouseLastName}
                      onChange={(e) => setSpouseLastName(e.target.value)}
                      placeholder="Nachname" 
                      className={lightInputClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={lightLabelClass}>Religion Ehepartner/in</label>
                  <div className="relative">
                    <select 
                      value={spouseReligion}
                      onChange={(e) => setSpouseReligion(e.target.value)}
                      className={cn(lightSelectClass, !spouseReligion && "text-slate-400")}
                    >
                      <option value="" className="bg-white">Religion auswählen</option>
                      <option value="catholic" className="bg-white">Katholisch</option>
                      <option value="reformed" className="bg-white">Reformiert</option>
                      <option value="christCatholic" className="bg-white">Christkatholisch</option>
                      <option value="other" className="bg-white">Andere</option>
                      <option value="none" className="bg-white">Keine</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
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

            {/* Address Section */}
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Adresse</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className={lightLabelClass}>Strasse</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Musterstrasse" 
                    className={lightInputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className={lightLabelClass}>Nr.</label>
                  <input 
                    type="text" 
                    value={adressnummer}
                    onChange={(e) => setAdressnummer(e.target.value)}
                    placeholder="123" 
                    className={lightInputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={lightLabelClass}>PLZ</label>
                  <input 
                    type="text" 
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="8001" 
                    className={lightInputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className={lightLabelClass}>Stadt</label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Zürich" 
                    className={lightInputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={lightLabelClass}>Kanton</label>
                <div className="relative">
                  <select 
                    value={kanton}
                    onChange={(e) => setKanton(e.target.value)}
                    className={cn(lightSelectClass, !kanton && "text-slate-400")}
                  >
                    <option value="" className="bg-white">Kanton auswählen</option>
                    <option value="ag" className="bg-white">Aargau</option>
                    <option value="zh" className="bg-white">Zürich</option>
                    <option value="be" disabled className="bg-white text-slate-400">Bern - noch nicht verfügbar</option>
                    <option value="lu" disabled className="bg-white text-slate-400">Luzern - noch nicht verfügbar</option>
                    <option value="ur" disabled className="bg-white text-slate-400">Uri - noch nicht verfügbar</option>
                    <option value="sz" disabled className="bg-white text-slate-400">Schwyz - noch nicht verfügbar</option>
                    <option value="ow" disabled className="bg-white text-slate-400">Obwalden - noch nicht verfügbar</option>
                    <option value="nw" disabled className="bg-white text-slate-400">Nidwalden - noch nicht verfügbar</option>
                    <option value="gl" disabled className="bg-white text-slate-400">Glarus - noch nicht verfügbar</option>
                    <option value="zg" disabled className="bg-white text-slate-400">Zug - noch nicht verfügbar</option>
                    <option value="fr" disabled className="bg-white text-slate-400">Freiburg - noch nicht verfügbar</option>
                    <option value="so" disabled className="bg-white text-slate-400">Solothurn - noch nicht verfügbar</option>
                    <option value="bs" disabled className="bg-white text-slate-400">Basel-Stadt - noch nicht verfügbar</option>
                    <option value="bl" disabled className="bg-white text-slate-400">Basel-Landschaft - noch nicht verfügbar</option>
                    <option value="sh" disabled className="bg-white text-slate-400">Schaffhausen - noch nicht verfügbar</option>
                    <option value="ar" disabled className="bg-white text-slate-400">Appenzell Ausserrhoden - noch nicht verfügbar</option>
                    <option value="ai" disabled className="bg-white text-slate-400">Appenzell Innerrhoden - noch nicht verfügbar</option>
                    <option value="sg" disabled className="bg-white text-slate-400">St. Gallen - noch nicht verfügbar</option>
                    <option value="gr" disabled className="bg-white text-slate-400">Graubünden - noch nicht verfügbar</option>
                    <option value="tg" disabled className="bg-white text-slate-400">Thurgau - noch nicht verfügbar</option>
                    <option value="ti" disabled className="bg-white text-slate-400">Tessin - noch nicht verfügbar</option>
                    <option value="vd" disabled className="bg-white text-slate-400">Waadt - noch nicht verfügbar</option>
                    <option value="vs" disabled className="bg-white text-slate-400">Wallis - noch nicht verfügbar</option>
                    <option value="ne" disabled className="bg-white text-slate-400">Neuenburg - noch nicht verfügbar</option>
                    <option value="ge" disabled className="bg-white text-slate-400">Genf - noch nicht verfügbar</option>
                    <option value="ju" disabled className="bg-white text-slate-400">Jura - noch nicht verfügbar</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* End Year Address Checkbox */}
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <label 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setHadDifferentAddressEnd(!hadDifferentAddressEnd)}
              >
                <div className={cn(
                  "w-5 h-5 rounded border transition-all flex items-center justify-center",
                  hadDifferentAddressEnd 
                    ? "bg-[#1D64FF] border-[#1D64FF]" 
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                )}>
                  {hadDifferentAddressEnd && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600">Per 31.12.{taxYear} hatte ich eine andere Wohnadresse</span>
              </label>

              {hadDifferentAddressEnd && (
                <div className="space-y-6 pl-8">
                  <h3 className="text-lg font-medium text-slate-800">Adresse per 31.12.{taxYear}</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <label className={lightLabelClass}>Strasse</label>
                      <input 
                        type="text" 
                        value={endYearAddress}
                        onChange={(e) => setEndYearAddress(e.target.value)}
                        placeholder="Musterstrasse" 
                        className={lightInputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={lightLabelClass}>Nr.</label>
                      <input 
                        type="text" 
                        value={endYearAdressnummer}
                        onChange={(e) => setEndYearAdressnummer(e.target.value)}
                        placeholder="123" 
                        className={lightInputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={lightLabelClass}>PLZ</label>
                      <input 
                        type="text" 
                        value={endYearPostalCode}
                        onChange={(e) => setEndYearPostalCode(e.target.value)}
                        placeholder="8001" 
                        className={lightInputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={lightLabelClass}>Stadt</label>
                      <input 
                        type="text" 
                        value={endYearCity}
                        onChange={(e) => setEndYearCity(e.target.value)}
                        placeholder="Zürich" 
                        className={lightInputClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={lightLabelClass}>Kanton</label>
                    <div className="relative">
                      <select 
                        value={endYearKanton}
                        onChange={(e) => setEndYearKanton(e.target.value)}
                        className={cn(lightSelectClass, !endYearKanton && "text-slate-400")}
                      >
                        <option value="" className="bg-white">Kanton auswählen</option>
                        <option value="zh" className="bg-white">Zürich</option>
                        <option value="ag" className="bg-white">Aargau</option>
                        <option value="zg" className="bg-white">Zug</option>
                        <option value="sz" className="bg-white">Schwyz</option>
                        <option value="be" className="bg-white">Bern</option>
                        <option value="lu" className="bg-white">Luzern</option>
                        <option value="ur" className="bg-white">Uri</option>
                        <option value="ow" className="bg-white">Obwalden</option>
                        <option value="nw" className="bg-white">Nidwalden</option>
                        <option value="gl" className="bg-white">Glarus</option>
                        <option value="fr" className="bg-white">Freiburg</option>
                        <option value="so" className="bg-white">Solothurn</option>
                        <option value="bs" className="bg-white">Basel-Stadt</option>
                        <option value="bl" className="bg-white">Basel-Landschaft</option>
                        <option value="sh" className="bg-white">Schaffhausen</option>
                        <option value="ar" className="bg-white">Appenzell Ausserrhoden</option>
                        <option value="ai" className="bg-white">Appenzell Innerrhoden</option>
                        <option value="sg" className="bg-white">St. Gallen</option>
                        <option value="gr" className="bg-white">Graubünden</option>
                        <option value="tg" className="bg-white">Thurgau</option>
                        <option value="ti" className="bg-white">Tessin</option>
                        <option value="vd" className="bg-white">Waadt</option>
                        <option value="vs" className="bg-white">Wallis</option>
                        <option value="ne" className="bg-white">Neuenburg</option>
                        <option value="ge" className="bg-white">Genf</option>
                        <option value="ju" className="bg-white">Jura</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Services */}
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Besondere Dienste</h2>
              
              <label 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setFirefighterService(!firefighterService)}
              >
                <div className={cn(
                  "w-5 h-5 rounded border transition-all flex items-center justify-center",
                  firefighterService 
                    ? "bg-[#1D64FF] border-[#1D64FF]" 
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                )}>
                  {firefighterService && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600">{t.contact.firefighterService}</span>
              </label>
            </div>

            {/* Children Section */}
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Kinder</h2>
              
              <label 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setHasChildren(!hasChildren)}
              >
                <div className={cn(
                  "w-5 h-5 rounded border transition-all flex items-center justify-center",
                  hasChildren 
                    ? "bg-[#1D64FF] border-[#1D64FF]" 
                    : "border-slate-300 bg-white group-hover:border-slate-400"
                )}>
                  {hasChildren && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600">{t.contact.hasChildren}</span>
              </label>

              {hasChildren && (
                <div className="pl-8">
                  <ChildrenRepeater
                    children={children}
                    onChange={setChildren}
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="mt-12 flex gap-3 pb-8">
              <button 
                type="button"
                onClick={() => embedded ? handleBack() : setSearchParams({})}
                className="px-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-2xl py-3.5 text-sm font-medium transition-all"
              >
                Zurück
              </button>
              
              <button 
                type={embedded ? "button" : "submit"}
                onClick={embedded ? handleNext : undefined}
                className="flex-1 bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white rounded-2xl py-3.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                {embedded ? 'Weiter' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return renderContactForm();
  }

  return (
    <Card className="w-full bg-transparent border-0">
      <CardContent className="p-0">
        {renderContactForm()}
      </CardContent>
    </Card>
  );
};

export default ContactForm;
