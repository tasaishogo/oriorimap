1. 判定表

| # | 前回指摘（要約） | 判定（解消/部分解消/未解消） | 根拠（該当箇所の引用） |
|---|---|---|---|
| 1 | 公開/非公開の読み取り認可が HTTP API のルート単位 JWT Authorizer と不整合 | 解消 | [02_design.md:112](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:112)「**読み取りAPIを公開系（`/api/...`・公開コンテンツのみ返し非公開は404）とオーナー系（`/api/me/...`・JWT必須で自分のものは非公開含め返す）に分離**する。」、[02_design.md:118](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:118)「`/api/maps/:id` | GET | 公開 | **公開地図のみ**取得（非公開・不存在は404）」、[02_design.md:122](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:122)「`/api/me/maps/:id` | GET | 要認証(オーナー) | 自分の地図の取得（非公開含む。編集画面・下書きプレビュー用。GeoJSON含む）」 |
| 2 | アップロード完了検証フローと `UploadedImage` エンティティの不在 | 解消 | [02_design.md:126](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:126)「`/api/uploads` | POST | 要認証 | `UploadedImage`レコード（status=pending）を作成しpresigned PUT URLを発行」、[02_design.md:127](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:127)「`/api/uploads/:imageId/complete` | POST | 要認証(発行者) | アップロード完了検証... `status=validated`。不一致はオブジェクト即削除+400」、[02_design.md:248](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:248)「`UploadedImage` ... status(`pending`→`validated`→`attached`→`pending_delete`)」、[02_design.md:163](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:163)「**未添付画像の回収**: `UploadedImage` が `attached` に達しないまま...7日経過したものをS3オブジェクト・レコードごと削除」 |
| 3 | `sort=created` が索引設計と不整合 | 解消 | [02_design.md:72](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:72)「GSI1（公開一覧）を全件Queryし**Lambda内で部分一致フィルタとソート**（`sort=created\|updated` いずれもLambda内。GSIの物理順はupdatedAtのみ）」 |
| 4 | KMZ 対応の設計欠落 | 解消 | [02_design.md:78](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:78)「**KMZ: fflateでZIP展開し `doc.kml`（無ければ最初の`.kml`エントリ）を抽出**」、[02_design.md:281](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:281)「KMZの解凍失敗・`.kml`エントリなし | クライアント側で行/エントリ情報付きエラー表示・取り込み中止」 |
| 5 | 退会の多段削除の順序・冪等性・部分失敗が未設計 | 解消 | [02_design.md:138](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:138)「**退会受付（202）**: Userに`status=pending_delete`のtombstoneを立て... `AdminDisableUser`で無効化。実削除はcleanupバッチが段階実行」、[02_design.md:161](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:161)「責務（3系統。**いずれも再実行安全＝冪等に実装する**）」、[02_design.md:164](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:164)「全コンテンツ削除完了を確認後、Cognitoユーザー削除...を最後に実行。途中失敗しても翌日の実行が残件から再開する」 |
| 6 | Google 同一メール自動リンクの実装詳細不足 | 解消 | [02_design.md:146](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:146)「同一メール自動リンク（R1.8, R1.11）の実装方式:」、[02_design.md:147](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:147)「`PreSignUp_ExternalProvider`... `ListUsers`」、[02_design.md:148](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:148)「`AdminLinkProviderForUser` でGoogleプロバイダを既存ユーザーにリンク」、[02_design.md:150](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:150)「IAM: `cognito-idp:ListUsers` / `cognito-idp:AdminLinkProviderForUser`」、[02_design.md:151](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:151)「実装初期に**スパイクで実機検証**する」 |
| 7 | R5.5 出典表示に必要な API 契約未定義 | 解消 | [02_design.md:129](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:129)「`/api/overlays/:id` | GET | 公開 | **公開のみ**取得。応答に参照元一覧 `sources: [{mapId, title, ownerName, status: available\|unavailable}]` を含む」 |
| 8 | bulk import の正常系レスポンス未定義 | 解消 | [02_design.md:124](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:124)「応答: `{totalCount, importedCount, skippedCount, skippedReasons[]}`」 |
| 9 | Geolonia 表示回数の把握が手作業メモ止まり | 解消 | [02_design.md:172](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:172)「### 4.7 運用ルーチン（Geolonia表示回数の把握）」、[02_design.md:174](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:174)「**運営者本人が毎月1日・15日にGeoloniaダッシュボードを確認**する」、[02_design.md:175](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:175)「16,000回（80%）超過でProプラン...切替を判断」 |

2. 新規問題

- P1: `pending_delete` ユーザー走査用 GSI の sort key に `updatedAt` を使っていますが、`User` エンティティ定義に `updatedAt` がありません。cleanup バッチの走査キーが未定義です。  
  該当箇所の引用: [02_design.md:247](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:247)
  > `User | USER#<userId> | PROFILE | displayName, status(active/pending_delete), createdAt ... | GSI1: USERSTATUS#pending_delete / <updatedAt>`

  修正案: `User` に `updatedAt` ではなく用途が明確な `deleteRequestedAt` を追加し、GSI1 の sort key もそれに合わせてください。少なくとも、退会受付時に必ず設定される属性を明示する必要があります。

- P1: `POST /api/uploads` が `kind=icon/photo` の両方に一律 `1MB` 制約を掛けており、同じ設計書内の「写真は最大1600px JPEG」と噛み合っていません。今回の修正で photo の受理条件が不必要に厳しくなっています。  
  該当箇所の引用: [02_design.md:77](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:77), [02_design.md:126](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:126)
  > 「写真: 最大1600px JPEG」  
  > 「`/api/uploads` ... （種別: icon/photo、Content-Type・**1MB制約付き**）」

  修正案: `icon` と `photo` で制約を分離してください。例えば `icon=1MB`、`photo=別上限` を明示し、API 契約とクライアント変換方針を一致させるべきです。