import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useFormContext } from '@/contexts';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { CheckCircle, ArrowLeft, User, Briefcase, Calculator, Home } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { SubpageHeader } from '@/components/ui/subpage-header';
export const FormDataSummary: React.FC = () => {
  const {
    formData,
    updateFormProgress,
    formProgress,
    taxYear,
    saveSection
  } = useFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(false);
  const handleBack = () => {
    setSearchParams({});
  };
  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      // Save summary data with markComplete flag to properly persist status
      await saveSection('summary', {
        confirmed: true,
        confirmedAt: new Date().toISOString()
      }, true); // markComplete = true
      
      toast({
        title: "Angaben bestätigt",
        description: "Ihre Daten wurden erfolgreich bestätigt. Sie können nun mit den Unterlagen fortfahren."
      });

      // Navigate back to dashboard
      setSearchParams({});
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Beim Bestätigen der Angaben ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsConfirming(false);
    }
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Nicht angegeben';
    return new Date(dateString).toLocaleDateString('de-CH');
  };

  const formatReligion = (religion: string) => {
    const religionMap: Record<string, string> = {
      'catholic': 'Römisch-katholisch',
      'reformed': 'Reformiert',
      'christCatholic': 'Christkatholisch',
      'other': 'Andere',
      'none': 'Keine'
    };
    return religionMap[religion] || religion || 'Nicht angegeben';
  };
  const getIncomeTypes = () => {
    const incomeTypes = [];
    if (formData.income?.hasPension) incomeTypes.push('Renten aus Sozialversicherungen/Pensionskasse');
    if (formData.income?.hasGiftInheritance) incomeTypes.push('Schenkung oder Erbvorbezug');
    if (formData.income?.hasPensionPayout) incomeTypes.push('Kapitalauszahlung aus Säule 2/3');
    if (formData.income?.hasOtherIncome) incomeTypes.push('Weitere Einkommen');
    if (formData.income?.hasFreelance) incomeTypes.push('Selbständig erwerbend');
    if (formData.income?.hasSalary) incomeTypes.push('Arbeitnehmer');
    return incomeTypes.length > 0 ? incomeTypes : ['Keine Angaben'];
  };
  const getDeductionTypes = () => {
    const deductionTypes = [];
    if (formData.deductions?.hasPillar3a) deductionTypes.push('Säule 3a');
    if (formData.deductions?.hasBVGPurchase) deductionTypes.push('BVG-Einkäufe');
    if (formData.deductions?.hasEducationExpenses) deductionTypes.push('Aus- und Weiterbildungskosten');
    if (formData.deductions?.hasDonations) deductionTypes.push('Spenden');
    if (formData.deductions?.hasPropertyMaintenance) deductionTypes.push('Liegenschaftsunterhalt');
    if (formData.deductions?.hasSupportedPersons) deductionTypes.push('Unterstützte Personen');
    if (formData.deductions?.hasMaintenancePayments) deductionTypes.push('Unterhaltszahlungen');
    if (formData.deductions?.hasChildcare) deductionTypes.push('Kinderbetreuungskosten');
    if (formData.deductions?.hasOtherDeductions) deductionTypes.push('Andere Abzüge');
    return deductionTypes.length > 0 ? deductionTypes : ['Keine Angaben'];
  };
  const getAssetTypes = () => {
    const assetTypes = [];
    if (formData.assets?.hasVehicle) assetTypes.push('Fahrzeuge');
    if (formData.assets?.hasProperty) assetTypes.push('Immobilien');
    if (formData.assets?.hasMortgage) assetTypes.push('Hypotheken');
    if (formData.assets?.hasDebt) assetTypes.push('Schulden');
    if (formData.assets?.hasDepositAccount) assetTypes.push('Sparkonten');
    if (formData.assets?.hasCrypto) assetTypes.push('Kryptowährungen');
    if (formData.assets?.hasOtherAssets) assetTypes.push('Weitere Vermögenswerte');
    return assetTypes.length > 0 ? assetTypes : ['Keine Angaben'];
  };
  return <div className="min-h-screen bg-transparent">
      <SubpageHeader 
        title="Zusammenfassung"
        onBack={handleBack}
      />
      <div className="max-w-4xl mx-auto p-4">
        {/* Content */}
        <motion.div initial={{
        opacity: 0,
        y: -20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mb-8">
          <p className="text-gray-600 text-center">Überprüfe deine Angaben.</p>
        </motion.div>

        <div className="space-y-6">
          {/* Contact Information */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }}>
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Kontaktangaben
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Adressnummer</p>
                    <p className="text-gray-900">{formData.contactInfo?.adressnummer || 'Nicht angegeben'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-gray-900">
                      {formData.contactInfo?.firstName} {formData.contactInfo?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Geburtsdatum</p>
                    <p className="text-gray-900">{formatDate(formData.contactInfo?.birthDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Religion</p>
                    <p className="text-gray-900">{formatReligion(formData.contactInfo?.religion)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Zivilstand</p>
                    <p className="text-gray-900">{formData.contactInfo?.maritalStatus || 'Nicht angegeben'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Feuerwehrdienst</p>
                    <p className="text-gray-900">{formData.contactInfo?.firefighterService ? 'Ja' : 'Nein'}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Adresse</p>
                    <p className="text-gray-900">
                      {(() => {
                      const address = formData.contactInfo?.address;
                      if (typeof address === 'object' && address && 'address' in address) {
                        const addrObj = address as {
                          address: string;
                          postalCode: string;
                          city: string;
                        };
                        return `${addrObj.address}, ${addrObj.postalCode} ${addrObj.city}, ${formData.contactInfo?.kanton || ''}`;
                      }
                      return `${address || 'Nicht angegeben'}, ${formData.contactInfo?.kanton || ''}`;
                    })()}
                    </p>
                  </div>
                  {formData.contactInfo?.maritalStatus === 'verheiratet' && <div>
                      <p className="text-sm font-medium text-gray-700">Ehepartner/in</p>
                      <p className="text-gray-900">
                        {formData.contactInfo?.spouseFirstName} {formData.contactInfo?.spouseLastName}
                        {formData.contactInfo?.spouseReligion && ` (${formatReligion(formData.contactInfo.spouseReligion)})`}
                      </p>
                    </div>}
                </div>
                {formData.contactInfo?.hasChildren && formData.contactInfo?.children?.length > 0 && <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Kinder</p>
                      <div className="space-y-1">
                        {formData.contactInfo.children.map((child: any, index: number) => <p key={index} className="text-gray-900 text-sm">
                            {child.firstName} {child.lastName} ({formatDate(child.birthDate)})
                            {child.schoolLevel && ` - ${child.schoolLevel}`}
                          </p>)}
                      </div>
                    </div>
                  </>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Income */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }}>
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black">
                  <Briefcase className="w-5 h-5 mr-2 text-indigo-600" />
                  Einkommen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Einkommensarten</p>
                  <div className="space-y-1">
                    {getIncomeTypes().map((type, index) => <p key={index} className="text-gray-900 text-sm">• {type}</p>)}
                  </div>
                </div>
                {formData.income?.hasSalary && formData.income?.employers?.length > 0 && <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Arbeitgeber</p>
                      <div className="space-y-2">
                        {formData.income.employers.map((employer: any, index: number) => <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                            <p><strong>Arbeitsort:</strong> {employer.workLocation}</p>
                            <p><strong>Pensum:</strong> {employer.workload}%</p>
                            <p><strong>Arbeitsweg:</strong> {employer.commute === 'public' ? 'ÖV' : employer.commute === 'publicBike' ? 'ÖV und Fahrrad' : employer.commute === 'bike' ? 'Fahrrad' : 'Auto/Motorrad'}</p>
                          </div>)}
                      </div>
                    </div>
                  </>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Deductions */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.3
        }}>
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black">
                  <Calculator className="w-5 h-5 mr-2 text-orange-600" />
                  Abzüge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Abzugsarten</p>
                  <div className="space-y-1">
                    {getDeductionTypes().map((type, index) => <p key={index} className="text-gray-900 text-sm">• {type}</p>)}
                  </div>
                </div>
                {formData.deductions?.hasOtherDeductions && formData.deductions?.otherDeductions && <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Andere Abzüge</p>
                      <p className="text-gray-900 text-sm">{formData.deductions.otherDeductions}</p>
                    </div>
                  </>}
                {formData.deductions?.hasSupportedPersons && formData.deductions?.supportedPersons?.length > 0 && <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Unterstützte Personen</p>
                      <div className="space-y-1">
                        {formData.deductions.supportedPersons.map((person: any, index: number) => <p key={index} className="text-gray-900 text-sm bg-gray-50 p-2 rounded">
                            {person.firstName} {person.lastName} ({formatDate(person.birthDate)})
                            {person.supportAmount && ` - CHF ${person.supportAmount}`}
                          </p>)}
                      </div>
                    </div>
                  </>}
                {formData.deductions?.hasMaintenancePayments && formData.deductions?.maintenancePayments?.length > 0 && <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Unterhaltszahlungen</p>
                      <div className="space-y-1">
                        {formData.deductions.maintenancePayments.map((payment: any, index: number) => <p key={index} className="text-gray-900 text-sm bg-gray-50 p-2 rounded">
                            {payment.recipient} - CHF {payment.amount} ({payment.type})
                          </p>)}
                      </div>
                    </div>
                  </>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Assets */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.4
        }}>
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black">
                  <Home className="w-5 h-5 mr-2 text-emerald-600" />
                  Vermögen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Vermögensarten</p>
                  <div className="space-y-1">
                    {getAssetTypes().map((type, index) => <p key={index} className="text-gray-900 text-sm">• {type}</p>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Confirmation Button */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.5
        }} className="pt-6">
            {formProgress.summary ? <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-green-800 font-medium">
                  ✓ Angaben bereits bestätigt für {taxYear}
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Sie können nun Unterlagen hochladen oder weitere Änderungen vornehmen.
                </p>
              </div> : <Button 
                onClick={handleConfirm} 
                disabled={isConfirming} 
                className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200"
                style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
              >
                {isConfirming ? "Wird bestätigt..." : "Angaben bestätigen"}
              </Button>}
          </motion.div>
        </div>
      </div>
    </div>;
};