/**
 * Offline Service Worker registration.
 *
 * Hard guards (any failure → no register, plus best-effort unregister):
 *   - Must run inside Despia native WebView
 *   - Hostname must be localhost / 127.0.0.1 (Despia Local Server)
 *   - Never inside an iframe
 *   - Never on Lovable preview hosts
 *   - Kill-switch: ?sw-disable=1 in the URL
 *
 * Only caches static assets (see /public/sw-offline.js). HTML navigations,
 * Supabase, Edge Functions and the Despia manifest are NetworkOnly so OTA
 * updates and live data flow normally.
 */
import { isDespiaNative } from '@/lib/despia';

const SW_PATH = '/sw-offline.js';

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h.includes('lovableproject.com') ||
    h.includes('lovable.app') ||
    h.includes('id-preview--')
  );
}

function isLocalhost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

function killSwitchActive(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('sw-disable') === '1';
  } catch {
    return false;
  }
}

async function unregisterAll(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('ditax-offline-')).map((n) => caches.delete(n))
      );
    }
  } catch {
    /* noop */
  }
}

export async function initOfflineServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const shouldRegister =
    !killSwitchActive() &&
    !isInIframe() &&
    !isPreviewHost() &&
    isDespiaNative() &&
    isLocalhost();

  if (!shouldRegister) {
    await unregisterAll();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch (err) {
    console.warn('[offline-sw] registration failed', err);
  }
}
