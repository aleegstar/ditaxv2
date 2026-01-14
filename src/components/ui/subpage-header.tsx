import React from 'react';
import { ArrowLeft, HelpCircle, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

interface SubpageHeaderProps {
  title: string;
  onBack?: () => void;
  className?: string;
  showModeToggle?: boolean;
  currentMode?: 'standard' | 'yesno';
  onModeChange?: (mode: 'standard' | 'yesno') => void;
  showAvatar?: boolean;
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
  title,
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between relative">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Centered Title */}
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 absolute left-1/2 -translate-x-1/2">
          {title}
        </h1>

        {/* Right side: Mode Toggle, Avatar, or Placeholder */}
        <div className="flex items-center gap-2">
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
