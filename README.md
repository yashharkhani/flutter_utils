# flutter-toolbox

A powerful VS Code extension that streamlines Flutter build processes for APK, IPA, and Web builds with intelligent command sequencing and real-time progress tracking.

## Features

### 🚀 Build Commands

- **Build APK** - Generate Android APK with optimized build sequence
- **Build IPA** - Generate iOS IPA with optimized build sequence
- **Build Web** - Generate web build with customizable base-href and optional WebAssembly (WASM) support

### 🛠️ Utility Commands

- **Flutter Version** - Check installed Flutter version (works with FVM or system Flutter)
- **Build Runner** - Generate freezed/json_serializable classes with `dart run build_runner build --delete-conflicting-outputs`
- **Analyze** - Run `flutter analyze` to check code for issues
- **Format** - Run `flutter format` to format all Dart files
- **Clean** - Run `flutter clean` to remove build artifacts
- **Pub Get** - Run `flutter pub get` to fetch dependencies
- **Clean & Pub Get** - Combined clean and pub get with optional pubspec.lock deletion
- **Pod Install** - Clean and reinstall iOS CocoaPods dependencies

### 🔌 Environment Setups

- **Generate FyUI MCP Config** - Generate Model Context Protocol configuration for FyUI library
- **Generate Fyers Launch Config** - Generate VS Code launch.json configurations for Fyers App (web + mobile)

### 🔀 Git Actions

- **Open Repository** - Open GitHub repository in browser (with current branch if not main/master)
- **Open Current File** - Open currently active file on GitHub (jumps to current line)
- **View Current Commit** - View current HEAD commit on GitHub
- **Copy Commit Hash** - Copy current commit SHA to clipboard
- **Create PR** - Open GitHub PR creation page (current branch → master)
- **View PR** - View existing pull requests for current branch
- **Open Actions** - Open GitHub Actions CI/CD page

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
- **WebAssembly (WASM) Support** - Optional WASM compilation for web builds with better performance
- **Detailed Output Logging** - View complete build logs in dedicated output channel
- **Command Palette Integration** - Access builds via Command Palette or sidebar
- **Cross-Platform** - Works on macOS, Windows, and Linux
- **Git Integration** - Quick access to GitHub repository, PRs, and Actions

## Usage

### Running a Build

#### Method 1: Using Sidebar (Recommended)

1. Open a Flutter project in VS Code
2. Click the **flutter-toolbox** icon in the Activity Bar (left sidebar)
3. Choose from the available options:

**BUILD Section:**
   - 📱 **Build APK** - Android release build
   - 📱 **Build IPA** - iOS release build
   - 🌐 **Build Web** - Web release build

**UTILS Section:**
   - ℹ️ **Flutter Version** - Check Flutter version
   - ⚙️ **Build Runner** - Generate code files (freezed, json_serializable)
   - 🔍 **Analyze** - Check code for issues
   - 🎨 **Format** - Format all Dart files
   - 🗑️ **Clean** - Clean build artifacts
   - 📥 **Pub Get** - Fetch dependencies
   - 🔄 **Clean & Pub Get** - Combined clean and pub get
   - 📦 **Pod Install** - Clean and reinstall iOS pods

**Environment Setups Section:**
   - 📝 **Generate FyUI MCP Config** - Create MCP configuration for FyUI library
   - 🐛 **Generate Fyers Launch Config** - Create launch.json for Fyers App debugging

**Git Actions Section:**
   - 📂 **Open Repository** - Open GitHub repo in browser
   - 📄 **Open Current File** - Open active file on GitHub
   - 👁️ **View Current Commit** - View HEAD commit on GitHub
   - 📋 **Copy Commit Hash** - Copy commit SHA
   - ➕ **Create PR** - Create pull request to master
   - 👁️ **View PR** - View PRs for current branch
   - ⚡ **Open Actions** - Open GitHub Actions

4. Follow the prompts:
   - Choose whether to delete `pubspec.lock`
   - For web builds:
     - Enter base-href (default: `/`)
     - Choose whether to use WebAssembly (WASM)
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
- **Output Panel**: View → Output → Select "flutter-toolbox" for detailed logs
- **Notifications**: Success/error messages appear as popup notifications

### Using MCP Config Generators

#### Generate FyUI MCP Config

1. Click **Generate FyUI MCP Config** in the MCP section
2. Enter the absolute path to your `fy_ui` repository (e.g., `/Users/yourname/projects/fy_ui`)
3. The configuration is:
   - ✅ Generated with proper path normalization
   - ✅ Automatically copied to clipboard
   - ✅ Displayed in output panel
   - ✅ Adapts to FVM or system Dart based on your settings
4. Paste the config into your MCP settings file

#### Generate Fyers Launch Config

1. Click **Generate Fyers Launch Config** in the MCP section
2. Enter the absolute path to your `fyers_app` repository
3. Two launch configurations are generated:
   - **fyers_app** - Web debug on Chrome (port 5000, with CORS disabled)
   - **fyers app mobile** - Mobile debug configuration
4. The configuration is:
   - ✅ Validated against lib/main.dart existence
   - ✅ Automatically copied to clipboard
   - ✅ Displayed in output panel
5. Click **Open launch.json** to:
   - Open existing launch.json, OR
   - Create new launch.json with these configurations

#### Git Actions

All git actions work with your current workspace git repository:

1. **Open Repository**
   - Opens GitHub repository in your default browser
   - If on a feature branch, opens that branch view
   - If on main/master, opens repository homepage

2. **Open Current File**
   - Opens the currently active file on GitHub
   - Automatically jumps to your current cursor line
   - Uses current branch (not commit) for live file view
   - Perfect for sharing specific code with teammates
   - Example: `https://github.com/user/repo/blob/feature-branch/lib/main.dart#L45`

3. **View Current Commit**
   - Opens the current HEAD commit on GitHub
   - See commit message, changed files, and diff
   - Shows short hash (first 7 chars) in notification

4. **Copy Commit Hash**
   - Copies the full commit SHA to clipboard
   - Shows short hash in confirmation message
   - Useful for referencing commits in PRs/issues

5. **Create PR**
   - Opens GitHub PR creation page
   - Pre-configured to create PR: `current branch` → `master`
   - Works with any branch except main/master

6. **View PR**
   - Opens GitHub PRs filtered by current branch
   - See all PRs for your current branch
   - Quick way to check PR status

7. **Open Actions**
   - Opens GitHub Actions page
   - View CI/CD workflow runs
   - Check build status

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
flutter-toolbox
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
flutter-toolbox
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
- `flutter-build-utils.buildRunner` - Generate code with build_runner
- `flutter-build-utils.flutterAnalyze` - Analyze Dart code
- `flutter-build-utils.flutterFormat` - Format Dart code
- `flutter-build-utils.clean` - Run flutter clean
- `flutter-build-utils.pubGet` - Run flutter pub get
- `flutter-build-utils.cleanAndPubGet` - Clean & Pub Get with optional pubspec.lock deletion
- `flutter-build-utils.podInstall` - Clean and reinstall iOS CocoaPods dependencies

**Environment Setup Commands:**
- `flutter-build-utils.generateMcpConfig` - Generate FyUI MCP configuration
- `flutter-build-utils.generateFyersLaunchConfig` - Generate Fyers App launch configurations

**Git Action Commands:**
- `flutter-build-utils.openRepository` - Open GitHub repository in browser
- `flutter-build-utils.openCurrentFile` - Open current file on GitHub with line number
- `flutter-build-utils.viewCurrentCommit` - View current commit on GitHub
- `flutter-build-utils.copyCommitHash` - Copy commit hash to clipboard
- `flutter-build-utils.createPR` - Create pull request
- `flutter-build-utils.viewPR` - View pull requests for current branch
- `flutter-build-utils.openActions` - Open GitHub Actions

**Other Commands:**
- `flutter-build-utils.refreshView` - Refresh sidebar view
- `flutter-build-utils.clearSessions` - Clear build history
- `flutter-build-utils.openOutputFolder` - Open build output folder in Finder/Explorer

## Output and Logs

All build output is logged to the **flutter-toolbox** output channel:

- Step-by-step progress with status indicators
- Command execution details
- Standard output and error streams
- Detailed error information on failures

Access via: `View → Output → flutter-toolbox`

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

### Building VSIX Package

Use the automated build script:

```bash
./build.sh
```

This will:
- Check all prerequisites (Node.js, npm, dependencies)
- Run linter and validate code quality
- Clean and compile TypeScript
- Package into VSIX with all validations
- Show detailed build summary

The generated `flutter-build-utils-0.0.1.vsix` can be installed or shared with others.

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
- Web builds with base-href and optional WebAssembly (WASM)
- Utility commands (Version, Build Runner, Analyze, Format, Clean, Pub Get, Clean & Pub Get, Pod Install)
- Environment setup generators (FyUI MCP, Fyers App Launch Config)
- Git Actions (Open Repo, Open Current File, View Commit, Copy Hash, Create PR, View PR, Open Actions)
- Sidebar UI with organized sections (Build/Utils/Environment setups/Git Actions)
- Real-time command-by-command status tracking in sidebar
- Build history (last 5 builds) with timing
- Expandable error details in sidebar
- One-click access to build output folders (APK/IPA/Web)
- Cross-platform folder opening (macOS/Windows/Linux)
- Configurable Flutter command prefix (supports FVM)
- Automatic Dart command derivation from Flutter command
- Smart build sequencing with multiple clean/pub get cycles
- Code generation with build_runner
- Code quality checks with analyze and format
- iOS dependency management with Pod Install with UTF-8 encoding fix
- WebAssembly compilation option for web builds
- Model Context Protocol integration support
- VS Code launch.json generator for Fyers App
- Git integration for GitHub workflows (repo, PRs, actions)
- Automatic URL opening in default browser
- Cross-platform browser support (macOS/Windows/Linux)
- Automatic clipboard copy for generated configs
- Detailed output logging
- Status bar progress indicators

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

**Enjoy streamlined Flutter builds!** 🎉
