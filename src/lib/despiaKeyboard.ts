/**
 * Despia keyboard handling
 *
 * In der Despia-WebView verschiebt die native Schicht standardmäßig den
 * gesamten WebView, sobald die Tastatur erscheint (iOS:
 * contentInsetAdjustmentBehavior=.automatic, Android: SOFT_INPUT_ADJUST_RESIZE).
 *
 * Da wir das Chat-Composer-Layout selbst per `visualViewport` ausrichten,
 * muss diese native Auto-Anpassung global deaktiviert werden – sonst sitzt
 * unser fixed-positionierter Composer hinter dem Keyboard.
 *
 * Doku: https://setup.despia.com/native-features/prevent-autoscroll
 */
import despia from 'despia-native';
import { isDespiaNative } from './despia';

let initialized = false;

export function initDespiaKeyboardHandling(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (!isDespiaNative()) return;

  try {
    despia('preventdefault://autoscroll?enabled=false');
    initialized = true;
    console.log('⌨️ Despia native keyboard autoscroll disabled');
  } catch (error) {
    console.warn('⌨️ Failed to disable Despia keyboard autoscroll', error);
  }
}

export function isDespiaKeyboardInitialized(): boolean {
  return initialized;
}
