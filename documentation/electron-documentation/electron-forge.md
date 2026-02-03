# 🛠️ Electron Forge Packaging & Distribution Guide (for MacBook)  

Super quick, no-fluff guide to go from building your app → to sending it to people 🎁  

---

## 🚀 Step 0: Setup (only do this once)

Make sure your project is using Electron Forge.

If not:

```bash
npm install --save-dev @electron-forge/cli
npx electron-forge import
````

This sets up the basics like `forge.config.js`.

---

## 📦 Step 1: Build Your App

Run this in the terminal:

```bash
npm run make
```

That’s it! It will:

* Bundle your app
* Create a `.dmg` (Mac installer) file
* Put everything inside the `out/` folder

---

## 🧪 Step 2: Test It!

1. Go to `out/make/`
2. Open the `.dmg` file
3. Install your app like a normal Mac app
4. Make sure it runs & behaves right

---

## 🍎 Step 3: macOS Code Signing (Optional but Important)

If you’re sharing this app with others (outside your own Mac):

1. You need an Apple Developer ID
2. Add this to your `forge.config.js`:

```js
packagerConfig: {
  osxSign: {
    identity: 'Developer ID Application: Your Name (Team ID)',
    hardenedRuntime: true
  }
}
```

🔒 This prevents macOS from blocking your app with scary warnings.

---

## ☁️ Step 4: Share the App!

You can now:

* Send the `.dmg` file to users ✅
* Upload it to GitHub Releases or your site ✅

---

## 🧠 Extra Tips

* Want to build for **Windows/Linux**? Use CI like GitHub Actions or run it on those systems.
* Want a signed & notarized app? Look into [`electron-notarize`](https://github.com/electron/electron-notarize)

---

## ❤️ That’s It!

Keep hacking. Keep shipping.
If it breaks, ask me here.

