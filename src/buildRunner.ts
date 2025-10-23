/**
 * Build Runner - Executes build commands and manages their state
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { BuildTreeProvider } from './buildTreeView';
import { BuildConfig, BuildSession, BuildStep, BuildType, CommandStatus, SessionStatus, SessionType } from './types';

const execAsync = promisify(exec);

export class BuildRunner {
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private treeProvider?: BuildTreeProvider;

    constructor(treeProvider?: BuildTreeProvider) {
        this.outputChannel = vscode.window.createOutputChannel('FLUTTERKIT');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.treeProvider = treeProvider;
    }

    /**
     * Set tree provider (if not provided in constructor)
     */
    setTreeProvider(treeProvider: BuildTreeProvider): void {
        this.treeProvider = treeProvider;
    }

    /**
     * Execute a build configuration
     */
    async executeBuild(
        config: BuildConfig,
        workspaceFolder: string,
        flutterCommand: string,
        skipPubspecLockDeletion: boolean = false
    ): Promise<boolean> {
        this.outputChannel.clear();
        this.outputChannel.show(true);

        this.log(`\n${'='.repeat(60)}`);
        this.log(`Starting ${config.name} Build Process`);
        this.log(`${'='.repeat(60)}\n`);
        this.log(`Workspace: ${workspaceFolder}`);
        this.log(`Flutter Command: ${flutterCommand}\n`);

        // Show Flutter version
        await this.showFlutterVersion(workspaceFolder, flutterCommand);

        // Create build session
        const sessionId = `build-${Date.now()}`;
        const steps = config.steps.filter(step =>
            !step.optional || (step.id === 'delete-pubspec-lock' && !skipPubspecLockDeletion)
        );

        const session: BuildSession = {
            id: sessionId,
            buildType: this.getBuildTypeFromName(config.name),
            buildName: config.name,
            status: SessionStatus.Running,
            startTime: new Date(),
            workspaceFolder: workspaceFolder,
            sessionType: SessionType.Build,
            steps: steps.map(step => ({
                step,
                status: CommandStatus.Waiting
            }))
        };

        // Start session in tree view
        if (this.treeProvider) {
            this.treeProvider.startBuildSession(session);
        }

        let stepIndex = 0;
        const totalSteps = steps.length;

        for (const step of steps) {
            // Skip optional steps if needed
            if (step.optional && step.id === 'delete-pubspec-lock' && skipPubspecLockDeletion) {
                this.log(`⏭️  Skipping: ${step.description}\n`);
                continue;
            }

            // Prepare command
            const command = step.command.replace('{FLUTTER_CMD}', flutterCommand);

            this.log(`${'─'.repeat(60)}`);
            this.log(`Step ${stepIndex + 1}/${totalSteps}: ${step.description}`);
            this.log(`Command: ${command}`);
            this.log(`${'─'.repeat(60)}`);

            // Update status to in-progress
            if (this.treeProvider) {
                this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.InProgress);
            }

            // Update status bar
            this.statusBarItem.text = `$(sync~spin) ${step.description}`;
            this.statusBarItem.show();

            // Execute command
            const success = await this.executeCommand(command, workspaceFolder, step, sessionId, stepIndex);

            if (!success) {
                // Update step to failed
                if (this.treeProvider) {
                    this.treeProvider.completeBuildSession(sessionId, SessionStatus.Failed);
                }

                this.statusBarItem.text = `$(error) Build Failed: ${step.description}`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

                vscode.window.showErrorMessage(
                    `Build failed at step: ${step.description}. Check output for details.`
                );

                setTimeout(() => {
                    this.statusBarItem.hide();
                }, 5000);

                return false;
            }

            stepIndex++;
        }

        // Build completed successfully
        if (this.treeProvider) {
            this.treeProvider.completeBuildSession(sessionId, SessionStatus.Completed);
        }

        this.log(`\n${'='.repeat(60)}`);
        this.log(`✅ ${config.name} Build Completed Successfully!`);
        this.log(`${'='.repeat(60)}\n`);

        this.statusBarItem.text = `$(check) Build Complete`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');

        vscode.window.showInformationMessage(`${config.name} build completed successfully!`);

        setTimeout(() => {
            this.statusBarItem.hide();
        }, 5000);

        return true;
    }

    /**
     * Execute a single command
     */
    private async executeCommand(
        command: string,
        cwd: string,
        step: BuildStep,
        sessionId: string,
        stepIndex: number
    ): Promise<boolean> {
        this.log(`⏳ Status: In Progress\n`);

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });

            if (stdout) {
                this.log('Output:');
                this.log(stdout);
            }

            if (stderr && stderr.trim()) {
                this.log('Warnings/Info:');
                this.log(stderr);
            }

            this.log(`✅ Status: Success\n`);

            // Update step to success
            if (this.treeProvider) {
                this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.Success);
            }

            return true;

        } catch (error: any) {
            this.log(`❌ Status: Failed\n`);
            this.log(`${'▼'.repeat(60)}`);
            this.log('ERROR DETAILS:');
            this.log(`${'▼'.repeat(60)}`);

            let errorMessage = '';

            if (error.stdout) {
                this.log('Standard Output:');
                this.log(error.stdout);
                errorMessage += error.stdout;
            }

            if (error.stderr) {
                this.log('Error Output:');
                this.log(error.stderr);
                errorMessage += '\n' + error.stderr;
            }

            if (error.message) {
                this.log('Error Message:');
                this.log(error.message);
                errorMessage += '\n' + error.message;
            }

            this.log(`${'▲'.repeat(60)}\n`);

            // Update step to failed with error
            if (this.treeProvider) {
                this.treeProvider.updateStepStatus(
                    sessionId,
                    stepIndex,
                    CommandStatus.Failed,
                    this.truncateError(errorMessage)
                );
            }

            return false;
        }
    }

    /**
     * Truncate error message for display in tree view
     */
    private truncateError(error: string, maxLength: number = 200): string {
        if (error.length <= maxLength) {
            return error;
        }
        return error.substring(0, maxLength) + '... (see output for full error)';
    }

    /**
     * Get build type from build name
     */
    private getBuildTypeFromName(buildName: string): BuildType {
        if (buildName.includes('APK')) {
            return BuildType.APK;
        }
        if (buildName.includes('IPA')) {
            return BuildType.IPA;
        }
        if (buildName.includes('Web')) {
            return BuildType.Web;
        }
        return BuildType.APK; // Default
    }

    /**
     * Show Flutter version
     */
    private async showFlutterVersion(workspaceFolder: string, flutterCommand: string): Promise<void> {
        this.log(`${'─'.repeat(60)}`);
        this.log(`Flutter Version Check`);
        this.log(`${'─'.repeat(60)}`);

        try {
            const versionCommand = `${flutterCommand} --version`;
            this.log(`Command: ${versionCommand}\n`);

            const { stdout, stderr } = await execAsync(versionCommand, {
                cwd: workspaceFolder,
                maxBuffer: 10 * 1024 * 1024
            });

            if (stdout) {
                this.log(stdout.trim());
            }

            if (stderr && stderr.trim()) {
                this.log(stderr.trim());
            }

            this.log(`\n${'─'.repeat(60)}\n`);

        } catch (error: any) {
            this.log(`⚠️  Warning: Could not get Flutter version`);
            if (error.message) {
                this.log(`Error: ${error.message}`);
            }
            this.log(`${'─'.repeat(60)}\n`);
        }
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
