import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
interface SphereProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  triggerPulse?: boolean;
  onPulseComplete?: () => void;
}
export const Sphere: React.FC<SphereProps> = ({
  className,
  size = 'medium',
  triggerPulse = false,
  onPulseComplete
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };
  useEffect(() => {
    console.log('Sphere component mounted, video loading...');
  }, []);
  useEffect(() => {
    if (triggerPulse) {
      setShowPulse(true);
      const timer = setTimeout(() => {
        setShowPulse(false);
        onPulseComplete?.();
      }, 800); // Shorter pulse duration
      return () => clearTimeout(timer);
    }
  }, [triggerPulse, onPulseComplete]);
  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setIsLoading(false);
    setHasError(false);
  };
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video failed to load:', e);
    setIsLoading(false);
    setHasError(true);
  };
  const handleVideoCanPlay = () => {
    console.log('Video can play');
    setIsLoading(false);
  };
  return (
    <div className={cn(
      'relative rounded-full flex items-center justify-center overflow-hidden',
      sizeClasses[size],
      showPulse && 'animate-pulse',
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-full">
          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <span className="text-destructive text-xs">!</span>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className={cn(
          'w-full h-full object-cover rounded-full transition-opacity',
          isLoading || hasError ? 'opacity-0' : 'opacity-100'
        )}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={handleVideoLoad}
        onCanPlay={handleVideoCanPlay}
        onError={handleVideoError}
        src="/sphere-animation.mp4"
      />
    </div>
  );
};