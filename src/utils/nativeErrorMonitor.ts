import { Capacitor } from '@capacitor/core';
import { androidDebug } from './androidDebug';

interface ErrorBreadcrumb {
  timestamp: string;
  type: 'navigation' | 'user-action' | 'error' | 'console' | 'system';
  message: string;
  data?: any;
}

class NativeErrorMonitor {
  private static breadcrumbs: ErrorBreadcrumb[] = [];
  private static maxBreadcrumbs = 50;
  private static initialized = false;

  static init() {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }

    this.initialized = true;
    androidDebug.log('NativeErrorMonitor: Initializing for native platform');

    // Hook global error handlers
    this.setupGlobalErrorHandlers();
    
    // Hook console methods
    this.setupConsoleInterception();
    
    // Hook navigation
    this.setupNavigationTracking();
    
    this.addBreadcrumb('system', 'NativeErrorMonitor initialized');
  }

  private static setupGlobalErrorHandlers() {
    // Unhandled JavaScript errors
    window.onerror = (message, source, lineno, colno, error) => {
      const errorInfo = {
        message: String(message),
        source,
        lineno,
        colno,
        stack: error?.stack
      };
      
      this.addBreadcrumb('error', `Global Error: ${message}`, errorInfo);
      androidDebug.criticalError('Unhandled JavaScript Error', errorInfo);
      
      // Don't prevent default handling
      return false;
    };

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorInfo = {
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack
      };
      
      this.addBreadcrumb('error', `Unhandled Promise Rejection: ${event.reason}`, errorInfo);
      androidDebug.criticalError('Unhandled Promise Rejection', errorInfo);
    });
  }

  private static setupConsoleInterception() {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = (...args) => {
      this.addBreadcrumb('console', `Console Error: ${args[0]}`, args);
      androidDebug.log('Console Error captured', args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addBreadcrumb('console', `Console Warn: ${args[0]}`, args);
      androidDebug.log('Console Warn captured', args);
      originalWarn.apply(console, args);
    };

    // Don't intercept regular console.log to avoid recursion with androidDebug
  }

  private static setupNavigationTracking() {
    // Track route changes
    let currentPath = window.location.pathname;
    
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        this.addBreadcrumb('navigation', `Route changed: ${currentPath} -> ${window.location.pathname}`);
        currentPath = window.location.pathname;
      }
    });

    observer.observe(document, { childList: true, subtree: true });

    // Track user interactions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const elementInfo = {
        tagName: target.tagName,
        className: target.className,
        id: target.id,
        textContent: target.textContent?.slice(0, 50)
      };
      
      this.addBreadcrumb('user-action', `Click: ${target.tagName}`, elementInfo);
    }, true);
  }

  static addBreadcrumb(type: ErrorBreadcrumb['type'], message: string, data?: any) {
    const breadcrumb: ErrorBreadcrumb = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };

    this.breadcrumbs.push(breadcrumb);
    
    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('native_error_breadcrumbs', JSON.stringify(this.breadcrumbs));
    } catch (e) {
      // Silent fail
    }
  }

  static getBreadcrumbs(): ErrorBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  static clearBreadcrumbs() {
    this.breadcrumbs = [];
    try {
      localStorage.removeItem('native_error_breadcrumbs');
    } catch (e) {
      // Silent fail
    }
  }

  static getDebugReport() {
    return {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      breadcrumbs: this.getBreadcrumbs(),
      androidLogs: androidDebug.getLogs()
    };
  }
}

export { NativeErrorMonitor };
