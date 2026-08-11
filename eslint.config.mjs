// ESLint flat config — モノレポルート単一構成
// frontend/** = React + TS、backend/**・shared/** = Node(Lambda) + TS
// 依存: eslint @eslint/js typescript-eslint（ルート）+ eslint-plugin-react-hooks eslint-plugin-react-refresh（frontend）
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/node_modules',
      '**/coverage',
      '.aws-sam',
      '**/*.config.{js,mjs,ts}',
      // autopilotハーネス（vendored・素のJS）はプロジェクトのTS lint対象外
      'scripts/**',
      // e2e は T036（Playwright導入）でtsconfig整備後にlint対象へ追加する
      'e2e/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['backend/**/*.ts', 'shared/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // 構造化ログはPowertools Loggerを使う（AGENTS.md P2-Node規約）
      'no-console': 'error',
    },
  },
  {
    // テストコードではconsole・非型チェックの緩和を許可
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
