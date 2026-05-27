/**
 * Despia keyboard handling
 *
 * Strategie (gemäß Despia-Doku):
 *   https://setup.despia.com/best-practices/frontend/structure#virtual-keyboard-adaptation
 *   https://setup.despia.com/native-features/prevent-autoscroll
 *
 * Wir nutzen in Despia bewusst die JS-gesteuerte Keyboard-Vermeidung:
 * - Native WebView-Autoverschiebung AUS via preventdefault://autoscroll
 * - Keyboard-Inset Messung via visualViewport (`useKeyboardDetection`)
 * - Chat-Footer wird im UI oberhalb der Tastatur positioniert
 *
 * Das entspricht exakt der Despia-Doku für Apps, die das Keyboard-Verhalten
 * selbst steuern. Die Fixed-Frame-Struktur im Chat bleibt erhalten; das
 * tatsächliche Ausweichen vor der Tastatur übernimmt aber unsere JS-Logik.
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
    console.log(
      '⌨️ Despia keyboard handling: native autoscroll disabled, JS keyboard avoidance active'
    );
  } catch (error) {
    console.error('⌨️ Failed to initialize Despia keyboard handling', error);
  }
}

export function isDespiaKeyboardInitialized(): boolean {
  return initialized;
}
