import { useState, useEffect, useRef } from 'react';

const getViewportHeight = () =>
  typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0;

const getViewportOffsetTop = () =>
  typeof window !== 'undefined' ? window.visualViewport?.offsetTop || 0 : 0;

const isEditableElement = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  );
};

export const useKeyboardDetection = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number>(getViewportHeight);
  const [viewportOffsetTop, setViewportOffsetTop] = useState<number>(getViewportOffsetTop);
  const editableFocusRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const visualHeight = vv?.height || window.innerHeight;
      const offsetTop = vv?.offsetTop || 0;
      const hasEditableFocus = isEditableElement(document.activeElement);
      const estimatedKeyboardHeight = Math.max(0, window.innerHeight - visualHeight - offsetTop);
      const keyboardThreshold = hasEditableFocus ? 60 : 120;
      const keyboardOpen = estimatedKeyboardHeight > keyboardThreshold;

      editableFocusRef.current = hasEditableFocus;

      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? estimatedKeyboardHeight : 0);
      setViewportHeight(visualHeight);
      setViewportOffsetTop(offsetTop);
    };

    const handleResize = () => handleViewportChange();

    const handleFocusChange = () => {
      requestAnimationFrame(handleViewportChange);
    };

    handleViewportChange();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('focusin', handleFocusChange, true);
    document.addEventListener('focusout', handleFocusChange, true);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('focusin', handleFocusChange, true);
      document.removeEventListener('focusout', handleFocusChange, true);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight, viewportHeight, viewportOffsetTop };
};
