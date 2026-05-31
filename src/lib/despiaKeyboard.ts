/**
 * Despia keyboard handling
 *
 * Strategie:
 *   https://setup.despia.com/best-practices/frontend/structure#virtual-keyboard-adaptation
 *   https://setup.despia.com/native-features/prevent-autoscroll
 *
 * Wir lassen die native WebView-Autoverschiebung AKTIV. Despia hebt damit
 * den fokussierten Input automatisch über die Bildschirmtastatur — auf
 * jeder Seite, ohne JS-Logik pro View.
 *
 * Frühere Versionen haben `preventdefault://autoscroll?enabled=false`
 * gesendet und versucht, Tastatur-Avoidance selbst in JS zu lösen. Das
 * funktionierte in Despia nicht zuverlässig (visualViewport-Werte sind
 * in iOS-WebViews inkonsistent) → Inputs blieben verdeckt.
 *
 * Diese Init-Funktion ruft jetzt explizit `enabled=true`, um einen ggf.
 * persistierten Disable-State zu überschreiben.
 */
import despia from 'despia-native';
import { isDespiaNative } from './despia';

let initialized = false;

export function initDespiaKeyboardHandling(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (!isDespiaNative()) return;

  try {
    despia('preventdefault://autoscroll?enabled=true');
    initialized = true;
    console.log(
      '⌨️ Despia keyboard handling: native autoscroll ENABLED (WebView shifts focused input over keyboard)'
    );
  } catch (error) {
    console.error('⌨️ Failed to initialize Despia keyboard handling', error);
  }
}

export function isDespiaKeyboardInitialized(): boolean {
  return initialized;
}
