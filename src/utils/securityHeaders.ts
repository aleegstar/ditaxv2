/**
 * Security Headers and CSRF Protection
 * Phase 3 Security Enhancement
 */
import { Capacitor } from '@capacitor/core';

export interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableXFrameOptions?: boolean;
  enableXContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  customCSP?: string;
}

// Strict TLS Configuration for Production
export const STRICT_TLS_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

export class SecurityHeaders {
  private static readonly DEFAULT_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    "img-src 'self' data: https: blob: https://*.supabase.co",
    "media-src 'self' https://ditax.ch",
    "connect-src 'self' https://gqbhilftduwxjszznnzy.supabase.co wss://gqbhilftduwxjszznnzy.supabase.co https://api.openai.com",
    "frame-src 'self' https://ditax.productlift.dev",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; ');

  /**
   * Generate security headers for HTTP responses
   */
  static generateHeaders(config: SecurityHeadersConfig = {}): Record<string, string> {
    const headers: Record<string, string> = {
      ...STRICT_TLS_HEADERS
    };
    
    // Content Security Policy
    if (config.enableCSP !== false) {
      headers['Content-Security-Policy'] = config.customCSP || this.DEFAULT_CSP;
    }

    // HTTP Strict Transport Security
    if (config.enableHSTS !== false) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    // X-Frame-Options
    if (config.enableXFrameOptions !== false) {
      headers['X-Frame-Options'] = 'DENY';
    }

    // X-Content-Type-Options
    if (config.enableXContentTypeOptions !== false) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Referrer Policy
    if (config.enableReferrerPolicy !== false) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    }

    // Permissions Policy
    if (config.enablePermissionsPolicy !== false) {
      headers['Permissions-Policy'] = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'fullscreen=(self)',
        'picture-in-picture=()'
      ].join(', ');
    }

    // Additional security headers
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none';
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Resource-Policy'] = 'same-origin';
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';

    return headers;
  }

  /**
   * Apply security headers to HTML document
   * 
   * NOTE: This provides a backup layer of security (Defense-in-Depth Layer 2).
   * Primary CSP and security meta-tags are defined directly in index.html for
   * immediate protection from first HTML load. This method ensures they remain
   * present even if HTML is modified at runtime.
   * 
   * IMPORTANT: On Lovable hosting, HTTP headers from public/_headers are NOT
   * supported. We rely on meta-tags as the primary security mechanism until
   * migration to a platform that supports HTTP-level header configuration.
   */
  static applyToDocument(): void {
    // Skip security headers on native Capacitor apps to prevent WebView conflicts
    if (Capacitor.isNativePlatform()) {
      console.log('Skipping security headers on native platform');
      return;
    }

    // Add security-related meta tags
    const metaTags = [
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
      { 'http-equiv': 'Content-Security-Policy', content: this.DEFAULT_CSP }
    ];

    metaTags.forEach(({ name, 'http-equiv': httpEquiv, content }) => {
      const existingTag = document.querySelector(
        `meta[${name ? 'name' : 'http-equiv'}="${name || httpEquiv}"]`
      );
      
      if (!existingTag) {
        const meta = document.createElement('meta');
        if (name) meta.setAttribute('name', name);
        if (httpEquiv) meta.setAttribute('http-equiv', httpEquiv);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    });
  }
}

export class CSRFProtection {
  private static readonly CSRF_TOKEN_KEY = 'csrf_token';
  private static readonly CSRF_HEADER_NAME = 'X-CSRF-Token';

  /**
   * Initialize CSRF protection
   */
  static initialize(): void {
    // Generate CSRF token if not exists
    if (!this.getToken()) {
      this.generateToken();
    }

    // Add CSRF token to all forms
    this.addTokenToForms();

    // Set up automatic token refresh
    this.setupTokenRefresh();
  }

  /**
   * Generate new CSRF token
   */
  static generateToken(): string {
    const token = crypto.getRandomValues(new Uint8Array(32))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
    
    sessionStorage.setItem(this.CSRF_TOKEN_KEY, token);
    return token;
  }

  /**
   * Get current CSRF token
   */
  static getToken(): string | null {
    return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
  }

  /**
   * Validate CSRF token
   */
  static validateToken(token: string): boolean {
    const storedToken = this.getToken();
    if (!storedToken || !token) {
      return false;
    }

    // Constant-time comparison
    if (token.length !== storedToken.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Add CSRF token to forms
   */
  private static addTokenToForms(): void {
    const forms = document.querySelectorAll('form');
    const token = this.getToken();

    if (!token) return;

    forms.forEach(form => {
      // Skip if token already exists
      if (form.querySelector('input[name="csrf_token"]')) return;

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'csrf_token';
      input.value = token;
      form.appendChild(input);
    });
  }

  /**
   * Set up automatic token refresh
   */
  private static setupTokenRefresh(): void {
    // Refresh token every 30 minutes
    setInterval(() => {
      this.generateToken();
      this.addTokenToForms();
    }, 30 * 60 * 1000);
  }

  /**
   * Get headers with CSRF token
   */
  static getHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { [this.CSRF_HEADER_NAME]: token } : {};
  }

  /**
   * Fetch wrapper with CSRF protection
   */
  static async secureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      ...this.getHeaders(),
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers
    });
  }
}

// Auto-initialize security features
if (typeof window !== 'undefined') {
  // Apply security headers to document
  document.addEventListener('DOMContentLoaded', () => {
    SecurityHeaders.applyToDocument();
    CSRFProtection.initialize();
  });

  // Initialize immediately if DOM is already loaded (skip on native platforms)
  if (!Capacitor.isNativePlatform()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        SecurityHeaders.applyToDocument();
        CSRFProtection.initialize();
      });
    } else {
      SecurityHeaders.applyToDocument();
      CSRFProtection.initialize();
    }
  }
}
