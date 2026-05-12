// Expo 환경에서 react-native-linear-gradient를 expo-linear-gradient로 대체하는 shim
const ExpoLinearGradient = require('expo-linear-gradient');
module.exports = ExpoLinearGradient;
module.exports.default = ExpoLinearGradient.LinearGradient;
