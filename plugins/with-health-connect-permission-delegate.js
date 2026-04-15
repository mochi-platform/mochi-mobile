const { createRunOncePlugin, withMainActivity } = require('expo/config-plugins')

const PLUGIN_NAME = 'mochi-health-connect-permission-delegate'
const PLUGIN_VERSION = '1.0.0'

function appendImport(contents, importLine) {
  if (contents.includes(importLine)) return contents

  const importBlockMatch = contents.match(/(^import[^\n]*\n)+/m)
  if (importBlockMatch) {
    const block = importBlockMatch[0]
    return contents.replace(block, `${block}${importLine}\n`)
  }

  return `${importLine}\n${contents}`
}

function injectDelegateCallIntoOnCreate(contents) {
  if (contents.includes('HealthConnectPermissionDelegate.setPermissionDelegate(this)')) {
    return contents
  }

  const onCreateRegex =
    /override\s+fun\s+onCreate\s*\(\s*savedInstanceState\s*:\s*Bundle\??\s*\)\s*\{[\s\S]*?\n\s*\}/m
  const onCreateMatch = contents.match(onCreateRegex)

  if (onCreateMatch) {
    const onCreateBlock = onCreateMatch[0]

    if (onCreateBlock.includes('super.onCreate(savedInstanceState)')) {
      const updatedBlock = onCreateBlock.replace(
        'super.onCreate(savedInstanceState)',
        'super.onCreate(savedInstanceState)\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)'
      )
      return contents.replace(onCreateBlock, updatedBlock)
    }

    const updatedBlock = onCreateBlock.replace('{', '{\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)')
    return contents.replace(onCreateBlock, updatedBlock)
  }

  // Avoid creating a second onCreate override when one already exists with a different signature style.
  const anyOnCreateRegex = /override\s+fun\s+onCreate\s*\(/m
  if (anyOnCreateRegex.test(contents)) {
    return contents
  }

  const classBodyInsertionRegex = /(class\s+MainActivity\s*:[\s\S]*?\{\n)/m
  if (!classBodyInsertionRegex.test(contents)) return contents

  return contents.replace(
    classBodyInsertionRegex,
    `$1  override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(savedInstanceState)\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)\n  }\n\n`
  )
}

function withHealthConnectPermissionDelegate(config) {
  return withMainActivity(config, (modConfig) => {
    const { modResults } = modConfig

    if (modResults.language !== 'kt') {
      return modConfig
    }

    let contents = modResults.contents
    contents = appendImport(contents, 'import android.os.Bundle')
    contents = appendImport(contents, 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate')
    contents = injectDelegateCallIntoOnCreate(contents)

    modConfig.modResults.contents = contents
    return modConfig
  })
}

const withHealthConnectPermissionDelegatePlugin = createRunOncePlugin(
  withHealthConnectPermissionDelegate,
  PLUGIN_NAME,
  PLUGIN_VERSION
)

module.exports = withHealthConnectPermissionDelegatePlugin
