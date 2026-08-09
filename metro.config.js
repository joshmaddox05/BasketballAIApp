// metro.config.js
// Added to fix a Reanimated 4 / react-native-worklets boot crash on Expo:
//   "[runtime not ready]: ReferenceError: Property 'c' doesn't exist" (thrown during
//   the Worklets init pipeline, before the runtime is ready).
//
// Per the react-native-worklets troubleshooting docs, Expo apps disable Metro's
// `inlineRequires` by default, which breaks the Worklets initialization pipeline
// (same root cause as the documented "createSerializableString of undefined" /
// "right operand of 'in' is not an object" errors — see reanimated issue #9445).
// Re-enabling `inlineRequires` restores the init pipeline. This does not touch the
// VisionCamera/worklets-core (pose) babel setup.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = config;
