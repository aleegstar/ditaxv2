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
  // Primary check: window.despia function exists (most reliable)
  if (typeof window !== 'undefined' && typeof (window as any).despia !== 'undefined') {
    return true;
  }
  // Fallback: userAgent check
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

// Check if we're definitely in a desktop browser (not mobile at all)
export const isDesktopBrowser = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for mobile indicators
  const hasMobileIndicator = 
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('ipod') ||
    ua.includes('mobile') ||
    ua.includes('webview') ||
    ua.includes('wv');
  
  // If no mobile indicators, it's a desktop browser
  return !hasMobileIndicator;
};

// Check if we're in a mobile app context (Despia, Capacitor, or WebView)
// IMPORTANT: Desktop browsers should always return false here
export const isMobileAppContext = (): boolean => {
  // Explicit desktop browser check first - never treat desktop as mobile
  if (isDesktopBrowser()) {
    return false;
  }
  
  return Capacitor.isNativePlatform() || isDespiaEnvironment() || isWebViewAndroidFallback();
};
