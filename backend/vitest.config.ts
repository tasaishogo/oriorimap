// backend/vitest.config.ts
// Vitest実行設定。T006（バックエンド骨格）のテスト基盤整備の一部として、
// テストランナー設定ファイルという保護パターンに交差するため、
// spec.md の注記に従いPM（人間著作差分）として直接作成している。
//
// CTRFレポーターの出力先は project-autopilot 結合テスト工程(d) が読む
// worktreeルート直下の ctrf/ctrf-report.json に合わせる（TASK CARD の CTRF パス）。
// `npm test -w backend` はこのファイルのある backend/ を cwd として実行されるため、
// 相対パスは 1 階層上（worktreeルート）を指す `../ctrf` にする。
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: [
      'default',
      ['vitest-ctrf-json-reporter', { outputDir: '../ctrf', outputFile: 'ctrf-report.json' }],
    ],
  },
});
