#!/bin/bash

# Momentz update script
# Run this whenever Claude gives you a new version: bash update.sh

DEST="src/App.jsx"
BACKUP="src/App.backup.jsx"

echo ""
echo "🎞  Momentz updater"
echo "───────────────────"

# Check we're in the right folder
if [ ! -f "package.json" ]; then
  echo "❌  Run this from inside your momentz folder."
  echo "    cd momentz"
  exit 1
fi

# Ask for the file path
echo ""
echo "1. Download the new Momentz.jsx from Claude"
echo "2. Drag the file into this terminal window"
echo "   (or type the full path manually)"
echo ""
read -p "📂  File path: " FILEPATH

# Strip quotes and whitespace that macOS adds on drag-and-drop
FILEPATH=$(echo "$FILEPATH" | tr -d "'" | xargs)

if [ ! -f "$FILEPATH" ]; then
  echo ""
  echo "❌  File not found: $FILEPATH"
  echo "    Make sure you downloaded the file first."
  exit 1
fi

# Backup current version
cp "$DEST" "$BACKUP"
echo ""
echo "✓  Backed up current version to App.backup.jsx"

# Copy new version
cp "$FILEPATH" "$DEST"
echo "✓  Updated App.jsx"

# Ask if they want to deploy
echo ""
read -p "🚀  Deploy to Vercel now? (y/n): " DEPLOY

if [ "$DEPLOY" = "y" ] || [ "$DEPLOY" = "Y" ]; then
  echo ""
  git add .
  read -p "📝  Commit message (or press enter for 'update app'): " MSG
  MSG=${MSG:-"update app"}
  git commit -m "$MSG"
  git push
  echo ""
  echo "✅  Pushed! Vercel will deploy in ~30 seconds."
  echo "    momentz.yolandamcleod.com"
else
  echo ""
  echo "✅  Code updated locally."
  echo "    Run 'npm run dev' to preview."
  echo "    When ready to deploy: git add . && git commit -m 'update' && git push"
fi

echo ""
