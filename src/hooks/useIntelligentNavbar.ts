import { useState, useEffect } from 'react';
import { useKeyboardDetection } from './useKeyboardDetection';
import { useScrollDirection } from './useScrollDirection';
import { useDebounce } from './use-debounce';

interface UseIntelligentNavbarOptions {
  hideOnScroll?: boolean;
  hideOnKeyboard?: boolean;
  showOnScrollUp?: boolean;
  debounceMs?: number;
}

export const useIntelligentNavbar = (options: UseIntelligentNavbarOptions = {}) => {
  const {
    hideOnScroll = true,
    hideOnKeyboard = true,
    showOnScrollUp = true,
    debounceMs = 150
  } = options;

  const { isKeyboardOpen, keyboardHeight } = useKeyboardDetection();
  const { scrollDirection, isScrollingDown, isScrollingUp, isAtTop, scrollY } = useScrollDirection();
  
  const [isVisible, setIsVisible] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Debounce visibility changes to prevent flickering
  const debouncedScrollDirection = useDebounce(scrollDirection, debounceMs);
  const debouncedIsKeyboardOpen = useDebounce(isKeyboardOpen, 100);

  useEffect(() => {
    let newVisibility = true;

    // Hide if keyboard is open and option is enabled
    if (hideOnKeyboard && debouncedIsKeyboardOpen) {
      newVisibility = false;
    }
    // Hide if scrolling down and not at top
    else if (hideOnScroll && debouncedScrollDirection === 'down' && scrollY > 100) {
      newVisibility = false;
    }
    // Show if scrolling up and option is enabled
    else if (showOnScrollUp && debouncedScrollDirection === 'up') {
      newVisibility = true;
    }
    // Always show at top of page
    else if (isAtTop) {
      newVisibility = true;
    }

    if (newVisibility !== isVisible) {
      setShouldAnimate(true);
      setIsVisible(newVisibility);
    }
  }, [
    debouncedScrollDirection,
    debouncedIsKeyboardOpen,
    scrollY,
    isAtTop,
    hideOnScroll,
    hideOnKeyboard,
    showOnScrollUp,
    isVisible
  ]);

  // Calculate dynamic bottom position when keyboard is open
  const getBottomPosition = () => {
    if (debouncedIsKeyboardOpen && keyboardHeight > 0) {
      // Position navbar above keyboard with some padding
      return keyboardHeight + 24; // 24px padding above keyboard
    }
    return 24; // Default 24px from bottom (bottom-6)
  };

  return {
    isVisible,
    shouldAnimate,
    isKeyboardOpen: debouncedIsKeyboardOpen,
    keyboardHeight,
    scrollDirection: debouncedScrollDirection,
    bottomPosition: getBottomPosition(),
    animationClass: shouldAnimate ? 'transition-all duration-300 ease-in-out' : ''
  };
};