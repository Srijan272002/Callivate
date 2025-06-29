module.exports = {
  extends: [
    'expo',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    // React rules
    'react-hooks/exhaustive-deps': 'warn',
    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'web-build/',
  ],
}; 