#!/bin/bash

# flutter-toolbox - Build Script
# This script builds the VS Code extension with all necessary checks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Start build process
print_header "flutter-toolbox - Build Script"

# Check 1: Node.js and npm
print_info "Checking Node.js and npm..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "Node.js $(node --version) and npm $(npm --version) found"

# Check 2: Check if node_modules exists
print_info "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_success "Dependencies found"
fi

# Check 3: Check if package.json exists
print_info "Validating package.json..."
if [ ! -f "package.json" ]; then
    print_error "package.json not found"
    exit 1
fi
print_success "package.json validated"

# Check 4: Check if TypeScript files exist
print_info "Checking source files..."
if [ ! -d "src" ]; then
    print_error "src directory not found"
    exit 1
fi

SOURCE_FILES=$(find src -name "*.ts" | wc -l | tr -d ' ')
if [ "$SOURCE_FILES" -eq 0 ]; then
    print_error "No TypeScript files found in src/"
    exit 1
fi
print_success "Found $SOURCE_FILES TypeScript files"

# Check 5: Run linter
print_header "Running Linter"
print_info "Checking code quality..."
if npm run lint; then
    print_success "Linter passed - no issues found"
else
    print_error "Linter found issues. Please fix them before building."
    exit 1
fi

# Check 6: Clean previous build
print_header "Cleaning Previous Build"
print_info "Removing old build artifacts..."
if [ -d "out" ]; then
    rm -rf out
    print_success "Old build artifacts removed"
else
    print_info "No previous build artifacts to clean"
fi

# Check 7: Compile TypeScript
print_header "Compiling TypeScript"
print_info "Compiling TypeScript to JavaScript..."
if npm run compile; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Check 8: Validate compiled output
print_info "Validating compiled output..."
if [ ! -d "out" ]; then
    print_error "out directory not created"
    exit 1
fi

COMPILED_FILES=$(find out -name "*.js" | wc -l | tr -d ' ')
if [ "$COMPILED_FILES" -eq 0 ]; then
    print_error "No JavaScript files found in out/"
    exit 1
fi
print_success "Found $COMPILED_FILES compiled JavaScript files"

# Check 9: Check if vsce is installed
print_header "Packaging Extension"
print_info "Checking for vsce (VS Code Extension CLI)..."
if ! command -v vsce &> /dev/null; then
    print_warning "vsce not found. Installing..."
    npm install -g @vscode/vsce
    print_success "vsce installed"
else
    print_success "vsce found"
fi

# Check 10: Remove old VSIX if exists
print_info "Removing old VSIX packages..."
rm -f *.vsix
print_success "Old packages removed"

# Check 11: Create VSIX package
print_info "Creating VSIX package..."
if vsce package; then
    print_success "VSIX package created successfully"
else
    print_error "Failed to create VSIX package"
    exit 1
fi

# Check 12: Validate VSIX was created
VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -1)
if [ -z "$VSIX_FILE" ]; then
    print_error "VSIX file not found after packaging"
    exit 1
fi

# Get file size
VSIX_SIZE=$(ls -lh "$VSIX_FILE" | awk '{print $5}')

# Final summary
print_header "Build Complete!"
echo ""
print_success "Extension packaged successfully!"
echo ""
echo -e "${GREEN}Package Details:${NC}"
echo -e "  File: ${BLUE}$VSIX_FILE${NC}"
echo -e "  Size: ${BLUE}$VSIX_SIZE${NC}"
echo -e "  Location: ${BLUE}$(pwd)/$VSIX_FILE${NC}"
echo ""
echo -e "${GREEN}Installation Commands:${NC}"
echo -e "  ${YELLOW}code --install-extension $VSIX_FILE${NC}"
echo ""
echo -e "${GREEN}Or install via VS Code UI:${NC}"
echo -e "  1. Open VS Code"
echo -e "  2. Go to Extensions (Cmd+Shift+X)"
echo -e "  3. Click ... menu → Install from VSIX"
echo -e "  4. Select: $VSIX_FILE"
echo ""
print_header "Build Summary"
echo ""
echo -e "${GREEN}✓ All checks passed${NC}"
echo -e "${GREEN}✓ Linter: No issues${NC}"
echo -e "${GREEN}✓ TypeScript: Compiled successfully${NC}"
echo -e "${GREEN}✓ Source files: $SOURCE_FILES files${NC}"
echo -e "${GREEN}✓ Compiled files: $COMPILED_FILES files${NC}"
echo -e "${GREEN}✓ Package: $VSIX_FILE ($VSIX_SIZE)${NC}"
echo ""
print_success "Ready to install and use! 🎉"
echo ""
