/**
 * Utility Runner - Executes utility commands and manages their state
 */

import { exec, spawn } from 'child_process';
import * as vscode from 'vscode';
import { BuildTreeProvider } from './buildTreeView';
import { BuildSession, BuildStep, CommandStatus, SessionStatus, SessionType } from './types';

export class UtilityRunner {
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private treeProvider?: BuildTreeProvider;
    private abortControllers: Map<string, AbortController> = new Map();

    constructor(treeProvider?: BuildTreeProvider) {
        this.outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.treeProvider = treeProvider;
    }

    setTreeProvider(treeProvider: BuildTreeProvider): void {
        this.treeProvider = treeProvider;
    }

    /**
     * Stop a running session by aborting its current command
     */
    stopSession(sessionId: string): void {
        const controller = this.abortControllers.get(sessionId);
        if (controller) {
            controller.abort();
            this.abortControllers.delete(sessionId);
        }
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

        return new Promise((resolve) => {
            const versionCommand = `${flutterCommand} --version`;
            this.log(`${'─'.repeat(60)}`);
            this.log(`Command: ${versionCommand}`);
            this.log(`${'─'.repeat(60)}\n`);

            exec(versionCommand, { cwd: workspaceFolder, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (stdout) { this.log(stdout.trim()); }
                if (stderr && stderr.trim()) { this.log('\nAdditional Info:'); this.log(stderr.trim()); }

                if (error) {
                    this.log(`\n❌ Error getting Flutter version`);
                    if (error.message) { this.log(`Error: ${error.message}`); }

                    this.statusBarItem.text = '$(error) Version Check Failed';
                    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

                    vscode.window.showErrorMessage('Failed to get Flutter version. Check output for details.');

                    setTimeout(() => { this.statusBarItem.hide(); }, 5000);
                    resolve(false);
                    return;
                }

                this.log(`\n${'='.repeat(60)}`);
                this.log(`✅ Flutter version retrieved successfully`);
                this.log(`${'='.repeat(60)}\n`);

                this.statusBarItem.text = '$(check) Flutter Version Retrieved';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');

                vscode.window.showInformationMessage('Flutter version retrieved successfully!');

                setTimeout(() => { this.statusBarItem.hide(); }, 3000);
                resolve(true);
            });
        });
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
     * Execute git fetch
     */
    async executeGitFetch(workspaceFolder: string, flutterCommand: string): Promise<boolean> {
        const steps: BuildStep[] = [
            {
                id: 'git-fetch',
                description: 'Fetch from origin',
                command: 'git fetch origin'
            }
        ];

        return this.executeUtilityWithSession(
            workspaceFolder,
            flutterCommand,
            'Git Fetch',
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
    async executeUtilityWithSession(
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

        // Create an AbortController for this session so it can be stopped
        const abortController = new AbortController();
        this.abortControllers.set(sessionId, abortController);

        let stepIndex = 0;
        const totalSteps = steps.length;

        for (const step of steps) {
            // Bail out early if already aborted before this step starts
            if (abortController.signal.aborted) {
                break;
            }

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
            const result = await this.executeCommand(command, workspaceFolder, step, sessionId, stepIndex, abortController.signal);

            if (result === 'cancelled') {
                // User stopped the session
                this.abortControllers.delete(sessionId);
                if (this.treeProvider) {
                    this.treeProvider.completeBuildSession(sessionId, SessionStatus.Cancelled);
                }

                this.log(`\n${'='.repeat(60)}`);
                this.log(`🛑 ${utilityName} stopped by user.`);
                this.log(`${'='.repeat(60)}\n`);

                this.statusBarItem.text = `$(stop-circle) ${utilityName} Stopped`;
                this.statusBarItem.backgroundColor = undefined;

                setTimeout(() => {
                    this.statusBarItem.hide();
                }, 3000);

                return false;
            }

            if (!result) {
                // Update to failed
                this.abortControllers.delete(sessionId);
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
        this.abortControllers.delete(sessionId);
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
     * Execute a single command. Returns true on success, false on failure, 'cancelled' when aborted.
     * Uses spawn with detached:true so we can kill the entire process group instantly (SIGKILL).
     */
    private executeCommand(
        command: string,
        cwd: string,
        step: BuildStep,
        sessionId: string,
        stepIndex: number,
        signal: AbortSignal
    ): Promise<boolean | 'cancelled'> {
        this.log(`⏳ Status: In Progress\n`);

        return new Promise((resolve) => {
            let stdoutBuf = '';
            let stderrBuf = '';

            // detached: true → child gets its own process group so we can kill the whole tree
            const child = spawn(command, [], {
                cwd,
                shell: true,
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            child.stdout?.on('data', (data: Buffer) => { stdoutBuf += data.toString(); });
            child.stderr?.on('data', (data: Buffer) => { stderrBuf += data.toString(); });

            this.log(`🔍 PID: ${child.pid}\n`);

            // Kill the whole process group the moment abort fires
            const killGroup = () => {
                try {
                    if (child.pid !== undefined) {
                        process.kill(-child.pid, 'SIGKILL');
                    }
                } catch { /* already dead */ }
            };
            signal.addEventListener('abort', killGroup, { once: true });

            child.on('close', (code) => {
                signal.removeEventListener('abort', killGroup);

                if (signal.aborted) {
                    this.log(`🛑 Status: Stopped\n`);
                    if (this.treeProvider) {
                        this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.Failed, 'Stopped by user');
                    }
                    resolve('cancelled');
                    return;
                }

                if (code !== 0) {
                    this.log(`❌ Status: Failed\n`);
                    this.log(`${'▼'.repeat(60)}`);
                    this.log('ERROR DETAILS:');
                    this.log(`${'▼'.repeat(60)}`);

                    let errorMessage = '';
                    if (stdoutBuf) { this.log('Standard Output:'); this.log(stdoutBuf); errorMessage += stdoutBuf; }
                    if (stderrBuf) { this.log('Error Output:'); this.log(stderrBuf); errorMessage += '\n' + stderrBuf; }

                    this.log(`${'▲'.repeat(60)}\n`);

                    if (this.treeProvider) {
                        this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.Failed, errorMessage);
                    }
                    resolve(false);
                    return;
                }

                if (stdoutBuf) { this.log('Output:'); this.log(stdoutBuf); }
                if (stderrBuf && stderrBuf.trim()) { this.log('Warnings/Info:'); this.log(stderrBuf); }
                this.log(`✅ Status: Success\n`);

                if (this.treeProvider) {
                    this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.Success);
                }
                resolve(true);
            });

            child.on('error', (err) => {
                signal.removeEventListener('abort', killGroup);
                if (signal.aborted) {
                    this.log(`🛑 Status: Stopped\n`);
                    if (this.treeProvider) {
                        this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.Failed, 'Stopped by user');
                    }
                    resolve('cancelled');
                } else {
                    this.log(`❌ Status: Failed\n`);
                    if (this.treeProvider) {
                        this.treeProvider.updateStepStatus(sessionId, stepIndex, CommandStatus.Failed, err.message);
                    }
                    resolve(false);
                }
            });
        });
    }

    /**
     * Show Flutter version
     */
    private showFlutterVersion(workspaceFolder: string, flutterCommand: string): Promise<void> {
        this.log(`${'─'.repeat(60)}`);
        this.log(`Flutter Version Check`);
        this.log(`${'─'.repeat(60)}`);

        return new Promise((resolve) => {
            const versionCommand = `${flutterCommand} --version`;
            this.log(`Command: ${versionCommand}\n`);
            exec(versionCommand, { cwd: workspaceFolder, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (stdout) { this.log(stdout.trim()); }
                if (stderr && stderr.trim()) { this.log(stderr.trim()); }
                if (error) {
                    this.log(`⚠️  Warning: Could not get Flutter version`);
                    if (error.message) { this.log(`Error: ${error.message}`); }
                }
                this.log(`\n${'─'.repeat(60)}\n`);
                resolve();
            });
        });
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
