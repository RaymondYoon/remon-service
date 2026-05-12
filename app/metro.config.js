const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'react-native-linear-gradient': path.resolve(
    __dirname,
    'src/shims/react-native-linear-gradient.js'
  ),
};

module.exports = config;
