# 裁定記録: 02_design

- 実施日時: 2026-08-11
- レビュアー構成: codexのみ（agyはヘッドレス実行の権限自動拒否（read_file）で初回・リトライとも空出力 → スキップ。要件フェーズ ラウンド1は成功していたため環境起因とみられる）
- ラウンド1指摘数: codex P0×2 / P1×4 / P2×3

| # | 指摘（要約） | 出所 | 重要度 | 裁定 | 理由・対応 |
|---|---|---|---|---|---|
| 1 | 「公開なら誰でも・非公開ならオーナーのみ」の読み取りがHTTP APIのルート単位JWT Authorizerと不整合 | codex | P0 | 反映済み | §4.2に認可の設計原則を明記し、読み取りAPIを公開系（`/api/...`＝公開のみ・404）とオーナー系（`/api/me/...`＝JWT必須）に分離。閲覧画面/編集画面の使い分けも明記 |
| 2 | アップロード完了検証フローとUploadedImageエンティティの不在（R2.7/R2.11が実装不能） | codex | P0 | 反映済み | `UploadedImage`エンティティ（pending→validated→attached→pending_delete）を§6に追加。完了契機を `POST /api/uploads/:imageId/complete` に固定（magic bytes・サイズ検証、不一致は即削除+400）。未添付7日回収をcleanupバッチ§4.5-2に追加 |
| 3 | `sort=created` がGSI（updatedAtのみ）と不整合 | codex | P1 | 反映済み | createdAt用GSIは追加せず「全件Query+Lambda内フィルタ・ソート」を設計として明文化（§3）。前提件数（公開1,000件まで）と超過時の移行方針（§10既載）を明記 |
| 4 | KMZ対応の設計欠落（要件R7.1との差分） | codex | P1 | 反映済み | fflateでZIP展開し`doc.kml`（無ければ最初の`.kml`）を抽出する方式を§3に明記。添付画像・非ポイント図形はスキップ報告。解凍失敗は§7に追加 |
| 5 | 退会（Cognito/DynamoDB/S3をまたぐ多段削除）の順序・冪等性・部分失敗が未設計 | codex | P1 | 反映済み | tombstone方式に再設計: DELETE /api/meは202受付（非公開化+AdminDisableUserのみ同期）、実削除はcleanupバッチ§4.5-3が冪等に段階実行（コンテンツ→画像→最後にCognito削除）。§7に部分失敗行を追加 |
| 6 | Google同一メール自動リンクの実装詳細（トリガー種別・API・IAM・失敗時）が未記載 | codex | P1 | 反映済み | §4.3に`PreSignUp_ExternalProvider`+`ListUsers`+`AdminLinkProviderForUser`+リンク後例外→再ログインの標準パターン、IAM最小権限、監査ログ、失敗時フォールバックを明記。実装初期のスパイク検証を§10に起票（縮退時は要件変更としてユーザー確認） |
| 7 | R5.5出典表示に必要なAPI契約（タイトル・作成者名）が未定義 | codex | P2 | 反映済み | `/api/overlays/:id`の応答に `sources: [{mapId, title, ownerName, status}]` を明記 |
| 8 | bulk importの正常系レスポンス（取込/スキップ件数）未定義 | codex | P2 | 反映済み | 応答 `{totalCount, importedCount, skippedCount, skippedReasons[]}` を§4.2に明記 |
| 9 | Geolonia表示回数の把握が手作業メモ止まり | codex | P2 | 反映済み | §4.7運用ルーチンを新設（責任者・毎月1日/15日・50%/80%閾値・Pro切替判断・runbook起票） |

集計: 反映済み9件 / 要判断0件 / 不採用0件

## 検証ラウンド発動判定

- ラウンド1でP0指摘あり（codex 2件）→ **検証ラウンド実施**（codexセッション継続。agyは環境エラーのため不参加）

## 検証ラウンド結果

- ラウンド2実施（2026-08-11・codexセッション継続）
- 判定: 前回指摘9件すべて「解消」
- 新規問題: P1×2（いずれも修正起因・照合の結果正当と裁定し反映）
  1. User走査GSIのsort keyが未定義属性（updatedAt）を参照 → `deleteRequestedAt` を属性として定義しGSIキーもこれに変更
  2. アイコン/写真に一律1MB制約が掛かり「写真1600px JPEG」方針と不整合 → 種別ごとに分離（icon=1MB / photo=5MB設計値）
- ラウンド3: 未解消P0・新規P0なしのため実施せず（発動条件外）
