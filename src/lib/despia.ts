/**
 * Despia SDK Helper Functions
 * Centralized utilities for Despia native app integration
 * 
 * Deeplink Format: {scheme}://oauth/{path}?params
 * - scheme: Your app's deeplink scheme (e.g., ditax)
 * - oauth/: Required prefix - tells native code to close browser session
 * - path: Where to navigate in your app (e.g., auth)
 * - params: Query params passed to that page
 * 
 * Example: ditax://oauth/auth?access_token=xxx
 * -> Closes ASWebAuthenticationSession/Chrome Custom Tab
 * -> Navigates WebView to /auth?access_token=xxx
 */
import despia from 'despia-native';

// Deeplink scheme configured in Despia Dashboard
export const DEEPLINK_SCHEME = "ditax";

// Supabase configuration
export const SUPABASE_URL = "https://gqbhilftduwxjszznnzy.supabase.co";

/**
 * Check if running in Despia native environment
 * IMPORTANT: Only use UserAgent check - the despia-native package is always available,
 * even in browsers, so checking for it would give false positives
 */
export const isDespiaNative = (): boolean => {
  const isDespia = typeof navigator !== 'undefined' && 
         navigator.userAgent.toLowerCase().includes('despia');
  
  if (isDespia) {
    console.log('📱 Despia native detected via userAgent');
  }
  
  return isDespia;
};

/**
 * Build a deeplink URL for native app navigation
 */
/**
 * Build a deeplink URL for native app navigation
 * IMPORTANT: Deeplink must be exactly ditax://oauth (not ditax://oauth/auth)
 * because that's what's registered in Android. The path param is ignored.
 * Despia will navigate WebView to /?params when receiving this deeplink.
 */
export const buildDeeplinkUrl = (path: string, params: Record<string, string>): string => {
  const queryString = new URLSearchParams(params).toString();
  // Format: ditax://oauth/{path}?params - oauth/ prefix closes browser session
  return `${DEEPLINK_SCHEME}://oauth/${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Build OAuth URL for Despia Easy OAuth flow
 * Uses Implicit Grant (response_type: token) as per Despia docs
 */
export const buildOAuthUrl = (provider: 'google' | 'apple', redirectTo: string): string => {
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    response_type: 'token',
    scope: 'openid email profile',
  });
  
  return `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
};

/**
 * Detect if running on iOS in Despia
 */
export const isDespiaIOS = (): boolean => {
  // Despia only supports iOS and Android.
  // If it's Despia but NOT Android, it must be iOS.
  // This catches iPhones/iPads even when the WebView sends a non-standard User-Agent.
  const isIOS = isDespiaNative() && !isDespiaAndroid();
  
  if (isIOS) {
    console.log('📱 Despia iOS detected (not Android):', { userAgent: navigator.userAgent });
  }
  
  return isIOS;
};

/**
 * Detect if running on Android in Despia
 */
export const isDespiaAndroid = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return isDespiaNative() && ua.includes('android');
};

/**
 * Trigger Despia Easy OAuth flow using the oauth:// protocol
 * 
 * According to Despia documentation:
 * Uses despia('oauth://?url=...') to open OAuth in secure browser session
 * (ASWebAuthenticationSession on iOS, Chrome Custom Tabs on Android)
 * 
 * @returns true if despia() was called successfully, false otherwise
 */
export const triggerDespiaOAuth = (oauthUrl: string): void => {
  console.log('🔗 triggerDespiaOAuth called');
  console.log('🔗 OAuth URL:', oauthUrl);
  
  // Use Despia SDK oauth:// protocol to open in secure browser session
  const despiaCommand = `oauth://?url=${encodeURIComponent(oauthUrl)}`;
  console.log('📱 Despia command:', despiaCommand);
  
  // Direkter Aufruf gemäß Despia-Dokumentation - kein Try/Catch nötig
  console.log('📱 Calling despia() with command...');
  despia(despiaCommand);
  console.log('✅ despia() called');
};

/**
 * Native Stripe Payment Sheet via Despia
 * Docs: https://setup.despia.com/payments/stripe/payment
 *
 * Wichtig: Listener `window.stripeEvent` MUSS vor dem Aufruf gesetzt sein.
 * Das Sheet feuert `window.stripeEvent` genau einmal mit dem Outcome.
 */
export type StripePaymentSheetEvent =
  | { method: 'paymentSheet'; status: 'completed' }
  | { method: 'paymentSheet'; status: 'canceled' }
  | { method: 'paymentSheet'; status: 'failed'; error: string };

declare global {
  interface Window {
    stripeEvent?: (event: StripePaymentSheetEvent) => void;
  }
}

export const triggerDespiaStripePaymentSheet = (params: {
  publishableKey: string;
  clientSecret: string;
  customerId?: string;
  ephemeralKeySecret?: string;
  theme?: 'light' | 'dark' | 'automatic';
  accentColor?: string; // hex ohne # (z. B. "1E3A5F")
  cornerRadius?: number;
  actionCornerRadius?: number;
}): void => {
  const qs = new URLSearchParams();
  qs.set('publishable_key', params.publishableKey);
  qs.set('payment_intent_client_secret', params.clientSecret);
  if (params.customerId && params.ephemeralKeySecret) {
    qs.set('customer_id', params.customerId);
    qs.set('ephemeral_key_secret', params.ephemeralKeySecret);
  }
  if (params.theme) qs.set('theme', params.theme);
  if (params.accentColor) qs.set('accent_color', params.accentColor.replace(/^#/, ''));
  if (typeof params.cornerRadius === 'number') qs.set('corner_radius', String(params.cornerRadius));
  if (typeof params.actionCornerRadius === 'number') qs.set('action_corner_radius', String(params.actionCornerRadius));

  const cmd = `stripe://payment?${qs.toString()}`;
  console.log('💳 Despia stripe://payment', { hasCustomer: !!params.customerId });
  despia(cmd);
};

/**
 * Native Action Sheet via Despia (actionsheet://)
 * Docs: https://setup.despia.com/native-features/action-sheet
 *
 * Globaler window.onSheetEvent wird einmalig installiert; pro Aufruf
 * setzen wir einen Pending-Resolver. Wenn parallel ein zweiter Aufruf
 * kommt, wird der ältere mit null aufgelöst (dismiss).
 */
export type ActionSheetItem = {
  label: string;
  value: string;
  iconIos?: string;
  iconAndroid?: string;
  destructive?: boolean;
};

declare global {
  interface Window {
    onSheetEvent?: (value: string | null) => void;
  }
}

let sheetPending: { resolve: (v: string | null) => void; timer: ReturnType<typeof setTimeout> } | null = null;
let sheetDispatcherInstalled = false;

function ensureSheetDispatcher() {
  if (sheetDispatcherInstalled || typeof window === 'undefined') return;
  const prev = window.onSheetEvent;
  window.onSheetEvent = (value) => {
    try { prev?.(value); } catch { /* ignore */ }
    const p = sheetPending;
    if (!p) return;
    sheetPending = null;
    clearTimeout(p.timer);
    p.resolve(value);
  };
  sheetDispatcherInstalled = true;
}

export function despiaActionSheet(opts: {
  title?: string;
  items: ActionSheetItem[];
  theme?: 'light' | 'dark' | 'system';
  timeoutMs?: number;
}): Promise<string | null> {
  if (!isDespiaNative()) return Promise.resolve(null);
  ensureSheetDispatcher();

  // Concurrent call: dismiss the previous sheet
  if (sheetPending) {
    const stale = sheetPending;
    sheetPending = null;
    clearTimeout(stale.timer);
    stale.resolve(null);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (sheetPending && sheetPending.resolve === resolve) {
        sheetPending = null;
        resolve(null);
      }
    }, opts.timeoutMs ?? 30000);
    sheetPending = { resolve, timer };

    const params = new URLSearchParams();
    if (opts.title) params.set('title', opts.title);
    params.set('items', JSON.stringify(opts.items));
    if (opts.theme) params.set('theme', opts.theme);

    try {
      despia(`actionsheet://?${params.toString()}`);
    } catch (e) {
      clearTimeout(timer);
      sheetPending = null;
      console.error('despia actionsheet failed', e);
      resolve(null);
    }
  });
}



/**
 * Trigger Despia Passkey Authentication via System Browser
 * Opens the WebAuthn auth page in the system browser (not WebView)
 * which allows full access to the device's keychain for passkey auth
 */
export const triggerDespiaPasskeyAuth = (email?: string): void => {
  // Build the WebAuthn auth URL with optional email parameter
  const params = new URLSearchParams({ despia: 'true' });
  if (email) {
    params.set('email', email);
  }
  
  const authUrl = `https://app.ditax.ch/webauthn-auth?${params.toString()}`;
  
  console.log('🔐 Triggering Despia Passkey Auth via System Browser:', authUrl);
  
  // Use the same mechanism as OAuth to open in system browser
  triggerDespiaOAuth(authUrl);
};

/**
 * Despia Vision OCR (on-device, iOS Vision Kit / Android ML Kit)
 * Docs: https://setup.despia.com/machine-learning/vision/ocr
 *
 * Bilddaten verlassen das Gerät NICHT. Liefert nur Roh-Text zurück.
 * Wir multiplexen window.onVisionEvent anhand der Request-ID, damit
 * mehrere parallele Aufrufe (und evtl. fremde Handler) koexistieren.
 */
type VisionEvent = {
  type: 'ocr';
  id: string;
  status: 'queued' | 'success' | 'error' | 'dismissed';
  text?: string;
  lines?: Array<{ text?: string } | string>;
  error?: { code?: string; message?: string };
};

type Pending = {
  resolve: (v: { text: string; lines: string[] }) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const visionPending = new Map<string, Pending>();
let visionDispatcherInstalled = false;

function ensureVisionDispatcher() {
  if (visionDispatcherInstalled || typeof window === 'undefined') return;
  const prev = (window as any).onVisionEvent as ((e: VisionEvent) => void) | undefined;
  (window as any).onVisionEvent = (evt: VisionEvent) => {
    try { prev?.(evt); } catch { /* ignore */ }
    if (!evt || evt.type !== 'ocr') return;
    const p = visionPending.get(evt.id);
    if (!p) return;
    if (evt.status === 'success') {
      clearTimeout(p.timer);
      visionPending.delete(evt.id);
      const lines = (evt.lines ?? [])
        .map((l) => (typeof l === 'string' ? l : l?.text ?? ''))
        .filter((s) => s && s.trim().length > 0);
      p.resolve({ text: evt.text ?? '', lines });
    } else if (evt.status === 'error' || evt.status === 'dismissed') {
      clearTimeout(p.timer);
      visionPending.delete(evt.id);
      p.reject(new Error(evt.error?.code ?? evt.status));
    }
  };
  visionDispatcherInstalled = true;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error('file_read_failed'));
    r.readAsDataURL(file);
  });
}

export async function despiaVisionOcr(
  file: File,
  opts: { lang?: string; timeoutMs?: number } = {}
): Promise<{ text: string; lines: string[] }> {
  if (!isDespiaNative()) throw new Error('not_despia');
  ensureVisionDispatcher();

  const dataUrl = await fileToDataUrl(file);
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const lang = opts.lang ?? 'de-CH,de-DE,en-US,fr-CH,it-CH';
  const timeoutMs = opts.timeoutMs ?? 15000;

  return new Promise<{ text: string; lines: string[] }>((resolve, reject) => {
    const timer = setTimeout(() => {
      visionPending.delete(id);
      reject(new Error('timeout'));
    }, timeoutMs);
    visionPending.set(id, { resolve, reject, timer });
    try {
      despia(
        `vision://ocr?id=${encodeURIComponent(id)}&src=${encodeURIComponent(dataUrl)}&lang=${encodeURIComponent(lang)}`
      );
    } catch (e) {
      clearTimeout(timer);
      visionPending.delete(id);
      reject(e instanceof Error ? e : new Error('despia_call_failed'));
    }
  });
}
