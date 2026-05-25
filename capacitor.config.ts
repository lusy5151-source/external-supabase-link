import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wandeung.app',
  appName: '완등',
  webDir: 'dist',
  server: {
    iosScheme: 'https',
  },
  plugins: {
    Browser: {
      presentationStyle: 'popover',
    },
  },
};

export default config;
