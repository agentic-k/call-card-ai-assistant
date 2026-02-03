# 🍏 macOS Code Signing & Notarization Guide for Electron Apps

## 🧠 Why Code Signing & Notarization?

To distribute your Electron app on macOS without triggering security warnings, you must:

* **Code Sign**: Certify the app's authenticity.
* **Notarize**: Have Apple scan and approve your app.

This ensures users can install and run your app smoothly.

---

## 💠 Prerequisites

1. **Apple Developer Account**: Enroll at [developer.apple.com](https://developer.apple.com/programs/) (\$99/year).
2. **Xcode**: Install from the Mac App Store.
3. **Certificates**:

   * **Developer ID Application**: For apps distributed outside the Mac App Store.
   * **Developer ID Installer**: If distributing via `.pkg` installers.
4. **App-Specific Password**: Generate at [appleid.apple.com](https://appleid.apple.com) for notarization.

---

## 🗞️ Generating Certificates

1. **Create a Certificate Signing Request (CSR)**:

   * Open **Keychain Access**.
   * Navigate to `Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority...`.
   * Enter your email and common name.
   * Choose "Saved to disk" and continue.

2. **Obtain Certificates**:

   * Visit [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list).
   * Create a new **Developer ID Application** certificate.
   * Upload your CSR and download the `.cer` file.
   * Double-click the `.cer` file to add it to your Keychain.

3. **Export as `.p12`**:

   * In **Keychain Access**, locate your certificate.
   * Right-click and select "Export".
   * Save as `.p12` and set a secure password.

---

## 📦 Configuring Electron Builder

1. **Install Electron Builder**:

```bash
npm install --save-dev electron-builder
```

2. **Update `package.json`**:

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "build": {
    "appId": "com.yourcompany.yourapp",
    "mac": {
      "category": "public.app-category.utilities",
      "target": ["dmg", "zip"],
      "hardenedRuntime": true,
      "entitlements": "entitlements.mac.plist",
      "entitlementsInherit": "entitlements.mac.plist",
      "identity": "Developer ID Application: Your Name (TEAMID1234)"
    },
    "afterSign": "scripts/notarize.js"
  }
}
```

3. **Create `entitlements.mac.plist`**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.app-sandbox</key>
    <false/>
  </dict>
</plist>
```

---

## 🔐 Environment Variables

Set the following environment variables before building:

* `CSC_LINK`: Path to your `.p12` certificate file.
* `CSC_KEY_PASSWORD`: Password for your `.p12` file.
* `APPLE_ID`: Your Apple Developer account email.
* `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password for notarization.
* `TEAM_ID`: Your Apple Developer Team ID.

**Example**:

```bash
export CSC_LINK=./certs/developer_id_application.p12
export CSC_KEY_PASSWORD=your_certificate_password
export APPLE_ID=your_email@example.com
export APPLE_APP_SPECIFIC_PASSWORD=your_app_specific_password
export TEAM_ID=YOURTEAMID
```

---

## 🔧 Notarization Script (`scripts/notarize.js`)

```js
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appBundleId: 'com.yourcompany.yourapp',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.TEAM_ID,
  });
};
```

---

## 🏗️ Building, Signing, and Notarizing

Run the build process:

```bash
npm run build
```

---

## 🧪 Testing the Signed App

1. **Verify Code Signature**:

```bash
codesign --verify --deep --strict --verbose=2 dist/mac/YourApp.app
```

2. **Check Notarization Status**:

```bash
spctl --assess --type execute --verbose dist/mac/YourApp.app
```

If notarized correctly, you'll see `accepted` in the output.

---

## 🐞 Debugging Tips

* **Enable Debug Logs**:

```bash
export DEBUG=electron-builder
```

* **Common Issues**:

  * Ensure your certificate is valid and not expired.
  * Double-check your environment variables.
  * Verify that the `entitlements.mac.plist` file is correctly configured.

---

## 📚 References

* [Electron Code Signing Guide](https://www.electronjs.org/docs/latest/tutorial/code-signing)
* [Electron Builder Code Signing](https://www.electron.build/code-signing)
* [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)

---
