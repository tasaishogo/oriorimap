// backend/vitest.config.ts
// Vitest実行設定。T006（バックエンド骨格）のテスト基盤整備の一部として、
// テストランナー設定ファイルという保護パターンに交差するため、
// spec.md の注記に従いPM（人間著作差分）として直接作成している。
//
// CTRFレポーターの出力先は project-autopilot 結合テスト工程(d) が読む
// worktreeルート直下の ctrf/ctrf-report.json に合わせる（TASK CARD の CTRF パス）。
// `npm test -w backend` はこのファイルのある backend/ を cwd として実行されるため、
// 相対パスは 1 階層上（worktreeルート）を指す `../ctrf` にする。
//
// レポーターパッケージ: `vitest-ctrf-json-reporter`(0.0.3。スキル references/verification-recipes.md
// が参照する既定パッケージ)はレガシーな `onFinished` フックのみを実装しており、
// Vitest 4.x はカスタムレポーターに対して新フック `onTestRunEnd` しか呼ばないため
// 無音で report.json が生成されない（実機確認済み・2026-08-12）。
// Vitest 4 対応版の `@d2t/vitest-ctrf-json-reporter`(1.3.0. `onTestRunEnd`実装済み・
// 既定の出力パスも同じ ctrf/ctrf-report.json でCTRFスキーマ形状も同一)を採用する。
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: [
      'default',
      ['@d2t/vitest-ctrf-json-reporter', { outputDir: '../ctrf', outputFile: 'ctrf-report.json' }],
    ],
  },
});
