# OriOriMap（仮称）

<!-- ツール非依存の共通正本。Claude Code / Codex / Antigravity すべてが（直接または@import経由で）読む -->

## プロジェクト概要

一般ユーザーがGIS知識なしで主題図（カスタムアイコン付きスポットの地図）を作成・公開し、複数の地図を重ね合わせ（がっちゃんこ）て閲覧・保存・共有できる日本向けWebサービス。重ね合わせは参照型（元地図の更新を自動反映）で、事前登録ドメイン限定のiframe埋め込み（embed）を提供する。趣味・小規模・低コスト運用（月額$0〜10目標）・OSS公開予定。

- 要件定義: docs/spec/01_requirements.md（approved）
- 技術設計: docs/spec/02_design.md（approved。**キー設計・API契約・認可モデルの正本**）
- タスク一覧: docs/spec/03_tasks.md（approved）

## 技術スタック

- フロントエンド: React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui。地図は Geolonia JS API（MapLibre GL JS互換）
- バックエンド: API Gateway (HTTP API) + JWT Authorizer + Lambda (nodejs24.x / TypeScript + Hono) + DynamoDB シングルテーブル + S3 + CloudFront（IaC: SAM）
- 認証: Cognito User Pool（Liteティア）+ Google IdP + Hosted UI（Code + PKCE）
- 共有: `shared/` ワークスペースの Zod スキーマ・定数（LIMITS / KASANE_COLORS）がフロント・バック共通の単一ソース
- リポジトリ: npm workspaces モノレポ（shared / backend / frontend / e2e）

## コマンド

- 依存インストール: `npm install`（ルート）
- テスト: `npm test`（全ワークスペース） / `npm test -w backend` 等
- Lint: `npm run lint` / Format: `npm run format`（確認は `npm run format:check`）
- 型チェック: `npm run typecheck`
- ローカルAPI: `sam local start-api`（T002以降） / フロント: `npm run dev -w frontend`（T007以降）

## コーディング規約（共通）

- 変更は小さく保つ。lint・型エラーゼロの状態で完了する
- テストを通すこと自体を目的にしない。既存テストの改変が必要と判断した場合は変更せず報告する
- 仕様の解釈に迷ったら docs/spec/ を正本として参照する（推測で埋めない）

## フロントエンド開発規約（P1: React + shadcn/ui）

- UIスタック: Tailwind CSS + shadcn/ui。**コンポーネントはshadcn CLI/レジストリ経由で追加**し、`frontend/src/components/ui/` 配下の実体を直接編集してカスタマイズする
- デザイントークンは docs/spec/02_design.md §5.2（案A「藤重」: プライマリ `#614C9B`・かさね色パレット・見出しZen Old Mincho/本文Noto Sans JP・16px/タップ44px・ライトのみ）が正本。実装は `frontend/src/styles/tokens.css` に一元化し、propsやトークンを推測で書かない
- 「AI slop」回避: 全カード同一角丸・紫グラデーション・意味のない中央寄せレイアウトの濫用を避ける。既存画面のパターンを踏襲する
- 地図: レイヤー描画はSymbolレイヤー+`addImage`（閲覧・embed）、編集UIのみHTML Marker。地図インスタンスは再生成せず `setData` で差分更新する
- IME: テキスト入力は composition イベントを尊重し、変換確定前に検索実行・整形をしない
- UI変更後の確認: e2e-check スキル（`.agents/skills/` 共有）の手順で実表示・コンソール・CWVを確認する

## サーバーレスバックエンド規約（P2-Node）

- IaC: SAM（template.yaml）。リソース変更は必ずtemplate経由。コンソール手作業やad-hocなAWS CLI変更は禁止
- デプロイフロー: iac-workflow スキルに従う（cfn-lint検証 → changeset確認 → デプロイ）。dev環境の更新はmainマージ後のCD（deploy-dev.yml）経由のみ
- Lambda (Node.js 24.x / TypeScript):
  - ビルドは SAM の `BuildMethod: esbuild`（`Format: esm`・`OutExtension: .js=.mjs`・`Target: es2022`）。tsc は型チェック専用（`noEmit`）
  - HTTPハンドラは Hono（`hono/aws-lambda` の `handle()`）。ルート定義とビジネスロジックを分離し、ロジックは単体テスト可能なモジュールに置く
  - ログ: Powertools for AWS Lambda (TypeScript) の Logger（構造化JSON）。`console.log` 禁止（ESLintで強制）。相関ID（requestId）を必ず含める
  - 入力バリデーション: `shared/` のZodスキーマでAPI境界にて必ず検証する
  - AWS SDK v3 は package.json にバージョンをピン留めして esbuild で同梱する（`External` に `@aws-sdk/*` を書かない）。クライアントはモジュールスコープで再利用する
  - べき等性: cleanupバッチ・退会の段階削除は再実行安全が契約（design §4.5）
- 認可モデル: 読み取りは公開系（`/api/...`＝公開のみ・404）とオーナー系（`/api/me/...`＝JWT必須）を混在させない（design §4.2）
- IAM: 最小権限。ワイルドカード（`Resource: "*"`）はユーザー承認なしに書かない
- DynamoDB: キー設計は design §6 が正本。GSIキーの設定/除去（公開切替・画像attach）を漏らさない。BatchWriteの `UnprocessedItems` を握りつぶさない
- テスト: Vitest + aws-sdk-client-mock。ローカル起動は `sam local start-api`

## テスト方針（共通）

- 単体テストの品質基準・作成手順: **unittest-quality スキルに従う**
- 原則: テストは公開インターフェース経由で振る舞いを検証する。実装詳細に結合させない
- **禁止事項**: テストを通すために既存テストを弱める・削除する・skipする行為。テスト側が誤っていると判断した場合は根拠を報告する
- カバレッジは目安であり目標ではない。境界値・異常系・並行性など「壊れ方」を検証するテストを優先する
- E2E: e2e-check スキルの三段構成（Chrome DevTools診断 / Playwright探索 / .spec.ts回帰）
