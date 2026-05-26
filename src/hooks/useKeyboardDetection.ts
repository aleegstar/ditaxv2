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
  const baseViewportHeightRef = useRef<number>(getViewportHeight());
  const editableFocusRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const visualHeight = vv?.height || window.innerHeight;
      const offsetTop = vv?.offsetTop || 0;
      const hasEditableFocus = isEditableElement(document.activeElement);
      const nextBaseViewportHeight = Math.max(baseViewportHeightRef.current, visualHeight);
      const heightDifference = Math.max(0, nextBaseViewportHeight - visualHeight);
      const windowDelta = Math.max(0, window.innerHeight - visualHeight - offsetTop);
      const estimatedKeyboardHeight = Math.max(heightDifference, windowDelta);
      const keyboardThreshold = hasEditableFocus ? 80 : 150;
      const keyboardOpen = estimatedKeyboardHeight > keyboardThreshold;

      editableFocusRef.current = hasEditableFocus;

      if (!keyboardOpen && !hasEditableFocus) {
        baseViewportHeightRef.current = nextBaseViewportHeight;
      }

      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? estimatedKeyboardHeight : 0);
      setViewportHeight(visualHeight);
      setViewportOffsetTop(offsetTop);
    };

    const handleResize = () => {
      if (!editableFocusRef.current) {
        baseViewportHeightRef.current = Math.max(baseViewportHeightRef.current, getViewportHeight());
      }
      handleViewportChange();
    };

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
