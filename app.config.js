// BUILD_ARCHS (set per profile in eas.json) picks the CPU architectures packed into the Android APK.
const archs = (process.env.BUILD_ARCHS || 'arm64-v8a').split(',');

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...config.plugins,
    ['expo-build-properties', {
      android: {
        enableProguardInReleaseBuilds: true,
        enableShrinkResourcesInReleaseBuilds: true,
        buildArchs: archs,
        useLegacyPackaging: true,
      },
    }],
  ],
});
