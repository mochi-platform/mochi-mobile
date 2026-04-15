const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Preserve Expo's defaults and add monorepo paths
config.watchFolders = [
  ...(config.watchFolders || [projectRoot]),
  ...(monorepoRoot !== projectRoot ? [monorepoRoot] : []),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Resolver para paquetes del monorepo
config.resolver.extraNodeModules = {
  '@mochi/ai': path.resolve(monorepoRoot, 'packages/ai'),
  '@mochi/supabase': path.resolve(monorepoRoot, 'packages/supabase'),
};

module.exports = withNativeWind(config, { input: "./global.css" });