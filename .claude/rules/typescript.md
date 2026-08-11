---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.astro"
---

# TypeScript規約

- ツールチェーン: ESLint + Prettier（設定はeslint.config.mjs / .prettierrc）
- `any` 禁止（やむを得ない場合は `unknown` + 絞り込み）。`@ts-ignore` は理由コメント必須
- コンポーネント: 関数コンポーネントのみ。1ファイル1エクスポートを基本とする
- 状態管理: まずローカルstate、次にコンポジション。グローバルストア導入はユーザーに相談
- shadcn/uiコンポーネントは `components/ui/` の実体を確認してから使う（propsを推測しない）
- 非同期: エラーハンドリングなしの浮いたPromise禁止（no-floating-promises）
