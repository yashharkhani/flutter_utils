/**
 * Prompt Manager for AI/LLM prompts
 * Handles CRUD operations for storing and managing prompts
 */

import * as vscode from 'vscode';
import { Prompt } from './types';

export class PromptManager {
    private static readonly CONFIG_KEY = 'aiPrompts';

    /**
     * Get all prompts from global settings
     */
    static getPrompts(): Prompt[] {
        const config = vscode.workspace.getConfiguration('flutterToolbox');
        const prompts = config.get<Prompt[]>(this.CONFIG_KEY, []);

        // If no prompts exist, initialize with default prompts
        if (prompts.length === 0) {
            return this.getDefaultPrompts();
        }

        return prompts;
    }

    /**
     * Add a new prompt
     */
    static async addPrompt(prompt: Prompt): Promise<void> {
        const prompts = this.getPrompts();
        prompts.push(prompt);
        await this.savePrompts(prompts);
    }

    /**
     * Update an existing prompt
     */
    static async updatePrompt(id: string, updates: Partial<Prompt>): Promise<void> {
        const prompts = this.getPrompts();
        const index = prompts.findIndex(p => p.id === id);

        if (index !== -1) {
            prompts[index] = { ...prompts[index], ...updates };
            await this.savePrompts(prompts);
        }
    }

    /**
     * Delete a prompt
     */
    static async deletePrompt(id: string): Promise<void> {
        const prompts = this.getPrompts();
        const filtered = prompts.filter(p => p.id !== id);
        await this.savePrompts(filtered);
    }

    /**
     * Get a specific prompt by ID
     */
    static getPromptById(id: string): Prompt | undefined {
        const prompts = this.getPrompts();
        return prompts.find(p => p.id === id);
    }

    /**
     * Save prompts to global settings
     */
    private static async savePrompts(prompts: Prompt[]): Promise<void> {
        const config = vscode.workspace.getConfiguration('flutterToolbox');
        await config.update(this.CONFIG_KEY, prompts, vscode.ConfigurationTarget.Global);
    }

    /**
     * Get default/predefined prompts
     */
    static getDefaultPrompts(): Prompt[] {
        return [
            {
                id: 'figma_to_flutter',
                title: 'Figma to Flutter',
                description: 'Create a complete Flutter UI from Figma design',
                prompt: "**Objective:** Generate Flutter code for the component at [INSERT LINK].\n\n**Constraints:**\n1. STRICTLY use **FyUI components** (FyCard, FyText, FyBadge, etc.).\n2. Use **FyTheme** for colors and **FyPlatform** for spacing/radius.\n3. NO hardcoded Flutter widgets or values.\n\n**Steps:**\n1. **Analyze:**\n   - Call `get_design_context` to extract structure/text.\n   - Call `get_screenshot` to verify visual style.\n   - Call `get_metadata` to find Node IDs and exact dimensions.\n   - Call `get_variable_defs` to find the variable definitions.\n2. **Map:**\n   - `search_ui_components` to identify the correct FyUI widgets.\n   - `get_example_snippet` to understand required parameters.\n   - `search_theme_primitives` / `search_platform_primitives` for tokens.\n   - `search_for_image` to find icons/assets.\n   - `search_enums` to find enums for parameters for ui components.\n   - `get_all_primitives` to find all the primitives available in the project.\n   - `get_ui_components` to find all the ui components available in the project along with their parameters definitions.\n\n3. **Generate:**\n   - Write the Flutter code implementing the design using strictly FyUI.\n\n**CRITICAL RULE:** Strictly use **FyUI components** and tokens.\n- ❌ NO: `Text`, `Card`, `Divider`, `Colors.red`, `SizedBox(height: 10)`\n- ✅ YES: `FyText`, `FyCard`, `FyDivider`, `FyTheme.subject.danger`, `FyPlatform.gap.sibling`",
            },
        ];
    }

    /**
     * Initialize prompts with defaults if empty
     */
    static async initializeDefaultPrompts(): Promise<void> {
        const prompts = this.getPrompts();
        if (prompts.length === 0) {
            const defaultPrompts = this.getDefaultPrompts();
            await this.savePrompts(defaultPrompts);
        }
    }
}

