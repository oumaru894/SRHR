import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      // Android needs the actual IP address in dev mode, not localhost
      return 'http://10.0.2.2:5000'; // Android emulator
    }
    if (Platform.OS === 'ios') {
      return 'http://127.0.0.1:5000'; // iOS simulator
    }
    return 'http://127.0.0.1:5000'; // Web
  }
  // Production environment
  return 'https://your-production-api-url.com'; // Replace with your actual production API URL
};

export const API_URL = getBaseUrl();
