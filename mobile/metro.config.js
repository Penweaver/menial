// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch both mobile and shared/root directories for hot reloads and asset tracking
config.watchFolders = [
  path.resolve(workspaceRoot, 'shared'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 2. Let Metro resolve packages in both mobile/node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Explicitly alias @shared to the repository-level shared directory
config.resolver.extraNodeModules = {
  '@shared': path.resolve(workspaceRoot, 'shared'),
  shared: path.resolve(workspaceRoot, 'shared'),
  crypto: path.resolve(projectRoot, 'src/shims/crypto.js'),
};

// 4. Ensure Metro resolves React Native / Browser condition exports for Supabase
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];

if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}
if (!config.resolver.sourceExts.includes('mjs')) {
  config.resolver.sourceExts.push('mjs');
}

module.exports = config;
