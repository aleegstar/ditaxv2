
import { useState, useEffect } from 'react';

// Custom hook to detect if the screen is mobile size
export const useIsMobile = (): boolean => {
  // Use lazy initial state to check immediately on first render
  const [isMobile, setIsMobile] = useState(() => {
    // Only check on client-side to avoid SSR mismatch
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false; // Default for SSR
  });

  useEffect(() => {
    // Check mobile once immediately for faster rendering
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check in case lazy initial state wasn't accurate
    checkMobile();
    
    // Set up event listener for resize
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
};
