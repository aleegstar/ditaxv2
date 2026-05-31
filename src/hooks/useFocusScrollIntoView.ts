import { useEffect } from 'react';

/**
 * Globaler Hook: stellt sicher, dass bei Fokus eines Input/Textarea das
 * Element bei geöffneter Bildschirmtastatur im sichtbaren Bereich landet.
 *
 * Wichtig:
 * - Läuft in **allen** Umgebungen (Browser, PWA, Despia-Native), weil auch
 *   in Despia Inputs in verschachtelten Scroll-Containern verdeckt werden
 *   können — der native Autoscroll erreicht nur das oberste WebView-Fenster.
 * - Scrollt zuerst den **nächsten scrollbaren Vorfahren** so, dass der Input
 *   sichtbar wird, und fällt anschliessend auf `scrollIntoView` zurück.
 * - Wartet ein paar Frames, damit visualViewport / Tastatur ihre neue Höhe
 *   melden, bevor wir messen.
 */
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(el.tagName)) {
    if (el.tagName === 'INPUT') {
      const type = (el as HTMLInputElement).type;
      if (
        type === 'checkbox' ||
        type === 'radio' ||
        type === 'button' ||
        type === 'submit' ||
        type === 'hidden' ||
        type === 'file'
      ) {
        return false;
      }
    }
    return true;
  }
  return el.isContentEditable;
}

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function applyKeyboardOffset(el: HTMLElement) {
  const root = document.documentElement;
  const rawInset = root.style.getPropertyValue('--keyboard-inset').trim();
  const inset = Number.parseFloat(rawInset || '0');

  if (!Number.isFinite(inset) || inset <= 0) {
    root.style.removeProperty('--keyboard-focus-offset');
    return;
  }

  const rect = el.getBoundingClientRect();
  const visibleBottom = getVisibleBottom();
  const margin = 20;
  const overlap = rect.bottom + margin - visibleBottom;

  root.style.setProperty('--keyboard-focus-offset', `${Math.max(0, Math.ceil(overlap))}px`);
}

function getVisibleBottom(): number {
  const vv = window.visualViewport;
  if (vv) return vv.offsetTop + vv.height;
  return window.innerHeight;
}

function bringIntoView(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const visibleTop = window.visualViewport?.offsetTop ?? 0;
  const visibleBottom = getVisibleBottom();
  const margin = 24;

  // Bereits komplett sichtbar?
  if (rect.top >= visibleTop + margin && rect.bottom <= visibleBottom - margin) return;

  const scroller = findScrollableAncestor(el);
  if (scroller) {
    const scrollerRect = scroller.getBoundingClientRect();
    // Ziel: Input vertikal zentriert im Sichtbereich
    const desiredCenterY = visibleTop + (visibleBottom - visibleTop) / 2;
    const inputCenterY = rect.top + rect.height / 2;
    const delta = inputCenterY - desiredCenterY;
    if (Math.abs(delta) > 4) {
      scroller.scrollTo({
        top: Math.max(0, scroller.scrollTop + delta),
        behavior: 'smooth',
      });
    }
    // Wenn der Scroller selbst nicht ausreicht, zusätzlich scrollIntoView
    if (scrollerRect.bottom > visibleBottom || scrollerRect.top < visibleTop) {
      try {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch {
        el.scrollIntoView();
      }
    }
    return;
  }

  try {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } catch {
    el.scrollIntoView();
  }
}

export function useFocusScrollIntoView(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: number | null = null;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isEditable(target)) return;
      const el = target as HTMLElement;

      if (timer != null) window.clearTimeout(timer);
      // Erst nach Tastatur-Animation messen (iOS ~300ms, Android ~150ms)
      timer = window.setTimeout(() => {
        timer = null;
        bringIntoView(el);
        applyKeyboardOffset(el);
        // Zweiter Pass, falls visualViewport später noch sinkt
        window.setTimeout(() => {
          bringIntoView(el);
          applyKeyboardOffset(el);
        }, 250);
      }, 300);
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !isEditable(active)) {
          document.documentElement.style.removeProperty('--keyboard-focus-offset');
        }
      }, 0);
    };

    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);

    const vv = window.visualViewport;
    const onViewportResize = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && isEditable(active)) {
        bringIntoView(active);
        applyKeyboardOffset(active);
      }
    };
    vv?.addEventListener('resize', onViewportResize);

    return () => {
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      vv?.removeEventListener('resize', onViewportResize);
      document.documentElement.style.removeProperty('--keyboard-focus-offset');
    };
  }, []);
}
