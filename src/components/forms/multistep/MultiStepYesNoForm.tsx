import React, { useState, useEffect, useMemo, useCallback, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useFormContext } from '@/contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { YesNoQuestion } from './YesNoQuestion';
import { RepeaterStep } from './RepeaterStep';
import { FormSummary } from './FormSummary';
import { MultiStepProgress } from './MultiStepProgress';
import { getQuestionsForSection } from '@/config/yesNoQuestions';
import { MultiStepFormState, FormSummaryItem } from '@/types/multiStepYesNo';
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { androidDebug } from '@/utils/androidDebug';
import { NativeErrorMonitor } from '@/utils/nativeErrorMonitor';
import { Capacitor } from '@capacitor/core';
import { isAndroidEnvironment } from '@/utils/platform';

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
    handleBack: contextHandleBack
  } = useFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Use Android environment detection for stable rendering
  const isAndroid = isAndroidEnvironment();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      NativeErrorMonitor.addBreadcrumb('navigation', `Enter ${section} form`);
    }
  }, [section]);

  const questionsConfig = getQuestionsForSection(section);
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

  // Load existing data and answers - only on section/formData changes
  useEffect(() => {
    console.log('Loading existing data for section:', section);
    
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

      console.log('Loaded answers:', answers);
      console.log('Loaded repeater data:', repeaterData);

      setFormState(prev => ({
        ...prev,
        answers,
        repeaterData
      }));
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }, [section, formData, questions]);

  // Handle initial position and summary state - only on section/formProgress changes  
  useEffect(() => {
    const sectionProgress = formProgress[section];
    const savedQuestionIndex = questionProgress[section];

    // Debug current state
    console.debug('MultiStepYesNoForm state', {
      section,
      questionsLength: questions.length,
      savedQuestionIndex,
      sectionProgress,
    });

    // If section is completed, go directly to summary
    if (sectionProgress) {
      console.debug('Section completed previously. Showing summary.', { section });
      dispatchViewState({ type: 'SET_SUMMARY', show: true });
      setFormState(prev => ({ ...prev, currentQuestionIndex: 0 }));
    } else {
      // Only set initial position if we have saved progress and are starting fresh
      const initialIndex = savedQuestionIndex !== undefined ? savedQuestionIndex : 0;
      setFormState(prev => ({ ...prev, currentQuestionIndex: initialIndex }));
      dispatchViewState({ type: 'RESET_VIEW' });
    }
  }, [section, formProgress]);

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
      if (Capacitor.isNativePlatform()) {
        androidDebug.log('handleAnswer called', { questionId: currentQuestion?.id, answer, currentIndex: formState.currentQuestionIndex });
        NativeErrorMonitor.addBreadcrumb('user-action', `Answer question: ${currentQuestion?.id} = ${answer}`);
      }
      
      if (!currentQuestion) {
        if (Capacitor.isNativePlatform()) {
          androidDebug.criticalError('handleAnswer: currentQuestion is null', { formState, questions });
        }
        return;
      }
      const qid = currentQuestion.id;

      const newAnswers = {
        ...formState.answers,
        [qid]: answer
      };

      setFormState(prev => ({
        ...prev,
        answers: newAnswers
      }));

      // Immediately save the answer
      try {
        const sectionData = { ...formData[section], [qid]: answer };
        updateFormData(section, sectionData);
        await saveSection(section, sectionData);
      } catch (saveError) {
        console.error('Error saving answer:', saveError);
      }

      // If answer is "Yes" and requires repeater, show repeater
      if (answer && currentQuestion.requiresRepeater) {
        if (Capacitor.isNativePlatform()) {
          NativeErrorMonitor.addBreadcrumb('navigation', `Open repeater for ${qid}`);
        }
        dispatchViewState({ type: 'SET_REPEATER', show: true });
      } else {
        // If in editing mode, complete editing
        if (viewState.isEditing) {
          handleEditingComplete();
        } else {
          // Move to next question or summary
          handleContinue();
        }
      }
    } catch (error) {
      if (Capacitor.isNativePlatform()) {
        androidDebug.criticalError('Error in handleAnswer', { error, currentQuestion, answer, formState });
      }
      
      // Graceful fallback - don't let the app crash
      toast({
        title: 'Fehler bei der Antwort',
        description: 'Bitte versuchen Sie es erneut.',
        variant: 'destructive'
      });
    }
  }, [formState.currentQuestionIndex, formState.answers, viewState.isEditing, section, formData, updateFormData, saveSection]);

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
      title: 'Änderung gespeichert',
      description: 'Deine Antwort wurde aktualisiert.',
    });
  }, []);

  const handleContinue = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        androidDebug.log('handleContinue called', { isLastQuestion, currentIndex: formState.currentQuestionIndex, isEditing: viewState.isEditing });
      }
      
      dispatchViewState({ type: 'SET_REPEATER', show: false });
      
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
        // After last question, save all data and navigate to /form
        if (Capacitor.isNativePlatform()) {
          NativeErrorMonitor.addBreadcrumb('navigation', 'Complete section and navigate to /form');
        }
        
        try {
          // Prepare and save all section data
          const sectionData: Record<string, any> = {};
          
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
          
          // Save to database with markComplete=true (this will also call updateFormProgress and generateChecklist internally)
          await saveSection(section, sectionData, true);

          toast({
            title: 'Erfolgreich gespeichert',
            description: `${section.charAt(0).toUpperCase() + section.slice(1)} wurde erfolgreich gespeichert.`
          });

          // Small delay to ensure DB transaction completes before navigation
          await new Promise(resolve => setTimeout(resolve, 100));

          // Navigate back to main form
          navigate('/form');
        } catch (error) {
          console.error('Error saving section:', error);
          toast({
            title: 'Fehler beim Speichern',
            description: 'Die Daten konnten nicht gespeichert werden.',
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
        title: 'Navigation Error',
        description: 'Bitte versuchen Sie es erneut.',
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
    navigate('/form');
  };

  const handleEditQuestion = useCallback(async (questionId: string) => {
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) {
      console.error('Question not found:', questionId);
      return;
    }

    try {
      // Update progress and state synchronously to avoid race conditions
      await updateQuestionProgress(section, questionIndex);
      
      setFormState(prev => ({
        ...prev,
        currentQuestionIndex: questionIndex
      }));
      
      dispatchViewState({ type: 'START_EDITING', questionId, questionIndex });
      
      toast({
        title: 'Bearbeitungsmodus aktiviert',
        description: `Du bearbeitest jetzt Frage ${questionIndex + 1} von ${questions.length}.`,
      });
    } catch (error) {
      console.error('Error setting up edit mode:', error);
      toast({
        title: 'Fehler',
        description: 'Bearbeitungsmodus konnte nicht aktiviert werden.',
        variant: 'destructive'
      });
    }
  }, [questions, section, updateQuestionProgress]);

  const handleConfirm = async () => {
    console.log('handleConfirm started', { section, formState });
    
    try {
      // Validate state before proceeding
      if (!section || !formState) {
        throw new Error('Invalid form state or section');
      }
      
      if (!questions || questions.length === 0) {
        throw new Error('No questions available for this section');
      }

      // Prepare data for saving with validation
      const sectionData: Record<string, any> = {};
      
      console.log('Processing questions for section:', section);
      
      questions.forEach((question, index) => {
        try {
          // Validate question structure
          if (!question || !question.id) {
            console.warn(`Invalid question at index ${index}:`, question);
            return;
          }
          
          // Set answer with fallback
          sectionData[question.id] = formState.answers?.[question.id] ?? false;
          
          // Handle repeater data safely
          if (question.requiresRepeater) {
            const dataKey = getRepeaterDataKey(question.id);
            if (dataKey) {
              sectionData[dataKey] = formState.repeaterData?.[question.id] || [];
            }
          }
        } catch (questionError) {
          console.error(`Error processing question ${question.id}:`, questionError);
        }
      });

      console.log('Prepared section data:', sectionData);

      // Sequential operations to prevent race conditions
      console.log('Step 1: Updating form data in context');
      updateFormData(section, sectionData);
      
      console.log('Step 2: Saving section to database and marking complete');
      await saveSection(section, sectionData);
      generateChecklist();
      
      console.log('Step 3: Updating form progress');
      updateFormProgress(section, true);

      toast({
        title: 'Erfolgreich gespeichert',
        description: `${section.charAt(0).toUpperCase() + section.slice(1)} wurde erfolgreich gespeichert.`
      });

      console.log('handleConfirm completed successfully');
      
      // Navigate back to main form to continue with next section
      navigate('/form');
    } catch (error) {
      console.error('Error in handleConfirm:', error);
      console.error('Error details:', {
        section,
        formState,
        questionsLength: questions?.length,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast({
        title: 'Fehler beim Speichern',
        description: error instanceof Error ? error.message : 'Die Daten konnten nicht gespeichert werden.',
        variant: 'destructive'
      });
    }
  };

  const summaryItems: FormSummaryItem[] = useMemo(() => {
    return questions.map(question => ({
      questionId: question.id,
      questionText: question.text,
      answer: formState.answers[question.id] || false,
      repeaterData: question.requiresRepeater ? formState.repeaterData[question.id] : undefined,
      repeaterTitle: question.requiresRepeater?.title
    }));
  }, [questions, formState.answers, formState.repeaterData]);

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

  // Effect for tracking summary view - moved to top level to fix Hook violation
  useEffect(() => {
    if (viewState.showSummary) {
      NativeErrorMonitor.addBreadcrumb('navigation', 'Summary mounted', { 
        section, 
        itemCount: summaryItems.length,
        isAndroid: isAndroidEnvironment() 
      });
    }
  }, [viewState.showSummary, section, summaryItems.length]);

  if (viewState.showSummary) {

    const isAndroid = isAndroidEnvironment();
    
    if (isAndroid) {
      // Conservative rendering for Android
      return (
        <div className="pb-20 md:pb-0">
          <div className="space-y-6 pb-6">
            {/* Header with integrated mode toggle */}
            <SubpageHeader 
              title={getSectionTitle()}
              onBack={handleHeaderBack}
              showModeToggle={true}
              currentMode="yesno"
              onModeChange={() => onModeSwitch()}
            />

            <div className="px-5">
              <FormSummary
                title={getSectionTitle()}
                summaryItems={summaryItems}
                onEdit={handleEditQuestion}
                onConfirm={handleConfirm}
                onBack={handleBack}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <AnimatedPageContainer>
        <div className="space-y-6 pb-6">
          {/* Header with integrated mode toggle */}
          <SubpageHeader 
            title={getSectionTitle()}
            onBack={handleHeaderBack}
            showModeToggle={true}
            currentMode="yesno"
            onModeChange={() => onModeSwitch()}
          />

          <div className="px-5">
            <FormSummary
              title={getSectionTitle()}
              summaryItems={summaryItems}
              onEdit={handleEditQuestion}
              onConfirm={handleConfirm}
              onBack={handleBack}
            />
          </div>
        </div>
      </AnimatedPageContainer>
    );
  }

  return (
    <AnimatedPageContainer>
      <div className="space-y-6 pb-6">
        {/* Header with integrated mode toggle */}
        <SubpageHeader 
          title={getSectionTitle()}
          onBack={handleHeaderBack}
          showModeToggle={true}
          currentMode="yesno"
          onModeChange={() => onModeSwitch()}
        />

        {/* Resume Message - Only show when there's actual saved progress and not already at start */}
        {questionProgress[section] !== undefined && 
         questionProgress[section]! > 0 && 
         !viewState.showSummary && 
         formState.currentQuestionIndex !== questionProgress[section] && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 px-5"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="text-sm text-foreground/80">
                  Du warst bei Frage {(questionProgress[section]! + 1)} von {questions.length}. Möchtest du fortfahren oder neu beginnen?
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    // Sequential updates to prevent race conditions
                    await updateQuestionProgress(section, 0);
                    setFormState(prev => ({ ...prev, currentQuestionIndex: 0 }));
                    dispatchViewState({ type: 'RESET_VIEW' });
                  }}
                  className="text-xs px-3 py-1 rounded border border-border bg-background hover:bg-accent"
                >
                  Neu beginnen
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="px-5">
          {/* Progress */}
          <MultiStepProgress
            currentStep={formState.currentQuestionIndex}
            totalSteps={questions.length}
            sectionTitle={getSectionTitle()}
          />

          {/* Editing Mode Indicator */}
          {viewState.isEditing && (
            isAndroid ? (
              <div className="mx-4">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="text-sm text-foreground">
                      <span className="font-medium">Bearbeitungsmodus:</span> Du bearbeitest diese Frage. Deine Änderung wird automatisch gespeichert.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4"
              >
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <div className="text-sm text-foreground">
                      <span className="font-medium">Bearbeitungsmodus:</span> Du bearbeitest diese Frage. Deine Änderung wird automatisch gespeichert.
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          )}

          {/* Navigation within questions */}
          {(formState.currentQuestionIndex > 0 || viewState.showRepeater) && !viewState.showSummary && (
            <div className="px-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </Button>
            </div>
          )}

          {/* Question Content */}
          {isAndroid ? (
            !currentQuestion ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
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
            )
          ) : (
            <AnimatePresence mode="wait">
              {!currentQuestion ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
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
          )}
        </div>
      </div>
    </AnimatedPageContainer>
  );
};