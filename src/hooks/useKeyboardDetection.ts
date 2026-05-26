import { useState, useEffect, useRef } from 'react';
import { isDespiaNative } from '@/lib/despia';


const getViewportHeight = () =>
  typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0;

const getViewportOffsetTop = () =>
  typeof window !== 'undefined' ? window.visualViewport?.offsetTop || 0 : 0;

const getViewportBottom = () =>
  typeof window !== 'undefined'
    ? (window.visualViewport?.offsetTop || 0) + (window.visualViewport?.height || window.innerHeight)
    : 0;

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
  /**
   * bottomInset: distance in px between the bottom of the layout viewport
   * (window.innerHeight) and the bottom of the visual viewport. This is the
   * exact amount fixed elements need to be shifted up to sit above the
   * on-screen keyboard. Always reflects the real viewport gap, with no
   * threshold smoothing, so the chat composer stays glued to the keyboard.
   */
  const [bottomInset, setBottomInset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number>(getViewportHeight);
  const [viewportOffsetTop, setViewportOffsetTop] = useState<number>(getViewportOffsetTop);
  const [viewportBottom, setViewportBottom] = useState<number>(getViewportBottom);
  const editableFocusRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const baselineInnerHeightRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const despia = isDespiaNative();

    const compute = () => {
      const vv = window.visualViewport;
      const innerHeight = window.innerHeight;
      if (!baselineInnerHeightRef.current || innerHeight > baselineInnerHeightRef.current) {
        baselineInnerHeightRef.current = innerHeight;
      }

      const visualHeight = vv?.height || window.innerHeight;
      const offsetTop = vv?.offsetTop || 0;
      const visualBottom = offsetTop + visualHeight;
      const hasEditableFocus = isEditableElement(document.activeElement);
      const layoutInset = Math.max(0, innerHeight - visualBottom);
      // In Despia WebView, window.innerHeight stays constant while the keyboard
      // is up (because we disabled native autoscroll), so the innerHeight-based
      // fallback would always report 0 and mislead us. Use visualViewport only.
      const fallbackInset = despia
        ? 0
        : hasEditableFocus
          ? Math.max(0, baselineInnerHeightRef.current - innerHeight)
          : 0;
      const rawInset = Math.max(layoutInset, fallbackInset);
      // For "isKeyboardOpen" flag we still threshold to avoid noise from
      // browser chrome resizing. The raw inset itself is exposed unfiltered
      // for positioning. Despia keyboards report smaller insets reliably.
      const keyboardThreshold = despia ? 80 : hasEditableFocus ? 60 : 120;
      const keyboardOpen = rawInset > keyboardThreshold;

      editableFocusRef.current = hasEditableFocus;

      setBottomInset(rawInset);
      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? rawInset : 0);
      setViewportHeight(visualHeight);
      setViewportOffsetTop(offsetTop);
      setViewportBottom(visualBottom);
    };


    const schedule = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        compute();
      });
    };

    compute();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', schedule);
      window.visualViewport.addEventListener('scroll', schedule);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('focusin', schedule, true);
    document.addEventListener('focusout', schedule, true);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', schedule);
        window.visualViewport.removeEventListener('scroll', schedule);
      }
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('focusin', schedule, true);
      document.removeEventListener('focusout', schedule, true);
    };
  }, []);

  return { isKeyboardOpen, keyboardHeight, bottomInset, viewportHeight, viewportOffsetTop, viewportBottom };
};
