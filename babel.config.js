// babel.config.js — added for on-device pose tracking. Before this the project relied on
// Expo/Metro's default babel-preset-expo with no config file. Two things require an explicit
// config now:
//   1. react-native-worklets-core/plugin — transforms the VisionCamera frame-processor
//      worklets that react-native-mediapipe runs pose detection inside. Must be listed here;
//      it is NOT auto-added by the preset.
//   2. babel-preset-expo still auto-configures react-native-reanimated when it's installed,
//      so we don't list a reanimated plugin explicitly.
//
// NOTE (Phase 0 gate): worklets-core (VisionCamera) and react-native-worklets (Reanimated 4)
// are two worklet runtimes coexisting. If the on-device build surfaces worklet/babel errors,
// plugin ordering here is the first thing to adjust.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets-core/plugin'],
  };
};
