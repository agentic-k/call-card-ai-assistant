# Quick Commands Summary
Task	Command
Build DMG locally	`npm run make`

1. Simulate publish	
`npx electron-forge publish --platform=darwin --dry-run`
2. Upload DMG
`GITHUB_TOKEN=xxx npx electron-forge publish --platform=darwin --from-dry-run`
3. Tag release	
`git tag -a vX.Y.Z` 
`git push origin --tags`

command 

### 1. Build a distributable version 
`npm run publish`

### 2. Create tag 
- create a tag using cursor
- run `git push origin --tags`
