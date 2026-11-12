const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Mushaf page SVGs are loaded as raw assets (read as text and inlined into a WebView),
// and the tafsir SQLite database is bundled as an asset.
for (const ext of ['svg', 'db']) {
  if (!config.resolver.assetExts.includes(ext)) config.resolver.assetExts.push(ext);
}

module.exports = config;
