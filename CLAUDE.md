@AGENTS.md

## Claude Code 固有

- パス別の詳細規約: `.claude/rules/` を参照（TypeScript規約）
- Lint・型チェックは Stop フック（gate-ts）がターン終了時に強制する。フックのブロックは「直してから終える」の合図であり、回避しない
- テスト資産・設定ファイル（`.claude/`・`.github/workflows/`・`scripts/agent/` 等）はガードhooksの保護対象。変更が必要な場合はユーザーに相談する（解除ファイルの作成はユーザーのみ）
- 無人実行（project-autopilot）は host モード + Remote Control 運用。起動規約は `.claude/automode-flag.json`（人間が `--settings` で注入したときのみ有効）

## MCP追加候補（現在未導入・必要になったら追加）

- 運用・デバッグフェーズ: cloudwatch MCP → `claude mcp add cloudwatch -- uvx awslabs.cloudwatch-mcp-server@latest`
- クロスブラウザ検証: Playwright MCP → `claude mcp add playwright -- npx @playwright/mcp@latest --caps=core`
- DynamoDB設計の再検討時: `claude mcp add dynamodb -- uvx awslabs.dynamodb-mcp-server@latest`
