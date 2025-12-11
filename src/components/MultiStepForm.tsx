import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FormStep, FormStepData, AddressData } from '@/types/multiStepForm';
import { ChatQuestion } from '@/components/chat/ChatQuestion';
import { ChatAnswer } from '@/components/chat/ChatAnswer';
import { StepInput } from '@/components/forms/StepInput';
import { Button } from '@/components/ui/button';
import { Sphere } from '@/components/ui/sphere';
import { Progress } from '@/components/ui/progress';
import { useFormContext } from '@/contexts';
import backgroundImage from '@/assets/multistep-background.png';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MultiStepFormProps {
  steps: FormStep[];
  onSubmit: (data: FormStepData) => void;
}

type ChatMessage = {
  type: 'question' | 'answer';
  content: string;
  stepId: string;
  stepIndex: number;
  timestamp: number;
};

const getDefaultValue = (type: string): string | boolean | AddressData | number | null => {
  switch (type) {
    case 'boolean':
      return null;
    case 'address':
      return { address: '', postalCode: '', city: '' };
    case 'number':
      return 0;
    default:
      return '';
  }
};

// Helper function to get nested value from FormContext data
const getNestedValue = (obj: any, path: string): any => {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
};

// Helper function to set nested value in FormContext data
const setNestedValue = (obj: any, path: string, value: any): any => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  if (lastKey) {
    current[lastKey] = value;
  }
  
  return obj;
};

// Import the display text mapping from StepInput
const getDisplayText = (option: string): string => {
  const displayMap: Record<string, string> = {
    'public': 'Öffentliche Verkehrsmittel',
    'publicBike': 'Öffentliche Verkehrsmittel + Velo',
    'bike': 'Velo',
    'car': 'Auto',
    'higher-income-father': 'Beim höherverdienenden Vater',
    'higher-income-mother': 'Bei der höherverdienenden Mutter',
    'child-self-sufficient': 'Kind ist selbstständig',
    'child-different-household': 'Kind lebt in anderem Haushalt',
    'römisch-katholisch': 'Römisch-katholisch',
    'reformiert': 'Reformiert',
    'christkatolisch': 'Christkatholisch',
    'andere/keine': 'Andere/Keine',
    'ledig': 'Ledig',
    'verheiratet': 'Verheiratet',
    'verwitwet': 'Verwitwet',
    'geschieden': 'Geschieden',
    'getrennt': 'Getrennt'
  };

  return displayMap[option] || option;
};

export const MultiStepForm: React.FC<MultiStepFormProps> = ({ steps, onSubmit }) => {
  const { 
    formData,
    formProgress,
    formDataLoaded,
    taxYear,
    saveSection
  } = useFormContext();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [localFormData, setLocalFormData] = useState<FormStepData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [infoStates, setInfoStates] = useState<{ [stepId: string]: boolean }>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const currentQuestionRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Initialize form data and calculate correct step when form data is loaded
  useEffect(() => {
    if (formDataLoaded && !isInitialized) {
      // Convert FormContext data to local format using the step IDs directly
      const convertedFormData: FormStepData = {};
      
      steps.forEach(step => {
        const value = getNestedValue(formData, step.id);
        if (value !== undefined) {
          convertedFormData[step.id] = value;
        }
      });

      setLocalFormData(convertedFormData);

      // Calculate current step based on form progress
      const calculateCurrentStep = () => {
        const progressEntries = Object.entries(formProgress);
        let lastCompletedSection = -1;
        
        for (let i = 0; i < progressEntries.length; i++) {
          const [, isCompleted] = progressEntries[i];
          if (isCompleted) {
            lastCompletedSection = i;
          } else {
            break;
          }
        }
        
        // If all sections are completed, go to last step
        if (lastCompletedSection === progressEntries.length - 1) {
          return steps.length - 1;
        }
        
        // Otherwise, go to first step of next incomplete section
        const nextSectionIndex = lastCompletedSection + 1;
        const sectionPrefixes = ['contactInfo', 'income', 'deductions', 'assets'];
        const nextSectionPrefix = sectionPrefixes[nextSectionIndex];
        
        if (nextSectionPrefix) {
          // Find first step of next section
          const nextStepIndex = steps.findIndex(step => step.id.startsWith(nextSectionPrefix));
          return nextStepIndex >= 0 ? nextStepIndex : 0;
        }
        
        return 0;
      };

      const calculatedStep = calculateCurrentStep();
      setCurrentStepIndex(calculatedStep);

      // Generate chat history from existing data
      const messages: ChatMessage[] = [];
      
      for (let i = 0; i <= calculatedStep && i < steps.length; i++) {
        const step = steps[i];
        
        // Add question
        messages.push({
          type: 'question',
          content: step.title,
          stepId: step.id,
          stepIndex: i,
          timestamp: Date.now() - (steps.length - i) * 1000
        });
        
        // Add answer if we have data for this step
        const stepValue = convertedFormData[step.id];
        if (stepValue !== undefined && stepValue !== null && stepValue !== '') {
          const answerContent = formatAnswerForChat(stepValue, step.type);
          messages.push({
            type: 'answer',
            content: answerContent,
            stepId: step.id,
            stepIndex: i,
            timestamp: Date.now() - (steps.length - i) * 1000 + 500
          });
        }
      }

      // If we're not at the first step and don't have a question for current step, add it
      if (calculatedStep < steps.length) {
        const currentStepExists = messages.some(
          msg => msg.type === 'question' && msg.stepIndex === calculatedStep
        );
        
        if (!currentStepExists) {
          messages.push({
            type: 'question',
            content: steps[calculatedStep].title,
            stepId: steps[calculatedStep].id,
            stepIndex: calculatedStep,
            timestamp: Date.now()
          });
        }
      }

      setChatMessages(messages);
      setIsInitialized(true);
    }
  }, [formDataLoaded, formData, formProgress, steps, isInitialized]);

  // Enhanced auto-scroll to ensure only current question is visible
  useEffect(() => {
    if (currentQuestionRef.current && chatContainerRef.current) {
      setTimeout(() => {
        const questionElement = currentQuestionRef.current;
        const containerElement = chatContainerRef.current;
        
        if (questionElement && containerElement) {
          const scrollPosition = questionElement.offsetTop - containerElement.offsetTop;
          
          containerElement.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
      }, 300);
    }
  }, [currentStepIndex, chatMessages]);

  const toggleInfo = (stepId: string) => {
    setInfoStates(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const validateStep = (): boolean => {
    if (!currentStep) return true;

    const newErrors: { [key: string]: string } = {};
    const stepValue = localFormData[currentStep.id];
    
    if (currentStep.validation?.required && !stepValue) {
      newErrors[currentStep.id] = 'Dieses Feld ist erforderlich';
      setErrors(newErrors);
      return false;
    }

    if (currentStep.type === 'email' && stepValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(stepValue))) {
      newErrors[currentStep.id] = 'Bitte gib eine gültige E-Mail-Adresse ein';
      setErrors(newErrors);
      return false;
    }

    if (currentStep.type === 'address') {
      const addressValue = stepValue as AddressData;
      if (!addressValue?.address) {
        newErrors[currentStep.id + '.address'] = 'Strasse ist erforderlich';
      }
      if (!addressValue?.postalCode) {
        newErrors[currentStep.id + '.postalCode'] = 'PLZ ist erforderlich';
      }
      if (!addressValue?.city) {
        newErrors[currentStep.id + '.city'] = 'Ort ist erforderlich';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const formatAnswerForChat = (value: any, stepType?: string): string => {
    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nein';
    }
    if (typeof value === 'object' && value !== null) {
      if (value.address && value.postalCode && value.city) {
        return `${value.address}, ${value.postalCode} ${value.city}`;
      }
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
    }
    
    // For select fields, use the display text mapping
    if (stepType === 'select') {
      return getDisplayText(String(value));
    }
    
    return String(value);
  };

  // Enhanced save data function with detailed logging
  const saveStepData = async (stepId: string, value: any) => {
    // Determine which section this step belongs to from the step ID
    const sectionName = stepId.split('.')[0];
    const fieldName = stepId.split('.')[1];
    
    if (sectionName && fieldName) {
      // Get current section data from context
      const currentSectionData = formData[sectionName as keyof typeof formData] || {};
      
      // Create updated section data with the new value (direct assignment)
      const updatedSectionData = {
        ...currentSectionData,
        [fieldName]: value  // Direct value assignment without any transformation
      };
      
      
      try {
        await saveSection(sectionName as any, updatedSectionData);
      } catch (error) {
      }
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    const stepValue = localFormData[currentStep.id];
    
    const answerContent = formatAnswerForChat(stepValue, currentStep.type);

    // Add user's answer to chat if we have a value
    if (stepValue !== undefined && stepValue !== null && stepValue !== '') {
      setChatMessages(prev => [
        ...prev,
        {
          type: 'answer',
          content: answerContent,
          stepId: currentStep.id,
          stepIndex: currentStepIndex,
          timestamp: Date.now()
        }
      ]);
      
      // Save to database
      await saveStepData(currentStep.id, stepValue);
    }

    // Move to next step
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length) {
      setCurrentStepIndex(nextStepIndex);
      
      // Add next question to chat
      setTimeout(() => {
        const nextQuestion = steps[nextStepIndex].title;
        setChatMessages(prev => [
          ...prev,
          {
            type: 'question',
            content: nextQuestion,
            stepId: steps[nextStepIndex].id,
            stepIndex: nextStepIndex,
            timestamp: Date.now()
          }
        ]);
      }, 500);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      // Remove last question and answer from chat
      setChatMessages(prev => {
        const filtered = prev.filter(msg => msg.stepIndex < currentStepIndex);
        return filtered;
      });
      
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStepChange = async (stepId: string, value: any) => {
    
    // Update local form data immediately with direct value assignment
    setLocalFormData(prev => {
      const updated = { ...prev, [stepId]: value };
      return updated;
    });
    
    // Clear any existing errors for this step
    setErrors(prev => {
      const { [stepId]: removedError, ...rest } = prev;
      return rest;
    });
    
    // Save to database immediately with direct value assignment
    await saveStepData(stepId, value);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    const stepValue = localFormData[currentStep.id];
    
    // Add final answer to chat
    if (stepValue !== undefined && stepValue !== null && stepValue !== '') {
      setChatMessages(prev => [
        ...prev,
        {
          type: 'answer',
          content: formatAnswerForChat(stepValue, currentStep.type),
          stepId: currentStep.id,
          stepIndex: currentStepIndex,
          timestamp: Date.now()
        }
      ]);
      
      // Save final step
      await saveStepData(currentStep.id, stepValue);
    }

    onSubmit(localFormData);
    navigate('/success');
  };

  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Show loading state until form data is loaded and initialized
  if (!formDataLoaded || !isInitialized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <Sphere className="w-16 h-16 mb-4" />
        <p className="text-white">Formular wird geladen...</p>
      </div>
    );
  }

  return (
    <div 
      className="h-screen flex flex-col bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url()` }}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-4 flex flex-col items-center">
        <Progress value={progress} className="w-full mb-4" />
        <div className="mb-4">
          <Sphere className="w-16 h-16" />
        </div>
        
        {/* Navigation buttons - now placed below the sphere */}
        <div className="flex justify-center items-center gap-6 mt-2">
          <motion.button 
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className={cn(
              "w-12 h-12 rounded-full bg-white text-black flex items-center justify-center transition-colors shadow-lg",
              currentStepIndex === 0 && 'opacity-30 pointer-events-none'
            )}
            whileHover={currentStepIndex !== 0 ? { scale: 1.1 } : {}}
            whileTap={currentStepIndex !== 0 ? { scale: 0.95 } : {}}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft size={20} />
          </motion.button>
          
          <motion.button
            onClick={isLastStep ? handleSubmit : handleNext}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center transition-colors shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </div>

      {/* Chat Container - Scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-2xl mx-auto w-full px-4">
        {/* Chat Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto space-y-2 mb-4 scroll-smooth h-32"
        >
          {chatMessages.map((message, index) => {
            const isCurrentQuestion = message.type === 'question' && message.stepIndex === currentStepIndex;
            
            return (
              <div 
                key={`${message.stepId}-${message.type}-${index}`}
                ref={isCurrentQuestion ? currentQuestionRef : null}
              >
                {message.type === 'question' ? (
                  <ChatQuestion
                    question={message.content}
                    explanation={steps.find(s => s.id === message.stepId)?.explanation}
                    showInfo={infoStates[message.stepId] || false}
                    onToggleInfo={() => toggleInfo(message.stepId)}
                  />
                ) : (
                  <ChatAnswer
                    answer={message.content}
                    isConfirmed={true}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Fixed Input Area */}
        <div className="flex-shrink-0 border-t border-white/20 pt-4 pb-4">
          <div className="space-y-4">
            {/* Use only individual step input for all sections */}
            {currentStep && (
              <div className="flex flex-col items-center">
                <StepInput
                  step={currentStep}
                  value={localFormData[currentStep.id] ?? getDefaultValue(currentStep.type)}
                  onChange={(value) => handleStepChange(currentStep.id, value)}
                  error={errors[currentStep.id]}
                  onAutoNext={isLastStep ? undefined : handleNext}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
