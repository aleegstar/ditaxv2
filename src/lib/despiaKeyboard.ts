/**
 * Despia keyboard handling
 *
 * Strategie (gemäß Despia-Doku):
 *   https://setup.despia.com/best-practices/frontend/structure#virtual-keyboard-adaptation
 *   https://setup.despia.com/native-features/prevent-autoscroll
 *
 * Wir verwenden die von Despia empfohlene Fixed-Frame-Struktur
 * (siehe `src/pages/Chat.tsx`: position: fixed inset-0, flex-column,
 *  Header/Footer flex-shrink-0, Content flex-1 overflow-y-auto).
 *
 * In diesem Modell passt sich die WebView automatisch an die virtuelle
 * Tastatur an – wir dürfen deshalb `preventdefault://autoscroll` NICHT
 * deaktivieren, sonst entsteht genau das Problem, dass der Composer hinter
 * dem Keyboard verschwindet.
 *
 * Die Funktion bleibt aus Kompatibilitätsgründen exportiert, ist aber ein
 * No-Op. Falls wir später wieder eigenes JS-Keyboard-Handling brauchen,
 * kann hier `preventdefault://autoscroll?enabled=false` reaktiviert werden.
 */
import { isDespiaNative } from './despia';

let initialized = false;

export function initDespiaKeyboardHandling(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (!isDespiaNative()) return;

  initialized = true;
  console.log(
    '⌨️ Despia keyboard handling: native auto-adaptation active (fixed-frame layout)'
  );
}

export function isDespiaKeyboardInitialized(): boolean {
  return initialized;
}
