1. **強み**  
フェーズ分割と依存の明示は全体として整理されており、`design.md §10` の未決事項をタスクに落としている点は実務的です。  
また、各タスクに `_Requirements:_` を持たせ、末尾に対応表まで置いているため、レビュー可能な形にはなっています。

2. **指摘**

**P0（承認をブロックすべき欠陥）**

1. 重ね合わせ地図が検索・一覧（R3.1/R3.2）に実装上つながっておらず、要件カバレッジ主張が成立していません。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:164)] [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:178)] [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:309)]  
該当箇所の引用: 「`GET /api/maps`… _Requirements: R3.1, R3.2, R3.3_」「`POST /api/overlays`… _Requirements: R5.1, R5.2, R5.3, R5.4, R5.5_」「`R3.1 | T021` `R3.2 | T021`」  
問題: 承認済み要件では R3.1/R3.2 の対象は「公開中の地図・重ね合わせ地図」ですが、T021 は地図一覧タスクとしてしか書かれておらず、重ね合わせ地図の一覧/検索への統合は T023 にも明記されていません。対応表も R3 を T021 単独で満たす前提になっており、トレーサビリティが破綻しています。  
修正案: T023 か別タスクで「公開 overlay を `/api/maps` 一覧/検索に統合する」「トップページで overlay も表示対象にする」「map/overlay 両方で検索・新着/更新順を検証する」を明記し、依存関係と対応表を更新してください。

**P1（承認前に修正を推奨）**

1. T008 の依存関係と `[P]` が自己矛盾しています。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:74)]  
該当箇所の引用: 「`dev CloudFrontドメインをキーに登録`」「`依存: なし`」  
問題: Done 条件に dev CloudFront ドメイン登録が入っている以上、少なくとも T005 完了前には閉じられません。現状の `[P]` は独立タスクではありません。  
修正案: 「アカウント作成・キー発行」と「dev ドメイン登録」を分割するか、T008 に `依存: T005` を付けて `[P]` を外してください。

2. T003 は対象ファイルと Done 条件が噛み合っておらず、現行記述では完了判定が実装不能です。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:36)]  
該当箇所の引用: 「`対象: template.yaml`」「`保護ルート（仮の GET /api/me スタブ）が200`」  
問題: `template.yaml` だけを触るタスクとして書かれているのに、Done はアプリ側の保護ルート実装を前提にしています。タスク境界が崩れています。  
修正案: `backend/src/...` を対象に追加してスタブルート実装まで含めるか、Done を「JWT Authorizer の接続確認」に限定して T012 で `/api/me` を初実装する形に整理してください。

3. T024 は R6 全体を背負っているのに、Done 条件が map の一部ケースしか検証していません。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:185)]  
該当箇所の引用: 「`curl -I <dev>/embed/map/<id>` のCSPヘッダー…」「`_Requirements: R6.1, R6.2, R6.3, R6.4, R6.5, R6.6_`」  
問題: overlay embed の成功、許可ドメイン削除後の拒否（R6.6）が Done に入っていません。要件対応を宣言している割に検証が足りません。  
修正案: Done に `/embed/overlay/<id>` の成功確認と、「許可ドメイン削除後に同一ページで再読込すると拒否される」確認を追加してください。

4. T031 は「health-only 初期デプロイ」と Done 条件、依存関係が一致していません。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:235)]  
該当箇所の引用: 「`prodスタックを初期デプロイ（health-only疎通）`」「`https://<本番ドメイン>/ で地図トップが表示されGeolonia地図がロードされる`」「`依存: T030, T005`」  
問題: health-only と言いながら、Done はフロント機能・地図表示まで要求しています。しかもその前提になる地図 UI/公開閲覧タスクへの依存がありません。  
修正案: Done を health-check のみに絞るか、逆に現行 Done を維持するなら `T009/T020/T021` など機能スライスを依存に追加してください。

5. 通報系は対象要件に対して依存と検証が弱く、R8.1/R8.2 を過大申告しています。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:199)] [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:206)]  
該当箇所の引用: 「`対象: 地図/スポット/重ね合わせ地図`」「`依存: T020`」「`一覧から消え重ね合わせに利用不可表示`」  
問題: T026 は overlay 通報も対象にしているのに T023 へ依存していません。T027 も R8.2 が要求する「embed から除外」「スポット個別削除」の確認が Done にありません。  
修正案: T026 に `依存: T020, T023` を追加し、T027 の Done に「スポット単体削除」と「embed で即時非表示」を入れてください。

**P2（改善提案）**

1. T025 は 45〜120分の粒度を明らかに超えています。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:192)]  
該当箇所の引用: 「`KMZ=fflate`」「`KML=@tmcw/togeojson`」「`CSV=papaparse`」「`bulk` API」「`行番号付きエラー表示`」  
問題: 3形式のパーサ実装、クライアント UI、バックエンド一括登録、異常系報告まで 1 タスクに詰め込みすぎです。見積もりも進捗管理も崩れます。  
修正案: 少なくとも「クライアント parser 群」「bulk API」「UI/結果表示」に分割してください。

2. R2.11 の対応表が実装実態を十分に表しておらず、トレーサビリティが弱いです。 [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:150)] [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:220)] [[03_tasks.md](/Users/shogotasai/dev/personal/oriorimap/docs/spec/03_tasks.md:307)]  
該当箇所の引用: 「`画像のPENDING_DELETE記録`」「`cleanupバッチ… PENDING_DELETE 7日回収`」「`R2.11 | T029`」  
問題: R2.11 は cleanup だけでは成立せず、削除時に回収対象へ正しく遷移させる T019 側も本質です。対応表が後段バッチだけを指しているのは不正確です。  
修正案: 対応表を `T019, T029`（必要なら T018 も）に修正し、T019 の Done に `PENDING_DELETE` 記録確認を明記してください。