import React, { useState, useEffect } from 'react';
import { useFormContext } from '../contexts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import MultiStepContactForm from './forms/MultiStepContactForm';
import IncomeForm from './forms/IncomeForm';
import AssetsForm from './forms/AssetsForm';
import DeductionsForm from './forms/DeductionsForm';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

const SectionBasedChatForm = () => {
  const { t } = useI18n();
  
  const SECTIONS = [
    { id: 'contactInfo', title: t.taxReturn.dashboard.sections.contact, component: MultiStepContactForm },
    { id: 'income', title: t.taxReturn.dashboard.sections.income, component: IncomeForm },
    { id: 'assets', title: t.taxReturn.dashboard.sections.assets, component: AssetsForm },
    { id: 'deductions', title: t.taxReturn.dashboard.sections.deductions, component: DeductionsForm }
  ];

  const { 
    currentStep, 
    setCurrentStep, 
    formProgress, 
    calculateProgress, 
    formDataLoaded, 
    isDataLoading, 
    isSwitchingTaxYear,
    taxYear
  } = useFormContext();
  
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Initialize section from currentStep
  useEffect(() => {
    if (formDataLoaded && !isDataLoading && !isSwitchingTaxYear) {
      setCurrentSectionIndex(Math.max(0, currentStep));
    }
  }, [formDataLoaded, isDataLoading, isSwitchingTaxYear, currentStep]);

  // Show loading state
  if (!formDataLoaded || isDataLoading || isSwitchingTaxYear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-lg">
            {isSwitchingTaxYear 
              ? `${t.common.loading} ${taxYear}...`
              : t.common.loading
            }
          </p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentSectionIndex < SECTIONS.length - 1) {
      const nextIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIndex);
      setCurrentStep(nextIndex);
    }
  };

  const handleBack = () => {
    if (currentSectionIndex > 0) {
      const prevIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(prevIndex);
      setCurrentStep(prevIndex);
    }
  };

  const handleSectionClick = (index: number) => {
    setCurrentSectionIndex(index);
    setCurrentStep(index);
  };

  const handleSectionSave = () => {
    // Section saved - move to next section automatically
    handleNext();
  };

  const currentSection = SECTIONS[currentSectionIndex];
  const CurrentFormComponent = currentSection?.component;
  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm">Fortschritt - {t.taxReturn.year} {taxYear}</span>
            <span className="text-white text-sm">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Section Navigation */}
        <div className="mb-8">
          <div className="flex space-x-2 overflow-x-auto">
            {SECTIONS.map((section, index) => {
              // Define gradient colors for each section
              const gradients = [
                'linear-gradient(to bottom right, #10b981, #059669)', // Green for contactInfo
                'linear-gradient(to bottom right, #1d64ff, #1d64ff)', // Blue for income  
                'linear-gradient(to bottom right, #8b5cf6, #7c3aed)', // Purple for assets
                'linear-gradient(to bottom right, #f59e0b, #d97706)', // Orange for deductions
              ];
              
              return (
                <Button
                  key={section.id}
                  variant="ghost"
                  onClick={() => handleSectionClick(index)}
                  className={`whitespace-nowrap border-0 relative overflow-hidden text-white font-medium hover:scale-105 transition-all duration-200 ${
                    index === currentSectionIndex ? 'ring-2 ring-white/30' : ''
                  }`}
                  style={{ 
                    background: gradients[index] || gradients[0],
                    backgroundImage: 'url(/lovable-uploads/61eae696-6f20-471f-8b27-807ee369094d.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundBlendMode: 'overlay'
                  }}
                >
                  {section.title}
                  {formProgress[section.id as keyof typeof formProgress] && (
                    <span className="ml-2 text-white">✓</span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Current Form Section */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">
              {currentSection?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {CurrentFormComponent && (
              <CurrentFormComponent 
                onSave={handleSectionSave}
                embedded={true}
              />
            )}
            
            {/* Navigation Buttons - Only show for non-contact sections */}
            {currentSectionIndex > 0 && (
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {t.common.back}
                </Button>
                
                <Button
                  onClick={handleNext}
                  disabled={currentSectionIndex === SECTIONS.length - 1}
                  className="bg-white text-blue-900 hover:bg-white/90 disabled:opacity-50"
                >
                  {t.common.continue}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SectionBasedChatForm;