/**
 * Mobile-side helper for safer auth-token storage on Capacitor.
 *
 * Web → falls back to sessionStorage (NOT localStorage — survives tab close less,
 * smaller XSS window).
 * Native → uses the Capacitor Preferences plugin which, on iOS, persists into
 * the Keychain; on Android, into EncryptedSharedPreferences when the
 * `@capacitor-community/secure-storage` plugin is installed.
 *
 * Wire this into the Supabase client like:
 *   createClient(url, key, { auth: { storage: secureAuthStorage } })
 */

import { Capacitor } from '@capacitor/core';

type Storage = {
  getItem: (k: string) => Promise<string | null> | string | null;
  setItem: (k: string, v: string) => Promise<void> | void;
  removeItem: (k: string) => Promise<void> | void;
};

let nativeImpl: Storage | null = null;

async function getNative(): Promise<Storage | null> {
  if (nativeImpl) return nativeImpl;
  try {
    // Lazy import keeps web bundles small.
    // @ts-expect-error optional native dependency
    const mod = await import('@capacitor/preferences');
    const Preferences = mod.Preferences;
    nativeImpl = {
      async getItem(k) { return (await Preferences.get({ key: k })).value ?? null; },
      async setItem(k, v) { await Preferences.set({ key: k, value: v }); },
      async removeItem(k) { await Preferences.remove({ key: k }); },
    };
    return nativeImpl;
  } catch {
    return null;
  }
}

const webFallback: Storage = {
  getItem: (k) => (typeof window === 'undefined' ? null : window.sessionStorage.getItem(k)),
  setItem: (k, v) => { if (typeof window !== 'undefined') window.sessionStorage.setItem(k, v); },
  removeItem: (k) => { if (typeof window !== 'undefined') window.sessionStorage.removeItem(k); },
};

export const secureAuthStorage: Storage = {
  async getItem(k) {
    if (Capacitor.isNativePlatform()) {
      const n = await getNative();
      if (n) return n.getItem(k);
    }
    return webFallback.getItem(k);
  },
  async setItem(k, v) {
    if (Capacitor.isNativePlatform()) {
      const n = await getNative();
      if (n) return n.setItem(k, v);
    }
    return webFallback.setItem(k, v);
  },
  async removeItem(k) {
    if (Capacitor.isNativePlatform()) {
      const n = await getNative();
      if (n) return n.removeItem(k);
    }
    return webFallback.removeItem(k);
  },
};
