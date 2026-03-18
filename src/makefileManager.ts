/**
 * MakefileManager – discovers Makefiles in the workspace, parses targets,
 * and persists per-project file selections via ExtensionContext.globalState.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { MakefileEntry, MakeTarget } from './types';

// Directories to skip while searching for Makefiles
const EXCLUDED_DIRS = new Set([
    'node_modules',
    '.dart_tool',
    'build',
    '.git',
    '.idea',
    '.vscode',
    '.fvm',
    'Pods',
    '.symlinks',
    'ios/Pods',
    '__pycache__',
    '.gradle',
]);

// Settings key prefix stored in globalState
const SETTINGS_KEY_PREFIX = 'flutterToolbox.makefileSelection.';

/**
 * Derive a stable globalState key from the project root path.
 */
function settingsKey(projectRoot: string): string {
    // Sanitise the path to be a valid key fragment
    return SETTINGS_KEY_PREFIX + projectRoot.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Recursively walk a directory and collect all Makefile paths.
 * Skips directories listed in EXCLUDED_DIRS.
 */
export function findMakefiles(projectRoot: string): string[] {
    const results: string[] = [];
    const makefileNames = new Set(['Makefile', 'makefile', 'GNUmakefile']);

    const walk = (dir: string) => {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return; // Permission denied or other IO error – skip
        }

        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (EXCLUDED_DIRS.has(entry.name)) {
                    continue;
                }
                walk(path.join(dir, entry.name));
            } else if (entry.isFile() && makefileNames.has(entry.name)) {
                results.push(path.join(dir, entry.name));
            }
        }
    };

    walk(projectRoot);
    return results;
}

/**
 * Parse make targets from a Makefile.
 *
 * Strategy (matches the sample Makefile shared by the user):
 *  1. Scan lines for `.PHONY: target` or `.PHONE: target` (typo-tolerant).
 *     Collect all phony target names.
 *  2. Scan for `target:` lines (not indented, not a variable assignment).
 *     For each found target, look back up to 3 lines for a `#` comment as
 *     a description (and also check inline `.PHONY` comment style sometimes).
 */
export function parseMakeTargets(makefilePath: string): MakeTarget[] {
    let content: string;
    try {
        content = fs.readFileSync(makefilePath, 'utf-8');
    } catch {
        return [];
    }

    const lines = content.split('\n');
    const targets: MakeTarget[] = [];
    const seenNames = new Set<string>();

    // Pass 1: collect all .PHONY / .PHONE declared targets
    const phonyTargets = new Set<string>();
    for (const line of lines) {
        const phonyMatch = line.match(/^\.PHO(?:NY|NE):\s*(.+)/);
        if (phonyMatch) {
            for (const t of phonyMatch[1].split(/\s+/)) {
                if (t.trim()) {
                    phonyTargets.add(t.trim());
                }
            }
        }
    }

    // Pass 2: find every `target:` definition line and extract description
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match a target definition: starts at column 0, has a colon,
        // is not a variable assignment (no `=` before `:`), not a `.PHONY` line.
        const targetMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_\-. ]*):\s*(?:[^=].*)?$/);
        if (!targetMatch) {
            continue;
        }

        const name = targetMatch[1].trim();

        // Skip special make targets
        if (name.startsWith('.') || name === '' || seenNames.has(name)) {
            continue;
        }
        seenNames.add(name);

        // Look backwards up to 5 lines for a `# comment` style description
        let description = '';
        for (let back = i - 1; back >= Math.max(0, i - 5); back--) {
            const prev = lines[back].trim();
            if (prev.startsWith('#')) {
                // Strip `# ` prefix and collect as description
                const commentText = prev.replace(/^#+\s*/, '').trim();
                if (commentText) {
                    description = commentText;
                    break;
                }
            } else if (prev.startsWith('.PHO') || prev === '') {
                // .PHONY line or blank line – keep looking
                continue;
            } else {
                // Hit something that isn't a comment or blank line
                break;
            }
        }

        targets.push({ name, description, makefilePath });
    }

    // If no targets found via definition scan but phony targets were declared,
    // fall back to listing phony targets (handles edge cases)
    if (targets.length === 0 && phonyTargets.size > 0) {
        for (const name of phonyTargets) {
            targets.push({ name, description: '', makefilePath });
        }
    }

    return targets;
}

/**
 * Load the list of selected Makefile paths for a given project root
 * from ExtensionContext.globalState.
 */
export function getSelectedMakefilePaths(
    context: vscode.ExtensionContext,
    projectRoot: string
): string[] {
    const key = settingsKey(projectRoot);
    return context.globalState.get<string[]>(key, []);
}

/**
 * Persist selected Makefile paths for a given project root.
 */
export async function saveSelectedMakefilePaths(
    context: vscode.ExtensionContext,
    projectRoot: string,
    paths: string[]
): Promise<void> {
    const key = settingsKey(projectRoot);
    await context.globalState.update(key, paths);
}

/**
 * Build MakefileEntry objects for the currently saved selection.
 * Parses each selected file and computes relative paths.
 */
export function buildMakefileEntries(
    context: vscode.ExtensionContext,
    projectRoot: string
): MakefileEntry[] {
    const selectedPaths = getSelectedMakefilePaths(context, projectRoot);

    return selectedPaths
        .filter(p => fs.existsSync(p))
        .map(absolutePath => {
            const relativePath = path.relative(projectRoot, absolutePath);
            const targets = parseMakeTargets(absolutePath);
            return { absolutePath, relativePath, targets };
        });
}

/**
 * Build a MakefileEntry for a single file (used by reload).
 */
export function buildSingleMakefileEntry(
    makefilePath: string,
    projectRoot: string
): MakefileEntry {
    const relativePath = path.relative(projectRoot, makefilePath);
    const targets = parseMakeTargets(makefilePath);
    return { absolutePath: makefilePath, relativePath, targets };
}
