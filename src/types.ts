/**
 * Types and interfaces for flutter-toolbox extension
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
  Utility = 'utility',
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
  Cancelled = 'cancelled',
}

export interface CustomCommand {
  id: string;
  name: string;
  description: string;
  command: string;
  workingDirectory?: string;
  requiresConfirmation?: boolean;
  scope?: 'global' | 'workspace';
}

export interface Prompt {
  id: string;
  title: string;
  prompt: string;
  description?: string;
}

export interface MakeTarget {
  name: string; // e.g. 'build', 'run'
  description: string; // comment above the target, if any
  makefilePath: string; // absolute path to the Makefile
}

export interface MakefileEntry {
  absolutePath: string; // full absolute path to the Makefile
  relativePath: string; // path relative to project root (shown in UI)
  targets: MakeTarget[];
}

export type AiToolType = 'claude' | 'cursor' | 'antigravity' | 'custom';

export interface AiSkill {
  name: string;          // filename without extension
  description: string;   // first meaningful line of the file
  filePath: string;      // absolute path
  toolType: AiToolType;
  category: string;      // e.g. 'Agents', 'Commands', 'Rules'
}

export interface AiToolGroup {
  toolType: AiToolType;
  label: string;         // 'Claude', 'Cursor', etc.
  category: string;      // 'Agents', 'Commands', 'Rules', 'Custom'
  skills: AiSkill[];
  sourcePath: string;    // the folder this group was scanned from
}
