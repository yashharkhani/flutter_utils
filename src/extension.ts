/**
 * flutter-toolbox Extension
 * Main extension file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getBuildConfig } from './buildCommands';
import { BuildRunner } from './buildRunner';
import { BuildTreeItem, BuildTreeProvider } from './buildTreeView';
import { BuildType } from './types';
import { UtilityRunner } from './utilityRunner';

let buildRunner: BuildRunner;
let utilityRunner: UtilityRunner;
let treeDataProvider: BuildTreeProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('flutter-toolbox extension is now active');

    // Initialize tree view provider first
    treeDataProvider = new BuildTreeProvider();
    const treeView = vscode.window.registerTreeDataProvider(
        'flutterBuildUtilsView',
        treeDataProvider
    );

    // Initialize build runner and utility runner with tree provider
    buildRunner = new BuildRunner(treeDataProvider);
    utilityRunner = new UtilityRunner(treeDataProvider);

    // Register commands
    const buildApkCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildApk',
        () => handleBuild(BuildType.APK)
    );

    const buildIpaCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildIpa',
        () => handleBuild(BuildType.IPA)
    );

    const buildWebCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildWeb',
        () => handleBuild(BuildType.Web)
    );

    const refreshViewCommand = vscode.commands.registerCommand(
        'flutter-build-utils.refreshView',
        () => treeDataProvider.refresh()
    );

    const clearSessionsCommand = vscode.commands.registerCommand(
        'flutter-build-utils.clearSessions',
        () => {
            treeDataProvider.clearSessions();
            vscode.window.showInformationMessage('Build history cleared');
        }
    );

    const openOutputFolderCommand = vscode.commands.registerCommand(
        'flutter-build-utils.openOutputFolder',
        (item: BuildTreeItem) => {
            if (item && item.folderPath) {
                openFolderInFinder(item.folderPath);
            }
        }
    );

    // Utility commands
    const flutterVersionCommand = vscode.commands.registerCommand(
        'flutter-build-utils.flutterVersion',
        () => handleUtilityCommand('flutterVersion')
    );

    const cleanCommand = vscode.commands.registerCommand(
        'flutter-build-utils.clean',
        () => handleUtilityCommand('clean')
    );

    const pubGetCommand = vscode.commands.registerCommand(
        'flutter-build-utils.pubGet',
        () => handleUtilityCommand('pubGet')
    );

    const cleanAndPubGetCommand = vscode.commands.registerCommand(
        'flutter-build-utils.cleanAndPubGet',
        () => handleUtilityCommand('cleanAndPubGet')
    );

    const podInstallCommand = vscode.commands.registerCommand(
        'flutter-build-utils.podInstall',
        () => handleUtilityCommand('podInstall')
    );

    const buildRunnerCommand = vscode.commands.registerCommand(
        'flutter-build-utils.buildRunner',
        () => handleUtilityCommand('buildRunner')
    );

    const flutterAnalyzeCommand = vscode.commands.registerCommand(
        'flutter-build-utils.flutterAnalyze',
        () => handleUtilityCommand('flutterAnalyze')
    );

    const flutterFormatCommand = vscode.commands.registerCommand(
        'flutter-build-utils.flutterFormat',
        () => handleUtilityCommand('flutterFormat')
    );

    // MCP commands
    const generateMcpConfigCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateMcpConfig',
        () => handleGenerateMcpConfig()
    );

    const generateFyersLaunchConfigCommand = vscode.commands.registerCommand(
        'flutter-build-utils.generateFyersLaunchConfig',
        () => handleGenerateFyersLaunchConfig()
    );

    context.subscriptions.push(
        buildApkCommand,
        buildIpaCommand,
        buildWebCommand,
        refreshViewCommand,
        clearSessionsCommand,
        openOutputFolderCommand,
        flutterVersionCommand,
        buildRunnerCommand,
        flutterAnalyzeCommand,
        flutterFormatCommand,
        cleanCommand,
        pubGetCommand,
        cleanAndPubGetCommand,
        podInstallCommand,
        generateMcpConfigCommand,
        generateFyersLaunchConfigCommand,
        treeView,
        buildRunner,
        utilityRunner
    );
}

/**
 * Handle build command execution
 */
async function handleBuild(buildType: BuildType): Promise<void> {
    try {
        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a Flutter project.');
            return;
        }

        // Verify it's a Flutter project
        const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
        if (!fs.existsSync(pubspecPath)) {
            vscode.window.showErrorMessage('This does not appear to be a Flutter project (pubspec.yaml not found).');
            return;
        }

        // Get Flutter command from settings
        const flutterCommand = getFlutterCommand();

        // Get build-specific options
        let baseHref: string | undefined;
        let deletePubspecLock = false;

        // Ask if user wants to delete pubspec.lock
        const deleteLockChoice = await vscode.window.showQuickPick(
            [
                { label: 'Yes', description: 'Delete pubspec.lock before build', value: true },
                { label: 'No', description: 'Keep pubspec.lock', value: false }
            ],
            {
                placeHolder: 'Delete pubspec.lock before building?',
                ignoreFocusOut: true
            }
        );

        if (deleteLockChoice === undefined) {
            return; // User cancelled
        }

        deletePubspecLock = !deleteLockChoice.value;

        // For web builds, get base-href
        if (buildType === BuildType.Web) {
            baseHref = await getBaseHref();
            if (baseHref === undefined) {
                return; // User cancelled
            }
        }

        // Get build configuration
        const config = getBuildConfig(buildType, baseHref);

        // Show confirmation
        const proceed = await vscode.window.showQuickPick(
            [
                { label: 'Start Build', description: `Execute ${config.steps.length} steps`, value: true },
                { label: 'Cancel', description: 'Cancel build process', value: false }
            ],
            {
                placeHolder: `Ready to build ${config.name}`,
                ignoreFocusOut: true
            }
        );

        if (!proceed || !proceed.value) {
            vscode.window.showInformationMessage('Build cancelled.');
            return;
        }

        // Execute build
        await buildRunner.executeBuild(config, workspaceFolder, flutterCommand, deletePubspecLock);

    } catch (error: any) {
        vscode.window.showErrorMessage(`Build error: ${error.message}`);
    }
}

/**
 * Get workspace folder path
 */
async function getWorkspaceFolder(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    if (workspaceFolders.length === 1) {
        return workspaceFolders[0].uri.fsPath;
    }

    // Multiple workspace folders - let user choose
    const chosen = await vscode.window.showQuickPick(
        workspaceFolders.map(folder => ({
            label: folder.name,
            description: folder.uri.fsPath,
            folder: folder
        })),
        {
            placeHolder: 'Select workspace folder for build',
            ignoreFocusOut: true
        }
    );

    return chosen?.folder.uri.fsPath;
}

/**
 * Get Flutter command from settings
 */
function getFlutterCommand(): string {
    const config = vscode.workspace.getConfiguration('flutterBuildUtils');
    const customCommand = config.get<string>('customFlutterCommand', '').trim();

    if (customCommand) {
        return customCommand;
    }

    return config.get<string>('flutterCommand', 'fvm flutter');
}

/**
 * Get Dart command from Flutter command settings
 * Converts flutter command to dart command (e.g., "fvm flutter" -> "fvm dart")
 */
function getDartCommand(): string {
    const flutterCommand = getFlutterCommand();

    // Replace "flutter" with "dart" in the command
    return flutterCommand.replace('flutter', 'dart');
}

/**
 * Get base-href for web builds
 */
async function getBaseHref(): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
        prompt: 'Enter base-href for web build',
        placeHolder: '/',
        value: '/',
        ignoreFocusOut: true,
        validateInput: (value: string) => {
            if (!value) {
                return 'Base-href cannot be empty';
            }
            if (!value.startsWith('/')) {
                return 'Base-href must start with "/"';
            }
            if (!value.endsWith('/')) {
                return 'Base-href must end with "/"';
            }
            return null;
        }
    });

    return input;
}

/**
 * Handle utility command execution
 */
async function handleUtilityCommand(utilType: 'flutterVersion' | 'buildRunner' | 'flutterAnalyze' | 'flutterFormat' | 'clean' | 'pubGet' | 'cleanAndPubGet' | 'podInstall'): Promise<void> {
    try {
        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a Flutter project.');
            return;
        }

        // Verify it's a Flutter project (except for version check which can run anywhere)
        if (utilType !== 'flutterVersion') {
            const pubspecPath = path.join(workspaceFolder, 'pubspec.yaml');
            if (!fs.existsSync(pubspecPath)) {
                vscode.window.showErrorMessage('This does not appear to be a Flutter project (pubspec.yaml not found).');
                return;
            }
        }

        // For pod install, check if ios folder exists
        if (utilType === 'podInstall') {
            const iosPath = path.join(workspaceFolder, 'ios');
            if (!fs.existsSync(iosPath)) {
                vscode.window.showErrorMessage('iOS folder not found. This project may not support iOS.');
                return;
            }
        }

        // Get Flutter and Dart commands from settings
        const flutterCommand = getFlutterCommand();
        const dartCommand = getDartCommand();

        // Handle different utility types
        switch (utilType) {
            case 'flutterVersion':
                await utilityRunner.executeFlutterVersion(workspaceFolder, flutterCommand);
                break;

            case 'buildRunner':
                await utilityRunner.executeBuildRunner(workspaceFolder, dartCommand, flutterCommand);
                break;

            case 'flutterAnalyze':
                await utilityRunner.executeFlutterAnalyze(workspaceFolder, flutterCommand);
                break;

            case 'flutterFormat':
                await utilityRunner.executeFlutterFormat(workspaceFolder, dartCommand, flutterCommand);
                break;

            case 'clean':
                await utilityRunner.executeClean(workspaceFolder, flutterCommand);
                break;

            case 'pubGet':
                await utilityRunner.executePubGet(workspaceFolder, flutterCommand);
                break;

            case 'cleanAndPubGet':
                // Ask if user wants to delete pubspec.lock
                const deleteLockChoice = await vscode.window.showQuickPick(
                    [
                        { label: 'Yes', description: 'Delete pubspec.lock before clean & pub get', value: true },
                        { label: 'No', description: 'Keep pubspec.lock', value: false }
                    ],
                    {
                        placeHolder: 'Delete pubspec.lock?',
                        ignoreFocusOut: true
                    }
                );

                if (deleteLockChoice !== undefined) {
                    await utilityRunner.executeCleanAndPubGet(
                        workspaceFolder,
                        flutterCommand,
                        deleteLockChoice.value
                    );
                }
                break;

            case 'podInstall':
                await utilityRunner.executePodInstall(workspaceFolder, flutterCommand);
                break;
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Utility command error: ${error.message}`);
    }
}

/**
 * Handle MCP config generation
 */
async function handleGenerateMcpConfig(): Promise<void> {
    try {
        // Prompt for FyUI library path
        const fyUiPath = await vscode.window.showInputBox({
            prompt: 'Enter the base path to your fy_ui library repository',
            placeHolder: '/Users/yourname/projects/fy_ui',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                // Check if path exists
                if (!fs.existsSync(value.replace(/\/$/, ''))) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                return null;
            }
        });

        if (!fyUiPath) {
            return; // User cancelled
        }

        // Remove trailing slash if present
        const normalizedPath = fyUiPath.replace(/\/$/, '');

        // Get dart command to determine if using FVM
        const dartCommand = getDartCommand();
        const isUsingFvm = dartCommand.includes('fvm');

        // Generate MCP config based on FVM usage
        let mcpConfig: any;

        if (isUsingFvm) {
            // FVM configuration
            mcpConfig = {
                "fy_ui_mcp": {
                    "displayName": "FyUI Components MCP",
                    "type": "stdio",
                    "command": "fvm",
                    "args": [
                        "dart",
                        "run",
                        `${normalizedPath}/mcp_server/bin/mcp_server.dart`
                    ],
                    "workingDirectory": `${normalizedPath}/mcp_server`
                }
            };
        } else {
            // System Dart configuration
            mcpConfig = {
                "fy_ui_mcp": {
                    "displayName": "FyUI Components MCP",
                    "type": "stdio",
                    "command": "dart",
                    "args": [
                        "run",
                        `${normalizedPath}/mcp_server/bin/mcp_server.dart`
                    ],
                    "workingDirectory": `${normalizedPath}/mcp_server`
                }
            };
        }

        const configJson = JSON.stringify(mcpConfig, null, 2);

        // Show in output channel
        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.clear();
        outputChannel.show(true);

        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('FyUI MCP Configuration Generated');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine(`FyUI Path: ${normalizedPath}`);
        outputChannel.appendLine(`Using: ${isUsingFvm ? 'FVM (fvm dart)' : 'System Dart (dart)'}\n`);
        outputChannel.appendLine('Add this to your MCP settings file:\n');
        outputChannel.appendLine(configJson);
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Configuration copied to clipboard!');
        outputChannel.appendLine('='.repeat(60) + '\n');

        // Copy to clipboard
        await vscode.env.clipboard.writeText(configJson);

        // Show success message with actions
        const choice = await vscode.window.showInformationMessage(
            'FyUI MCP config generated and copied to clipboard!',
            'Generate Another',
            'Close'
        );

        if (choice === 'Generate Another') {
            // Regenerate
            await handleGenerateMcpConfig();
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`MCP config generation error: ${error.message}`);
    }
}

/**
 * Handle Fyers App launch config generation
 */
async function handleGenerateFyersLaunchConfig(): Promise<void> {
    try {
        // Prompt for Fyers App path
        const fyersAppPath = await vscode.window.showInputBox({
            prompt: 'Enter the base path to your fyers_app repository',
            placeHolder: '/Users/yourname/projects/fyers_app',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Path cannot be empty';
                }
                const normalizedValue = value.replace(/\/$/, '');
                // Check if path exists
                if (!fs.existsSync(normalizedValue)) {
                    return 'Path does not exist. Please enter a valid path.';
                }
                // Check if it has lib/main.dart
                const mainDartPath = path.join(normalizedValue, 'lib', 'main.dart');
                if (!fs.existsSync(mainDartPath)) {
                    return 'lib/main.dart not found. Please ensure this is a valid Flutter project.';
                }
                return null;
            }
        });

        if (!fyersAppPath) {
            return; // User cancelled
        }

        // Remove trailing slash if present
        const normalizedPath = fyersAppPath.replace(/\/$/, '');

        // Generate launch configurations
        const launchConfigs = [
            {
                "name": "fyers_app (web - chrome)",
                "cwd": normalizedPath,
                "request": "launch",
                "type": "dart",
                "flutterMode": "debug",
                "deviceId": "chrome",
                "program": "lib/main.dart",
                "args": [
                    "--web-port=5000",
                    "--web-enable-expression-evaluation",
                    "--web-browser-flag",
                    "--disable-web-security"
                ]
            },
            {
                "name": "fyers_app (any device)",
                "cwd": normalizedPath,
                "request": "launch",
                "type": "dart",
                "flutterMode": "debug",
                "program": "lib/main.dart"
            }
        ];

        const configJson = JSON.stringify(launchConfigs, null, 4);

        // Show in output channel
        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.clear();
        outputChannel.show(true);

        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Fyers App Launch Configurations Generated');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine(`Fyers App Path: ${normalizedPath}\n`);
        outputChannel.appendLine('Add these to your launch.json configurations array:\n');
        outputChannel.appendLine(configJson);
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Configurations copied to clipboard!');
        outputChannel.appendLine('='.repeat(60) + '\n');

        // Copy to clipboard
        await vscode.env.clipboard.writeText(configJson);

        // Show success message with actions
        const choice = await vscode.window.showInformationMessage(
            'Fyers App launch configurations generated and copied to clipboard!',
            'Open launch.json',
            'Generate Another',
            'Close'
        );

        if (choice === 'Open launch.json') {
            // Try to open launch.json if it exists
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const launchJsonPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'launch.json');

                if (fs.existsSync(launchJsonPath)) {
                    const doc = await vscode.workspace.openTextDocument(launchJsonPath);
                    await vscode.window.showTextDocument(doc);
                } else {
                    // Create .vscode folder if it doesn't exist
                    const vscodeFolder = path.join(workspaceFolders[0].uri.fsPath, '.vscode');
                    if (!fs.existsSync(vscodeFolder)) {
                        fs.mkdirSync(vscodeFolder, { recursive: true });
                    }

                    // Create basic launch.json
                    const launchTemplate = {
                        "version": "0.2.0",
                        "configurations": launchConfigs
                    };

                    fs.writeFileSync(launchJsonPath, JSON.stringify(launchTemplate, null, 4));

                    const doc = await vscode.workspace.openTextDocument(launchJsonPath);
                    await vscode.window.showTextDocument(doc);

                    vscode.window.showInformationMessage('Created launch.json with Fyers App configurations!');
                }
            } else {
                vscode.window.showWarningMessage('No workspace folder found. Please paste the config manually.');
            }
        } else if (choice === 'Generate Another') {
            // Regenerate
            await handleGenerateFyersLaunchConfig();
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Launch config generation error: ${error.message}`);
    }
}

/**
 * Open folder in Finder (macOS) or Explorer (Windows/Linux)
 */
function openFolderInFinder(folderPath: string): void {
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
        vscode.window.showErrorMessage(`Output folder not found: ${folderPath}`);
        return;
    }

    // Open folder based on platform
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
        // macOS - use 'open' command
        command = `open "${folderPath}"`;
    } else if (platform === 'win32') {
        // Windows - use 'explorer' command
        command = `explorer "${folderPath}"`;
    } else {
        // Linux - use 'xdg-open' command
        command = `xdg-open "${folderPath}"`;
    }

    const exec = require('child_process').exec;
    exec(command, (error: any) => {
        if (error) {
            vscode.window.showErrorMessage(`Failed to open folder: ${error.message}`);
        }
    });
}

export function deactivate() {
    if (buildRunner) {
        buildRunner.dispose();
    }
    if (utilityRunner) {
        utilityRunner.dispose();
    }
}
