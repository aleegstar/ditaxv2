import React from 'react';
import { usePriceCalculator } from '@/hooks/usePriceCalculator';
import { StepNavigation } from './StepNavigation';
import { QuestionsStep } from './QuestionsStep';
import { ResultStep } from './ResultStep';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

export const PriceCalculatorFlow = () => {
  const {
    started,
    currentStep,
    currentSection,
    progress,
    answers,
    repeaterCounts,
    priceBreakdown,
    goToNextStep,
    goToPrevStep,
    handleAnswer,
    handleRepeaterCount,
    isComplete,
    startCalculator
  } = usePriceCalculator();

  const sectionTitles = {
    income: 'Einkommen',
    assets: 'Vermögen', 
    deductions: 'Abzüge'
  };

  // Show start screen if not started
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-none border-0 bg-white">
          <CardContent className="p-8 lg:p-12">
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[#1d64ff]/10 rounded-full flex items-center justify-center">
                  <Calculator className="w-8 h-8 text-[#1d64ff]" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Preisrechner
                </h1>
                <p className="text-gray-600 text-base lg:text-lg">
                  Berechnen Sie schnell und einfach den Preis für Ihre Steuererklärung
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={startCalculator}
                  className="w-full"
                >
                  Jetzt Preis berechnen
                </Button>
              </div>

              <p className="text-xs text-gray-500 pt-4">
                Die Berechnung dauert nur wenige Minuten
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Schritt {currentStep} von 4</span>
          <span>{Math.round(progress)}% abgeschlossen</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <Card className="shadow-none border-0 bg-white">
        <CardContent className="p-8">
          {!isComplete ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {sectionTitles[currentSection as keyof typeof sectionTitles]}
                </h2>
                <p className="text-gray-600">
                  Beantworten Sie die folgenden Fragen zu Ihrem {sectionTitles[currentSection as keyof typeof sectionTitles].toLowerCase()}
                </p>
              </div>

              <QuestionsStep
                section={currentSection}
                answers={answers}
                repeaterCounts={repeaterCounts}
                onAnswer={handleAnswer}
                onRepeaterCount={handleRepeaterCount}
              />
            </>
          ) : (
            <ResultStep priceBreakdown={priceBreakdown} />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      {!isComplete && (
        <StepNavigation
          canGoBack={currentStep > 1}
          onNext={goToNextStep}
          onBack={goToPrevStep}
        />
      )}
    </div>
  );
};