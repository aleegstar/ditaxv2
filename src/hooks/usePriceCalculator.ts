import { useState, useMemo } from 'react';
import { calculatePrice, PriceBreakdown } from '@/utils/priceCalculator';
import { getQuestionsForSection } from '@/config/yesNoQuestions';
import { FormData } from '@/types';
import { SimplifiedFormData } from '@/types/priceCalculator';

interface PriceCalculatorState {
  started: boolean;
  currentStep: number;
  currentSection: 'income' | 'assets' | 'deductions';
  answers: Record<string, boolean>;
  repeaterCounts: Record<string, number>;
}

export const usePriceCalculator = () => {
  const [state, setState] = useState<PriceCalculatorState>({
    started: false,
    currentStep: 1,
    currentSection: 'income',
    answers: {},
    repeaterCounts: {}
  });

  const sections: Array<'income' | 'assets' | 'deductions'> = ['income', 'assets', 'deductions'];
  
  // Calculate progress based on completed sections and current progress within section
  const progress = useMemo(() => {
    const sectionIndex = sections.indexOf(state.currentSection);
    const baseProgress = (sectionIndex / sections.length) * 100;
    
    if (state.currentStep === 4) return 100; // Results step
    
    const currentQuestions = getQuestionsForSection(state.currentSection).questions;
    const answeredQuestions = currentQuestions.filter(q => state.answers[q.id] !== undefined).length;
    const sectionProgress = (answeredQuestions / currentQuestions.length) * (100 / sections.length);
    
    return Math.min(baseProgress + sectionProgress, 95); // Max 95% until results
  }, [state.currentStep, state.currentSection, state.answers]);

  // Convert answers to mock FormData format for price calculation
  const formData = useMemo((): FormData => {
    // Create mock FormData that matches the structure expected by calculatePrice
    const mockFormData: any = {
      contactInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        city: '',
        canton: '',
        adressnummer: '',
        kanton: '',
        birthDate: '',
        religion: '',
        zivilstand: '',
        steuerart: '',
        steuerpflichtigVon: '',
        steuerpflichtigBis: '',
        bemerkungen: '',
        bankverbindung: '',
        iban: '',
        children: []
      },
      income: {},
      assets: {},
      deductions: {}
    };

    // Filter answers by section and apply to mock data
    getQuestionsForSection('income').questions.forEach(q => {
      if (state.answers[q.id] !== undefined) {
        mockFormData.income[q.id] = state.answers[q.id];
      }
    });

    getQuestionsForSection('assets').questions.forEach(q => {
      if (state.answers[q.id] !== undefined) {
        mockFormData.assets[q.id] = state.answers[q.id];
      }
    });

    getQuestionsForSection('deductions').questions.forEach(q => {
      if (state.answers[q.id] !== undefined) {
        mockFormData.deductions[q.id] = state.answers[q.id];
      }
    });

    // Add repeater arrays based on counts
    mockFormData.income.employers = Array(state.repeaterCounts.hasSalary || 0).fill({});
    mockFormData.assets.vehicles = Array(state.repeaterCounts.hasVehicle || 0).fill({});
    mockFormData.assets.properties = Array(state.repeaterCounts.hasProperty || 0).fill({});
    mockFormData.assets.debts = Array(state.repeaterCounts.hasDebt || 0).fill({});
    mockFormData.deductions.supportedPersons = Array(state.repeaterCounts.hasSupportedPersons || 0).fill({});

    return mockFormData as FormData;
  }, [state.answers, state.repeaterCounts]);

  const priceBreakdown = useMemo((): PriceBreakdown => {
    return calculatePrice(formData, false);
  }, [formData]);

  const isComplete = state.currentStep === 4;

  const goToNextStep = () => {
    if (state.currentStep < 3) {
      const nextSectionIndex = sections.indexOf(state.currentSection) + 1;
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        currentSection: sections[nextSectionIndex]
      }));
    } else {
      // Go to results
      setState(prev => ({ ...prev, currentStep: 4 }));
    }
  };

  const goToPrevStep = () => {
    if (state.currentStep > 1) {
      const prevSectionIndex = sections.indexOf(state.currentSection) - 1;
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        currentSection: sections[prevSectionIndex]
      }));
    }
  };

  const handleAnswer = (questionId: string, answer: boolean) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer
      }
    }));
  };

  const handleRepeaterCount = (questionId: string, count: number) => {
    setState(prev => ({
      ...prev,
      repeaterCounts: {
        ...prev.repeaterCounts,
        [questionId]: count
      }
    }));
  };

  const startCalculator = () => {
    setState(prev => ({ ...prev, started: true }));
  };

  return {
    started: state.started,
    currentStep: state.currentStep,
    currentSection: state.currentSection,
    progress,
    answers: state.answers,
    repeaterCounts: state.repeaterCounts,
    priceBreakdown,
    isComplete,
    goToNextStep,
    goToPrevStep,
    handleAnswer,
    handleRepeaterCount,
    startCalculator
  };
};