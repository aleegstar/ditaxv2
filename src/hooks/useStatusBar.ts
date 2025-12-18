import { useEffect } from 'react';
import { isDespiaEnvironment } from '@/utils/platform';
import { setStatusBarLight, setStatusBarDark } from '@/utils/despiaStatusBar';

type StatusBarStyle = 'light' | 'dark';

/**
 * Custom hook to manage status bar styling in Despia environment
 * Sets the status bar style on mount and resets to dark on unmount
 * 
 * @param style - 'light' for white background/dark text, 'dark' for black background/white text
 */
export const useStatusBar = (style: StatusBarStyle): void => {
  useEffect(() => {
    if (!isDespiaEnvironment()) return;

    // Set the requested style on mount
    if (style === 'light') {
      setStatusBarLight();
    } else {
      setStatusBarDark();
    }

    // Reset to dark theme on unmount
    return () => {
      setStatusBarDark();
    };
  }, [style]);
};
