#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/.."

# Load signing configuration
source "build/signing-config.sh"

echo "Building signed Mac app..."
echo "Team ID: $APPLE_TEAM_ID"
echo "Certificate: $CSC_LINK"

# Run the build
npm run build:mac
