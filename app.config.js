// GitHub Actions supplies BUILD_NUMBER for each build so an updated APK can
// install over the previous version without changing the Android package name.
module.exports = ({ config }) => {
  const parsedBuild = Number.parseInt(process.env.BUILD_NUMBER || '1', 10);
  const buildNumber = Number.isSafeInteger(parsedBuild) && parsedBuild > 0 ? parsedBuild : 1;
  const eas = config.extra?.eas || {};
  const projectId = process.env.EAS_PROJECT_ID || eas.projectId;

  return {
    ...config,
    android: { ...config.android, versionCode: buildNumber },
    extra: {
      ...(config.extra || {}),
      ...(projectId ? { eas: { ...eas, projectId } } : {}),
      buildNumber,
    },
  };
};
