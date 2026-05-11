import type { CapacitorConfig } from '@capacitor/cli';

/**
 * SECURITY:
 *  - Production builds MUST NOT contain `server.url` (would load remote code → MITM risk).
 *  - `cleartext` is only enabled for local dev; never for shipped binaries.
 *  - For physical-device dev hot-reload, set CAP_DEV_SERVER_URL=https://… and CAP_DEV=1.
 */
const isDev = process.env.CAP_DEV === '1';
const devServerUrl = process.env.CAP_DEV_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'ch.ditax.app',
  appName: 'Ditax',
  webDir: 'dist',
  ...(isDev && devServerUrl
    ? { server: { url: devServerUrl, cleartext: false, androidScheme: 'https' } }
    : { server: { androidScheme: 'https' } }),
  plugins: {
    CapacitorHttp: { enabled: true }, // Native TLS path — enables cert-pinning configs
    App: {},
    Browser: { presentationStyle: 'popover' },
  },
};

export default config;
