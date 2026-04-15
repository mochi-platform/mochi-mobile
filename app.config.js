const withMochiHealthConnectPermissionDelegate = require('./plugins/with-mochi-health-connect-delegate.js')

module.exports = ({ config }) => {
  const baseConfig = config
  const basePlugins = Array.isArray(baseConfig.plugins) ? baseConfig.plugins : []
  const baseExtra =
    baseConfig.extra && typeof baseConfig.extra === 'object' ? baseConfig.extra : {}

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
    plugins: [...plugins, withMochiHealthConnectPermissionDelegate],
  }
}
