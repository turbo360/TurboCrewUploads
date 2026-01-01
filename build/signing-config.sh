# Mac Code Signing Configuration
# Turbo 360 Apple Developer Credentials

# Certificate - Developer ID Application
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CSC_LINK="$SCRIPT_DIR/Certificates.p12"
export CSC_KEY_PASSWORD=

# Apple Notarization
export APPLE_ID=james@turboproductions.com.au
export APPLE_APP_SPECIFIC_PASSWORD=flin-trgz-dgxo-hdbi
export APPLE_TEAM_ID=ETURVK9WSA
