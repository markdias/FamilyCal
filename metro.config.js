// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure path aliases work correctly
config.resolver = {
  ...config.resolver,
  alias: {
    '@': __dirname,
  },
};

// Fix for react-native-screens web initialization issue
// Ensure react-native-web is resolved before react-native-screens on web
if (process.env.EXPO_PLATFORM === 'web' || process.env.NODE_ENV === 'web') {
  config.resolver.platforms = ['web', 'native', 'ios', 'android'];
}

module.exports = config;
