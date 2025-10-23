/**
 * Flutter Build Utils Extension
 * Main extension file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getBuildConfig } from './buildCommands';
import { BuildRunner } from './buildRunner';
import { BuildTreeItem, BuildTreeProvider } from './buildTreeView';
import { BuildType } from './types';

let buildRunner: BuildRunner;
let treeDataProvider: BuildTreeProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Flutter Build Utils extension is now active');

    // Initialize tree view provider first
    treeDataProvider = new BuildTreeProvider();
    const treeView = vscode.window.registerTreeDataProvider(
        'flutterBuildUtilsView',
        treeDataProvider
    );

    // Initialize build runner with tree provider
    buildRunner = new BuildRunner(treeDataProvider);

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

    context.subscriptions.push(
        buildApkCommand,
        buildIpaCommand,
        buildWebCommand,
        refreshViewCommand,
        clearSessionsCommand,
        openOutputFolderCommand,
        treeView,
        buildRunner
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
}
