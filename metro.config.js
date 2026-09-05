// metro.config.js
//
// getSentryExpoConfig (not getDefaultConfig) — the Sentry wizard swapped this in
// so release builds emit the source maps that make a stack trace readable. It is
// a superset of the Expo default.
//
// DO NOT REMOVE the inlineRequires override below. Expo disables Metro's
// inlineRequires by default, which breaks the react-native-worklets init
// pipeline and crashes the app at boot with:
//   "[runtime not ready]: ReferenceError: Property 'c' doesn't exist"
// (same root cause as the documented "createSerializableString of undefined" /
// "right operand of 'in' is not an object" errors — reanimated issue #9445).
// The wizard rewrote this file and deleted that explanation; it is restored here
// because the next person to touch it would otherwise have no idea why it exists.
// This does not touch the VisionCamera/worklets-core (pose) babel setup.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = config;
