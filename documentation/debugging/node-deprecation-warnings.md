# Node.js Deprecation Warnings

## DEP0174: Promisify on Promise-returning Functions

### Warning Message
```
[DEP0174] DeprecationWarning: Calling promisify on a function that returns a Promise is likely a mistake.
```

### Context
This warning appears when running `npm run make` and is related to the Electron Forge ecosystem. The warning occurs because some internal functions in `@electron-forge` and `@electron/packager` are using `util.promisify()` on functions that already return promises.

### Current Solution
We've implemented a workaround by suppressing this specific deprecation warning using the `--disable-warning=DEP0174` Node.js flag in our npm scripts:

```json
{
  "scripts": {
    "make": "npm run clean && NODE_ENV=production NODE_OPTIONS=\"--disable-warning=DEP0174\" dotenv -e .env.make -- vite build --mode production && electron-forge make",
    "package": "NODE_ENV=production NODE_OPTIONS=\"--disable-warning=DEP0174\" vite build --mode production && electron-forge package"
  }
}
```

### Root Cause
The warning comes from the Electron Forge ecosystem's internal usage of `util.promisify()` on functions that are already returning promises. This is considered a potential mistake by Node.js as it can lead to unnecessary promise wrapping.

### Long-term Solution
- This is a known issue in the Electron Forge ecosystem
- The proper fix would require updates to the underlying packages
- We're tracking this issue and will remove the warning suppression once the ecosystem packages are updated

### Additional Notes
- The warning does not affect functionality
- The suppression is specific to DEP0174 only
- Other deprecation warnings should still be visible
- This is a development-time warning only and doesn't affect the built application

## How to Track New Deprecation Warnings

To monitor for new deprecation warnings:

1. Temporarily remove the warning suppression:
   ```bash
   # Remove NODE_OPTIONS="--disable-warning=DEP0174" and run
   npm run make
   ```

2. Use Node's trace deprecation flag for detailed stack traces:
   ```bash
   NODE_OPTIONS="--trace-deprecation" npm run make
   ```

3. Document any new warnings in this file with:
   - Warning message
   - Context
   - Solution or workaround
   - Root cause analysis
   - Long-term fix plans 