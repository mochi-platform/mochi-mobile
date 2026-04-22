const withMochiHealthConnectPermissionDelegate = require('./plugins/with-mochi-health-connect-delegate.js')

module.exports = ({ config }) => {
  const baseConfig = config
  const basePlugins = Array.isArray(baseConfig.plugins) ? baseConfig.plugins : []
  const baseExtra =
    baseConfig.extra && typeof baseConfig.extra === 'object' ? baseConfig.extra : {}

  const admobAndroidAppId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ??
    'ca-app-pub-3940256099942544~3347511713'
  const admobIosAppId =
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ??
    'ca-app-pub-3940256099942544~1458002511'

  const plugins = basePlugins.filter((plugin) => {
    if (typeof plugin !== 'string') return true
    return plugin !== './plugins/with-mochi-health-connect-delegate.js'
  })

  return {
    ...baseConfig,
    extra: {
      ...baseExtra,
      openrouterApiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? null,
    },
    plugins: [
  ...plugins,
  "expo-router",
  [
    'react-native-google-mobile-ads',
    {
      androidAppId: admobAndroidAppId,
      iosAppId: admobIosAppId,
    },
  ],
  withMochiHealthConnectPermissionDelegate,
],
  }
}
