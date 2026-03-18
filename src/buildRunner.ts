/**
 * Build Runner - Executes build commands and manages their state
 */

import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { BuildTreeProvider } from './buildTreeView';
import { BuildConfig, BuildSession, BuildStep, BuildType, CommandStatus, SessionStatus, SessionType } from './types';

export class BuildRunner {
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private treeProvider?: BuildTreeProvider;
    private abortControllers: Map<string, AbortController> = new Map();

    constructor(treeProvider?: BuildTreeProvider) {
        this.outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
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
            const result = await this.executeCommand(command, workspaceFolder, step, sessionId, stepIndex, abortController.signal);

            if (result === 'cancelled') {
                // User stopped the session
                this.abortControllers.delete(sessionId);
                if (this.treeProvider) {
                    this.treeProvider.completeBuildSession(sessionId, SessionStatus.Cancelled);
                }

                this.log(`\n${'='.repeat(60)}`);
                this.log(`🛑 Build stopped by user.`);
                this.log(`${'='.repeat(60)}\n`);

                this.statusBarItem.text = `$(stop-circle) Build Stopped`;
                this.statusBarItem.backgroundColor = undefined;

                setTimeout(() => {
                    this.statusBarItem.hide();
                }, 3000);

                return false;
            }

            if (!result) {
                // Update step to failed
                this.abortControllers.delete(sessionId);
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
        this.abortControllers.delete(sessionId);
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
    private showFlutterVersion(workspaceFolder: string, flutterCommand: string): Promise<void> {
        this.log(`${'─'.repeat(60)}`);
        this.log(`Flutter Version Check`);
        this.log(`${'─'.repeat(60)}`);

        return new Promise((resolve) => {
            const versionCommand = `${flutterCommand} --version`;
            this.log(`Command: ${versionCommand}\n`);

            let out = '';
            let err = '';
            const child = spawn(versionCommand, [], { cwd: workspaceFolder, shell: true, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
            child.stdout?.on('data', (d: Buffer) => { out += d; });
            child.stderr?.on('data', (d: Buffer) => { err += d; });
            child.on('close', () => {
                if (out) { this.log(out.trim()); }
                if (err && err.trim()) { this.log(err.trim()); }
                this.log(`\n${'─'.repeat(60)}\n`);
                resolve();
            });
            child.on('error', () => {
                this.log(`⚠️  Warning: Could not get Flutter version`);
                this.log(`${'─'.repeat(60)}\n`);
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

    /**
     * Dispose resources
     */
    dispose(): void {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
