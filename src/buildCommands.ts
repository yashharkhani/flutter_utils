/**
 * Build command configurations
 * This file defines the sequence of commands for each build type
 */

import { BuildConfig, BuildType } from './types';

/**
 * Get the build configuration for a specific build type
 */
export function getBuildConfig(buildType: BuildType, baseHref?: string, useWasm?: boolean): BuildConfig {
    const configs: Record<BuildType, BuildConfig> = {
        [BuildType.APK]: {
            name: 'Android APK',
            steps: [
                {
                    id: 'delete-pubspec-lock',
                    description: 'Delete pubspec.lock',
                    command: 'rm -f pubspec.lock',
                    optional: true,
                    requiresConfirmation: true,
                    confirmationMessage: 'Delete pubspec.lock before build?'
                },
                {
                    id: 'clean-1',
                    description: 'Clean project (1st pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-1',
                    description: 'Get dependencies (1st pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'clean-2',
                    description: 'Clean project (2nd pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-2',
                    description: 'Get dependencies (2nd pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'build-apk-1',
                    description: 'Build APK (1st build)',
                    command: '{FLUTTER_CMD} build apk --release'
                },
                {
                    id: 'clean-3',
                    description: 'Clean project (3rd pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-3',
                    description: 'Get dependencies (3rd pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'build-apk-2',
                    description: 'Build APK (final build)',
                    command: '{FLUTTER_CMD} build apk --release'
                }
            ]
        },
        [BuildType.IPA]: {
            name: 'iOS IPA',
            steps: [
                {
                    id: 'delete-pubspec-lock',
                    description: 'Delete pubspec.lock',
                    command: 'rm -f pubspec.lock',
                    optional: true,
                    requiresConfirmation: true,
                    confirmationMessage: 'Delete pubspec.lock before build?'
                },
                {
                    id: 'clean-1',
                    description: 'Clean project (1st pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-1',
                    description: 'Get dependencies (1st pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'clean-2',
                    description: 'Clean project (2nd pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-2',
                    description: 'Get dependencies (2nd pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'build-ipa-1',
                    description: 'Build IPA (1st build)',
                    command: '{FLUTTER_CMD} build ipa --release'
                },
                {
                    id: 'clean-3',
                    description: 'Clean project (3rd pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-3',
                    description: 'Get dependencies (3rd pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'build-ipa-2',
                    description: 'Build IPA (final build)',
                    command: '{FLUTTER_CMD} build ipa --release'
                }
            ]
        },
        [BuildType.Web]: {
            name: 'Web',
            steps: [
                {
                    id: 'delete-pubspec-lock',
                    description: 'Delete pubspec.lock',
                    command: 'rm -f pubspec.lock',
                    optional: true,
                    requiresConfirmation: true,
                    confirmationMessage: 'Delete pubspec.lock before build?'
                },
                {
                    id: 'clean-1',
                    description: 'Clean project (1st pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-1',
                    description: 'Get dependencies (1st pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'clean-2',
                    description: 'Clean project (2nd pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-2',
                    description: 'Get dependencies (2nd pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'build-web-1',
                    description: useWasm ? 'Build Web with WASM (1st build)' : 'Build Web (1st build)',
                    command: `{FLUTTER_CMD} build web --release --base-href ${baseHref || '/'}${useWasm ? ' --wasm' : ''}`
                },
                {
                    id: 'clean-3',
                    description: 'Clean project (3rd pass)',
                    command: '{FLUTTER_CMD} clean'
                },
                {
                    id: 'pub-get-3',
                    description: 'Get dependencies (3rd pass)',
                    command: '{FLUTTER_CMD} pub get'
                },
                {
                    id: 'build-web-2',
                    description: useWasm ? 'Build Web with WASM (final build)' : 'Build Web (final build)',
                    command: `{FLUTTER_CMD} build web --release --base-href ${baseHref || '/'}${useWasm ? ' --wasm' : ''}`
                }
            ]
        }
    };

    return configs[buildType];
}
