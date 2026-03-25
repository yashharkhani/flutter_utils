/**
 * AI Tools Tree View Provider
 * Displays Claude agents/commands, Cursor rules, Antigravity workflows,
 * and custom-path skills in a second sidebar tab.
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { AiSkill, AiToolGroup, AiToolType } from './types';

// ── Context values ────────────────────────────────────────────────────
// aiToolsRoot        – the top-level "AI Tools" header (unused as parent)
// aiToolGroup        – a collapsible group node (e.g. "Claude › Agents")
// aiSkill            – a leaf skill/agent file
// aiCustomPaths      – the "Custom Paths" section header
// aiEmptyState       – placeholder shown when a group has no items
// ─────────────────────────────────────────────────────────────────────

export class AiToolsTreeItem extends vscode.TreeItem {
    // Carry routing data through command args
    skillFilePath?: string;
    groupSourcePath?: string;
    toolType?: AiToolType;
}

export class AiToolsTreeProvider implements vscode.TreeDataProvider<AiToolsTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AiToolsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private groups: AiToolGroup[] = [];

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setGroups(groups: AiToolGroup[]): void {
        this.groups = groups;
        this.refresh();
    }

    getGroups(): AiToolGroup[] {
        return this.groups;
    }

    getTreeItem(element: AiToolsTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AiToolsTreeItem): Thenable<AiToolsTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }

        if (element.contextValue === 'aiToolGroup' || element.contextValue === 'aiToolGroupGlobal') {
            return Promise.resolve(this.getSkillItems(element));
        }

        return Promise.resolve([]);
    }

    // ── Root items ────────────────────────────────────────────────────

    private getRootItems(): AiToolsTreeItem[] {
        const items: AiToolsTreeItem[] = [];

        if (this.groups.length === 0) {
            const empty = new AiToolsTreeItem(
                'No AI tools found in this project',
                vscode.TreeItemCollapsibleState.None
            );
            empty.contextValue = 'aiEmptyState';
            empty.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('disabledForeground'));
            empty.tooltip = new vscode.MarkdownString(
                '**No AI tool directories detected.**\n\n' +
                'The following paths are scanned automatically:\n\n' +
                '- `.claude/agents/` – Claude sub-agents (project)\n' +
                '- `.claude/skills/` – Claude skills (project)\n' +
                '- `.claude/commands/` – Claude slash commands (project)\n' +
                '- `.cursor/rules/` – Cursor rules / agents (project)\n' +
                '- `~/.claude/skills/` – Claude skills (global)\n' +
                '- `~/.claude/agents/` – Claude agents (global)\n' +
                '- `~/.cursor/skills/` – Cursor skills (global)\n' +
                '- `~/.cursor/agents/` – Cursor agents (global)\n' +
                '- `.agents/workflows/` – Antigravity workflows\n\n' +
                'Use the **+** button above to add a custom path.',
                true
            );
            items.push(empty);
            return items;
        }

        // Group by toolType for visual separation
        const toolOrder: AiToolType[] = ['claude', 'cursor', 'antigravity', 'custom'];
        const byTool = new Map<AiToolType, AiToolGroup[]>();

        for (const g of this.groups) {
            if (!byTool.has(g.toolType)) { byTool.set(g.toolType, []); }
            byTool.get(g.toolType)!.push(g);
        }

        for (const toolType of toolOrder) {
            const toolGroups = byTool.get(toolType);
            if (!toolGroups) { continue; }

            for (const group of toolGroups) {
                if (group.skills.length === 0) { continue; }
                const item = this.buildGroupItem(group);
                items.push(item);
            }
        }

        return items;
    }

    private buildGroupItem(group: AiToolGroup): AiToolsTreeItem {
        const skillCount = group.skills.length;
        const isGlobal = group.isGlobal === true;

        const label = group.toolType === 'custom'
            ? `${group.category}`
            : isGlobal
                ? `${group.label}  ›  ${group.category}  (Global)`
                : `${group.label}  ›  ${group.category}`;

        const item = new AiToolsTreeItem(
            label,
            vscode.TreeItemCollapsibleState.Expanded
        );
        item.contextValue = isGlobal ? 'aiToolGroupGlobal' : 'aiToolGroup';
        item.description = `${skillCount} ${skillCount === 1 ? 'file' : 'files'}`;
        item.iconPath = toolIcon(group.toolType, isGlobal);
        item.groupSourcePath = group.sourcePath;
        item.toolType = group.toolType;

        const globalNote = isGlobal ? '🌐 **Global** — from your home directory\n\n' : '';
        item.tooltip = new vscode.MarkdownString(
            `**${label}**\n\n` +
            globalNote +
            `📁 \`${group.sourcePath}\`\n\n` +
            `${skillCount} skill${skillCount !== 1 ? 's' : ''} found\n\n` +
            (skillCount > 0
                ? group.skills.slice(0, 6).map(s => `- \`${s.name}\``).join('\n') +
                (skillCount > 6 ? `\n- _…and ${skillCount - 6} more_` : '')
                : '_Directory exists but no matching files found._') +
            '\n\n_Click the ↻ icon to refresh after adding new files_',
            true
        );

        return item;
    }

    // ── Skill children ────────────────────────────────────────────────

    private getSkillItems(groupItem: AiToolsTreeItem): AiToolsTreeItem[] {
        // Find the group this node belongs to (handle both project and global)
        const group = this.groups.find(g => g.sourcePath === groupItem.groupSourcePath);
        if (!group || group.skills.length === 0) {
            const empty = new AiToolsTreeItem(
                'No files found',
                vscode.TreeItemCollapsibleState.None
            );
            empty.contextValue = 'aiEmptyState';
            empty.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('disabledForeground'));
            return [empty];
        }

        return group.skills.map(skill => this.buildSkillItem(skill));
    }

    private buildSkillItem(skill: AiSkill): AiToolsTreeItem {
        const item = new AiToolsTreeItem(
            skill.name,
            vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'aiSkill';
        item.description = skill.description;
        item.iconPath = skillIcon(skill.toolType);
        item.skillFilePath = skill.filePath;
        item.toolType = skill.toolType;

        // Command: open file in editor on click
        item.command = {
            command: 'flutter-toolbox.openAiSkill',
            title: 'Open',
            arguments: [skill.filePath],
        };

        item.tooltip = new vscode.MarkdownString(
            `**${skill.name}**\n\n` +
            (skill.description ? `${skill.description}\n\n` : '') +
            `📁 \`${skill.filePath}\`\n\n` +
            `_Click to open · Use the copy icon to copy content to clipboard_`,
            true
        );

        return item;
    }
}

// ── Icon helpers ──────────────────────────────────────────────────────

function toolIcon(toolType: AiToolType, isGlobal = false): vscode.ThemeIcon {
    // Global groups get a subtle tint shift to hint at their scope.
    // (VSCode doesn't support badge overlays via ThemeIcon, so we rely on the label.)
    switch (toolType) {
        case 'claude': return new vscode.ThemeIcon(
            isGlobal ? 'globe' : 'comment-discussion',
            new vscode.ThemeColor('charts.orange')
        );
        case 'cursor': return new vscode.ThemeIcon(
            isGlobal ? 'globe' : 'edit',
            new vscode.ThemeColor('charts.blue')
        );
        case 'antigravity': return new vscode.ThemeIcon('rocket', new vscode.ThemeColor('charts.purple'));
        case 'custom': return new vscode.ThemeIcon('folder-opened', new vscode.ThemeColor('charts.yellow'));
    }
}

function skillIcon(toolType: AiToolType): vscode.ThemeIcon {
    switch (toolType) {
        case 'claude': return new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.orange'));
        case 'cursor': return new vscode.ThemeIcon('symbol-interface', new vscode.ThemeColor('charts.blue'));
        case 'antigravity': return new vscode.ThemeIcon('symbol-event', new vscode.ThemeColor('charts.purple'));
        case 'custom': return new vscode.ThemeIcon('symbol-file', new vscode.ThemeColor('charts.yellow'));
    }
}
