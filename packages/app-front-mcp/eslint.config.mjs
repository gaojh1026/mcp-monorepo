import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import { nextMonorepoIgnores } from '../../configs/eslint/next-base.mjs'

export default [
    {
        ignores: nextMonorepoIgnores
    },
    js.configs.recommended,
    ...vue.configs['flat/essential'],
    {
        files: ['**/*.{ts,tsx,mts,cts}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module'
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        rules: {
            ...tsPlugin.configs.recommended.rules
        }
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        rules: {
            'vue/multi-word-component-names': ['error', { ignores: ['index'] }]
        }
    },
    {
        rules: {
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error'
        }
    }
]
