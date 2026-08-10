import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dypollabs.dypol',
  appName: 'Dypol',
  webDir: 'public',
  server: {
    url: 'https://dypol.vercel.app',
    cleartext: false
  }
};

export default config;
