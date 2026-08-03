import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.cursor', '.qoder'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['*.mjs', '*.config.{js,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // TypeScript already reports undefined identifiers
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  // Prettier handles formatting; disable conflicting rules
  prettier,
  {
    rules: {
      // Codebase uses `any` intentionally in several DOM/FS-API interop spots
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Untyped third-party imports use @ts-ignore with an explanation
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description' },
      ],
      // Preview HTML is sanitized with DOMPurify before v-html
      'vue/no-v-html': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
)
