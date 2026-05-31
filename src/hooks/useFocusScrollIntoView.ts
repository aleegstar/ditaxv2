import { useEffect } from 'react';
import { isDespiaNative } from '@/lib/despia';

/**
 * Globaler Hook: stellt sicher, dass beim Fokussieren eines Input/Textarea
 * das Element bei geöffneter Bildschirmtastatur in den sichtbaren Bereich
 * gescrollt wird (PWA / Browser auf iOS, wo `interactive-widget` nicht greift).
 *
 * - In Despia-Native: deaktiviert (native WebView macht das Scrolling selbst).
 * - Wartet ~200ms nach focusin, damit visualViewport seine neue Höhe meldet.
 * - Scrollt nur, wenn das Element tatsächlich verdeckt wäre.
 */
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(el.tagName)) {
    if (el.tagName === 'INPUT') {
      const type = (el as HTMLInputElement).type;
      if (type === 'checkbox' || type === 'radio' || type === 'button' || type === 'submit') {
        return false;
      }
    }
    return true;
  }
  return el.isContentEditable;
}

export function useFocusScrollIntoView(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isDespiaNative()) return; // native WebView regelt das

    let timer: number | null = null;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isEditable(target)) return;

      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        const el = target as HTMLElement;
        // nur scrollen, wenn Tastatur tatsächlich offen ist
        const keyboardInsetRaw = getComputedStyle(document.documentElement)
          .getPropertyValue('--keyboard-inset')
          .trim();
        const keyboardInset = parseInt(keyboardInsetRaw, 10) || 0;
        if (keyboardInset <= 0) return;

        const vv = window.visualViewport;
        const viewportTop = vv?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (vv?.height ?? window.innerHeight);
        const rect = el.getBoundingClientRect();

        // Wenn Input bereits komplett im sichtbaren Bereich: nichts tun
        if (rect.top >= viewportTop + 8 && rect.bottom <= viewportBottom - 8) return;

        try {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {
          el.scrollIntoView();
        }
      }, 200);
    };

    document.addEventListener('focusin', onFocusIn, true);

    return () => {
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn, true);
    };
  }, []);
}
