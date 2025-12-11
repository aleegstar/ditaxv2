import { useEffect } from 'react';

export const useFontLoader = () => {
  useEffect(() => {
    // Ensure Plus Jakarta Sans is loaded and applied
    const applyFont = () => {
      document.documentElement.style.setProperty('--font-family', 'Plus Jakarta Sans, sans-serif');
      document.body.style.fontFamily = 'Plus Jakarta Sans, sans-serif';
    };

    // Apply immediately
    applyFont();

    // Also apply when fonts are loaded
    if (document.fonts) {
      document.fonts.ready.then(() => {
        applyFont();
      });
    }

    // Fallback for older browsers
    const timer = setTimeout(applyFont, 100);

    return () => clearTimeout(timer);
  }, []);
};