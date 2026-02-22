import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global cleanup hook for Vaul drawer overlays.
 * On Android WebViews, Vaul portals/overlays can persist in the DOM
 * after navigation, blocking all touch events. This hook removes
 * leftover elements on every route change.
 */
export function useVaulCleanup() {
  const location = useLocation();

  useEffect(() => {
    const cleanup = () => {
      // Remove vaul overlay and drawer elements
      document.querySelectorAll('[data-vaul-overlay]').forEach(el => el.remove());
      document.querySelectorAll('[data-vaul-drawer]').forEach(el => el.remove());
      document.querySelectorAll('.drawer-overlay-frosted').forEach(el => el.remove());
      
      // Remove empty radix portal containers (leftover from drawers)
      document.querySelectorAll('[data-radix-portal]').forEach(el => {
        if (el.querySelector('[data-vaul-overlay], [data-vaul-drawer]') || el.children.length === 0) {
          el.remove();
        }
      });

      // Reset body styles that vaul may have set
      document.body.style.pointerEvents = '';
      document.body.style.overflow = '';
    };

    // Run cleanup immediately on route change and delayed as fallback
    cleanup();
    const t1 = setTimeout(cleanup, 100);
    const t2 = setTimeout(cleanup, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname, location.search]);
}
