import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global cleanup hook for Vaul drawer overlays.
 * On Android WebViews, Vaul portals/overlays can persist in the DOM
 * after navigation, blocking all touch events. This hook removes
 * leftover elements only on pathname changes (not query param changes,
 * which would destroy actively-opening drawers like ImportWizard).
 */
export function useVaulCleanup() {
  const location = useLocation();
  const prevPathname = useRef(location.pathname);

  useEffect(() => {
    // Only run cleanup when the pathname actually changes, not on query param changes
    if (prevPathname.current === location.pathname) return;
    prevPathname.current = location.pathname;

    const cleanup = () => {
      // Remove vaul overlay and drawer elements
      document.querySelectorAll('[data-vaul-overlay]').forEach(el => el.remove());
      document.querySelectorAll('[data-vaul-drawer]').forEach(el => el.remove());
      document.querySelectorAll('.drawer-overlay-frosted').forEach(el => el.remove());
      
      // Remove lingering radix alert-dialog overlays (e.g. after delete confirmations)
      document.querySelectorAll('[role="alertdialog"]').forEach(el => {
        const portal = el.closest('[data-radix-portal]');
        if (portal) portal.remove();
      });

      // Remove empty radix portal containers (leftover from drawers/dialogs)
      document.querySelectorAll('[data-radix-portal]').forEach(el => {
        if (el.querySelector('[data-vaul-overlay], [data-vaul-drawer]') || el.children.length === 0) {
          el.remove();
        }
      });

      // Reset body styles that vaul/radix may have set
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
  }, [location.pathname]);
}
