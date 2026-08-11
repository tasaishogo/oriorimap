1. 判定表

| # | 前回指摘（要約） | 判定 | 根拠（該当箇所の引用） |
|---|---|---|---|
| 1 | R3.1/R3.2の「重ね合わせ地図の一覧/検索」が未実装でトレーサビリティ破綻 | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:178) に「**公開overlayを一覧/検索（`GET /api/maps`・GSI1 `PUBLIC#OVL`）とトップページの表示対象に統合**」と追記。対応表も [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:58) で「`R3.1 | T021, T023`」「`R3.2 | T021, T023`」に修正。 |
| 2 | T008のDone（dev CloudFrontドメイン登録）が「依存なし[P]」と矛盾 | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:74) で「**dev CloudFrontドメインの登録はT005完了後にT020の前提として実施**」へ移し、Done も「**APIキーが発行され、localhost での地図表示に使える状態**」に縮小されている。 |
| 3 | T003の対象（template.yamlのみ）とDone（`/api/me` スタブ前提）の不整合 | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:36) に「**Authorizer検証用に… `GET /api/health-auth` をテンプレートに追加（アプリコードの変更なし）**」、Done も「**JWT付き `curl /api/health-auth` が200・JWTなしで401**」へ変更。 |
| 4 | T024のDoneがoverlay embed成功とR6.6を検証していない | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:185) の Done に「**`/embed/map/<id>` と `/embed/overlay/<id>`**」「**map・overlay両方のiframe表示成功**」「**許可ドメイン削除後に同一ページを再読込すると拒否される**」が追加されている。 |
| 5 | T031が「health-only」と言いつつDoneで地図表示まで要求し依存も不足 | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:235) の Done は「**`/api/health` が200、`/` が200でSPAを配信する（health-only。地図表示を含む本番動作確認はT034で実施）**」に修正。加えて [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:1) 下部の T034 で「**本番ドメインでの動作確認（地図トップ表示・Geolonia地図ロード）**」を担当し、「**依存: T029, T031, T022**」となっている。 |
| 6 | T026がoverlay通報を対象にしながらT023に依存せず、T027のDoneにスポット個別削除・embed除外の確認がない | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:199) で T026 は「**閲覧画面（地図・重ね合わせ地図）の通報UI**」「**依存: T020, T023**」。[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:206) で T027 の Done に「**embedビューでも非表示**」「**スポット個別削除→当該スポットのみ消える**」、依存に「**T024**」が追加。 |
| 7 | T025が3形式パーサ+API+UIで粒度超過 | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:192) に T025「**インポート①: クライアント側パーサ群**」、[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:206) に T038「**インポート②: 一括登録APIと取り込みUI**」として分割。 |
| 8 | R2.11の対応表がT029のみでT019側（PENDING_DELETE記録）が漏れ | 解消 | [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:150) の Done に「**削除時に画像キーが`PENDING_DELETE`へ記録されること**」が追加され、対応表も [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:58) で「**`R2.11 | T019, T029`**」に修正。 |

2. 新規問題

- **P1** T008 から外した「dev CloudFrontドメイン登録」が、独立タスクでも依存でもなく T020 の本文中の前提に埋め込まれており、追跡不能になっています。  
  該当箇所の引用: [03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:157) 「**前提: 【人間】dev CloudFrontドメインをGeolonia APIキーのURL一覧に登録（T008で発行済みのキー）**」  
  問題: 実行に必要な人間作業なのに、`【人間】` マーカー付きタスクとしても、`依存:` としても表現されていません。結果として、T020 の完了阻害要因が計画上見えなくなっています。  
  修正案: 「dev CloudFrontドメイン登録」を別の `【人間】` タスクとして切り出して `依存: T005, T008` を付け、T020 はそのタスクに依存させてください。