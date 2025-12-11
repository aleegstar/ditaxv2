import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ch.ditax.app',
  appName: 'ditax-42',
  webDir: 'dist',
  server: {
    url: 'https://316cea7b-cd59-4e51-945e-829a5b4f8fa0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    App: {
      // Remove launchUrl to prevent redirect loop
    },
    Browser: {
      presentationStyle: 'popover'
    }
  }
};

export default config;