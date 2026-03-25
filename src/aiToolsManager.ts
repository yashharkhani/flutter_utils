/**
 * AI Tools Manager
 * Discovers Claude agents/skills, Cursor agents/rules/skills,
 * and Antigravity workflows from the project tree, plus custom paths.
 *
 * Supports two structural patterns:
 *   1. File-based   – each .md / .mdc file is a skill
 *   2. Dir-based    – each subdirectory is a skill; reads SKILL.md inside it
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { AiSkill, AiToolGroup, AiToolType } from './types';

// ----- globalState keys -----------------------------------------------

const CUSTOM_PATHS_KEY_PREFIX = 'flutterToolbox.aiToolPaths.';

function customPathsKey(projectRoot: string): string {
    return CUSTOM_PATHS_KEY_PREFIX + projectRoot.replace(/[^a-zA-Z0-9]/g, '_');
}

export function getCustomScanPaths(
    context: vscode.ExtensionContext,
    projectRoot: string
): string[] {
    return context.globalState.get<string[]>(customPathsKey(projectRoot), []);
}

export async function saveCustomScanPaths(
    context: vscode.ExtensionContext,
    projectRoot: string,
    paths: string[]
): Promise<void> {
    await context.globalState.update(customPathsKey(projectRoot), paths);
}

// ----- Skip lists ---------------------------------------------------------

const WALK_EXCLUDED_DIRS = new Set([
    'node_modules', '.dart_tool', 'build', '.git', '.idea',
    '.fvm', 'Pods', '.symlinks', '__pycache__', '.gradle',
    'out', 'dist', '.next', '.nuxt', 'coverage',
]);

/** Basenames (without extension, lowercase) never shown as skills */
const EXCLUDED_FILENAMES = new Set([
    'readme', 'license', 'changelog', 'contributing',
    'code_of_conduct', 'security', 'authors', 'todo',
]);

function isExcludedFile(filename: string): boolean {
    const base = path.basename(filename, path.extname(filename)).toLowerCase();
    return EXCLUDED_FILENAMES.has(base);
}

// ----- Scan config --------------------------------------------------------

interface ToolDirConfig {
    toolType: AiToolType;
    label: string;
    category: string;
    relPath: string;
    extensions: string[];
    /**
     * If true, each immediate SUBDIRECTORY of relPath is a skill.
     * The skill description is read from SKILL.md (or the first .md file) inside it.
     */
    dirBased?: boolean;
}

const TOOL_DIR_CONFIGS: ToolDirConfig[] = [
    // ── Claude ─────────────────────────────────────────────────────────
    {
        toolType: 'claude', label: 'Claude', category: 'Skills',
        relPath: '.claude/skills', extensions: ['.md'], dirBased: true
    },
    {
        toolType: 'claude', label: 'Claude', category: 'Agents',
        relPath: '.claude/agents', extensions: ['.md'], dirBased: true
    },
    {
        toolType: 'claude', label: 'Claude', category: 'Commands',
        relPath: '.claude/commands', extensions: ['.md']
    },

    // ── Cursor ─────────────────────────────────────────────────────────
    {
        toolType: 'cursor', label: 'Cursor', category: 'Agents',
        relPath: '.cursor/agents', extensions: ['.md']
    },
    {
        toolType: 'cursor', label: 'Cursor', category: 'Skills',
        relPath: '.cursor/skills', extensions: ['.md'], dirBased: true
    },
    {
        toolType: 'cursor', label: 'Cursor', category: 'Rules',
        relPath: '.cursor/rules', extensions: ['.mdc', '.md']
    },

    // ── Antigravity ────────────────────────────────────────────────────
    {
        toolType: 'antigravity', label: 'Antigravity', category: 'Workflows',
        relPath: '.agents/workflows', extensions: ['.md']
    },
    {
        toolType: 'antigravity', label: 'Antigravity', category: 'Workflows',
        relPath: '.agent/workflows', extensions: ['.md']
    },
    {
        toolType: 'antigravity', label: 'Antigravity', category: 'Workflows',
        relPath: '_agents/workflows', extensions: ['.md']
    },
    {
        toolType: 'antigravity', label: 'Antigravity', category: 'Workflows',
        relPath: '_agent/workflows', extensions: ['.md']
    },
];

/**
 * Global tool directories — relative to the user's home directory (~/).
 * Skills/agents discovered here are tagged with isGlobal = true.
 */
const GLOBAL_TOOL_DIR_CONFIGS: ToolDirConfig[] = [
    // ── Global Claude ───────────────────────────────────────────────────
    {
        toolType: 'claude', label: 'Claude', category: 'Skills',
        relPath: '.claude/skills', extensions: ['.md'], dirBased: true
    },
    {
        toolType: 'claude', label: 'Claude', category: 'Agents',
        relPath: '.claude/agents', extensions: ['.md'], dirBased: true
    },

    // ── Global Cursor ───────────────────────────────────────────────────
    {
        toolType: 'cursor', label: 'Cursor', category: 'Skills',
        relPath: '.cursor/skills', extensions: ['.md'], dirBased: true
    },
    {
        toolType: 'cursor', label: 'Cursor', category: 'Agents',
        relPath: '.cursor/agents', extensions: ['.md']
    },
];

// ----- File parsing -------------------------------------------------------

export function parseSkillDescription(filePath: string): string {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Skip YAML frontmatter
        let start = 0;
        if (lines[0]?.trim() === '---') {
            const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
            if (end !== -1) { start = end + 1; }
        }

        for (let i = start; i < Math.min(start + 25, lines.length); i++) {
            const line = lines[i].trim();
            if (!line || line === '---') { continue; }
            const stripped = line.replace(/^#+\s*/, '').trim();
            if (stripped && stripped.length > 2) {
                return stripped.length > 90 ? stripped.slice(0, 87) + '…' : stripped;
            }
        }
    } catch { /* unreadable */ }
    return '';
}

// ----- Directory scanning -------------------------------------------------

/**
 * Scan a dir where each SUBDIRECTORY is a skill.
 * Reads SKILL.md (preferred), then README.md, then the first .md file in the subdir.
 */
function scanDirBased(
    parentDir: string,
    toolType: AiToolType,
    category: string
): AiSkill[] {
    if (!fs.existsSync(parentDir)) { return []; }

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(parentDir, { withFileTypes: true });
    } catch { return []; }

    const skills: AiSkill[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) { continue; }

        const skillDir = path.join(parentDir, entry.name);

        // Only accept directories that have an explicit SKILL.md / skill.md.
        // Falling back to README.md or arbitrary .md files causes regular
        // project folders (android/, ios/, docs/ …) to appear as skills.
        const skillFileCandidates = ['SKILL.md', 'skill.md'];
        let entryFile: string | undefined;

        for (const c of skillFileCandidates) {
            const p = path.join(skillDir, c);
            if (fs.existsSync(p)) { entryFile = p; break; }
        }

        // Not a skill directory — skip it
        if (!entryFile) { continue; }

        const name = entry.name;
        const description = parseSkillDescription(entryFile);
        const filePath = entryFile;

        skills.push({ name, description, filePath, toolType, category });
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan a dir where each FILE is a skill.
 */
function scanFileBased(
    dirPath: string,
    toolType: AiToolType,
    category: string,
    extensions: string[]
): AiSkill[] {
    if (!fs.existsSync(dirPath)) { return []; }

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch { return []; }

    const skills: AiSkill[] = [];
    for (const entry of entries) {
        if (!entry.isFile()) { continue; }
        const ext = path.extname(entry.name).toLowerCase();
        if (!extensions.includes(ext)) { continue; }
        if (isExcludedFile(entry.name)) { continue; }

        const filePath = path.join(dirPath, entry.name);
        const name = path.basename(entry.name, ext);
        const description = parseSkillDescription(filePath);
        skills.push({ name, description, filePath, toolType, category });
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
}

// ----- Recursive directory finder -----------------------------------------

/**
 * Walk the project tree looking for directories whose path ends with
 * the given relative-path suffix (e.g. ".cursor/rules") at any depth ≤ maxDepth.
 */
function findToolDirectories(
    projectRoot: string,
    targetRelPath: string,
    maxDepth = 5
): string[] {
    const results: string[] = [];
    const sep = path.sep;
    const targetParts = targetRelPath.split('/').filter(Boolean);

    const walk = (dir: string, depth: number) => {
        if (depth > maxDepth) { return; }

        const rel = path.relative(projectRoot, dir);
        const relParts = rel === '' ? [] : rel.split(sep);

        // Check if this directory's path ends in the target suffix
        if (
            relParts.length >= targetParts.length &&
            relParts.slice(-targetParts.length).join('/') === targetParts.join('/')
        ) {
            results.push(dir);
            return; // don't descend inside a matched tool dir
        }

        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch { return; }

        for (const entry of entries) {
            if (!entry.isDirectory()) { continue; }
            if (WALK_EXCLUDED_DIRS.has(entry.name)) { continue; }
            walk(path.join(dir, entry.name), depth + 1);
        }
    };

    walk(projectRoot, 0);
    return results;
}

// ----- Top-level discovery ------------------------------------------------

export function discoverSkills(
    projectRoot: string,
    context: vscode.ExtensionContext
): AiToolGroup[] {
    const groups: AiToolGroup[] = [];
    // key = toolType::category — merge results from multiple found dirs
    const mergedGroups = new Map<string, AiToolGroup>();

    for (const cfg of TOOL_DIR_CONFIGS) {
        const key = `${cfg.toolType}::${cfg.category}`;
        const foundDirs = findToolDirectories(projectRoot, cfg.relPath);

        for (const absPath of foundDirs) {
            if (!mergedGroups.has(key)) {
                mergedGroups.set(key, {
                    toolType: cfg.toolType,
                    label: cfg.label,
                    category: cfg.category,
                    skills: [],
                    sourcePath: absPath,
                });
            }

            const group = mergedGroups.get(key)!;
            const newSkills = cfg.dirBased
                ? scanDirBased(absPath, cfg.toolType, cfg.category)
                : scanFileBased(absPath, cfg.toolType, cfg.category, cfg.extensions);

            for (const s of newSkills) {
                if (!group.skills.find(x => x.filePath === s.filePath)) {
                    group.skills.push(s);
                }
            }
        }
    }

    for (const group of mergedGroups.values()) {
        if (group.skills.length > 0) {
            group.skills.sort((a, b) => a.name.localeCompare(b.name));
            groups.push(group);
        }
    }

    // ── Global paths (~/.claude, ~/.cursor) ───────────────────────────────
    const globalGroups = discoverGlobalSkills();
    for (const g of globalGroups) {
        groups.push(g);
    }

    // ── Custom paths ──────────────────────────────────────────────────────
    const customPaths = getCustomScanPaths(context, projectRoot);
    for (const customPath of customPaths) {
        const absPath = fs.existsSync(customPath)
            ? customPath
            : path.join(projectRoot, customPath);

        if (!fs.existsSync(absPath)) { continue; }

        const displayPath = path.relative(projectRoot, absPath);
        // For custom paths: try dir-based first (SKILL.md pattern), then file-based
        const dirSkills = scanDirBased(absPath, 'custom', displayPath);
        const fileSkills = scanFileBased(absPath, 'custom', displayPath, ['.md', '.mdc', '.txt']);
        const skills = dirSkills.length > 0 ? dirSkills : fileSkills;

        groups.push({
            toolType: 'custom',
            label: 'Custom',
            category: displayPath,
            skills,
            sourcePath: absPath,
        });
    }

    return groups;
}

/**
 * Scan the user's global home directory for ~/.claude and ~/.cursor
 * skills/agents directories. All discovered items are tagged isGlobal = true
 * and appear in separate groups from project-local items.
 */
function discoverGlobalSkills(): AiToolGroup[] {
    const homeDir = os.homedir();
    // key = toolType::category::global
    const mergedGroups = new Map<string, AiToolGroup>();

    for (const cfg of GLOBAL_TOOL_DIR_CONFIGS) {
        const absPath = path.join(homeDir, cfg.relPath);
        if (!fs.existsSync(absPath)) { continue; }

        const key = `${cfg.toolType}::${cfg.category}::global`;

        if (!mergedGroups.has(key)) {
            mergedGroups.set(key, {
                toolType: cfg.toolType,
                label: cfg.label,
                category: cfg.category,
                skills: [],
                sourcePath: absPath,
                isGlobal: true,
            });
        }

        const group = mergedGroups.get(key)!;
        const newSkills = cfg.dirBased
            ? scanDirBased(absPath, cfg.toolType, cfg.category)
            : scanFileBased(absPath, cfg.toolType, cfg.category, cfg.extensions);

        for (const s of newSkills) {
            if (!group.skills.find(x => x.filePath === s.filePath)) {
                group.skills.push({ ...s, isGlobal: true });
            }
        }
    }

    const result: AiToolGroup[] = [];
    for (const group of mergedGroups.values()) {
        if (group.skills.length > 0) {
            group.skills.sort((a, b) => a.name.localeCompare(b.name));
            result.push(group);
        }
    }
    return result;
}
