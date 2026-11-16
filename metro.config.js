const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Mushaf page SVGs are shipped Brotli-compressed (.svg.br), read as bytes, decoded and inlined into a WebView,
// and the tafsir SQLite database is bundled as an asset.
for (const ext of ['svg', 'br', 'db']) {
  if (!config.resolver.assetExts.includes(ext)) config.resolver.assetExts.push(ext);
}

module.exports = config;
