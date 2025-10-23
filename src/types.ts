/**
 * Types and interfaces for Flutter Build Utils extension
 */

export interface BuildCommand {
    name: string;
    command: string;
    status: CommandStatus;
    error?: string;
}

export enum CommandStatus {
    Waiting = 'waiting',
    InProgress = 'in-progress',
    Success = 'success',
    Failed = 'failed'
}

export interface BuildConfig {
    name: string;
    steps: BuildStep[];
}

export interface BuildStep {
    id: string;
    description: string;
    command: string;
    optional?: boolean;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
}

export interface BuildOptions {
    deletePubspecLock?: boolean;
    baseHref?: string;
}

export enum BuildType {
    APK = 'apk',
    IPA = 'ipa',
    Web = 'web'
}

export interface BuildSession {
    id: string;
    buildType?: BuildType;
    buildName: string;
    status: SessionStatus;
    startTime: Date;
    endTime?: Date;
    steps: BuildStepStatus[];
    workspaceFolder?: string;
    sessionType: SessionType;
}

export enum SessionType {
    Build = 'build',
    Utility = 'utility'
}

export interface BuildStepStatus {
    step: BuildStep;
    status: CommandStatus;
    startTime?: Date;
    endTime?: Date;
    error?: string;
    output?: string;
}

export enum SessionStatus {
    Running = 'running',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled'
}
