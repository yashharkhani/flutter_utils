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
import {
    generateFreezedApiState,
    generateFreezedCubitState,
    generateFreezedModel,
    generateFreezedUiState
} from './codeGenerator';
import { BuildType, CustomCommand } from './types';
import { UtilityRunner } from './utilityRunner';

let buildRunner: BuildRunner;
let utilityRunner: UtilityRunner;
let treeDataProvider: BuildTreeProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('flutter-toolbox extension is now active');

    // Initialize tree view provider first
    treeDataProvider = new BuildTreeProvider();
    const treeView = vscode.window.registerTreeDataProvider(
        'flutterToolboxView',
        treeDataProvider
    );

    // Initialize build runner and utility runner with tree provider
    buildRunner = new BuildRunner(treeDataProvider);
    utilityRunner = new UtilityRunner(treeDataProvider);

    // Register commands
    const buildApkCommand = vscode.commands.registerCommand(
        'flutter-toolbox.buildApk',
        () => handleBuild(BuildType.APK)
    );

    const buildIpaCommand = vscode.commands.registerCommand(
        'flutter-toolbox.buildIpa',
        () => handleBuild(BuildType.IPA)
    );

    const buildWebCommand = vscode.commands.registerCommand(
        'flutter-toolbox.buildWeb',
        () => handleBuild(BuildType.Web)
    );

    const refreshViewCommand = vscode.commands.registerCommand(
        'flutter-toolbox.refreshView',
        () => treeDataProvider.refresh()
    );

    const clearSessionsCommand = vscode.commands.registerCommand(
        'flutter-toolbox.clearSessions',
        () => {
            treeDataProvider.clearSessions();
            vscode.window.showInformationMessage('Build history cleared');
        }
    );

    const openOutputFolderCommand = vscode.commands.registerCommand(
        'flutter-toolbox.openOutputFolder',
        (item: BuildTreeItem) => {
            if (item && item.folderPath) {
                openFolderInFinder(item.folderPath);
            }
        }
    );

    // Utility commands
    const flutterVersionCommand = vscode.commands.registerCommand(
        'flutter-toolbox.flutterVersion',
        () => handleUtilityCommand('flutterVersion')
    );

    const cleanCommand = vscode.commands.registerCommand(
        'flutter-toolbox.clean',
        () => handleUtilityCommand('clean')
    );

    const pubGetCommand = vscode.commands.registerCommand(
        'flutter-toolbox.pubGet',
        () => handleUtilityCommand('pubGet')
    );

    const cleanAndPubGetCommand = vscode.commands.registerCommand(
        'flutter-toolbox.cleanAndPubGet',
        () => handleUtilityCommand('cleanAndPubGet')
    );

    const podInstallCommand = vscode.commands.registerCommand(
        'flutter-toolbox.podInstall',
        () => handleUtilityCommand('podInstall')
    );

    const buildRunnerCommand = vscode.commands.registerCommand(
        'flutter-toolbox.buildRunner',
        () => handleUtilityCommand('buildRunner')
    );

    const flutterAnalyzeCommand = vscode.commands.registerCommand(
        'flutter-toolbox.flutterAnalyze',
        () => handleUtilityCommand('flutterAnalyze')
    );

    const flutterFormatCommand = vscode.commands.registerCommand(
        'flutter-toolbox.flutterFormat',
        () => handleUtilityCommand('flutterFormat')
    );

    // MCP commands
    const generateMcpConfigCommand = vscode.commands.registerCommand(
        'flutter-toolbox.generateMcpConfig',
        () => handleGenerateMcpConfig()
    );

    const generateFyersLaunchConfigCommand = vscode.commands.registerCommand(
        'flutter-toolbox.generateFyersLaunchConfig',
        () => handleGenerateFyersLaunchConfig()
    );

    // Git action commands
    const openRepositoryCommand = vscode.commands.registerCommand(
        'flutter-toolbox.openRepository',
        () => handleGitAction('openRepo')
    );

    const createPRCommand = vscode.commands.registerCommand(
        'flutter-toolbox.createPR',
        () => handleGitAction('createPR')
    );

    const viewPRCommand = vscode.commands.registerCommand(
        'flutter-toolbox.viewPR',
        () => handleGitAction('viewPR')
    );

    const openActionsCommand = vscode.commands.registerCommand(
        'flutter-toolbox.openActions',
        () => handleGitAction('openActions')
    );

    const openCurrentFileCommand = vscode.commands.registerCommand(
        'flutter-toolbox.openCurrentFile',
        () => handleGitAction('openCurrentFile')
    );

    const viewCurrentCommitCommand = vscode.commands.registerCommand(
        'flutter-toolbox.viewCurrentCommit',
        () => handleGitAction('viewCurrentCommit')
    );

    const copyCommitHashCommand = vscode.commands.registerCommand(
        'flutter-toolbox.copyCommitHash',
        () => handleGitAction('copyCommitHash')
    );

    // Code generation commands
    const generateFreezedCubitStateCommand = vscode.commands.registerCommand(
        'flutter-toolbox.generateFreezedCubitState',
        () => generateFreezedCubitState()
    );

    const generateFreezedApiStateCommand = vscode.commands.registerCommand(
        'flutter-toolbox.generateFreezedApiState',
        () => generateFreezedApiState()
    );

    const generateFreezedUiStateCommand = vscode.commands.registerCommand(
        'flutter-toolbox.generateFreezedUiState',
        () => generateFreezedUiState()
    );

    const generateFreezedModelCommand = vscode.commands.registerCommand(
        'flutter-toolbox.generateFreezedModel',
        () => generateFreezedModel()
    );

    const addFlutterCursorRulesCommand = vscode.commands.registerCommand(
        'flutter-toolbox.addFlutterCursorRules',
        () => handleAddFlutterCursorRules(context)
    );

    const setupGitAICommand = vscode.commands.registerCommand(
        'flutter-toolbox.setupGitAI',
        () => handleSetupGitAI(context)
    );

    const gitPushCommand = vscode.commands.registerCommand(
        'flutter-toolbox.gitPush',
        () => handleGitCommand('push')
    );

    const gitPullCommand = vscode.commands.registerCommand(
        'flutter-toolbox.gitPull',
        () => handleGitCommand('pull')
    );

    const gitCommitCommand = vscode.commands.registerCommand(
        'flutter-toolbox.gitCommit',
        () => handleGitCommit()
    );

    const gitFetchCommand = vscode.commands.registerCommand(
        'flutter-toolbox.gitFetch',
        () => handleGitCommand('fetch')
    );

    const showErrorInEditorCommand = vscode.commands.registerCommand(
        'flutter-toolbox.showErrorInEditor',
        (item: BuildTreeItem) => handleShowErrorInEditor(item)
    );

    // Custom command commands
    const addCustomCommandCommand = vscode.commands.registerCommand(
        'flutter-toolbox.addCustomCommand',
        () => handleAddCustomCommand()
    );

    const editCustomCommandCommand = vscode.commands.registerCommand(
        'flutter-toolbox.editCustomCommand',
        (item: BuildTreeItem) => handleEditCustomCommand(item)
    );

    const deleteCustomCommandCommand = vscode.commands.registerCommand(
        'flutter-toolbox.deleteCustomCommand',
        (item: BuildTreeItem) => handleDeleteCustomCommand(item)
    );

    const runCustomCommandCommand = vscode.commands.registerCommand(
        'flutter-toolbox.runCustomCommand',
        (item: BuildTreeItem) => handleRunCustomCommand(item)
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
        openRepositoryCommand,
        openCurrentFileCommand,
        viewCurrentCommitCommand,
        copyCommitHashCommand,
        createPRCommand,
        viewPRCommand,
        openActionsCommand,
        generateFreezedCubitStateCommand,
        generateFreezedApiStateCommand,
        generateFreezedUiStateCommand,
        generateFreezedModelCommand,
        addFlutterCursorRulesCommand,
        setupGitAICommand,
        gitPushCommand,
        gitPullCommand,
        gitCommitCommand,
        gitFetchCommand,
        showErrorInEditorCommand,
        addCustomCommandCommand,
        editCustomCommandCommand,
        deleteCustomCommandCommand,
        runCustomCommandCommand,
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
        let useWasm: boolean | undefined;
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

        // For web builds, get base-href and WASM option
        if (buildType === BuildType.Web) {
            baseHref = await getBaseHref();
            if (baseHref === undefined) {
                return; // User cancelled
            }

            // Ask if user wants to use WASM
            const wasmChoice = await vscode.window.showQuickPick(
                [
                    { label: 'No', description: 'Build with JavaScript (standard)', value: false },
                    { label: 'Yes', description: 'Build with WebAssembly (--wasm)', value: true }
                ],
                {
                    placeHolder: 'Use WebAssembly (WASM) for web build?',
                    ignoreFocusOut: true
                }
            );

            if (wasmChoice === undefined) {
                return; // User cancelled
            }

            useWasm = wasmChoice.value;
        }

        // Get build configuration
        const config = getBuildConfig(buildType, baseHref, useWasm);

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
    const config = vscode.workspace.getConfiguration('flutterToolbox');
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
 * Get git repository URL
 */
async function getGitRepoUrl(workspaceFolder: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('git remote get-url origin', { cwd: workspaceFolder });
        const remote = stdout.trim();

        // Convert git@github.com:user/repo.git to https://github.com/user/repo
        if (remote.startsWith('git@github.com:')) {
            return remote
                .replace('git@github.com:', 'https://github.com/')
                .replace('.git', '');
        }

        // Handle https://github.com/user/repo.git format
        if (remote.startsWith('https://')) {
            return remote.replace('.git', '');
        }

        return remote;
    } catch (error) {
        return null;
    }
}

/**
 * Get current git branch
 */
async function getCurrentBranch(workspaceFolder: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceFolder });
        return stdout.trim();
    } catch (error) {
        return null;
    }
}

/**
 * Get current commit hash
 */
async function getCurrentCommitHash(workspaceFolder: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: workspaceFolder });
        return stdout.trim();
    } catch (error) {
        return null;
    }
}

/**
 * Get relative path of file within git repository
 */
async function getGitRelativePath(workspaceFolder: string, filePath: string): Promise<string | null> {
    try {
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        // Get the git root directory
        const { stdout: gitRoot } = await execAsync('git rev-parse --show-toplevel', { cwd: workspaceFolder });
        const rootPath = gitRoot.trim();

        // Calculate relative path from git root
        const relativePath = path.relative(rootPath, filePath);
        return relativePath;
    } catch (error) {
        return null;
    }
}

/**
 * Open URL in default browser
 */
function openUrl(url: string): void {
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
        // macOS
        command = `open "${url}"`;
    } else if (platform === 'win32') {
        // Windows
        command = `start "${url}"`;
    } else {
        // Linux
        command = `xdg-open "${url}"`;
    }

    const exec = require('child_process').exec;
    exec(command, (error: any) => {
        if (error) {
            vscode.window.showErrorMessage(`Failed to open URL: ${error.message}`);
        }
    });
}

/**
 * Handle git actions
 */
async function handleGitAction(actionType: 'openRepo' | 'openCurrentFile' | 'viewCurrentCommit' | 'copyCommitHash' | 'createPR' | 'viewPR' | 'openActions'): Promise<void> {
    try {
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        // Get repo URL
        const repoUrl = await getGitRepoUrl(workspaceFolder);
        if (!repoUrl) {
            vscode.window.showErrorMessage('Could not get git remote URL. Is this a git repository?');
            return;
        }

        // Get current branch (not needed for all actions)
        const currentBranch = await getCurrentBranch(workspaceFolder);

        // Handle different actions
        switch (actionType) {
            case 'openRepo':
                // Open repository with current branch
                const repoWithBranch = currentBranch && currentBranch !== 'main' && currentBranch !== 'master'
                    ? `${repoUrl}/tree/${currentBranch}`
                    : repoUrl;
                openUrl(repoWithBranch);
                vscode.window.showInformationMessage(`Opening repository${currentBranch ? ` (${currentBranch})` : ''}...`);
                break;

            case 'openCurrentFile':
                // Open current file on GitHub
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('No file is currently open.');
                    return;
                }

                const currentFilePath = activeEditor.document.uri.fsPath;
                const relativePath = await getGitRelativePath(workspaceFolder, currentFilePath);

                if (!relativePath) {
                    vscode.window.showErrorMessage('Could not determine file path in repository.');
                    return;
                }

                const fileBranch = await getCurrentBranch(workspaceFolder);
                if (!fileBranch) {
                    vscode.window.showErrorMessage('Could not get current branch.');
                    return;
                }

                // Get current selection/line
                const selection = activeEditor.selection;
                const lineNumber = selection.active.line + 1; // Lines are 0-based, GitHub is 1-based

                const fileUrl = `${repoUrl}/blob/${fileBranch}/${relativePath}#L${lineNumber}`;
                openUrl(fileUrl);
                vscode.window.showInformationMessage(`Opening ${path.basename(currentFilePath)} on GitHub (${fileBranch}, line ${lineNumber})...`);
                break;

            case 'viewCurrentCommit':
                // View current commit on GitHub
                const commitHashForView = await getCurrentCommitHash(workspaceFolder);
                if (!commitHashForView) {
                    vscode.window.showErrorMessage('Could not get current commit hash.');
                    return;
                }

                const commitUrl = `${repoUrl}/commit/${commitHashForView}`;
                openUrl(commitUrl);
                vscode.window.showInformationMessage(`Opening commit ${commitHashForView.substring(0, 7)}...`);
                break;

            case 'copyCommitHash':
                // Copy commit hash to clipboard
                const commitHashToCopy = await getCurrentCommitHash(workspaceFolder);
                if (!commitHashToCopy) {
                    vscode.window.showErrorMessage('Could not get current commit hash.');
                    return;
                }

                await vscode.env.clipboard.writeText(commitHashToCopy);
                vscode.window.showInformationMessage(`Copied commit hash: ${commitHashToCopy.substring(0, 7)}...`);
                break;

            case 'createPR':
                if (!currentBranch) {
                    vscode.window.showErrorMessage('Could not get current branch.');
                    return;
                }
                // Create PR from current branch to master
                const createPrUrl = `${repoUrl}/compare/master...${currentBranch}`;
                openUrl(createPrUrl);
                vscode.window.showInformationMessage(`Creating PR: ${currentBranch} → master...`);
                break;

            case 'viewPR':
                if (!currentBranch) {
                    vscode.window.showErrorMessage('Could not get current branch.');
                    return;
                }
                // View PR for current branch
                const viewPrUrl = `${repoUrl}/pulls?q=is%3Apr+head%3A${currentBranch}`;
                openUrl(viewPrUrl);
                vscode.window.showInformationMessage(`Opening PRs for branch: ${currentBranch}...`);
                break;

            case 'openActions':
                // Open GitHub Actions
                const actionsUrl = `${repoUrl}/actions`;
                openUrl(actionsUrl);
                vscode.window.showInformationMessage('Opening GitHub Actions...');
                break;
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Git action error: ${error.message}`);
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

/**
 * Handle git push/pull/fetch command execution
 */
async function handleGitCommand(gitType: 'push' | 'pull' | 'fetch'): Promise<void> {
    try {
        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        // Get current branch as default
        const currentBranch = await getCurrentBranch(workspaceFolder);

        // For fetch, we don't need branch input
        if (gitType === 'fetch') {
            // Get Flutter command from settings
            const flutterCommand = getFlutterCommand();
            await utilityRunner.executeGitFetch(workspaceFolder, flutterCommand);
            return;
        }

        // Prompt for branch name (for push/pull)
        const branchName = await vscode.window.showInputBox({
            prompt: `Enter the branch name to ${gitType}`,
            placeHolder: currentBranch || 'main',
            value: currentBranch || '',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Branch name cannot be empty';
                }
                return null;
            }
        });

        if (!branchName) {
            return; // User cancelled
        }

        // Get Flutter command from settings
        const flutterCommand = getFlutterCommand();

        // Execute git command
        if (gitType === 'push') {
            await utilityRunner.executeGitPush(workspaceFolder, branchName.trim(), flutterCommand);
        } else {
            await utilityRunner.executeGitPull(workspaceFolder, branchName.trim(), flutterCommand);
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Git ${gitType} error: ${error.message}`);
    }
}

/**
 * Handle git commit with type selection
 */
async function handleGitCommit(): Promise<void> {
    try {
        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        // Check if we're in a git repo
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        try {
            await execAsync('git rev-parse --is-inside-work-tree', { cwd: workspaceFolder });
        } catch (error) {
            vscode.window.showErrorMessage('Not a git repository.');
            return;
        }

        // Check if there are staged changes
        try {
            const { stdout } = await execAsync('git diff --cached --quiet', { cwd: workspaceFolder });
        } catch (error: any) {
            // Non-zero exit code means there are staged changes - this is what we want
            if (error.code === 1) {
                // Continue with commit
            } else {
                vscode.window.showErrorMessage('Error checking git status.');
                return;
            }
        }

        // If diff --cached --quiet returns 0, there are no staged changes
        try {
            const { stdout } = await execAsync('git diff --cached --name-only', { cwd: workspaceFolder });
            if (!stdout.trim()) {
                vscode.window.showWarningMessage('⚠️  Nothing to commit (no staged changes)');
                return;
            }
        } catch (error) {
            vscode.window.showErrorMessage('Error checking staged changes.');
            return;
        }

        // Ask user to select commit type
        const commitTypes = [
            { label: 'feat', description: 'A new feature', value: 'feat' },
            { label: 'fix', description: 'A bug fix', value: 'fix' },
            { label: 'docs', description: 'Documentation only changes', value: 'docs' },
            { label: 'style', description: 'Code style changes (formatting, etc)', value: 'style' },
            { label: 'refactor', description: 'Code refactoring', value: 'refactor' },
            { label: 'perf', description: 'Performance improvements', value: 'perf' },
            { label: 'test', description: 'Adding or updating tests', value: 'test' },
            { label: 'chore', description: 'Maintenance tasks', value: 'chore' }
        ];

        const selectedType = await vscode.window.showQuickPick(commitTypes, {
            placeHolder: 'Select commit type',
            ignoreFocusOut: true
        });

        if (!selectedType) {
            return; // User cancelled
        }

        // Ask for commit message
        const message = await vscode.window.showInputBox({
            prompt: 'Enter commit message',
            placeHolder: 'your commit message here',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Commit message cannot be empty';
                }
                return null;
            }
        });

        if (!message) {
            return; // User cancelled
        }

        // Get Flutter command from settings
        const flutterCommand = getFlutterCommand();

        // Execute git commit
        await utilityRunner.executeGitCommit(
            workspaceFolder,
            selectedType.value,
            message.trim(),
            flutterCommand
        );

    } catch (error: any) {
        vscode.window.showErrorMessage(`Git commit error: ${error.message}`);
    }
}

/**
 * Handle Setup Git-AI
 */
async function handleSetupGitAI(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Check if on macOS
        const platform = process.platform;
        if (platform !== 'darwin') {
            vscode.window.showErrorMessage('Git-AI setup is currently only supported on macOS.');
            return;
        }

        // Get the script path from extension resources
        const scriptPath = path.join(context.extensionPath, 'resources', 'git_ai_setup.sh');

        // Check if script exists
        if (!fs.existsSync(scriptPath)) {
            vscode.window.showErrorMessage('Git-AI setup script not found in extension resources.');
            return;
        }

        // Show confirmation dialog
        const proceed = await vscode.window.showWarningMessage(
            'This will install git-ai and configure Cursor to use it. The script requires:\n\n' +
            '• Homebrew (will be checked)\n• Internet connection\n• Administrator permissions may be needed\n\n' +
            'Continue?',
            { modal: true },
            'Install Git-AI',
            'Cancel'
        );

        if (proceed !== 'Install Git-AI') {
            return;
        }

        // Show output channel
        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.clear();
        outputChannel.show(true);

        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Git-AI Setup Starting...');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine(`Script Path: ${scriptPath}\n`);

        // Execute the shell script
        const exec = require('child_process').exec;
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        vscode.window.showInformationMessage('Installing Git-AI... Check output panel for progress.');

        try {
            // Make script executable
            await execAsync(`chmod +x "${scriptPath}"`);

            // Execute the script
            const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });

            if (stdout) {
                outputChannel.appendLine(stdout);
            }

            if (stderr && stderr.trim()) {
                outputChannel.appendLine('\nWarnings/Additional Info:');
                outputChannel.appendLine(stderr);
            }

            outputChannel.appendLine('\n' + '='.repeat(60));
            outputChannel.appendLine('✅ Git-AI Setup Completed Successfully!');
            outputChannel.appendLine('='.repeat(60) + '\n');
            outputChannel.appendLine('Next steps:');
            outputChannel.appendLine('1. Restart Cursor for the settings to take effect');
            outputChannel.appendLine('2. Verify git-ai is working by running: git-ai --version\n');

            // Show success message with actions
            const choice = await vscode.window.showInformationMessage(
                'Git-AI setup completed successfully! Please restart Cursor for changes to take effect.',
                'Restart Cursor',
                'Later'
            );

            if (choice === 'Restart Cursor') {
                // Reload VS Code window
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }

        } catch (error: any) {
            outputChannel.appendLine('\n❌ Error during Git-AI setup');
            if (error.stdout) {
                outputChannel.appendLine('\nOutput:');
                outputChannel.appendLine(error.stdout);
            }
            if (error.stderr) {
                outputChannel.appendLine('\nError Details:');
                outputChannel.appendLine(error.stderr);
            }
            if (error.message) {
                outputChannel.appendLine('\nError Message:');
                outputChannel.appendLine(error.message);
            }

            vscode.window.showErrorMessage('Git-AI setup failed. Check output panel for details.');
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Git-AI setup error: ${error.message}`);
    }
}

/**
 * Handle adding Flutter cursor rules to a project
 */
async function handleAddFlutterCursorRules(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Prompt for project path
        const projectPath = await vscode.window.showInputBox({
            prompt: 'Enter the path to your Flutter project',
            placeHolder: '/Users/yourname/projects/your_flutter_app',
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
                // Check if it has pubspec.yaml
                const pubspecPath = path.join(normalizedValue, 'pubspec.yaml');
                if (!fs.existsSync(pubspecPath)) {
                    return 'pubspec.yaml not found. Please ensure this is a valid Flutter project.';
                }
                return null;
            }
        });

        if (!projectPath) {
            return; // User cancelled
        }

        // Remove trailing slash if present
        const normalizedPath = projectPath.replace(/\/$/, '');

        // Create .cursor/rules directory if it doesn't exist
        const cursorRulesDir = path.join(normalizedPath, '.cursor', 'rules');
        if (!fs.existsSync(cursorRulesDir)) {
            fs.mkdirSync(cursorRulesDir, { recursive: true });
        }

        // Get source file path from extension resources
        const sourceFilePath = path.join(context.extensionPath, 'resources', 'flutter_rules.mdc');

        // Check if source file exists
        if (!fs.existsSync(sourceFilePath)) {
            vscode.window.showErrorMessage('Flutter rules template file not found in extension resources.');
            return;
        }

        // Copy file to destination
        const destinationFilePath = path.join(cursorRulesDir, 'flutter_rules.mdc');
        fs.copyFileSync(sourceFilePath, destinationFilePath);

        // Show in output channel
        const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        outputChannel.clear();
        outputChannel.show(true);

        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Flutter Cursor Rules Added to Project');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine(`Project Path: ${normalizedPath}`);
        outputChannel.appendLine(`Rules File: ${destinationFilePath}\n`);
        outputChannel.appendLine('File Structure Created:');
        outputChannel.appendLine(`${normalizedPath}/`);
        outputChannel.appendLine('└── .cursor/');
        outputChannel.appendLine('    └── rules/');
        outputChannel.appendLine('        └── flutter_rules.mdc ✓');
        outputChannel.appendLine('\n' + '='.repeat(60));
        outputChannel.appendLine('Flutter cursor rules successfully added!');
        outputChannel.appendLine('='.repeat(60) + '\n');
        outputChannel.appendLine('The rules will be automatically applied when working in this project.');

        // Show success message with action
        const choice = await vscode.window.showInformationMessage(
            'Flutter cursor rules successfully added to project!',
            'Open File',
            'Add to Another Project',
            'Close'
        );

        if (choice === 'Open File') {
            // Open the created file
            const doc = await vscode.workspace.openTextDocument(destinationFilePath);
            await vscode.window.showTextDocument(doc);
        } else if (choice === 'Add to Another Project') {
            // Recursively call to add to another project
            await handleAddFlutterCursorRules(context);
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Error adding Flutter cursor rules: ${error.message}`);
    }
}

/**
 * Handle showing error in temporary editor file
 */
async function handleShowErrorInEditor(item: BuildTreeItem): Promise<void> {
    try {
        if (!item.error) {
            vscode.window.showWarningMessage('No error information available.');
            return;
        }

        // Create a temporary file with the error content
        const doc = await vscode.workspace.openTextDocument({
            content: item.error,
            language: 'text'
        });

        // Show the document in editor
        await vscode.window.showTextDocument(doc, {
            preview: true,
            viewColumn: vscode.ViewColumn.Beside
        });

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to show error: ${error.message}`);
    }
}

/**
 * Handle adding a new custom command
 */
async function handleAddCustomCommand(): Promise<void> {
    try {
        // Get command name
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for this command',
            placeHolder: 'e.g., Run Tests, Deploy to Staging',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Command name cannot be empty';
                }
                return null;
            }
        });

        if (!name) {
            return; // User cancelled
        }

        // Get description
        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description for this command',
            placeHolder: 'e.g., Run all unit tests',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Description cannot be empty';
                }
                return null;
            }
        });

        if (!description) {
            return; // User cancelled
        }

        // Get command
        const command = await vscode.window.showInputBox({
            prompt: 'Enter the command to execute',
            placeHolder: 'e.g., flutter test, npm run deploy',
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Command cannot be empty';
                }
                return null;
            }
        });

        if (!command) {
            return; // User cancelled
        }

        // Ask if requires confirmation
        const confirmChoice = await vscode.window.showQuickPick(
            [
                { label: 'No', description: 'Run immediately without confirmation', value: false },
                { label: 'Yes', description: 'Ask for confirmation before running', value: true }
            ],
            {
                placeHolder: 'Require confirmation before running?',
                ignoreFocusOut: true
            }
        );

        if (confirmChoice === undefined) {
            return; // User cancelled
        }

        // Ask for scope (global or workspace)
        const scopeChoice = await vscode.window.showQuickPick(
            [
                {
                    label: '🌍 Global',
                    description: 'Available in all projects',
                    value: 'global' as const
                },
                {
                    label: '📁 Workspace',
                    description: 'Only for this project',
                    value: 'workspace' as const
                }
            ],
            {
                placeHolder: 'Where should this command be available?',
                ignoreFocusOut: true
            }
        );

        if (scopeChoice === undefined) {
            return; // User cancelled
        }

        // Create the custom command
        const customCommand: CustomCommand = {
            id: `custom-${Date.now()}`,
            name: name.trim(),
            description: description.trim(),
            command: command.trim(),
            requiresConfirmation: confirmChoice.value,
            scope: scopeChoice.value
        };

        // Add to tree provider
        await treeDataProvider.addCustomCommand(customCommand);

        const scopeText = scopeChoice.value === 'global' ? 'globally' : 'to this workspace';
        vscode.window.showInformationMessage(`Custom command "${name}" added ${scopeText}!`);

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to add custom command: ${error.message}`);
    }
}

/**
 * Handle editing a custom command
 */
async function handleEditCustomCommand(item: BuildTreeItem): Promise<void> {
    try {
        if (!item.customCommandId) {
            vscode.window.showWarningMessage('No custom command ID found.');
            return;
        }

        const existingCommand = treeDataProvider.getCustomCommand(item.customCommandId);
        if (!existingCommand) {
            vscode.window.showWarningMessage('Custom command not found.');
            return;
        }

        // Get new name
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for this command',
            placeHolder: 'e.g., Run Tests, Deploy to Staging',
            value: existingCommand.name,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Command name cannot be empty';
                }
                return null;
            }
        });

        if (!name) {
            return; // User cancelled
        }

        // Get new description
        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description for this command',
            placeHolder: 'e.g., Run all unit tests',
            value: existingCommand.description,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Description cannot be empty';
                }
                return null;
            }
        });

        if (!description) {
            return; // User cancelled
        }

        // Get new command
        const command = await vscode.window.showInputBox({
            prompt: 'Enter the command to execute',
            placeHolder: 'e.g., flutter test, npm run deploy',
            value: existingCommand.command,
            ignoreFocusOut: true,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Command cannot be empty';
                }
                return null;
            }
        });

        if (!command) {
            return; // User cancelled
        }

        // Ask if requires confirmation
        const confirmChoice = await vscode.window.showQuickPick(
            [
                { label: 'No', description: 'Run immediately without confirmation', value: false },
                { label: 'Yes', description: 'Ask for confirmation before running', value: true }
            ],
            {
                placeHolder: 'Require confirmation before running?',
                ignoreFocusOut: true
            }
        );

        if (confirmChoice === undefined) {
            return; // User cancelled
        }

        // Ask for scope (global or workspace)
        const currentScope = existingCommand.scope || 'workspace';
        const scopeChoice = await vscode.window.showQuickPick(
            [
                {
                    label: '🌍 Global',
                    description: currentScope === 'global' ? '(Current)' : 'Available in all projects',
                    value: 'global' as const
                },
                {
                    label: '📁 Workspace',
                    description: currentScope === 'workspace' ? '(Current)' : 'Only for this project',
                    value: 'workspace' as const
                }
            ],
            {
                placeHolder: 'Where should this command be available?',
                ignoreFocusOut: true
            }
        );

        if (scopeChoice === undefined) {
            return; // User cancelled
        }

        // Update the custom command
        await treeDataProvider.updateCustomCommand(item.customCommandId, {
            name: name.trim(),
            description: description.trim(),
            command: command.trim(),
            requiresConfirmation: confirmChoice.value,
            scope: scopeChoice.value
        });

        const scopeText = scopeChoice.value === 'global' ? 'globally' : 'in this workspace';
        vscode.window.showInformationMessage(`Custom command "${name}" updated and saved ${scopeText}!`);

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to edit custom command: ${error.message}`);
    }
}

/**
 * Handle deleting a custom command
 */
async function handleDeleteCustomCommand(item: BuildTreeItem): Promise<void> {
    try {
        if (!item.customCommandId) {
            vscode.window.showWarningMessage('No custom command ID found.');
            return;
        }

        const existingCommand = treeDataProvider.getCustomCommand(item.customCommandId);
        if (!existingCommand) {
            vscode.window.showWarningMessage('Custom command not found.');
            return;
        }

        // Confirm deletion
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the command "${existingCommand.name}"?`,
            { modal: true },
            'Delete',
            'Cancel'
        );

        if (confirm !== 'Delete') {
            return;
        }

        // Delete the custom command
        await treeDataProvider.deleteCustomCommand(item.customCommandId);

        vscode.window.showInformationMessage(`Custom command "${existingCommand.name}" deleted successfully!`);

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to delete custom command: ${error.message}`);
    }
}

/**
 * Handle running a custom command
 */
async function handleRunCustomCommand(item: BuildTreeItem): Promise<void> {
    try {
        if (!item.customCommandId) {
            vscode.window.showWarningMessage('No custom command ID found.');
            return;
        }

        const customCommand = treeDataProvider.getCustomCommand(item.customCommandId);
        if (!customCommand) {
            vscode.window.showWarningMessage('Custom command not found.');
            return;
        }

        // Get workspace folder
        const workspaceFolder = await getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        // Check if requires confirmation
        if (customCommand.requiresConfirmation) {
            const confirm = await vscode.window.showQuickPick(
                [
                    { label: 'Run', description: `Execute: ${customCommand.command}`, value: true },
                    { label: 'Cancel', description: 'Cancel execution', value: false }
                ],
                {
                    placeHolder: `Run custom command: ${customCommand.name}?`,
                    ignoreFocusOut: true
                }
            );

            if (!confirm || !confirm.value) {
                return;
            }
        }

        // Get Flutter command from settings
        const flutterCommand = getFlutterCommand();

        // Execute the custom command using utility runner
        const steps = [{
            id: 'custom-command',
            description: customCommand.name,
            command: customCommand.command
        }];

        await utilityRunner.executeUtilityWithSession(
            customCommand.workingDirectory || workspaceFolder,
            flutterCommand,
            customCommand.name,
            steps
        );

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to run custom command: ${error.message}`);
    }
}

export function deactivate() {
    if (buildRunner) {
        buildRunner.dispose();
    }
    if (utilityRunner) {
        utilityRunner.dispose();
    }
}
