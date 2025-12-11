import { useState, useEffect } from 'react';

export const useKeyboardDetection = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    let initialViewportHeight = window.innerHeight;
    let initialVisualViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleViewportChange = () => {
      const currentHeight = window.innerHeight;
      const visualHeight = window.visualViewport?.height || currentHeight;
      
      // Calculate keyboard height
      const heightDifference = initialVisualViewportHeight - visualHeight;
      
      // Keyboard is considered open if the height difference is significant (> 150px)
      const keyboardOpen = heightDifference > 150;
      
      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? heightDifference : 0);
    };

    const handleResize = () => {
      // Update initial heights on resize (orientation change)
      initialViewportHeight = window.innerHeight;
      initialVisualViewportHeight = window.visualViewport?.height || window.innerHeight;
      handleViewportChange();
    };

    // Use visualViewport API if available (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleViewportChange);
    }

    // Handle orientation changes
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight };
};