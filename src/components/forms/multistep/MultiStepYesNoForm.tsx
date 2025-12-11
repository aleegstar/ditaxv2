import React, { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
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

  // Ref to track local updates and prevent useEffect from re-triggering
  const isLocalUpdateRef = useRef(false);

  // Load existing data and answers - only on section changes, skip local updates
  useEffect(() => {
    // Skip if this is a local update (from button click)
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }

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

  // Handle initial position - only on section/formProgress changes  
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
  }, [section, formProgress, onModeSwitch]);

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

      // Mark as local update to prevent useEffect from re-triggering
      isLocalUpdateRef.current = true;

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
      
      // Mark as local update to prevent useEffect from re-triggering
      isLocalUpdateRef.current = true;
      
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
        // After last question, show summary instead of switching to expert mode
        if (Capacitor.isNativePlatform()) {
          NativeErrorMonitor.addBreadcrumb('navigation', 'Complete yes/no questions - showing summary');
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
          
          // Save to database
          await saveSection(section, sectionData);

          // Show summary instead of switching to expert mode
          dispatchViewState({ type: 'SET_SUMMARY', show: true });
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
      <div className="min-h-screen bg-[#020408] text-zinc-200 antialiased flex justify-center selection:bg-[#1D64FF]/30">
        <div className="h-screen md:max-w-2xl bg-[#020408] w-full max-w-[500px] mr-auto ml-auto relative flex flex-col shadow-2xl overflow-hidden border-x border-white/[0.02]">
          {/* Background Ambient Glow */}
          <div 
            className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-100"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.01) 50%, transparent 70%)',
              filter: 'blur(90px)'
            }}
          />

          {/* Header */}
          <div className="flex shrink-0 w-full z-20 pt-8 pr-6 pb-4 pl-6 relative items-center justify-between">
            <motion.button 
              onClick={() => dispatchViewState({ type: 'SET_SUMMARY', show: false })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 group shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            </motion.button>

            <h1 className="font-medium text-lg tracking-tight text-white/90 leading-tight absolute left-1/2 -translate-x-1/2">
              {getSectionTitle()}
            </h1>

            <div className="w-10 h-10" />
          </div>

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
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
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
              <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">
                Verschlüsselt &amp; Sicher
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-200 antialiased flex justify-center selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="h-screen md:max-w-2xl bg-[#020408] w-full max-w-[500px] mr-auto ml-auto relative flex flex-col shadow-2xl overflow-hidden border-x border-white/[0.02]">
        {/* Background Ambient Glow */}
        <div 
          className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-100"
          style={{
            background: 'radial-gradient(circle at 50% 30%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.01) 50%, transparent 70%)',
            filter: 'blur(90px)'
          }}
        />

        {/* Header */}
        <div className="flex shrink-0 w-full z-20 pt-8 pr-6 pb-4 pl-6 relative items-center justify-between">
          {/* Back Button */}
          <motion.button 
            onClick={handleHeaderBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 group shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
          </motion.button>

          {/* Title */}
          <h1 className="font-medium text-lg tracking-tight text-white/90 leading-tight absolute left-1/2 -translate-x-1/2">
            {getSectionTitle()}
          </h1>

          {/* Empty space for balance */}
          <div className="w-10 h-10" />
        </div>

        {/* Main Content */}
        <div className="z-10 flex-1 flex flex-col px-6 pb-8 relative overflow-y-auto pt-4">
          {/* Progress Bar */}
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
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="bg-[#1D64FF]/10 border border-[#1D64FF]/20 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#1D64FF] rounded-full shadow-[0_0_8px_rgba(29,100,255,0.5)]" />
                  <div className="text-sm text-zinc-300">
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
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-all"
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
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  <div className="text-sm text-zinc-300">
                    <span className="font-medium text-orange-400">Bearbeitungsmodus:</span> Du bearbeitest diese Frage.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Question Content */}
          <AnimatePresence mode="wait">
            {!currentQuestion ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
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

        {/* Footer Info */}
        <div className="absolute bottom-6 w-full text-center z-20 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05]">
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
            <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">
              Verschlüsselt &amp; Sicher
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};