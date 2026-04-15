import React from 'react';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TaxFilerSelectorProps {
  className?: string;
}

const TaxFilerSelector: React.FC<TaxFilerSelectorProps> = ({ className }) => {
  const { activeTaxFiler, hasMultipleFilers } = useTaxFiler();
  const { profile } = useProfile();
  const navigate = useNavigate();

  if (!hasMultipleFilers || !activeTaxFiler) {
    return null;
  }

  const handleClick = () => {
    navigate('/select-person');
  };

  const getAvatarUrl = (): string | undefined => {
    if (activeTaxFiler.avatar_url) {
      return activeTaxFiler.avatar_url;
    }
    if (activeTaxFiler.is_primary && profile?.avatar_url) {
      return profile.avatar_url;
    }
    return undefined;
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 pl-4 pr-2 py-2 rounded-full',
        'bg-white/80 backdrop-blur-sm',
        'ring-1 ring-black/5 shadow-sm',
        'hover:shadow-md hover:bg-white',
        'transition-all duration-200 group',
        className
      )}
    >
      {/* Name */}
      <span className="text-sm font-medium text-foreground">
        {activeTaxFiler.first_name} {activeTaxFiler.last_name}
      </span>

      {/* Avatar */}
      <Avatar className="w-8 h-8 ring-1 ring-primary/10">
        <AvatarImage 
          src={getAvatarUrl()}
          alt={`${activeTaxFiler.first_name} ${activeTaxFiler.last_name}`}
          className="object-cover"
        />
        <AvatarFallback 
          className="text-sm font-medium"
          style={{ 
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 100%)',
            color: 'hsl(var(--primary))'
          }}
        >
          {activeTaxFiler.first_name.charAt(0)}{activeTaxFiler.last_name.charAt(0)}
        </AvatarFallback>
      </Avatar>
    </button>
  );
};

export default TaxFilerSelector;
