# Crew Upload Desktop - Development Guide

## Prerequisites

- Node.js 20+
- macOS for Mac builds
- Apple Developer Account (for notarization)
- Code signing certificates installed in Keychain

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

## Building

### Mac Build (without notarization)

```bash
npm run build:mac
```

Output: `release/Crew Upload-1.0.0-universal.dmg`

### Windows Build

```bash
npm run build:win
```

Output: `release/Crew Upload Setup 1.0.0.exe`

### Build All Platforms

```bash
npm run build:all
```

## Mac Notarization

Notarization is required for Mac apps to avoid security warnings when users open the app.

### Required Credentials

- **Apple ID:** james@turboproductions.com.au
- **Team ID:** ETURVK9WSA
- **App-Specific Password:** Generate at https://appleid.apple.com (Sign-In and Security > App-Specific Passwords)

### Stored Keychain Profile

Credentials are stored in the macOS Keychain under profile `TURBO360`. To update:

```bash
xcrun notarytool store-credentials "TURBO360" \
  --apple-id "james@turboproductions.com.au" \
  --password "YOUR_APP_SPECIFIC_PASSWORD" \
  --team-id "ETURVK9WSA"
```

### Full Build & Notarize Process

1. **Build the Mac app:**
   ```bash
   npm run build:mac
   ```

2. **Create a zip for notarization:**
   ```bash
   cd release
   ditto -c -k --keepParent "mac-universal/Crew Upload.app" "Crew Upload.zip"
   ```

3. **Submit for notarization:**
   ```bash
   xcrun notarytool submit "Crew Upload.zip" \
     --keychain-profile "TURBO360" \
     --wait
   ```

   Wait for `status: Accepted`

4. **Staple the notarization ticket:**
   ```bash
   xcrun stapler staple "mac-universal/Crew Upload.app"
   ```

5. **Verify stapling:**
   ```bash
   xcrun stapler validate "mac-universal/Crew Upload.app"
   ```

6. **Rebuild DMG with stapled app:**
   ```bash
   rm -f "Crew Upload-1.0.0-universal.dmg"
   hdiutil create -volname "Crew Upload" \
     -srcfolder "mac-universal/Crew Upload.app" \
     -ov -format UDZO \
     "Crew Upload-1.0.0-universal.dmg"
   ```

### Quick Notarize Script

For convenience, run all notarization steps:

```bash
cd release
ditto -c -k --keepParent "mac-universal/Crew Upload.app" "Crew Upload.zip"
xcrun notarytool submit "Crew Upload.zip" --keychain-profile "TURBO360" --wait
xcrun stapler staple "mac-universal/Crew Upload.app"
rm -f "Crew Upload-1.0.0-universal.dmg"
hdiutil create -volname "Crew Upload" -srcfolder "mac-universal/Crew Upload.app" -ov -format UDZO "Crew Upload-1.0.0-universal.dmg"
rm "Crew Upload.zip"
```

## Code Signing Certificate

The app is signed with:
- **Certificate:** Developer ID Application: James Anderson (ETURVK9WSA)
- **Identity:** 195FE1D19B506C20B067261A60094C9823592A12

To view installed certificates:
```bash
security find-identity -v -p codesigning
```

## Troubleshooting

### "App is damaged and can't be opened"
The app wasn't notarized. Follow the notarization steps above.

### "Invalid credentials" during notarization
1. Generate a new app-specific password at https://appleid.apple.com
2. Update the keychain profile with the new password

### Notarization rejected
Check the rejection reason:
```bash
xcrun notarytool log <submission-id> --keychain-profile "TURBO360"
```

## Project Structure

```
crew-upload-desktop/
├── electron/           # Electron main & preload scripts
├── src/               # React frontend
├── build/             # Build resources (icons, entitlements)
├── scripts/           # Build scripts
├── release/           # Built applications
└── package.json       # Config & dependencies
```

## Environment

- **Upload Server:** https://upload.turbo.net.au
- **API Endpoint:** https://upload.turbo.net.au/api
