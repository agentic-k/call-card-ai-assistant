// forge.config.mjs
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import dotenv from 'dotenv';
dotenv.config();

// --- ADD THESE LINES ---
import path from 'path'; // Import the 'path' module
import { fileURLToPath } from 'url'; // Import fileURLToPath for ESM context

// Recreate __dirname and __filename for ESM context in Forge config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- END ADDITIONS ---


export default {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/{onnxruntime-node,sharp}/**/*',
    },
    // Use the correct icon format for each platform - .icns for macOS
    icon: path.join(__dirname, 'public/icons/icon'), // This will automatically use the right extension
    // Include audio-processor.js outside of ASAR for AudioWorklet access
    extraFiles: [
      './electron/audio-processor.js'
    ],
    // Copy the icons directory to the resources folder
    extraResources: [
      {
        from: './public/icons',
        to: 'icons'
      }
    ],
    // This is the crucial part for passing environment variables to the main process
    extraResource: ['./.env.production'],
    // macOS specific configuration
    extendInfo: {
      NSMicrophoneUsageDescription: "This app requires microphone access to capture audio for calls and recordings.",
      NSCameraUseContinuityCameraDeviceType: false,
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ['callcard']
        }
      ]
    },
    // macOS specific configuration
    osxSign: {
      identity: process.env.APPLE_SIGNING_IDENTITY || "Developer ID Application: YOUR_NAME (TEAM_ID)",
      "hardened-runtime": true,
      entitlements: "./public/entitlements.mac.plist",
      "entitlements-inherit": "./public/entitlements.mac.plist",
    },
    // Notarize the app for macOS (only in production)
    // osxNotarize: {
    //   tool: 'notarytool',
    //   appleId: process.env.APPLE_ID,
    //   appleIdPassword: process.env.APPLE_APP_PASSWORD,
    //   teamId: process.env.APPLE_TEAM_ID,
    //   staple: true
    // },
    // Explicitly include important files and folders
    ignore: [
      /^\/src\//,
      /^\/tests\//,
      /^\/cypress\//,
      /^\/docs\//,
      /^\/\.vscode\//,
      /^\/\.cursor\//,
      /^\/\.git\//,
      // Include electron-related packages and all update-electron-app dependencies
      // /^\/node_modules\/(?!(@electron\/|electron-|update-electron-app|github-url-to-object|is-url|ms))/,
      /\.md$/,
      /^\/vite\.config\.ts$/,
      /^\/tsconfig.*\.json$/,
      /^\/eslint\.config\.js$/,
      /^\/tailwind\.config\.ts$/,
      /^\/postcss\.config\.cjs$/,
      /^\/cypress\.config\.ts$/,
      /^\/components\.json$/,
      /^\.env$/,
      /^\.env\..+$/,  // This will match .env.local, .env.production, etc.
      /^\.env-.*$/,   // This will match any .env-* files
      /^\.env\.make$/  // Specifically exclude .env.make
    ]
  },
  rebuildConfig: {},

  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        icon: path.join(__dirname, 'public/icons/mac/icon.icns'), // Use the mac-specific icon
        name: 'CallCard',
        overwrite: true,
        backgroundColor: '#FFFFFF',
        format: 'ULFO'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        icon: path.join(__dirname, 'public/icons/mac/icon.icns'), // Use the mac-specific icon
        name: 'CallCard',
        overwrite: true,
        backgroundColor: '#FFFFFF',
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
    }),

  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'call-card',
          name: 'call-card'
        },
        prerelease: false,
        draft: false
      }
    }
  ]
};