import { Capacitor } from '@capacitor/core';

// Robust platform detection for Android native environments
export const isAndroidNative = (): boolean => {
  try {
    return Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
};

// Check if running in Despia environment specifically
export const isDespiaEnvironment = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('despia');
};

// Fallback detection for WebView environments (like Appelix or Despia)
export const isWebViewAndroidFallback = (): boolean => {
  if (isAndroidNative()) return true;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('android') && (
    userAgent.includes('wv') || 
    userAgent.includes('webview') ||
    userAgent.includes('appelix') ||
    userAgent.includes('despia')
  );
};

// Check if we're in any Android environment that might have rendering issues
export const isAndroidEnvironment = (): boolean => {
  return isAndroidNative() || isWebViewAndroidFallback();
};

// Check if we're in a mobile app context (Despia, Capacitor, or WebView)
export const isMobileAppContext = (): boolean => {
  return Capacitor.isNativePlatform() || isDespiaEnvironment() || isWebViewAndroidFallback();
};
