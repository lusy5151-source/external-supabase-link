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
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
    LocalNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: true,
    backgroundColor: '#F8FAED',
  },
};

export default config;
