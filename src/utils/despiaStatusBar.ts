import { isDespiaEnvironment } from './platform';

/**
 * Safely call Despia native functions
 * Only executes in Despia environment
 */
export const despia = (command: string): void => {
  if (isDespiaEnvironment() && typeof window !== 'undefined' && (window as any).despia) {
    try {
      (window as any).despia(command);
    } catch (error) {
      console.warn('Despia command failed:', command, error);
    }
  }
};

/**
 * Set status bar to light theme (white background, dark text)
 * Use on pages with light backgrounds
 */
export const setStatusBarLight = (): void => {
  despia('statusbarcolor://255, 255, 255');
  despia('statusbartextcolor://black');
};

/**
 * Set status bar to dark theme (black background, white text)
 * Use on pages with dark backgrounds (default)
 */
export const setStatusBarDark = (): void => {
  despia('statusbarcolor://0, 0, 0');
  despia('statusbartextcolor://white');
};
