import React, { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useFormContext } from '@/contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { YesNoQuestion } from './YesNoQuestion';
import { RepeaterStep } from './RepeaterStep';
import { MultiStepProgress } from './MultiStepProgress';
import { FormSummary } from './FormSummary';
import { getQuestionsForSection } from '@/config/yesNoQuestions';
import { MultiStepFormState, FormSummaryItem } from '@/types/multiStepYesNo';
import { useNavigate } from 'react-router-dom';
import { androidDebug } from '@/utils/androidDebug';
import { NativeErrorMonitor } from '@/utils/nativeErrorMonitor';
import { Capacitor } from '@capacitor/core';
import { isAndroidEnvironment } from '@/utils/platform';
import { useI18n } from '@/contexts/I18nContext';

interface MultiStepYesNoFormProps {
  section: 'income' | 'assets' | 'deductions';
  onComplete: () => void;
  onModeSwitch: () => void;
}

// Define state type for reducer
interface FormViewState {
  showRepeater: boolean;
  showSummary: boolean;
  isEditing: boolean;
  editingQuestionId: string | null;
}

// Define action types for reducer
type FormViewAction = 
  | { type: 'SET_SUMMARY'; show: boolean }
  | { type: 'SET_REPEATER'; show: boolean }
  | { type: 'START_EDITING'; questionId: string; questionIndex: number }
  | { type: 'COMPLETE_EDITING' }
  | { type: 'RESET_VIEW' };

// Reducer for managing view state
const formViewReducer = (state: FormViewState, action: FormViewAction): FormViewState => {
  console.log('FormView Action:', action.type, action);
  
  switch (action.type) {
    case 'SET_SUMMARY':
      return {
        ...state,
        showSummary: action.show,
        showRepeater: false,
        isEditing: false,
        editingQuestionId: null
      };
    case 'SET_REPEATER':
      return {
        ...state,
        showRepeater: action.show,
        showSummary: false
      };
    case 'START_EDITING':
      return {
        showRepeater: false,
        showSummary: false,
        isEditing: true,
        editingQuestionId: action.questionId
      };
    case 'COMPLETE_EDITING':
      return {
        ...state,
        showRepeater: false,
        showSummary: true,
        isEditing: false,
        editingQuestionId: null
      };
    case 'RESET_VIEW':
      return {
        showRepeater: false,
        showSummary: false,
        isEditing: false,
        editingQuestionId: null
      };
    default:
      return state;
  }
};

export const MultiStepYesNoForm: React.FC<MultiStepYesNoFormProps> = ({
  section,
  onComplete,
  onModeSwitch
}) => {
  const { 
    formData, 
    formProgress,
    questionProgress,
    updateFormData, 
    saveSection, 
    updateFormProgress, 
    updateQuestionProgress,
    generateChecklist,
    setCurrentStep,
    handleBack: contextHandleBack,
    taxYear
  } = useFormContext();
  const navigate = useNavigate();
  const { t } = useI18n();

  // Use Android environment detection for stable rendering
  const isAndroid = isAndroidEnvironment();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      NativeErrorMonitor.addBreadcrumb('navigation', `Enter ${section} form`);
    }
  }, [section]);

  const questionsConfig = getQuestionsForSection(section, t);
  const questions = questionsConfig.questions;

  const [formState, setFormState] = useState<MultiStepFormState>({
    currentQuestionIndex: 0,
    answers: {},
    repeaterData: {},
    isComplete: false,
    mode: 'yesno'
  });

  // Use reducer for view state management
  const [viewState, dispatchViewState] = useReducer(formViewReducer, {
    showRepeater: false,
    showSummary: false,
    isEditing: false,
    editingQuestionId: null
  });

  // Ref to track that initial data has been loaded for this section
  const dataLoadedForSectionRef = useRef<string | null>(null);
  
  // Ref to ensure initial check only runs once per section
  const initialCheckDoneRef = useRef(false);
  
  // Reset refs when section changes
  useEffect(() => {
    initialCheckDoneRef.current = false;
    dataLoadedForSectionRef.current = null;
  }, [section]);

  // Load existing data and answers - ONLY on initial mount or section change, never on formData updates
  useEffect(() => {
    // Only load once per section
    if (dataLoadedForSectionRef.current === section) {
      return;
    }

    console.log('Loading existing data for section:', section);
    dataLoadedForSectionRef.current = section;
    
    try {
      const existingData = formData[section] || {};
      const answers: Record<string, boolean> = {};
      const repeaterData: Record<string, any[]> = {};

      if (!questions || questions.length === 0) {
        console.warn('No questions available for section:', section);
        return;
      }

      questions.forEach((question, index) => {
        try {
          if (!question || !question.id) {
            console.warn(`Invalid question at index ${index}:`, question);
            return;
          }
          
          answers[question.id] = existingData[question.id] || false;
          
          if (question.requiresRepeater) {
            const dataKey = getRepeaterDataKey(question.id);
            if (dataKey) {
              repeaterData[question.id] = existingData[dataKey] || [];
            }
          }
        } catch (questionError) {
          console.error(`Error processing question ${question.id}:`, questionError);
        }
      });

      setFormState(prev => ({
        ...prev,
        answers,
        repeaterData
      }));
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }, [section, formData, questions]);

  // Handle initial position - only run once per section mount
  useEffect(() => {
    // Only run the initial check once per section
    if (initialCheckDoneRef.current) return;
    
    const sectionProgress = formProgress[section];
    const savedQuestionIndex = questionProgress[section];

    // Debug current state
    console.debug('MultiStepYesNoForm initial state check', {
      section,
      questionsLength: questions.length,
      savedQuestionIndex,
      sectionProgress,
    });

    // Mark as checked
    initialCheckDoneRef.current = true;

    // If section is completed, switch to expert mode immediately
    if (sectionProgress) {
      console.debug('Section completed previously. Switching to expert mode.', { section });
      onModeSwitch();
      return;
    }
    
    // Only set initial position if we have saved progress and are starting fresh
    const initialIndex = savedQuestionIndex !== undefined ? savedQuestionIndex : 0;
    setFormState(prev => ({ ...prev, currentQuestionIndex: initialIndex }));
    dispatchViewState({ type: 'RESET_VIEW' });
  }, [section, formProgress, questionProgress, questions.length, onModeSwitch]);

  // Effect to handle progress updates - only on actual question changes, not during editing or summary
  useEffect(() => {
    // Skip progress updates when in editing mode, summary mode, or when section is completed
    if (viewState.isEditing || viewState.showSummary || formProgress[section]) {
      return;
    }
    
    updateQuestionProgress(section, formState.currentQuestionIndex);
  }, [formState.currentQuestionIndex, section, updateQuestionProgress, viewState.isEditing, viewState.showSummary, formProgress]);

// Define function at module level to avoid TDZ issues
  function getRepeaterDataKey(questionId: string): string {
    const mapping: Record<string, string> = {
      'hasSalary': 'employers',
      'hasRental': 'rentalIncomes',
      'hasVehicle': 'vehicles',
      'hasProperty': 'properties',
      'hasDebt': 'debts'
    };
    return mapping[questionId] || questionId;
  }

  const currentQuestion = questions[formState.currentQuestionIndex];
  const isLastQuestion = formState.currentQuestionIndex === questions.length - 1;

  const handleAnswer = useCallback(async (answer: boolean) => {
    try {
      const question = questions[formState.currentQuestionIndex];
      
      if (Capacitor.isNativePlatform()) {
        androidDebug.log('handleAnswer called', { questionId: question?.id, answer, currentIndex: formState.currentQuestionIndex });
        NativeErrorMonitor.addBreadcrumb('user-action', `Answer question: ${question?.id} = ${answer}`);
      }
      
      if (!question) {
        console.error('handleAnswer: question is null at index', formState.currentQuestionIndex);
        if (Capacitor.isNativePlatform()) {
          androidDebug.criticalError('handleAnswer: question is null', { formState, questions });
        }
        return;
      }
      const qid = question.id;
      const hasRepeater = !!question.requiresRepeater;

      // Determine view change FIRST (synchronously) before async operations
      if (answer && hasRepeater) {
        if (Capacitor.isNativePlatform()) {
          NativeErrorMonitor.addBreadcrumb('navigation', `Open repeater for ${qid}`);
        }
        dispatchViewState({ type: 'SET_REPEATER', show: true });
      }

      const newAnswers = {
        ...formState.answers,
        [qid]: answer
      };

      setFormState(prev => ({
        ...prev,
        answers: newAnswers
      }));

      // No need to guard useEffect - it only runs once per section now

      // Save the answer (async, non-blocking for UI)
      try {
        const sectionData = { ...formData[section], [qid]: answer };
        updateFormData(section, sectionData);
        await saveSection(section, sectionData);
      } catch (saveError) {
        console.error('Error saving answer:', saveError);
      }

      // If NOT showing repeater, handle navigation
      if (!(answer && hasRepeater)) {
        if (viewState.isEditing) {
          handleEditingComplete();
        } else {
          handleContinue();
        }
      }
    } catch (error) {
      console.error('Error in handleAnswer:', error);
      if (Capacitor.isNativePlatform()) {
        androidDebug.criticalError('Error in handleAnswer', { error, formState });
      }
      
      toast({
        title: t.toasts.answerError,
        description: t.toasts.answerErrorDescription,
        variant: 'destructive'
      });
    }
  }, [formState.currentQuestionIndex, formState.answers, questions, viewState.isEditing, section, formData, updateFormData, saveSection, t]);

  const handleRepeaterDataChange = (data: any[]) => {
    if (!currentQuestion) return;
    const qid = currentQuestion.id;
    setFormState(prev => ({
      ...prev,
      repeaterData: {
        ...prev.repeaterData,
        [qid]: data
      }
    }));
  };

  const canContinueFromRepeater = (): boolean => {
    try {
      if (Capacitor.isNativePlatform()) {
        androidDebug.log('canContinueFromRepeater called', { currentQuestion: currentQuestion?.id });
      }
      
      if (!currentQuestion || !currentQuestion.requiresRepeater) return true;
      
      const qid = currentQuestion.id;
      const data = formState.repeaterData[qid] || [];
      const minEntries = currentQuestion.requiresRepeater.minimumEntries ?? 1;
      
      // Check if we have minimum entries and all entries have required fields
      const result = data.length >= minEntries && data.every(entry => {
        // Basic validation - ensure entry has some meaningful data
        return Object.values(entry).some(value => 
          value !== undefined && value !== null && value !== ''
        );
      });
      
      if (Capacitor.isNativePlatform()) {
        androidDebug.log('canContinueFromRepeater result', { result, dataLength: data.length, minEntries });
      }
      
      return result;
    } catch (error) {
      if (Capacitor.isNativePlatform()) {
        androidDebug.criticalError('Error in canContinueFromRepeater', { error, currentQuestion });
      }
      
      // Safe fallback - allow continuation if validation fails
      return true;
    }
  };

  const handleEditingComplete = useCallback(() => {
    console.log('Editing complete, returning to summary');
    
    // Exit editing mode and return to summary using reducer
    dispatchViewState({ type: 'COMPLETE_EDITING' });
    
    toast({
      title: t.toasts.changeSaved,
      description: t.toasts.changeSavedDescription,
    });
  }, []);

  const handleContinue = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        androidDebug.log('handleContinue called', { isLastQuestion, currentIndex: formState.currentQuestionIndex, isEditing: viewState.isEditing });
      }
      
      dispatchViewState({ type: 'SET_REPEATER', show: false });
      
      // No need to guard useEffect - it only runs once per section now
      
      // Save current repeater data if we have it
      if (currentQuestion?.requiresRepeater) {
        const qid = currentQuestion.id;
        const dataKey = getRepeaterDataKey(qid);
        const repeaterData = formState.repeaterData[qid] || [];
        
        if (dataKey && repeaterData.length > 0) {
          try {
            const sectionData = { ...formData[section], [dataKey]: repeaterData };
            updateFormData(section, sectionData);
            await saveSection(section, sectionData);
          } catch (saveError) {
            console.error('Error saving repeater data:', saveError);
          }
        }
      }
      
      // If in editing mode, return to summary instead of continuing
      if (viewState.isEditing) {
        handleEditingComplete();
        return;
      }
      
      if (isLastQuestion) {
        // After last question, save data and navigate back to form overview
        if (Capacitor.isNativePlatform()) {
          NativeErrorMonitor.addBreadcrumb('navigation', 'Complete yes/no questions - navigating back to form overview');
        }
        
        try {
          // Prepare and save all section data
          const sectionData: Record<string, any> = {
            _completed: true // Mark section as fully completed
          };
          
          questions.forEach((question) => {
            if (!question || !question.id) return;
            
            sectionData[question.id] = formState.answers?.[question.id] ?? false;
            
            if (question.requiresRepeater) {
              const dataKey = getRepeaterDataKey(question.id);
              if (dataKey) {
                sectionData[dataKey] = formState.repeaterData?.[question.id] || [];
              }
            }
          });

          // Update local state first
          updateFormData(section, sectionData);
          
          // Save to database
          await saveSection(section, sectionData);
          
          // Mark section as complete in progress
          updateFormProgress(section, true);

          // Navigate back to form overview (card selection)
          navigate(`/form?year=${taxYear}`);
        } catch (error) {
          console.error('Error saving section:', error);
          toast({
            title: t.toasts.saveError,
            description: t.toasts.saveErrorDescription,
            variant: 'destructive'
          });
        }
      } else {
        setFormState(prev => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1
        }));
      }
    } catch (error) {
      if (Capacitor.isNativePlatform()) {
        androidDebug.criticalError('Error in handleContinue', { error, formState, viewState });
      }
      
      // Graceful fallback
      toast({
        title: t.toasts.navigationError,
        description: t.toasts.navigationErrorDescription,
        variant: 'destructive'
      });
    }
  };

  const handleBack = () => {
    if (viewState.showSummary) {
      // If coming from summary while editing, exit editing mode
      if (viewState.isEditing) {
        dispatchViewState({ type: 'RESET_VIEW' });
      } else {
        dispatchViewState({ type: 'SET_SUMMARY', show: false });
      }
      return;
    }
    
    if (viewState.showRepeater) {
      dispatchViewState({ type: 'SET_REPEATER', show: false });
      return;
    }

    // If in editing mode, go back to summary instead of previous question
    if (viewState.isEditing) {
      handleEditingComplete();
      return;
    }

    if (formState.currentQuestionIndex > 0) {
      setFormState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    } else {
      // If at first question, go back to expert mode
      onModeSwitch();
    }
  };

  const handleHeaderBack = () => {
    // Navigate back to the main form (remove section parameter)
    navigate(`/form?year=${taxYear}`);
  };

  const getSectionTitle = () => {
    switch (section) {
      case 'income':
        return 'Einkommen';
      case 'assets':
        return 'Vermögen';
      case 'deductions':
        return 'Abzüge';
      default:
        return section;
    }
  };

  // Generate summary items for the FormSummary component
  const generateSummaryItems = useCallback((): FormSummaryItem[] => {
    return questions.map((question) => ({
      questionId: question.id,
      questionText: question.text,
      answer: formState.answers[question.id] || false,
      repeaterData: question.requiresRepeater ? formState.repeaterData[question.id] : undefined,
      repeaterTitle: question.requiresRepeater?.title
    }));
  }, [questions, formState.answers, formState.repeaterData]);

  // Handle editing from summary
  const handleEditFromSummary = useCallback((questionId: string) => {
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      setFormState(prev => ({
        ...prev,
        currentQuestionIndex: questionIndex
      }));
      dispatchViewState({ type: 'START_EDITING', questionId, questionIndex });
    }
  }, [questions]);

  // Handle confirm from summary - switch to expert mode
  const handleConfirmSummary = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        NativeErrorMonitor.addBreadcrumb('navigation', 'Summary confirmed - switching to expert mode');
      }

      toast({
        title: 'Fragen abgeschlossen',
        description: 'Wechsle zum Experten-Modus für detaillierte Eingaben.'
      });

      // Switch to expert mode
      onModeSwitch();
    } catch (error) {
      console.error('Error confirming summary:', error);
      toast({
        title: 'Fehler',
        description: 'Bitte versuche es erneut.',
        variant: 'destructive'
      });
    }
  }, [onModeSwitch]);

  // Render summary if showSummary is true
  if (viewState.showSummary && !viewState.isEditing) {
    const summaryItems = generateSummaryItems();
    
    return (
      <div className="min-h-screen bg-white text-slate-800 antialiased flex justify-center selection:bg-[#1D64FF]/30">
        <div className="h-screen md:max-w-4xl bg-white w-full max-w-4xl mr-auto ml-auto relative flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm shrink-0">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between relative">
              <button 
                onClick={() => dispatchViewState({ type: 'SET_SUMMARY', show: false })}
                className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 -ml-2"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.8} />
              </button>

              <h1 className="font-medium text-lg tracking-tight text-slate-800 leading-tight absolute left-1/2 -translate-x-1/2">
                {getSectionTitle()}
              </h1>

              <div className="w-10 h-10" />
            </div>
          </header>

          {/* Summary Content */}
          <div className="z-10 flex-1 flex flex-col px-6 pb-8 relative overflow-y-auto pt-4">
            <FormSummary
              title={getSectionTitle()}
              summaryItems={summaryItems}
              onEdit={handleEditFromSummary}
              onConfirm={handleConfirmSummary}
              onBack={() => dispatchViewState({ type: 'SET_SUMMARY', show: false })}
            />
          </div>

          {/* Footer Info */}
          <div className="absolute bottom-6 w-full text-center z-20 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-emerald-500"
              >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Verschlüsselt &amp; Sicher
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android-safe rendering without any framer-motion elements that could block touch events
  if (isAndroid) {
    return (
      <div className="min-h-screen bg-white text-slate-800 flex justify-center">
        <div className="h-screen md:max-w-4xl bg-white w-full max-w-4xl mr-auto ml-auto flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm shrink-0">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between relative">
              <button 
                onClick={handleHeaderBack}
                className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 -ml-2"
                style={{ touchAction: 'manipulation' }}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.8} />
              </button>
              <h1 className="font-medium text-lg tracking-tight text-slate-800 leading-tight absolute left-1/2 -translate-x-1/2">
                {getSectionTitle()}
              </h1>
              <div className="w-10 h-10" />
            </div>
          </header>

          {/* Main Content */}
          <div 
            className="flex-1 flex flex-col px-6 pb-8 overflow-y-auto pt-4"
            style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <MultiStepProgress
              currentStep={formState.currentQuestionIndex}
              totalSteps={questions.length}
              sectionTitle={getSectionTitle()}
            />

            {/* Resume Message */}
            {questionProgress[section] !== undefined && 
             questionProgress[section]! > 0 && 
             !viewState.showSummary && 
             formState.currentQuestionIndex !== questionProgress[section] && (
              <div className="mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#1D64FF] rounded-full" />
                    <div className="text-sm text-slate-600">
                      Du warst bei Frage {(questionProgress[section]! + 1)} von {questions.length}.
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={async () => {
                        await updateQuestionProgress(section, 0);
                        setFormState(prev => ({ ...prev, currentQuestionIndex: 0 }));
                        dispatchViewState({ type: 'RESET_VIEW' });
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                      style={{ touchAction: 'manipulation' }}
                    >
                      Neu beginnen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Editing Mode Indicator */}
            {viewState.isEditing && (
              <div className="mb-4">
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-orange-600">Bearbeitungsmodus:</span> Du bearbeitest diese Frage.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Question Content - no AnimatePresence, no motion */}
            {!currentQuestion ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                Keine Frage verfügbar. Bitte versuche es erneut.
              </div>
            ) : viewState.showRepeater ? (
              <RepeaterStep
                key="repeater"
                question={currentQuestion}
                data={formState.repeaterData[currentQuestion.id] || []}
                onDataChange={handleRepeaterDataChange}
                onContinue={handleContinue}
                canContinue={canContinueFromRepeater()}
              />
            ) : (
              <YesNoQuestion
                key={`${currentQuestion.id}-${viewState.isEditing ? 'editing' : 'normal'}-${viewState.editingQuestionId || 'none'}`}
                question={currentQuestion}
                answer={formState.answers[currentQuestion.id]}
                onAnswer={handleAnswer}
              />
            )}
          </div>

          {/* Footer Info - NOT absolute, just at the bottom */}
          <div className="py-4 text-center shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                Verschlüsselt &amp; Sicher
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Glass Card Container */}
      <div className="w-full max-w-md bg-background/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-border/40 overflow-hidden flex flex-col relative">
        
        {/* Header: Back + Progress */}
        <div className="px-6 sm:px-8 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={handleHeaderBack}
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl px-2 py-1 -ml-2 hover:bg-muted/50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" strokeWidth={2} />
              Zurück
            </button>
            <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
              {formState.currentQuestionIndex + 1} von {questions.length}
            </span>
          </div>

          {/* Progress Bar */}
          <MultiStepProgress
            currentStep={formState.currentQuestionIndex}
            totalSteps={questions.length}
            sectionTitle={getSectionTitle()}
          />
        </div>

        {/* Content Area */}
        <div className="px-6 sm:px-8 pb-6 flex-grow overflow-y-auto">
          {/* Resume Message */}
          {questionProgress[section] !== undefined && 
           questionProgress[section]! > 0 && 
           !viewState.showSummary && 
           formState.currentQuestionIndex !== questionProgress[section] && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <div className="text-sm text-muted-foreground">
                    Du warst bei Frage {(questionProgress[section]! + 1)} von {questions.length}.
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => {
                      await updateQuestionProgress(section, 0);
                      setFormState(prev => ({ ...prev, currentQuestionIndex: 0 }));
                      dispatchViewState({ type: 'RESET_VIEW' });
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl border border-border/50 bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
                  >
                    Neu beginnen
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Editing Mode Indicator */}
          {viewState.isEditing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <div className="bg-amber-50/60 border border-amber-200/40 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-amber-600">Bearbeitungsmodus:</span> Du bearbeitest diese Frage.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Question Content */}
          <AnimatePresence mode="wait">
            {!currentQuestion ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground py-12">
                Keine Frage verfügbar. Bitte versuche es erneut.
              </div>
            ) : viewState.showRepeater ? (
              <RepeaterStep
                key="repeater"
                question={currentQuestion}
                data={formState.repeaterData[currentQuestion.id] || []}
                onDataChange={handleRepeaterDataChange}
                onContinue={handleContinue}
                canContinue={canContinueFromRepeater()}
              />
            ) : (
              <YesNoQuestion
                key={`${currentQuestion.id}-${viewState.isEditing ? 'editing' : 'normal'}-${viewState.editingQuestionId || 'none'}`}
                question={currentQuestion}
                answer={formState.answers[currentQuestion.id]}
                onAnswer={handleAnswer}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground/60">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Deine Daten werden verschlüsselt übertragen.</span>
      </div>
    </div>
  );
};