const withMochiHealthConnectPermissionDelegate = require('./plugins/with-mochi-health-connect-delegate.js')

// En builds de producción las variables obligatorias deben existir: no se permite caer en IDs de prueba.
const REQUIRED_PRODUCTION_ENV = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_REVENUECAT_API_KEY',
  'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
  'EXPO_PUBLIC_ADMOB_REWARDED_ANDROID_UNIT_ID',
]

function assertProductionEnv() {
  const profile = process.env.EAS_BUILD_PROFILE || process.env.APP_ENV || ''
  if (!profile.startsWith('production')) return
  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Build de producción detenido: faltan variables obligatorias: ${missing.join(', ')}. ` +
        'Configúralas en EAS (eas env:create --environment production).'
    )
  }
}

module.exports = ({ config }) => {
  assertProductionEnv()
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
