/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: "com.call-card.app",
  productName: "Call-Card",
  directories: {
    output: "release",
    buildResources: "build"
  },
  files: [
    "dist/**/*",
    "electron/**/*",
    "!electron/**/*.map",
    "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
    "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    "!**/node_modules/*.d.ts",
    "!**/node_modules/.bin",
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/._*",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
    "!.env",
    "!.env.*",
    "!.env-*",
    "!.env.make"
  ],
  extraResources: [
    {
      from: "build",
      to: "build",
      filter: ["**/*"]
    }
  ],
  mac: {
    target: ["dmg", "zip"],
    icon: "public/icons/icon.icns",
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist"
  },
  win: {
    target: ["nsis", "zip"],
    icon: "public/icon.png"
  },
  linux: {
    target: ["AppImage", "deb"],
    category: "Productivity",
    icon: "public/icon.png"
  },
  // Add asar configuration
  asar: true,
  asarUnpack: [
    "node_modules/**/*.node"
  ],
  // Add publish configuration for auto-updates (if needed)
  publish: {
    provider: "generic",
    url: "https://example.com/auto-updates" // TODO: Replace with your update server URL
  }
};

module.exports = config;
