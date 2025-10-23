# Flutter Build Utils

A powerful VS Code extension that streamlines Flutter build processes for APK, IPA, and Web builds with intelligent command sequencing and real-time progress tracking.

## Features

### 🚀 Build Commands

- **Build APK** - Generate Android APK with optimized build sequence
- **Build IPA** - Generate iOS IPA with optimized build sequence
- **Build Web** - Generate web build with customizable base-href

### 🛠️ Utility Commands

- **Flutter Version** - Check installed Flutter version (works with FVM or system Flutter)
- **Clean** - Run `flutter clean` to remove build artifacts
- **Pub Get** - Run `flutter pub get` to fetch dependencies
- **Clean & Pub Get** - Combined clean and pub get with optional pubspec.lock deletion
- **Pod Install** - Clean and reinstall iOS CocoaPods dependencies

### ✨ Key Capabilities

- **Sidebar UI** - Beautiful sidebar panel with clickable build commands
- **Real-time Status Tracking** - Watch each command execute with live status updates in sidebar
- **Step-by-Step Progress** - See individual build steps with icons (waiting/running/success/failed)
- **Build History** - Last 5 builds kept in sidebar with timing and status
- **Error Accordion** - Expandable error details right in the sidebar
- **Quick Access to Outputs** - One-click button to open build output folders in Finder/Explorer
- **Configurable Flutter Command** - Use `fvm flutter`, `flutter`, or custom command prefix
- **Smart Build Sequencing** - Automated clean, pub get, and build cycles for optimal results
- **Optional pubspec.lock Deletion** - Choose whether to delete pubspec.lock before each build
- **Base-href Support** - Configure base-href for web builds with built-in validation
- **Detailed Output Logging** - View complete build logs in dedicated output channel
- **Command Palette Integration** - Access builds via Command Palette or sidebar
- **Cross-Platform** - Works on macOS, Windows, and Linux

## Usage

### Running a Build

#### Method 1: Using Sidebar (Recommended)

1. Open a Flutter project in VS Code
2. Click the **Flutter Build Utils** icon in the Activity Bar (left sidebar)
3. Choose from the available options:

**BUILD Section:**
   - 📱 **Build APK** - Android release build
   - 📱 **Build IPA** - iOS release build
   - 🌐 **Build Web** - Web release build

**UTILS Section:**
   - ℹ️ **Flutter Version** - Check Flutter version
   - 🗑️ **Clean** - Clean build artifacts
   - 📥 **Pub Get** - Fetch dependencies
   - 🔄 **Clean & Pub Get** - Combined clean and pub get
   - 📦 **Pod Install** - Clean and reinstall iOS pods

4. Follow the prompts:
   - Choose whether to delete `pubspec.lock`
   - For web builds: Enter base-href (default: `/`)
   - Confirm to start the build

5. **Watch real-time progress** in the sidebar:
   - Build session appears as an expandable item
   - Each command step shows live status:
     - 🕐 **Waiting** - Step queued
     - 🔄 **Running** - Currently executing
     - ✅ **Success** - Completed successfully
     - ❌ **Failed** - Error occurred (expand to see details)
   - Execution time shown for each completed step

6. **Access build outputs** after successful completion:
   - Click **📂 Open Output Folder** button at the bottom of completed builds
   - Opens the build output folder in Finder (macOS) / Explorer (Windows) / File Manager (Linux)
   - Direct access to generated APK, IPA, or web files

#### Method 2: Using Command Palette

1. Open a Flutter project in VS Code
2. Open Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
3. Type and select one of:
   - `Flutter: Build APK`
   - `Flutter: Build IPA`
   - `Flutter: Build Web`

4. Follow the same prompts as above

### Monitoring Build Progress

- **Sidebar Panel**: Real-time status for each build step with icons and timing
  - Active builds show with spinning icon
  - Completed builds show in recent history (up to 5)
  - Failed steps are expandable to show error details
  - Use 🗑️ "Clear Build History" button to remove old builds
- **Status Bar** (bottom): Shows current build step with spinner
- **Output Panel**: View → Output → Select "Flutter Build Utils" for detailed logs
- **Notifications**: Success/error messages appear as popup notifications

### Build Process

Each build follows this optimized sequence:

1. **Optional**: Delete `pubspec.lock` (if selected)
2. **1st Pass**: Clean project + Get dependencies
3. **2nd Pass**: Clean project + Get dependencies
4. **1st Build**: Execute build command
5. **3rd Pass**: Clean project + Get dependencies
6. **Final Build**: Execute build command

This multiple-pass approach ensures:
- Fresh dependency resolution
- Consistent build artifacts
- Reduced build issues from cached state

## Configuration

### Settings

Configure the extension in VS Code settings:

```json
{
  "flutterBuildUtils.flutterCommand": "fvm flutter",  // or "flutter"
  "flutterBuildUtils.customFlutterCommand": ""        // custom command prefix
}
```

### Available Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `flutterBuildUtils.flutterCommand` | Flutter command prefix | `fvm flutter` |
| `flutterBuildUtils.customFlutterCommand` | Custom Flutter command (overrides above) | `""` |

### Customizing Build Commands

Build command sequences are defined in `src/buildCommands.ts`. To customize:

1. Open the extension source code
2. Edit `src/buildCommands.ts`
3. Modify the `getBuildConfig()` function
4. Rebuild and reload the extension

## Requirements

- VS Code 1.85.0 or higher
- Flutter SDK installed
- (Optional) FVM installed if using `fvm flutter` command

## Sidebar UI Example

When you run a build, the sidebar will show:

```
FLUTTER BUILD UTILS
├── 📱 Build APK
├── 📱 Build IPA
├── 🌐 Build Web
├── ─────────────────────
└── 🔄 Android APK (Running...)
    ├── 🕐 Delete pubspec.lock (Waiting...)
    ├── ✅ Clean project (1st pass) (2.3s)
    ├── ✅ Get dependencies (1st pass) (5.1s)
    ├── 🔄 Clean project (2nd pass) (Running...)
    ├── 🕐 Get dependencies (2nd pass) (Waiting...)
    ├── 🕐 Build APK (1st build) (Waiting...)
    └── ...
```

After completion:

```
FLUTTER BUILD UTILS
├── 📱 Build APK
├── 📱 Build IPA
├── 🌐 Build Web
├── ─────────────────────
└── ✅ Android APK (45.2s)
    ├── ✅ Clean project (1st pass) (2.3s)
    ├── ✅ Get dependencies (1st pass) (5.1s)
    ├── ✅ Clean project (2nd pass) (2.1s)
    ├── ✅ Get dependencies (2nd pass) (4.9s)
    ├── ✅ Build APK (1st build) (18.5s)
    ├── ✅ Clean project (3rd pass) (2.2s)
    ├── ✅ Get dependencies (3rd pass) (5.0s)
    ├── ✅ Build APK (final build) (17.8s)
    └── 📂 Open Output Folder (build/app/outputs/flutter-apk)
```

If a step fails:

```
└── ❌ Android APK (12.5s)
    ├── ✅ Clean project (1st pass) (2.3s)
    ├── ✅ Get dependencies (1st pass) (5.1s)
    └── ❌ Build APK (1st build) (5.1s)
        └── Error: Gradle build failed... (click to expand)
```

## Extension Commands

This extension contributes the following commands:

**Build Commands:**
- `flutter-build-utils.buildApk` - Build Android APK
- `flutter-build-utils.buildIpa` - Build iOS IPA
- `flutter-build-utils.buildWeb` - Build Web with base-href

**Utility Commands:**
- `flutter-build-utils.flutterVersion` - Check Flutter version
- `flutter-build-utils.clean` - Run flutter clean
- `flutter-build-utils.pubGet` - Run flutter pub get
- `flutter-build-utils.cleanAndPubGet` - Clean & Pub Get with optional pubspec.lock deletion
- `flutter-build-utils.podInstall` - Clean and reinstall iOS CocoaPods dependencies

**Other Commands:**
- `flutter-build-utils.refreshView` - Refresh sidebar view
- `flutter-build-utils.clearSessions` - Clear build history
- `flutter-build-utils.openOutputFolder` - Open build output folder in Finder/Explorer

## Output and Logs

All build output is logged to the **Flutter Build Utils** output channel:

- Step-by-step progress with status indicators
- Command execution details
- Standard output and error streams
- Detailed error information on failures

Access via: `View → Output → Flutter Build Utils`

## Troubleshooting

### Build Fails at First Step

- Ensure Flutter SDK is properly installed
- Verify `flutterCommand` setting matches your setup
- Check if FVM is installed (if using `fvm flutter`)

### pubspec.yaml Not Found

- Open a valid Flutter project
- Ensure `pubspec.yaml` exists in workspace root

### Command Not Found

- Verify Flutter is in your system PATH
- For FVM: ensure FVM is installed and configured
- Try using custom Flutter command in settings

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run linter
npm run lint
```

### Project Structure

```
.
├── src/
│   ├── extension.ts        # Main extension entry point
│   ├── buildRunner.ts      # Build execution logic
│   ├── buildCommands.ts    # Build command configurations
│   └── types.ts            # TypeScript type definitions
├── package.json            # Extension manifest
└── tsconfig.json           # TypeScript configuration
```

## Release Notes

### 0.0.1

Initial release with support for:
- Android APK builds
- iOS IPA builds
- Web builds with base-href
- Utility commands (Clean, Pub Get, Clean & Pub Get)
- Sidebar UI with organized sections (Build/Utils)
- Real-time command-by-command status tracking in sidebar
- Build history (last 5 builds) with timing
- Expandable error details in sidebar
- One-click access to build output folders (APK/IPA/Web)
- Cross-platform folder opening (macOS/Windows/Linux)
- Configurable Flutter command prefix
- Smart build sequencing with multiple clean/pub get cycles
- Quick utilities for common Flutter tasks
- Detailed output logging
- Status bar progress indicators

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

**Enjoy streamlined Flutter builds!** 🎉
