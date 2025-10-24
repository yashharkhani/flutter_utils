/**
 * Code Generator - Generates freezed boilerplate code
 */

import * as vscode from 'vscode';

/**
 * Generate Freezed Cubit/Bloc State
 */
export async function generateFreezedCubitState(): Promise<void> {
    // Get class name
    const className = await vscode.window.showInputBox({
        prompt: 'Enter the state class name (e.g., AuthState)',
        placeHolder: 'AuthState',
        validateInput: (value: string) => {
            if (!value || value.trim() === '') {
                return 'Class name cannot be empty';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'Class name must start with uppercase letter and contain only alphanumeric characters';
            }
            return null;
        }
    });

    if (!className) {
        return; // User cancelled
    }

    // Get UI state name
    const uiStateName = await vscode.window.showInputBox({
        prompt: 'Enter the UI state class name (e.g., AuthUiState)',
        placeHolder: `${className.replace('State', '')}UiState`,
        validateInput: (value: string) => {
            if (!value || value.trim() === '') {
                return 'UI state name cannot be empty';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'UI state name must start with uppercase letter and contain only alphanumeric characters';
            }
            return null;
        }
    });

    if (!uiStateName) {
        return; // User cancelled
    }

    // Get number of UI state fields
    const fieldsCountInput = await vscode.window.showInputBox({
        prompt: 'How many fields do you want in the UI state?',
        placeHolder: '4',
        value: '4',
        validateInput: (value: string) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 20) {
                return 'Please enter a number between 1 and 20';
            }
            return null;
        }
    });

    if (!fieldsCountInput) {
        return; // User cancelled
    }

    const fieldsCount = parseInt(fieldsCountInput);
    const fields: { name: string; type: string; defaultValue: string }[] = [];

    // Collect field information for UI state
    for (let i = 0; i < fieldsCount; i++) {
        const fieldName = await vscode.window.showInputBox({
            prompt: `Field ${i + 1}: Enter field name (e.g., isLoading)`,
            placeHolder: `field${i + 1}`,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Field name cannot be empty';
                }
                if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
                    return 'Field name must start with lowercase letter';
                }
                return null;
            }
        });

        if (!fieldName) {
            return; // User cancelled
        }

        const fieldType = await vscode.window.showQuickPick(
            [
                { label: 'int', value: 'int', defaultValue: '0' },
                { label: 'double', value: 'double', defaultValue: '0.0' },
                { label: 'String', value: 'String', defaultValue: "''" },
                { label: 'bool', value: 'bool', defaultValue: 'false' },
                { label: 'List', value: 'List', defaultValue: '[]' },
                { label: 'Map', value: 'Map', defaultValue: '{}' },
                { label: 'dynamic', value: 'dynamic', defaultValue: 'null' },
                { label: 'Custom (nullable)', value: 'custom', defaultValue: 'null' }
            ],
            {
                placeHolder: `Select type for ${fieldName}`,
                ignoreFocusOut: true
            }
        );

        if (!fieldType) {
            return; // User cancelled
        }

        let type = fieldType.value;
        let defaultValue = fieldType.defaultValue || 'null';

        // If custom type, ask for the type name
        if (type === 'custom') {
            const customType = await vscode.window.showInputBox({
                prompt: `Enter custom type for ${fieldName} (e.g., User?)`,
                placeHolder: 'CustomType?',
                validateInput: (value: string) => {
                    if (!value || value.trim() === '') {
                        return 'Type cannot be empty';
                    }
                    return null;
                }
            });

            if (!customType) {
                return; // User cancelled
            }

            type = customType;
            defaultValue = 'null';
        }

        fields.push({ name: fieldName, type, defaultValue });
    }

    const privateClassName = `_${className}`;
    const privateUiStateName = `_${uiStateName}`;

    // Generate UI state field declarations
    const uiFieldDeclarations = fields
        .map(f => `    required ${f.type} ${f.name},`)
        .join('\n');

    // Generate UI state initial values
    const uiInitialValues = fields
        .map(f => `        ${f.name}: ${f.defaultValue},`)
        .join('\n');

    // Generate complete file with all 3 classes
    const code = `@freezed
abstract class ${className} with ${privateClassName} {
  const factory ${className}({
    required APIState apiState,
    required ${uiStateName} uiState,
  }) = ${privateClassName};

  factory ${className}.initial() => ${className}(
        apiState: const APIState.initial(),
        uiState: ${uiStateName}.initial(),
      );
}

@freezed
abstract class APIState with _$APIState {
  const factory APIState.initial() = _APIStateInitial;

  const factory APIState.loading() = _APIStateLoading;

  const factory APIState.loaded({
    required dynamic data,
  }) = _APIStateLoaded;

  const factory APIState.error({
    int? code,
    String? message,
    String? status,
  }) = _APIStateError;
}

@freezed
abstract class ${uiStateName} with ${privateUiStateName} {
  const factory ${uiStateName}({
${uiFieldDeclarations}
  }) = ${privateUiStateName};

  factory ${uiStateName}.initial() => const ${uiStateName}(
${uiInitialValues}
      );
}`;

    // Copy to clipboard
    await vscode.env.clipboard.writeText(code);

    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
    outputChannel.clear();
    outputChannel.show(true);

    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Complete Freezed Cubit/Bloc State Generated');
    outputChannel.appendLine('='.repeat(60) + '\n');
    outputChannel.appendLine('Generated 3 classes:');
    outputChannel.appendLine(`  1. ${className} (Parent state with APIState and UIState)`);
    outputChannel.appendLine(`  2. APIState (API call states)`);
    outputChannel.appendLine(`  3. ${uiStateName} (UI state with ${fieldsCount} fields)`);
    outputChannel.appendLine('\n' + '='.repeat(60) + '\n');
    outputChannel.appendLine(code);
    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Code copied to clipboard!');
    outputChannel.appendLine('\nNote: Remember to add these imports:');
    outputChannel.appendLine("import 'package:freezed_annotation/freezed_annotation.dart';");
    outputChannel.appendLine("\npart '<filename>.freezed.dart';");
    outputChannel.appendLine('='.repeat(60) + '\n');

    vscode.window.showInformationMessage('Complete Cubit/Bloc state with all 3 classes generated and copied to clipboard!');
}

/**
 * Generate Freezed API State
 */
export async function generateFreezedApiState(): Promise<void> {
    // Ask if generic type is needed
    const useGeneric = await vscode.window.showQuickPick(
        [
            { label: 'Yes', description: 'Use generic type <T>', value: true },
            { label: 'No', description: 'No generic type', value: false }
        ],
        {
            placeHolder: 'Do you want to use a generic type?',
            ignoreFocusOut: true
        }
    );

    if (useGeneric === undefined) {
        return; // User cancelled
    }

    const genericPart = useGeneric.value ? '<T>' : '';
    const dataTypePart = useGeneric.value ? 'T' : 'dynamic';

    const code = `@freezed
abstract class APIState${genericPart} with _$APIState${genericPart} {
  const factory APIState.initial() = _APIStateInitial${genericPart};

  const factory APIState.loading() = _APIStateLoading${genericPart};

  const factory APIState.loaded({
    required ${dataTypePart} data,
  }) = _APIStateLoaded${genericPart};

  const factory APIState.error({
    int? code,
    String? message,
    String? status,
  }) = _APIStateError${genericPart};
}`;

    // Copy to clipboard
    await vscode.env.clipboard.writeText(code);

    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
    outputChannel.clear();
    outputChannel.show(true);

    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Freezed API State Generated');
    outputChannel.appendLine('='.repeat(60) + '\n');
    outputChannel.appendLine(code);
    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Code copied to clipboard!');
    outputChannel.appendLine('='.repeat(60) + '\n');

    vscode.window.showInformationMessage('Freezed API state code generated and copied to clipboard!');
}

/**
 * Generate Freezed UI State
 */
export async function generateFreezedUiState(): Promise<void> {
    // Get class name
    const className = await vscode.window.showInputBox({
        prompt: 'Enter the UI state class name (e.g., AuthUiState)',
        placeHolder: 'AuthUiState',
        validateInput: (value: string) => {
            if (!value || value.trim() === '') {
                return 'Class name cannot be empty';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'Class name must start with uppercase letter and contain only alphanumeric characters';
            }
            return null;
        }
    });

    if (!className) {
        return; // User cancelled
    }

    // Get number of fields
    const fieldsCountInput = await vscode.window.showInputBox({
        prompt: 'How many fields do you want?',
        placeHolder: '4',
        value: '4',
        validateInput: (value: string) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 20) {
                return 'Please enter a number between 1 and 20';
            }
            return null;
        }
    });

    if (!fieldsCountInput) {
        return; // User cancelled
    }

    const fieldsCount = parseInt(fieldsCountInput);
    const fields: { name: string; type: string; defaultValue: string }[] = [];

    // Collect field information
    for (let i = 0; i < fieldsCount; i++) {
        const fieldName = await vscode.window.showInputBox({
            prompt: `Field ${i + 1}: Enter field name (e.g., isLoading)`,
            placeHolder: `field${i + 1}`,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Field name cannot be empty';
                }
                if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
                    return 'Field name must start with lowercase letter';
                }
                return null;
            }
        });

        if (!fieldName) {
            return; // User cancelled
        }

        const fieldType = await vscode.window.showQuickPick(
            [
                { label: 'int', value: 'int', defaultValue: '0' },
                { label: 'double', value: 'double', defaultValue: '0.0' },
                { label: 'String', value: 'String', defaultValue: "''" },
                { label: 'bool', value: 'bool', defaultValue: 'false' },
                { label: 'List', value: 'List', defaultValue: '[]' },
                { label: 'Map', value: 'Map', defaultValue: '{}' },
                { label: 'dynamic', value: 'dynamic', defaultValue: 'null' },
                { label: 'Custom (nullable)', value: 'custom', defaultValue: 'null' }
            ],
            {
                placeHolder: `Select type for ${fieldName}`,
                ignoreFocusOut: true
            }
        );

        if (!fieldType) {
            return; // User cancelled
        }

        let type = fieldType.value;
        let defaultValue = fieldType.defaultValue || 'null';

        // If custom type, ask for the type name
        if (type === 'custom') {
            const customType = await vscode.window.showInputBox({
                prompt: `Enter custom type for ${fieldName} (e.g., User?)`,
                placeHolder: 'CustomType?',
                validateInput: (value: string) => {
                    if (!value || value.trim() === '') {
                        return 'Type cannot be empty';
                    }
                    return null;
                }
            });

            if (!customType) {
                return; // User cancelled
            }

            type = customType;
            defaultValue = 'null';
        }

        fields.push({ name: fieldName, type, defaultValue });
    }

    const privateClassName = `_${className}`;

    // Generate field declarations
    const fieldDeclarations = fields
        .map(f => `    required ${f.type} ${f.name},`)
        .join('\n');

    // Generate initial values
    const initialValues = fields
        .map(f => `        ${f.name}: ${f.defaultValue},`)
        .join('\n');

    const code = `@freezed
abstract class ${className} with ${privateClassName} {
  const factory ${className}({
${fieldDeclarations}
  }) = ${privateClassName};

  factory ${className}.initial() => const ${className}(
${initialValues}
      );
}`;

    // Copy to clipboard
    await vscode.env.clipboard.writeText(code);

    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
    outputChannel.clear();
    outputChannel.show(true);

    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Freezed UI State Generated');
    outputChannel.appendLine('='.repeat(60) + '\n');
    outputChannel.appendLine(code);
    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Code copied to clipboard!');
    outputChannel.appendLine('='.repeat(60) + '\n');

    vscode.window.showInformationMessage('Freezed UI state code generated and copied to clipboard!');
}

/**
 * Generate Freezed Model
 */
export async function generateFreezedModel(): Promise<void> {
    // Get class name
    const className = await vscode.window.showInputBox({
        prompt: 'Enter the model class name (e.g., User)',
        placeHolder: 'User',
        validateInput: (value: string) => {
            if (!value || value.trim() === '') {
                return 'Class name cannot be empty';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'Class name must start with uppercase letter and contain only alphanumeric characters';
            }
            return null;
        }
    });

    if (!className) {
        return; // User cancelled
    }

    // Ask if JSON serialization is needed
    const useJson = await vscode.window.showQuickPick(
        [
            { label: 'Yes', description: 'Include fromJson/toJson methods', value: true },
            { label: 'No', description: 'No JSON serialization', value: false }
        ],
        {
            placeHolder: 'Include JSON serialization support?',
            ignoreFocusOut: true
        }
    );

    if (useJson === undefined) {
        return; // User cancelled
    }

    // Get number of fields
    const fieldsCountInput = await vscode.window.showInputBox({
        prompt: 'How many fields do you want?',
        placeHolder: '4',
        value: '4',
        validateInput: (value: string) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 20) {
                return 'Please enter a number between 1 and 20';
            }
            return null;
        }
    });

    if (!fieldsCountInput) {
        return; // User cancelled
    }

    const fieldsCount = parseInt(fieldsCountInput);
    const fields: { name: string; type: string; jsonKey?: string }[] = [];

    // Collect field information
    for (let i = 0; i < fieldsCount; i++) {
        const fieldName = await vscode.window.showInputBox({
            prompt: `Field ${i + 1}: Enter field name (e.g., userId)`,
            placeHolder: `field${i + 1}`,
            validateInput: (value: string) => {
                if (!value || value.trim() === '') {
                    return 'Field name cannot be empty';
                }
                if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
                    return 'Field name must start with lowercase letter';
                }
                return null;
            }
        });

        if (!fieldName) {
            return; // User cancelled
        }

        const fieldType = await vscode.window.showQuickPick(
            [
                { label: 'int', value: 'int' },
                { label: 'int?', value: 'int?' },
                { label: 'double', value: 'double' },
                { label: 'double?', value: 'double?' },
                { label: 'String', value: 'String' },
                { label: 'String?', value: 'String?' },
                { label: 'bool', value: 'bool' },
                { label: 'bool?', value: 'bool?' },
                { label: 'List<dynamic>', value: 'List<dynamic>' },
                { label: 'Map<String, dynamic>', value: 'Map<String, dynamic>' },
                { label: 'Custom', value: 'custom' }
            ],
            {
                placeHolder: `Select type for ${fieldName}`,
                ignoreFocusOut: true
            }
        );

        if (!fieldType) {
            return; // User cancelled
        }

        let type = fieldType.value;

        // If custom type, ask for the type name
        if (type === 'custom') {
            const customType = await vscode.window.showInputBox({
                prompt: `Enter custom type for ${fieldName} (e.g., User, List<User>)`,
                placeHolder: 'CustomType',
                validateInput: (value: string) => {
                    if (!value || value.trim() === '') {
                        return 'Type cannot be empty';
                    }
                    return null;
                }
            });

            if (!customType) {
                return; // User cancelled
            }

            type = customType;
        }

        let jsonKey: string | undefined;

        // If JSON serialization, ask for JSON key
        if (useJson.value) {
            const jsonKeyInput = await vscode.window.showInputBox({
                prompt: `JSON key for ${fieldName} (press Enter to use same name)`,
                placeHolder: fieldName,
                value: fieldName
            });

            if (jsonKeyInput === undefined) {
                return; // User cancelled
            }

            if (jsonKeyInput && jsonKeyInput !== fieldName) {
                jsonKey = jsonKeyInput;
            }
        }

        fields.push({ name: fieldName, type, jsonKey });
    }

    const privateClassName = `_${className}`;

    // Generate field declarations
    const fieldDeclarations = fields
        .map(f => {
            if (f.jsonKey && useJson.value) {
                return `    @JsonKey(name: '${f.jsonKey}') required ${f.type} ${f.name},`;
            }
            return `    required ${f.type} ${f.name},`;
        })
        .join('\n');

    // Generate fromJson if needed
    const fromJsonPart = useJson.value
        ? `\n\n  factory ${className}.fromJson(Map<String, dynamic> json) => _$${className}FromJson(json);`
        : '';

    const code = `@freezed
abstract class ${className} with ${privateClassName} {
  const factory ${className}({
${fieldDeclarations}
  }) = ${privateClassName};${fromJsonPart}
}`;

    // Copy to clipboard
    await vscode.env.clipboard.writeText(code);

    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('flutter-toolbox');
    outputChannel.clear();
    outputChannel.show(true);

    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Freezed Model Generated');
    outputChannel.appendLine('='.repeat(60) + '\n');
    outputChannel.appendLine(code);
    outputChannel.appendLine('\n' + '='.repeat(60));
    outputChannel.appendLine('Code copied to clipboard!');
    if (useJson.value) {
        outputChannel.appendLine('\nNote: Remember to add these imports:');
        outputChannel.appendLine("import 'package:freezed_annotation/freezed_annotation.dart';");
        outputChannel.appendLine("\npart '<filename>.freezed.dart';");
        outputChannel.appendLine("part '<filename>.g.dart';");
    }
    outputChannel.appendLine('='.repeat(60) + '\n');

    vscode.window.showInformationMessage('Freezed model code generated and copied to clipboard!');
}
