import { useEffect } from 'react';
import { isDespiaNative } from '@/lib/despia';

type VirtualKeyboardWithBounds = {
  overlaysContent?: boolean;
  boundingRect?: DOMRectReadOnly;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

type NavigatorWithVirtualKeyboard = Navigator & {
  virtualKeyboard?: VirtualKeyboardWithBounds;
};

/**
 * Globaler Hook: schreibt den unteren Tastatur-Inset (in px) als CSS-Variable
 * `--keyboard-inset` auf `<html>`. So können beliebige Komponenten via
 * `calc(var(--keyboard-inset) + env(safe-area-inset-bottom))` reagieren,
 * ohne ihren eigenen Listener zu führen.
 *
 * Wirkung:
 * - Chrome/Safari/PWA: meldet `visualViewport` die Höhe der Bildschirmtastatur,
 *   wir berechnen `innerHeight - (vv.height + vv.offsetTop)` und speichern.
 * - Despia-Native: WebView verschiebt Inputs automatisch (siehe `despiaKeyboard`).
 *   Hier liefert visualViewport keinen Tastatur-Inset, also bleibt der Wert 0.
 *
 * Nur einmal im App-Root mounten.
 */
export function useVisualViewportInset(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    const virtualKeyboard = (navigator as NavigatorWithVirtualKeyboard).virtualKeyboard;

    let rafId: number | null = null;
    let lastValue = -1;

    const compute = () => {
      rafId = null;
      const innerHeight = window.innerHeight;
      const visualHeight = vv?.height ?? innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const visualViewportInset = Math.max(0, Math.round(innerHeight - (visualHeight + offsetTop)));
      const keyboardRect = virtualKeyboard?.boundingRect;
      const virtualKeyboardInset = keyboardRect
        ? Math.max(0, Math.round(innerHeight - keyboardRect.y))
        : 0;
      const inset = Math.max(visualViewportInset, virtualKeyboardInset);
      // In Despia: zur Sicherheit fest auf 0 (native autoscroll macht den Job)
      const value = isDespiaNative() ? 0 : inset;
      if (value === lastValue) return;
      lastValue = value;
      root.style.setProperty('--keyboard-inset', `${value}px`);
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(compute);
    };

    compute();

    if (virtualKeyboard) {
      try {
        virtualKeyboard.overlaysContent = true;
      } catch {
        // noop – some implementations expose the API read-only.
      }
    }

    if (vv) {
      vv.addEventListener('resize', schedule);
      vv.addEventListener('scroll', schedule);
    }
    virtualKeyboard?.addEventListener?.('geometrychange', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('focusin', schedule, true);
    document.addEventListener('focusout', schedule, true);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      if (vv) {
        vv.removeEventListener('resize', schedule);
        vv.removeEventListener('scroll', schedule);
      }
      virtualKeyboard?.removeEventListener?.('geometrychange', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('focusin', schedule, true);
      document.removeEventListener('focusout', schedule, true);
      root.style.setProperty('--keyboard-inset', '0px');
    };
  }, []);
}
