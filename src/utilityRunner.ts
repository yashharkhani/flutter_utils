/**
 * Utility Runner - Executes utility commands and manages their state
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { BuildTreeProvider } from './buildTreeView';
import { BuildSession, BuildStep, CommandStatus, SessionStatus, SessionType } from './types';

const execAsync = promisify(exec);

export class UtilityRunner {
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private treeProvider?: BuildTreeProvider;

    constructor(treeProvider?: BuildTreeProvider) {
        this.outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.treeProvider = treeProvider;
    }

    setTreeProvider(treeProvider: BuildTreeProvider): void {
        this.treeProvider = treeProvider;
    }

    /**
     * Execute Flutter version check
     */
    async executeFlutterVersion(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        this.outputChannel.clear();
        this.outputChannel.show(true);

        this.log(`\n${'='.repeat(60)}`);
        this.log(`Flutter Version Information`);
        this.log(`${'='.repeat(60)}\n`);
        this.log(`Workspace: ${workspaceFolder}`);
        this.log(`Flutter Command: ${flutterCommand}\n`);

        this.statusBarItem.text = '$(sync~spin) Checking Flutter version...';
        this.statusBarItem.show();

        try {
            const versionCommand = `${flutterCommand} --version`;
            this.log(`${'─'.repeat(60)}`);
            this.log(`Command: ${versionCommand}`);
            this.log(`${'─'.repeat(60)}\n`);

            const { stdout, stderr } = await execAsync(versionCommand, {
                cwd: workspaceFolder,
                maxBuffer: 10 * 1024 * 1024
            });

            if (stdout) {
                this.log(stdout.trim());
            }

            if (stderr && stderr.trim()) {
                this.log('\nAdditional Info:');
                this.log(stderr.trim());
            }

            this.log(`\n${'='.repeat(60)}`);
            this.log(`✅ Flutter version retrieved successfully`);
            this.log(`${'='.repeat(60)}\n`);

            this.statusBarItem.text = '$(check) Flutter Version Retrieved';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');

            vscode.window.showInformationMessage('Flutter version retrieved successfully!');

            setTimeout(() => {
                this.statusBarItem.hide();
            }, 3000);

            return true;

        } catch (error: any) {
            this.log(`\n❌ Error getting Flutter version`);
            if (error.message) {
                this.log(`Error: ${error.message}`);
            }
            if (error.stderr) {
                this.log(`Details: ${error.stderr}`);
            }

            this.statusBarItem.text = '$(error) Version Check Failed';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

            vscode.window.showErrorMessage('Failed to get Flutter version. Check output for details.');

            setTimeout(() => {
                this.statusBarItem.hide();
            }, 5000);

            return false;
        }
    }

    /**
     * Execute build runner
     */
    async executeBuildRunner(workspaceFolder: string, dartCommand: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'build-runner',
                description: 'Generate code with build_runner',
                command: `${dartCommand} run build_runner build --delete-conflicting-outputs`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand, // Pass flutter command for version check
            'Build Runner',
            steps
        );
    }

    /**
     * Execute flutter analyze
     */
    async executeFlutterAnalyze(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'analyze',
                description: 'Analyze Dart code',
                command: '{FLUTTER_CMD} analyze'
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Flutter Analyze',
            steps
        );
    }

    /**
     * Execute dart format
     */
    async executeFlutterFormat(workspaceFolder: string, dartCommand: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'format',
                description: 'Format Dart code (line length: 80)',
                command: `${dartCommand} format . -l 80`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand, // For version check
            'Dart Format',
            steps
        );
    }

    /**
     * Execute clean command
     */
    async executeClean(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Clean',
            [{ id: 'clean', description: 'Clean project', command: '{FLUTTER_CMD} clean' }]
        );
    }

    /**
     * Execute pub get command
     */
    async executePubGet(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Pub Get',
            [{ id: 'pub-get', description: 'Get dependencies', command: '{FLUTTER_CMD} pub get' }]
        );
    }

    /**
     * Execute clean and pub get
     */
    async executeCleanAndPubGet(
        workspaceFolder: string,
        flutterCommand: string,
        deletePubspecLock: boolean
    ): Promise<boolean> {
        const steps: BuildStep[] = [];

        if (deletePubspecLock) {
            steps.push({
                id: 'delete-lock',
                description: 'Delete pubspec.lock',
                command: 'rm -f pubspec.lock'
            });
        }

        steps.push(
            {
                id: 'clean',
                description: 'Clean project',
                command: '{FLUTTER_CMD} clean'
            },
            {
                id: 'pub-get',
                description: 'Get dependencies',
                command: '{FLUTTER_CMD} pub get'
            }
        );

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Clean & Pub Get',
            steps
        );
    }

    /**
     * Execute git push
     */
    async executeGitPush(workspaceFolder: string, branchName: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'git-push',
                description: `Push to origin/${branchName}`,
                command: `git push origin ${branchName}`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Git Push (${branchName})`,
            steps
        );
    }

    /**
     * Execute git pull
     */
    async executeGitPull(workspaceFolder: string, branchName: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'git-pull',
                description: `Pull from origin/${branchName}`,
                command: `git pull origin ${branchName}`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Git Pull (${branchName})`,
            steps
        );
    }

    /**
     * Execute git commit with type
     */
    async executeGitCommit(workspaceFolder: string, commitType: string, message: string, flutterCommand: string): Promise<boolean> {
        const commitMessage = `${commitType}: ${message}`;

        const steps: BuildStep[] = [
            {
                id: 'git-commit',
                description: `Commit: ${commitMessage}`,
                command: `git commit -m "${commitMessage}"`
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            `Git Commit`,
            steps
        );
    }

    /**
     * Execute pod install
     */
    async executePodInstall(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'remove-pods',
                description: 'Remove Pods folder',
                command: 'cd ios && rm -rf Pods'
            },
            {
                id: 'remove-symlinks',
                description: 'Remove .symlinks',
                command: 'cd ios && rm -rf .symlinks'
            },
            {
                id: 'remove-podfile-lock',
                description: 'Remove Podfile.lock',
                command: 'cd ios && rm -rf Podfile.lock'
            },
            {
                id: 'pod-deintegrate',
                description: 'Pod deintegrate',
                command: 'export LANG=en_US.UTF-8 && cd ios && pod deintegrate'
            },
            {
                id: 'pod-setup',
                description: 'Pod setup',
                command: 'export LANG=en_US.UTF-8 && cd ios && pod setup'
            },
            {
                id: 'pod-install',
                description: 'Pod install',
                command: 'export LANG=en_US.UTF-8 && cd ios && pod install'
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand, // Pass flutter command for version check
            'Pod Install',
            steps
        );
    }

    /**
     * Execute utility with session tracking
     */
    private async executeUtilityWithSession(
        workspaceFolder: string,
        flutterCommand: string,
        utilityName: string,
        steps: BuildStep[]
    ): Promise<boolean> {
        this.outputChannel.clear();
        this.outputChannel.show(true);

        this.log(`\n${'='.repeat(60)}`);
        this.log(`Starting: ${utilityName}`);
        this.log(`${'='.repeat(60)}\n`);
        this.log(`Workspace: ${workspaceFolder}`);
        this.log(`Flutter Command: ${flutterCommand}\n`);

        // Show Flutter version
        await this.showFlutterVersion(workspaceFolder, flutterCommand);

        // Create session
        const sessionId = `util-${Date.now()}`;
        const session: BuildSession = {
            id: sessionId,
            buildName: utilityName,
            status: SessionStatus.Running,
            startTime: new Date(),
            workspaceFolder: workspaceFolder,
            sessionType: SessionType.Utility,
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
                // Update to failed
                if (this.treeProvider) {
                    this.treeProvider.completeBuildSession(sessionId, SessionStatus.Failed);
                }

                this.statusBarItem.text = `$(error) ${utilityName} Failed`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

                vscode.window.showErrorMessage(`${utilityName} failed at step: ${step.description}. Check output for details.`);

                setTimeout(() => {
                    this.statusBarItem.hide();
                }, 5000);

                return false;
            }

            stepIndex++;
        }

        // Completed successfully
        if (this.treeProvider) {
            this.treeProvider.completeBuildSession(sessionId, SessionStatus.Completed);
        }

        this.log(`\n${'='.repeat(60)}`);
        this.log(`✅ ${utilityName} Completed Successfully!`);
        this.log(`${'='.repeat(60)}\n`);

        this.statusBarItem.text = `$(check) ${utilityName} Complete`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');

        vscode.window.showInformationMessage(`${utilityName} completed successfully!`);

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

            // Update step to failed with error (store full error message)
            if (this.treeProvider) {
                this.treeProvider.updateStepStatus(
                    sessionId,
                    stepIndex,
                    CommandStatus.Failed,
                    errorMessage
                );
            }

            return false;
        }
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

    dispose(): void {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
