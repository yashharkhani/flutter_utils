# Development Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile TypeScript

```bash
npm run compile
```

Or for development with auto-recompile on file changes:

```bash
npm run watch
```

### 3. Run the Extension

#### Option A: Using F5 (Recommended)

1. Open this project in VS Code
2. Press `F5` or go to `Run and Debug` (Cmd+Shift+D / Ctrl+Shift+D)
3. Select "Run Extension" from the dropdown
4. Click the green play button or press `F5`

This will:
- Compile the TypeScript code
- Open a new VS Code window with your extension loaded
- Enable debugging with breakpoints

#### Option B: Using Command Palette

1. Open this project in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type: `Debug: Start Debugging`
4. Select "Run Extension"

### 4. Test the Extension

In the new Extension Development Host window that opens:

1. Open a Flutter project (or create a test Flutter project)
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type one of these commands:
   - `Flutter: Build APK`
   - `Flutter: Build IPA`
   - `Flutter: Build Web`
4. Follow the prompts and watch the build process!

## Development Workflow

### Making Changes

1. Make changes to TypeScript files in `src/`
2. If using `npm run watch`, changes auto-compile
3. In the Extension Development Host window, press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux) to reload the extension
4. Test your changes

### Debugging

1. Set breakpoints in your TypeScript code
2. Run extension with `F5`
3. Trigger the command that hits your breakpoint
4. Use Debug Console to inspect variables

### Viewing Logs

- **Extension Output**: View → Output → Select "flutter-toolbox"
- **Debug Console**: View → Debug Console (shows console.log from your code)
- **Developer Tools**: Help → Toggle Developer Tools

## Project Structure

```
flutter_utils/
├── .vscode/
│   ├── launch.json          # Debug configurations
│   └── tasks.json           # Build tasks
├── src/
│   ├── extension.ts         # Main entry point
│   ├── buildRunner.ts       # Build execution engine
│   ├── buildCommands.ts     # Build command definitions
│   └── types.ts             # TypeScript interfaces
├── out/                     # Compiled JavaScript (generated)
├── package.json             # Extension manifest
├── tsconfig.json            # TypeScript config
└── README.md                # User documentation
```

## Customizing Build Commands

Build sequences are defined in `src/buildCommands.ts`:

```typescript
export function getBuildConfig(buildType: BuildType, baseHref?: string): BuildConfig {
    // Modify the steps array for each build type
}
```

After changing, reload the extension to test.

## Building for Distribution

### Quick Build (Recommended)

Use the automated build script:

```bash
./build.sh
```

This script will:
- ✅ Check all prerequisites
- ✅ Run linter
- ✅ Clean previous builds
- ✅ Compile TypeScript
- ✅ Validate output
- ✅ Create VSIX package
- ✅ Show installation instructions

### Manual Build

If you prefer manual steps:

```bash
# Install vsce (VS Code Extension manager) globally
npm install -g @vscode/vsce

# Run linter
npm run lint

# Compile TypeScript
npm run compile

# Package the extension
vsce package
```

This creates a `.vsix` file that can be:
- Shared with others
- Installed manually
- Published to VS Code Marketplace

### Install VSIX Locally

```bash
code --install-extension flutter-build-utils-0.0.1.vsix
```

Or in VS Code:
1. View → Extensions
2. Click `...` (three dots) → Install from VSIX
3. Select the `.vsix` file

## Publishing to Marketplace

1. Create a [Visual Studio Marketplace](https://marketplace.visualstudio.com/) publisher account
2. Update `publisher` field in `package.json`
3. Create a Personal Access Token
4. Publish:

```bash
vsce login your-publisher-name
vsce publish
```

## Troubleshooting

### "Cannot find module" errors

```bash
rm -rf node_modules package-lock.json
npm install
```

### Extension not updating

In Extension Development Host:
- Reload window: `Cmd+R` / `Ctrl+R`
- Or close and re-launch with `F5`

### TypeScript compilation errors

```bash
npm run compile
# Fix any errors shown
```

### Extension not activating

Check:
1. Is there a `pubspec.yaml` in the workspace? (Required for activation)
2. Check Debug Console for errors
3. View extension host log: Help → Toggle Developer Tools → Console

## Testing Checklist

Before committing changes:

- [ ] Extension compiles without errors: `npm run compile`
- [ ] No linter errors: `npm run lint`
- [ ] All three build commands work (APK, IPA, Web)
- [ ] Error handling works (test with invalid Flutter project)
- [ ] Settings are respected (test different Flutter commands)
- [ ] Output channel shows proper logs
- [ ] Status bar updates correctly

## Common Development Tasks

### Add a New Build Type

1. Add to `BuildType` enum in `src/types.ts`
2. Add configuration in `src/buildCommands.ts`
3. Register command in `src/extension.ts`
4. Add to `package.json` contributions

### Modify Build Steps

Edit the `steps` array in `src/buildCommands.ts` for the target build type.

### Change Default Settings

Edit the `contributes.configuration.properties` section in `package.json`.

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)

---

Happy developing! 🚀
