import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default [
    {
        ignores: ['**/dist/**']
    },
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true
                }
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setImmediate: 'readonly',
                process: 'readonly',
                __REACT_DEVTOOLS_GLOBAL_HOOK__: 'readonly',
                FormData: 'readonly',
                AbortController: 'readonly',
                performance: 'readonly',
                MessageChannel: 'readonly',
                queueMicrotask: 'readonly',
                matchMedia: 'readonly',
                reportError: 'readonly',
                HTMLImageElement: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript,
            'react': reactPlugin,
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin
        },
        rules: {
            ...typescript.configs.recommended.rules,
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'react/jsx-uses-react': 'error',
            'react/jsx-uses-vars': 'error',
            'no-empty': ['error', { 'allowEmptyCatch': true }],
            'no-constant-condition': ['error', { 'checkLoops': false }],
            'no-prototype-builtins': 'off',
            'no-control-regex': 'off',
            'no-useless-escape': 'off',
            'no-fallthrough': 'off',
            'no-cond-assign': 'off',
            'getter-return': 'off',
            'valid-typeof': 'off',
            'no-misleading-character-class': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_' }]
        }
    }
]; 