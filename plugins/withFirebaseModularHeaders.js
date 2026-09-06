// withFirebaseModularHeaders.js — Expo config plugin that unblocks `pod install`.
//
// THE ERROR THIS FIXES:
//   The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
//   `RecaptchaInterop`, which do not define modules.
//
// Firebase pulls in AppCheckCore, which is written in Swift. Swift can only
// import a static-library pod that generates a module map, and GoogleUtilities
// and RecaptchaInterop are plain Objective-C pods that do not generate one by
// default. CocoaPods refuses to integrate the graph rather than produce a build
// that fails later at link time.
//
// WHY A PLUGIN AND NOT AN EDIT: ios/ is generated. This project is CNG — see the
// note at the top of withPoseModel.js — so anything hand-added to ios/Podfile is
// erased by the next `expo prebuild --clean`, and by EAS's own prebuild on the
// build server. The fix has to live in a plugin or it is not really applied.
//
// WHY TARGETED AND NOT `use_modular_headers!`: the global switch turns modular
// headers on for EVERY pod in the graph, including React Native's, which is a
// much larger blast radius than the problem warrants. These are the two pods
// CocoaPods actually named.
const { withPodfile } = require('@expo/config-plugins');

// Exactly the pods from the error. Adding one here is cheap; the cost of the
// global flag is not.
const NEEDS_MODULAR_HEADERS = ['GoogleUtilities', 'RecaptchaInterop'];

const MARKER = '# withFirebaseModularHeaders';

const withFirebaseModularHeaders = (config) =>
  withPodfile(config, (config) => {
    const contents = config.modResults.contents;

    // Prebuild can run the plugin against an already-patched Podfile.
    if (contents.includes(MARKER)) return config;

    // Anchor on use_expo_modules!, which is the first line inside the app
    // target in every Expo-generated Podfile. Inserting at the top of the file
    // would put these outside any target, where CocoaPods ignores them.
    const anchor = '  use_expo_modules!';
    if (!contents.includes(anchor)) {
      throw new Error(
        'withFirebaseModularHeaders: could not find `use_expo_modules!` in the Podfile. ' +
          'The Expo template changed — re-anchor this plugin before shipping, or ' +
          '`pod install` will fail on AppCheckCore with no obvious cause.',
      );
    }

    const block = [
      anchor,
      '',
      `  ${MARKER} — Swift pods (AppCheckCore) cannot import these unless they`,
      '  # generate module maps. Managed by plugins/withFirebaseModularHeaders.js.',
      ...NEEDS_MODULAR_HEADERS.map((pod) => `  pod '${pod}', :modular_headers => true`),
    ].join('\n');

    config.modResults.contents = contents.replace(anchor, block);
    return config;
  });

module.exports = withFirebaseModularHeaders;
