import { Capacitor } from '@capacitor/core';

// Android-specific debug utilities
export const androidDebug = {
  isAndroid: () => Capacitor.getPlatform() === 'android',
  isNative: () => Capacitor.isNativePlatform(),
  
  // Enhanced logging for Android that works even when console doesn't
  log: (message: string, data?: any) => {
    const logMessage = `[Android Debug] ${message}`;
    
    // Standard console log
    console.log(logMessage, data);
    
    // For Android native, also try alternative logging
    if (androidDebug.isAndroid()) {
      try {
        // Store in localStorage as backup
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message: logMessage, data };
        const existing = localStorage.getItem('android_debug_logs') || '[]';
        const logs = JSON.parse(existing);
        logs.push(logEntry);
        // Keep only last 50 logs
        if (logs.length > 50) logs.shift();
        localStorage.setItem('android_debug_logs', JSON.stringify(logs));
      } catch (e) {
        // Silent fail for logging
      }
    }
  },
  
  // Critical error with alert fallback
  criticalError: (message: string, error?: any) => {
    const errorMessage = `CRITICAL: ${message}`;
    console.error(errorMessage, error);

    // Throttle critical notifications to avoid cascading issues
    const now = Date.now();
    try {
      const last = parseInt(localStorage.getItem('android_last_critical_ts') || '0', 10);
      if (!isNaN(last) && now - last < 5000) {
        // Within 5s window, only log
        console.warn('[Android Debug] Critical error throttled');
        return;
      }
      localStorage.setItem('android_last_critical_ts', String(now));
    } catch {}

    if (androidDebug.isAndroid()) {
      try {
        // Persist a lightweight critical flag for UI-based handling
        const payload = {
          timestamp: new Date().toISOString(),
          message,
          error: error ? (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error)) : undefined
        };
        localStorage.setItem('android_critical_error', JSON.stringify(payload));
        // Also write to our rolling logs
        androidDebug.log(`Critical error recorded: ${message}`, error);
      } catch (e) {
        console.error('Failed to persist critical error:', e);
      }
    }
  },
  
  // Get debug logs for troubleshooting
  getLogs: () => {
    try {
      const logs = localStorage.getItem('android_debug_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      return [];
    }
  },
  
  // Clear debug logs
  clearLogs: () => {
    try {
      localStorage.removeItem('android_debug_logs');
    } catch (e) {
      // Silent fail
    }
  }
};

// Safe JSON stringify for Android
export const safeSringify = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return '[Object too complex to stringify]';
  }
};

// Memory-safe object cloning for Android
export const safeClone = <T>(obj: T): T => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    androidDebug.log('Failed to clone object, returning original', e);
    return obj;
  }
};
