// Listrr has no ads and no analytics SDK, so nothing in this project
// currently requests the Google Advertising ID permission
// (com.google.android.gms.permission.AD_ID). This config plugin explicitly
// strips it from the final Android manifest as a safety net, so it can
// never reappear silently if a future dependency pulls it in.

const { withAndroidManifest } = require('@expo/config-plugins');

const AD_ID_PERMISSION = 'com.google.android.gms.permission.AD_ID';
const TOOLS_NS = 'http://schemas.android.com/tools';

module.exports = function withNoAdId(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = TOOLS_NS;
    }

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const alreadyPresent = manifest['uses-permission'].some(
      (perm) => perm.$?.['android:name'] === AD_ID_PERMISSION
    );

    if (!alreadyPresent) {
      manifest['uses-permission'].push({
        $: {
          'android:name': AD_ID_PERMISSION,
          'tools:node': 'remove',
        },
      });
    }

    return config;
  });
};