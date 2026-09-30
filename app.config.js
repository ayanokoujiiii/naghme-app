// Keep Android installs updateable while honoring CI build numbering.
module.exports = ({ config }) => {
  const parsedManifestBuild = Number.parseInt(String(config.android?.versionCode ?? 1), 10);
  const manifestBuild = Number.isSafeInteger(parsedManifestBuild) && parsedManifestBuild > 0 ? parsedManifestBuild : 1;
  const parsedRequestedBuild = Number.parseInt(process.env.BUILD_NUMBER || '', 10);
  const buildNumber = Number.isSafeInteger(parsedRequestedBuild) && parsedRequestedBuild > 0
    ? Math.max(parsedRequestedBuild, manifestBuild)
    : manifestBuild;
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
