1. 強み: 低コスト制約に対して AWS サーバーレス + Geolonia + DynamoDB の組み合わせは概ね筋が良く、過剰な基盤導入は抑えられています。  
UI・データモデル・運用制約まで一通り章立てされており、特に §5 の画面/状態設計と §6 のアクセスパターン明示はレビュー可能な粒度に達しています。

2. 指摘

**P0（承認をブロックすべき欠陥）**

1. 公開閲覧とオーナー限定閲覧の認可モデルが、HTTP API のルート認可方式と整合していません。  
該当箇所の引用: [02_design.md:110](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:110), [02_design.md:116](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:116), [02_design.md:123](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:123), [01_requirements.md:29](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:29)
> 認証: `(公開)` = 認証不要ルート、`(要認証)` = JWT Authorizer、`(admin)` = JWT + Cognitoグループ `admin` をLambda内で検証。  
> `/api/maps/:id` | GET/PUT/DELETE | 公開/要認証(オーナー)  
> `/api/overlays/:id` | GET/PUT/DELETE | 公開/要認証(オーナー)  
> 非公開: オーナー（と共同編集者）のみ閲覧できる下書き状態

問題: API Gateway HTTP API の JWT Authorizer は基本的にルート単位です。この設計だと `GET /api/maps/:id` と `GET /api/overlays/:id` を「匿名でも読めるが、非公開ならオーナーだけ読める」にはできません。公開ルートにすれば非公開判定を Lambda 側でやるしかなく、要認証ルートにすれば匿名閲覧要件を壊します。設計の中核である公開/非公開モデルがここで未解決です。  
修正案: 読み取り API を明確に分離してください。例として、`/api/public/maps/:id` と `/api/me/maps/:id` に分けるか、GET を常に Lambda 判定に寄せるなら「任意 JWT 受理 + Lambda 内認可」に設計を切り替え、その前提でキャッシュ/認可境界を再定義してください。`overlays` も同様です。

2. アップロードの完了検証フローが存在せず、サーバー側 magic bytes 検証が成立していません。  
該当箇所の引用: [02_design.md:77](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:77), [02_design.md:121](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:121), [02_design.md:221](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:221), [02_design.md:294](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:294)
> アップロード前に**クライアント側Canvasで変換** ... → presigned PUT。サーバー側でmagic bytes検証  
> `/api/uploads` | POST | 要認証 | presigned PUT URL発行 ... 完了通知時にmagic bytes検証  
> | Spot | ... | `photoKey?` ... |  
> `handlers/          #   api.ts（メインLambda）/ cleanup.ts（日次バッチ）/ preSignup.ts（Cognitoトリガー）`

問題: 「完了通知時」の通知経路が API にもイベントにも定義されていません。さらに `UploadedImage` 相当の永続エンティティも無く、未添付アップロード・検証待ち・検証失敗・削除待ちを追跡できません。現状の記述では R2.7 のサーバー側検証も、R2.11 の画像ライフサイクル管理も実装不能です。  
修正案: `UploadedImage` エンティティを追加し、`pending -> uploaded -> validated -> attached -> pending_delete` の状態遷移を定義してください。完了契機は `POST /api/uploads/complete` か S3 `ObjectCreated` イベントのどちらかに固定し、検証失敗時の即時削除・未添付 TTL 回収まで設計に含めるべきです。

**P1（承認前に修正を推奨）**

1. `sort=created` を掲げていますが、データモデルは `updatedAt` しか索引しておらず整合していません。  
該当箇所の引用: [02_design.md:114](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:114), [02_design.md:224](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:224), [02_design.md:226](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:226), [02_design.md:235](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:235)
> `/api/maps` | GET | 公開 | ... `?q=`部分一致・`?sort=created\|updated`  
> Map ... GSI1: `PUBLIC#MAP` / `<updatedAt>`  
> OverlayMap ... GSI1: `PUBLIC#OVL` / `<updatedAt>`  
> 公開一覧/検索: GSI1 ... をupdatedAt降順でQuery

問題: `created` 順は現行索引では効率的に出せません。実装時に全件読んで Lambda 内ソートへ流れるのが見えており、仕様と物理設計がずれています。  
修正案: `createdAt` 用 GSI を追加するか、一覧専用の集約エンティティを持ってください。もし「件数が少ないから Lambda 内ソートでよい」とするなら、その制約を設計書に明記し、件数上限と切替条件を API 仕様に織り込むべきです。

2. 要件の KMZ 対応が、設計では事実上抜けています。  
該当箇所の引用: [01_requirements.md:136](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:136), [02_design.md:78](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:78), [02_design.md:304](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:304)
> R7.1 WHEN 作成者がKML/KMZファイル ...  
> インポート解析 | クライアント側パース（KML: @tmcw/togeojson / CSV: papaparse）  
> `features/          #   search, import(kml/csvパース), ...`

問題: `togeojson` で書いてあるのは KML のみで、ZIP 展開を要する KMZ の設計がありません。承認済み要件との差分です。  
修正案: KMZ 展開ライブラリ（`fflate` / `jszip` 等）を前提に、`doc.kml` 抽出、多重 KML の扱い、添付画像を無視するのか取り込むのか、失敗時メッセージをどうするかまで明記してください。

3. 退会処理が多段破壊操作なのに、順序・冪等性・部分失敗時の扱いが未設計です。  
該当箇所の引用: [02_design.md:129](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:129), [02_design.md:239](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:239), [01_requirements.md:58](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:58)
> `/api/me` | GET/DELETE | 要認証 | プロフィール取得 / 退会（Cognitoユーザー削除 + コンテンツ削除。R1.10）  
> 地図削除時は `MAP#<id>` パーティション一括削除（BatchWrite）+ 画像キーを `PENDING_DELETE` へ記録  
> ... 個人情報および当該ユーザーが作成した地図・重ね合わせ地図・アップロード画像を削除する

問題: Cognito・DynamoDB・S3 をまたぐ不可逆処理なのに、どの順で消すのか、途中失敗したらどう回復するのか、再実行して安全かが書かれていません。ここは運用事故になりやすい箇所です。  
修正案: 退会は同期 DELETE 一発で終わらせず、`USER#... status=pending_delete` の tombstone を立てて非同期ジョブで段階削除してください。DynamoDB 側はページング/チャンク削除、S3 は後追い、Cognito ユーザー削除は最後、全工程を冪等にするのが妥当です。

4. Google 同一メール連携の実装が、セキュリティ要件の割に雑すぎます。  
該当箇所の引用: [02_design.md:136](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:136), [02_design.md:249](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:249), [01_requirements.md:56](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:56), [01_requirements.md:59](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:59)
> 同一メール自動リンク（Pre SignUp Lambdaトリガーで検証済みメールのみリンク、未検証は案内エラー = R1.8, R1.11）  
> Pre SignUpトリガーで検証済みなら自動リンク / 未検証なら例外→「メール検証を完了してください」表示

問題: これはアカウント乗っ取り耐性に直結する設計ですが、実際のトリガー種別、リンク API 呼び出し、必要 IAM、既存ユーザー発見時の分岐、競合時の失敗処理が何も書かれていません。調査メモも Cognito の料金・Hosted UI・JWT Authorizer が中心で、この具体方式の裏付けになっていません。  
修正案: この項目は「できる想定」ではなく、実装手順レベルまで詰めてください。少なくとも使用トリガー、既存ユーザー照合手順、リンク実行主体、失敗時のフォールバック、監査ログを明示すること。未検証なら設計確定事項から外してスパイク課題に降ろすべきです。

**P2（改善提案）**

1. R5.5 の「出典表示」に必要な API 契約が明記されていません。  
該当箇所の引用: [01_requirements.md:117](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:117), [02_design.md:123](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:123)
> R5.5 THE SYSTEM SHALL 重ね合わせ地図の画面に、参照する各元地図のタイトルと作成者名を出典として表示する  
> `/api/overlays/:id` ... 取得（参照先の公開状態を解決しレイヤー可用性を返す。R4.5, R5.2, R5.4）

問題: UI 要件としては必須なのに、`/api/overlays/:id` の戻り値が「可用性を返す」までしか書かれていません。タイトル・作成者名をどこで解決するかが曖昧です。  
修正案: overlay 詳細レスポンスに `sources: [{ mapId, title, ownerName, status }]` を明記してください。これをやらないと、実装時に追加フェッチ乱立か要件漏れになります。

2. インポートの成功/スキップ件数の返却仕様が足りません。  
該当箇所の引用: [01_requirements.md:136](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:136), [01_requirements.md:138](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:138), [02_design.md:119](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:119), [02_design.md:261](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:261)
> ... 取り込み件数とスキップ件数を表示する  
> ... スキップした旨と件数を報告する  
> `/api/maps/:id/spots/bulk` ... インポート一括登録・全件Zod検証・上限チェック  
> インポートファイル解析不能 ... API側でもZod検証で不正行を400返却

問題: 失敗時しか書かれておらず、正常系の「何件取り込んだか」「何件を線・面としてスキップしたか」の結果フォーマットがありません。  
修正案: bulk import のレスポンスを `importedCount / skippedCount / skippedReasons[] / totalCount` まで定義してください。KML の非ポイント除外はここに入れるべきです。

3. Geolonia 表示回数の把握が、設計というより手作業メモに留まっています。  
該当箇所の引用: [01_requirements.md:166](/Users/shogotasai/dev/personal/oriorimap/docs/spec/01_requirements.md:166), [02_design.md:265](/Users/shogotasai/dev/personal/oriorimap/docs/spec/02_design.md:265)
> 表示回数を月次で把握できるようにする  
> ダッシュボード月次確認+閾値接近時にProプラン切替判断（運用手順書に記載）

問題: 「誰が」「いつ」「どの閾値で」確認するのかが設計に落ちておらず、実質的には注意書きです。無料枠超過時の影響が大きい割に運用設計が弱いです。  
修正案: 少なくとも runbook と責任者/頻度を明記してください。可能なら月初・月中の定例確認、残量閾値、切替判断基準を §10 ではなく本設計に入れるべきです。