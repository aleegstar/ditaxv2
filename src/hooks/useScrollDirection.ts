import { useState, useEffect, useRef } from 'react';

export type ScrollDirection = 'up' | 'down' | 'idle';

export const useScrollDirection = (threshold: number = 10) => {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('idle');
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      
      if (Math.abs(currentScrollY - lastScrollY.current) < threshold) {
        ticking.current = false;
        return;
      }

      setScrollDirection(
        currentScrollY > lastScrollY.current ? 'down' : 'up'
      );
      
      setScrollY(currentScrollY);
      lastScrollY.current = currentScrollY > 0 ? currentScrollY : 0;
      ticking.current = false;
    };

    const requestScrollUpdate = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    const handleScroll = () => {
      requestScrollUpdate();
    };

    // Initial scroll position
    setScrollY(window.scrollY);
    lastScrollY.current = window.scrollY;

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return {
    scrollDirection,
    scrollY,
    isScrollingDown: scrollDirection === 'down',
    isScrollingUp: scrollDirection === 'up',
    isAtTop: scrollY < 50
  };
};