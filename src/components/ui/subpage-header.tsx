import React from 'react';
import { ArrowLeft, HelpCircle, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

interface SubpageHeaderProps {
  title?: string;
  titleElement?: React.ReactNode;
  onBack?: () => void;
  className?: string;
  showModeToggle?: boolean;
  currentMode?: 'standard' | 'yesno';
  onModeChange?: (mode: 'standard' | 'yesno') => void;
  showAvatar?: boolean;
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
  title,
  titleElement,
  onBack,
  className,
  showModeToggle = false,
  currentMode = 'yesno',
  onModeChange,
  showAvatar = true
}) => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const handleToggle = () => {
    if (onModeChange) {
      onModeChange(currentMode === 'standard' ? 'yesno' : 'standard');
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-30 bg-white",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
        {/* Back Button - fixed width */}
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Centered Title or Custom Element - flex-1 to take remaining space */}
        <div className="flex-1 min-w-0 flex justify-center">
          {titleElement ? (
            <div className="max-w-full">
              {titleElement}
            </div>
          ) : title ? (
            <h1 className="text-base font-semibold tracking-tight text-slate-900 text-center line-clamp-2 leading-tight">
              {title}
            </h1>
          ) : null}
        </div>

        {/* Right side: Mode Toggle, Avatar, or Placeholder - fixed width */}
        <div className="flex items-center gap-2 shrink-0">
          {showModeToggle && onModeChange && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="flex items-center gap-2 text-xs rounded-full h-8 px-3 text-slate-700 hover:bg-slate-100"
            >
              {currentMode === 'yesno' ? (
                <>
                  <List className="w-3 h-3" />
                  Experten
                </>
              ) : (
                <>
                  <HelpCircle className="w-3 h-3" />
                  Ja/Nein
                </>
              )}
            </Button>
          )}
          
          {showAvatar ? (
            <button 
              onClick={() => navigate('/profile')} 
              className="w-10 h-10 rounded-full bg-slate-200 ring-2 ring-white shadow-sm overflow-hidden shrink-0 hover:ring-blue-100 transition-all"
            >
            <img 
                src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} 
                alt="Profil" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/lovable-uploads/default-avatar.png';
                }}
              />
            </button>
          ) : !showModeToggle && (
            <div className="w-10 h-10" />
          )}
        </div>
      </div>
    </header>
  );
};
