#!/bin/bash

# Setup script for git-ai on macOS
# This script installs git-ai and configures Cursor to use it

set -e  # Exit on error

echo "=========================================="
echo "Git-AI Setup Script for macOS"
echo "=========================================="
echo ""

# Check if jq is installed, install if needed
if ! command -v jq &> /dev/null; then
    echo "jq not found. Installing jq..."
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo "Error: Homebrew not found. Please install Homebrew or jq manually."
        echo "Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
fi

# Step 1: Install git-ai
echo "Step 1: Installing git-ai..."
curl -sSL https://raw.githubusercontent.com/acunniffe/git-ai/main/install.sh | bash
echo "✓ git-ai installed successfully"
echo ""

# Step 2: Update Cursor settings.json
echo "Step 2: Updating Cursor settings.json..."
CURSOR_SETTINGS="$HOME/Library/Application Support/Cursor/User/settings.json"

if [ ! -f "$CURSOR_SETTINGS" ]; then
    echo "Warning: Cursor settings.json not found at $CURSOR_SETTINGS"
    echo "Creating new settings file..."
    mkdir -p "$(dirname "$CURSOR_SETTINGS")"
    echo '{}' > "$CURSOR_SETTINGS"
fi

# Update git.path using jq
GIT_AI_PATH="$HOME/.git-ai/bin/git"
jq --arg path "$GIT_AI_PATH" '."git.path" = $path' "$CURSOR_SETTINGS" > "$CURSOR_SETTINGS.tmp" && mv "$CURSOR_SETTINGS.tmp" "$CURSOR_SETTINGS"
echo "✓ Updated git.path to: $GIT_AI_PATH"
echo ""

# Step 3: Update git-ai config.json
echo "Step 3: Updating git-ai config.json..."
GIT_AI_CONFIG="$HOME/.git-ai/config.json"

# Wait a moment for the installation to complete and create the config file
sleep 2

if [ ! -f "$GIT_AI_CONFIG" ]; then
    echo "Warning: git-ai config.json not found at $GIT_AI_CONFIG"
    echo "Creating new config file..."
    mkdir -p "$(dirname "$GIT_AI_CONFIG")"
    echo '{}' > "$GIT_AI_CONFIG"
fi

# Update ignore_prompts using jq
jq '.ignore_prompts = true' "$GIT_AI_CONFIG" > "$GIT_AI_CONFIG.tmp" && mv "$GIT_AI_CONFIG.tmp" "$GIT_AI_CONFIG"
echo "✓ Set ignore_prompts to true in git-ai config"
echo ""

# Step 4: Update .bashrc with git-ai PATH
echo "Step 4: Updating .bashrc..."
BASHRC="$HOME/.bashrc"
GIT_AI_PATH_EXPORT='export PATH="$HOME/.git-ai/bin:$PATH"'

# Create .bashrc if it doesn't exist
if [ ! -f "$BASHRC" ]; then
    touch "$BASHRC"
fi

# Check if the PATH export already exists
if grep -q "\.git-ai/bin" "$BASHRC"; then
    echo "✓ git-ai PATH already exists in .bashrc"
else
    echo "" >> "$BASHRC"
    echo "# Added by git-ai setup script" >> "$BASHRC"
    echo "$GIT_AI_PATH_EXPORT" >> "$BASHRC"
    echo "✓ Added git-ai to PATH in .bashrc"
fi

echo ""
echo "=========================================="
echo "✓ Setup completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart Cursor for the settings to take effect"
echo "2. Verify git-ai is working by running: git-ai --version"
echo ""
