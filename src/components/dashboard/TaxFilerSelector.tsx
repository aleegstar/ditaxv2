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
        'flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-full',
        'bg-foreground/[0.04] hover:bg-foreground/[0.07]',
        'transition-colors duration-200 group',
        className
      )}
    >
      <span className="text-[12px] font-medium text-foreground/85 tracking-[-0.005em]">
        {activeTaxFiler.first_name}
      </span>

      <Avatar className="w-6 h-6">
        <AvatarImage
          src={getAvatarUrl()}
          alt={`${activeTaxFiler.first_name} ${activeTaxFiler.last_name}`}
          className="object-cover"
        />
        <AvatarFallback
          className="text-[10px] font-semibold"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.08) 100%)',
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
