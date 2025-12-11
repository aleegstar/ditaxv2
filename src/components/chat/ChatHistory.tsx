
import React, { useEffect, useRef } from 'react';
import { ChatQuestion } from './ChatQuestion';
import { ChatAnswer } from './ChatAnswer';

interface ChatMessage {
  stepId: string;
  question: string;
  answer: any;
  stepType: 'text' | 'boolean' | 'select' | 'address' | 'repeater';
  explanation?: string;
}

interface ChatHistoryProps {
  messages: ChatMessage[];
  className?: string;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div 
      ref={scrollRef}
      className={`max-h-64 overflow-y-auto scroll-smooth space-y-2 mb-6 ${className}`}
    >
      {messages.map((message, index) => (
        <div key={`${message.stepId}-${index}`} className="space-y-2">
          <ChatQuestion 
            question={message.question}
            explanation={message.explanation}
            showInfo={false}
            onToggleInfo={() => {}}
          />
          <ChatAnswer 
            answer={message.answer}
            stepType={message.stepType as 'text' | 'boolean' | 'select' | 'address'}
            isConfirmed={true}
          />
        </div>
      ))}
    </div>
  );
};
