# Production App
1. Run dmg file for the app 
`out/callcard-darwin-arm64/callcard.app/Contents/MacOS/callcard`

# Development

## Permission 
1. Remove permissions
`tccutil reset Microphone`


# Playright 
### Test Single File
npx playwright test tests/login.spec.ts

### Test All Files
npx playwright test


