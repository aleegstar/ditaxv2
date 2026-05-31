/// <reference types="vite/client" />

// Build-time constant injected via vite `define` (see vite.config.ts).
// Used by the React Query persister as a cache buster so OTA updates
// invalidate the IndexedDB snapshot.
declare const __DITAX_BUILD_ID__: string;
