// withPoseModel.js — Expo config plugin that bundles the MediaPipe Pose Landmarker model
// (`pose_landmarker_lite.task`) into the native iOS app. react-native-mediapipe resolves the
// model at runtime via `Bundle.main.path(forResource:)`, so the file MUST be a bundled resource
// of the app target — an arbitrary path won't work.
//
// Because this project is CNG (app.config.js + `expo prebuild` regenerates ios/), we add the
// resource through this plugin instead of hand-editing Xcode, so it survives prebuild. Mirrors
// the pattern @expo/config-plugins uses for PrivacyInfo.xcprivacy.
//
// Run `npx expo prebuild -p ios` after adding this to app.config.js.

const { withXcodeProject, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODEL_FILE = 'pose_landmarker_lite.task';
const MODEL_SRC = path.join('assets', 'models', MODEL_FILE);

// 1) Physically copy the model into ios/<ProjectName>/ during prebuild.
const withCopyPoseModel = (config) =>
  withDangerousMod(config, [
    'ios',
    (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
      const src = path.join(projectRoot, MODEL_SRC);
      const destDir = path.join(platformProjectRoot, projectName);
      const dest = path.join(destDir, MODEL_FILE);

      if (!fs.existsSync(src)) {
        throw new Error(
          `[withPoseModel] Model not found at ${MODEL_SRC}. Download pose_landmarker_lite.task ` +
            `into assets/models/ before prebuilding.`
        );
      }
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      return config;
    },
  ]);

// 2) Register the copied file as a bundle resource of the app target.
const withPoseModelResource = (config) =>
  withXcodeProject(config, (config) => {
    const { projectRoot } = config.modRequest;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const filepath = path.join(projectName, MODEL_FILE);

    if (!config.modResults.hasFile(filepath)) {
      config.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath,
        groupName: projectName,
        project: config.modResults,
        isBuildFile: true,
        verbose: true,
      });
    }
    return config;
  });

module.exports = (config) => withPoseModelResource(withCopyPoseModel(config));
