import { useState, useEffect } from 'react';

export const useKeyboardDetection = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number>(
    typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 0
  );
  const [viewportOffsetTop, setViewportOffsetTop] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let initialVisualViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const visualHeight = vv?.height || window.innerHeight;
      const offsetTop = vv?.offsetTop || 0;

      const heightDifference = initialVisualViewportHeight - visualHeight;
      const keyboardOpen = heightDifference > 150;

      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? heightDifference : 0);
      setViewportHeight(visualHeight);
      setViewportOffsetTop(offsetTop);
    };

    const handleResize = () => {
      // Reset baseline on orientation change
      initialVisualViewportHeight = window.visualViewport?.height || window.innerHeight;
      handleViewportChange();
    };

    handleViewportChange();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    } else {
      window.addEventListener('resize', handleViewportChange);
    }
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight, viewportHeight, viewportOffsetTop };
};
