module.exports = {
    env: {
        es2022: true,
        browser: true,
        node: true
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: ['import'],
    extends: ['eslint:recommended', 'plugin:import/recommended'],
    ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.next/**',
        '**/.turbo/**'
    ],
    rules: {
        eqeqeq: ['error', 'always', { null: 'ignore' }],
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'prefer-const': 'error',
        'no-var': 'error',
        'import/no-duplicates': 'error'
    }
}
