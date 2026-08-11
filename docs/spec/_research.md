# 外部調査キャッシュ（project-blueprint）

調査日: 2026-08-11

構想概要: 一般ユーザーが主題図（ピン+カスタムアイコン+説明付きの地図レイヤー）を作成・公開し、複数の地図を重ね合わせ（マージ）て閲覧・共有できる日本向けWebサービス。地図表示はGeolonia Maps、インフラはAWS+Cloudflare中心、小規模・低コスト運用（月額数千円目標）。作成した地図（単体または重ね合わせ）は事前登録したサイトへのiframe埋め込みも予定。

---

## 1. Geolonia Maps の技術仕様

- **MapLibre GL JSとの関係**: Geolonia JavaScript APIはMapLibre GL JSをラップした拡張クラス（フォークではない）。クラス名`maplibregl`を`geolonia`に置き換えるだけでほぼ全てのメソッド・プロパティ・イベントがそのまま利用可能（例: `new geolonia.Map('#map')`、`geolonia.Popup()`）。非互換なのはAPIキーの受け渡し方式とベクトルタイルのスキーマの2点のみ。`<div id="map" data-lat="..." data-lng="...">`のようなdata-*属性で設定するEmbed API（スクリプトタグ埋め込みのみで動く簡易版）も提供されている。
  出典: https://docs.geolonia.com/embed-api/javascript

- **APIキー発行方法**: `app.geolonia.com`でダッシュボードにサインアップして取得。発行時に「地図を利用する実サイトのURL」を登録する必要がある（盗用防止のため）。1キーに複数URLを登録可能、1アカウントで複数キーを取得可能。
  出典: https://docs.geolonia.com/tutorial/002

- **ドメイン制限の仕組み**: APIキー発行時にURL（スキーマ込みで完全一致。例: `http://127.0.0.1:8000`と`https://127.0.0.1:8000`は別扱い）をダッシュボードに登録するallowlist方式。開発用途として`http://127.0.0.1:*`、`http://localhost:*`、`https://*.test`、`https://*.example`、GitHub Pages（独自ドメイン除く）、Netlify、Vercel、CodePen等は無料・無制限で許可され、表示回数カウントの対象外。
  出典: https://docs.geolonia.com/tutorial/002

- **GeoJSONレイヤー**: MapLibre GL JS標準の`map.addSource()` / `map.addLayer()`がそのまま使用可能（公式クックブックに`type: 'fill'`レイヤーで都道府県をハイライトする実装例あり）。加えてGeolonia独自の簡易記法`geolonia.SimpleStyle(geojson).addTo(map).fitBounds()`があり、GeoJSON Featureの`properties`に`marker-color` / `marker-symbol`等simplestyle-spec準拠のプロパティを埋め込むだけでPoint/LineString/Polygonをスタイリング表示できる。
  出典: https://docs.geolonia.com/geojson , https://docs.geolonia.com/cookbook/highlight_prefectures

- **カスタムマーカー画像（オリジナルアイコン）**: simplestyleの`marker-symbol`はGeolonia提供のプリセットアイコン一覧（`airport`, `cafe`, `hospital`等、Makiアイコン準拠）からの選択のみで、任意の独自画像は指定不可（「一部のスタイルで意図したとおりにアイコンを表示できないことがある」との注記あり）。
  出典: https://docs.geolonia.com/geojson/marker-symbol
  一方、公式サイトの開発者向けページでは「マーカーをカスタマイズして会社のロゴを表示することもできます」という実例が紹介されている。MapLibre GL JS標準のHTML要素ベースMarker、またはSymbolレイヤー+`addImage`によるカスタムアイコン表示が可能と考えられるが、本調査では実装コード本文（CodePen側）までは確認できていない。**要件定義・技術設計の際は、独自アイコン表示をHTML Marker方式で実装する前提を置きつつ、Geolonia公式のコードサンプルで具体実装を裏取りすることを推奨。**
  出典: https://www.geolonia.com/maps-dev

---

## 2. Geolonia Maps の料金体系・利用規約

- **料金プラン**（https://www.geolonia.com/pricing ）
  - Free: 無料、地図表示 20,000回/月まで
  - Pro: 月額3,980円（税抜、税込4,378円）、50,000回/月まで
  - 従量課金（Pro超過分、各税抜/税込目安1.1倍）:
    - 50,001〜100,000回: ¥0.40/回
    - 100,001〜500,000回: ¥0.30/回
    - 500,001〜1,000,000回: ¥0.23/回
    - 1,000,001〜5,000,000回: ¥0.12/回
    - 5,000,001回以上: ¥0.06/回
  - 「地図表示回数」はユーザー端末に地図が実際に表示された回数（画面外は非カウント）。開発環境（localhost, *.test, GitHub Pages/Netlify/Vercel等）は無料・無制限でカウント対象外。
  - 上限超過時は配信停止し、地図上にアップグレード促進メッセージが表示される（事前アラート通知機能はなし）。
  出典: https://www.geolonia.com/pricing , https://docs.geolonia.com/tutorial/002 , https://www.geolonia.com/products/faq

- **商用利用**: 可能。「正規化済みの住所データ、座標ともに、自由に（商用であっても）保存が可能」と明記。
  出典: https://www.geolonia.com/products/faq

- **第三者サイトへの埋め込み（iframe）**: 登録済みAPIキーでは制限の明記なし。ドキュメント上、サンプルキー`YOUR-API-KEY`のみ「iFrame内での利用を禁止」と明記されており、逆に言えば正規登録キーはiframe埋め込みが前提として許容されると読める。
  出典: https://docs.geolonia.com/tutorial/002

- **印刷利用**: トップページで「自由なライセンスで印刷も可能」と明言。Google Mapsのような部数制限等の記載は確認できなかった。
  出典: https://www.geolonia.com

- **クレジット/帰属表記の義務**: 利用規約（全13条、https://www.geolonia.com/terms ）には帰属表記義務に関する明文規定は確認できなかった。ただし公式GitHub組織に`mbgl-geolonia-control`（地図上にGeoloniaの商標を表示するコントロール）というOSSリポジトリが存在し、実運用上何らかのクレジット表示が推奨・組み込まれている可能性がある。**明確な義務条文は本調査では未確認のため、契約前に問い合わせフォームで確認することを推奨。**
  出典: https://www.geolonia.com/terms , https://handbook.geolonia.com/プロダクト/geolonia-portfolio.html

---

## 3. 地図embed実現方式の比較（iframe + ドメインallowlist）

### 3-1. 実装パターン3方式の比較

| 方式 | 仕組み | なりすまし耐性 | 実装コスト | 留意点 |
|---|---|---|---|---|
| (a) Referer/Origin検証 | サーバー側でリクエストのReferer/Originヘッダーを許可ドメインと照合 | 低い（ヘッダーは容易に偽装可能。curl等では自由に設定できる） | 低い | `Referrer-Policy: no-referrer`等のブラウザ設定・拡張機能でヘッダーが送信されないケースがあり単独では不十分。web.devも「決済フロー等でも基本チェックにしかならない」と明言 |
| (b) CSP `frame-ancestors` | 埋め込まれる側がHTTPレスポンスヘッダーで許可オリジンを指定するクリックジャッキング対策の標準機構 | 高い（ブラウザ強制） | 中 | 旧`X-Frame-Options`と異なり複数オリジン指定可。両方存在する場合CSP対応ブラウザは`frame-ancestors`を優先。`<meta>`タグでは機能せずHTTPヘッダー必須。**ユーザーが動的にドメインを追加登録するUGCサービスでは、登録の都度サーバー側でヘッダーを動的生成する設計が必要** |
| (c) 署名付きembedトークン（JWT等） | サーバーが埋め込みごとに有効期限・対象コンテンツID等を含む署名付きトークンを発行し、埋め込み側がURL等で検証させる | 最も高い | 高い（署名鍵管理・失効/再発行フロー） | Lightdash/Mode/Sigma等のBI埋め込みで採用。「誰が見る権利があるか」を制御する別レイヤーであり、ドメイン制限の代替ではなくfrmae-ancestorsと併用されることが多い |

出典: https://web.dev/articles/referrer-best-practices , https://security.stackexchange.com/questions/66165/ , https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors , https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html , https://inventivehq.com/blog/x-frame-options-vs-csp-frame-ancestors , https://docs.lightdash.com/references/iframe-embedding , https://mode.com/help/articles/white-label-embeds , https://help.sigmacomputing.com/docs/create-an-embed-api-with-json-web-tokens , https://community.nginx.org/t/restrict-access-to-iframe-only-using-jwt-or-alternative-options/5436

**推奨方針**: Referer検証は単独では不十分（補助・分析用途に留める）。frame-ancestorsは動的allowlist（DBルックアップでヘッダーを都度生成）と組み合わせれば費用対効果が高く、実務的な主軸として妥当。署名トークンは公開範囲をさらに厳密制御したい場合の追加レイヤーとして検討。

### 3-2. 既存サービスのembed事例

いずれの主要サービスも**iframe自体へのドメインallowlistは実装しておらず**、公開範囲制御はマップ側の共有権限（リンクを知っている人のみ等）で行う設計が主流。

- **Google Maps Embed API / Google My Maps**: ドメイン制限機構なし、誰でもiframe化可能なオープン方式。APIキー利用時はGoogle Cloud Console側でHTTPリファラー制限をAPIキー単位で設定可能だが、これは公開iframeそのものを止める仕組みではない。埋め込みタグには`referrerpolicy="strict-origin-when-cross-origin"`が付与される。
  出典: https://developers.google.com/maps/documentation/embed/embedding-map
- **uMap**: 「Share and Download」パネルからiframeコードを生成、ドメイン制限なしのオープン方式。
  出典: https://uqlibrary.github.io/technology-training/uMap/umap_intro.html
- **Felt**: `File > Embed`からiframeコード生成。ロゴ・カラーバー・UI要素（凡例、検索、計測ツール等）の表示/非表示はカスタマイズ可能だが、埋め込み先ドメインを技術的に制限する記載は確認できず、アクセス権限＝マップの公開/限定共有設定側で制御する思想。
  出典: https://help.felt.com/sharing-and-collaboration/embedding

---

## 4. 類似サービスの機能比較

| 観点 | Google My Maps | uMap | Felt |
|---|---|---|---|
| 複数地図の重ね合わせ・マージ | 公式の「複数マップ結合」機能は**なし**。KMLエクスポート→他マップへの再インポートという手動回避策のみ（レイヤー数上限10の制約あり） | 複数のオーバーレイタイルレイヤーを1マップに追加可能。データレイヤー単位でリモートURLの取り込みにも対応 | レイヤーの重ね合わせ・空間結合（Join機能）・重複フィーチャ検査など、複数データソースを1マップ上で分析的に統合する機能が充実 |
| 共同編集 | 基本的に単一オーナー編集（アカウント共有はあるがリアルタイム協働機能は限定的） | 「Everyone can edit」設定でオープン編集可能。**2024年以降リアルタイム共同編集（同時編集の変更ストリーミング、競合マージ、オフライン編集対応）を開発・実装**（changelog: "add collaborative real-time map editing"） | リアルタイム共同編集がコア機能。カーソルのプレゼンス表示、招待した人が同時に描画・注釈・編集可能（Google Docsライクなモデル） |
| 埋め込み(embed) | iframeコード自動生成、サイズ調整可、APIキー不要 | Share/Downloadパネルからiframeコード生成、埋め込みオプションあり | `File > Embed`からiframe生成。ロゴ・カラー・UI要素の表示/非表示をカスタマイズ可能で3サービス中カスタマイズ性が最も高い |

出典: https://gis.stackexchange.com/questions/241395/how-do-i-combine-layers-in-google-maps , https://support.google.com/earth/thread/233736834/merging-multiple-google-my-maps , https://docs.umap-project.org/en/master/changelog , https://blog.notmyidea.org/adding-real-time-collaboration-to-umap-first-week.html , https://help.felt.com/sharing-and-collaboration/embedding , https://atlas.co/blog/atlas-vs-felt , https://help.felt.com/layers/spatial-analysis

**示唆**: 「複数地図の重ね合わせ・マージ」を主機能に据える本構想は、Google My Maps（機能なし）・uMap（タイル/データレイヤー単位で限定的）に対して差別化余地がある。Feltは分析的なレイヤー統合が強いが個人GISツール寄りで、一般ユーザー向けUGC主題図共有という立ち位置は本構想と異なる。共同編集は必須要件でなければ初期スコープ外にして良い（uMap/Feltのリアルタイム共同編集は実装コストが高い）。

---

## 5. AWS+Cloudflare 低コストアーキテクチャ選択肢

想定ワークロード: 月間地図閲覧 約1万PV（読み取り中心）、地図作成・編集は月数百件程度（軽量書き込み）、目標月額コスト 数千円（概ね$20〜40）。

### 案1: AWSフルサーバーレス構成

- **構成**: S3（GeoJSON・アイコン画像原本）+ CloudFront（CDN配信）+ API Gateway（HTTP API）+ Lambda（地図CRUD）+ DynamoDB（on-demand、メタデータ）+ Route 53
- **適合性**: 読み取り中心のGeoJSON配信はS3+CloudFrontの「キャッシュ可能な静的コンテンツ配信」に最適。書き込みはLambda+DynamoDB on-demandでアイドル時ゼロ課金となり、月数百件の低頻度書き込みに対して過剰投資にならない。
- **コスト試算**: CloudFront（常時無料枠1TB転送・1000万リクエスト/月内）$0、Lambda（無料枠100万リクエスト＋40万GB秒/月内）$0、API Gateway（無料枠100万コール/月内）$0、DynamoDB（無料枠内）$0、S3ストレージ数GB分（$0.023/GB/月）数十セント、Route 53ホストゾーン $0.50/月。**合計目安: 約$1〜3/月**。トラフィックが10倍になっても大半が無料枠内に収まり成長耐性も高い。
  出典: https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/ , https://repost.aws/knowledge-center/lambda-reduce-costs , https://docs.aws.amazon.com/lambda/latest/dg/furls-http-invoke-decision.html , https://aws.amazon.com/dynamodb/faqs/ , https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html , https://docs.aws.amazon.com/hands-on/latest/host-static-website/host-static-website.html

### 案2: フルCloudflare構成

- **構成**: Cloudflare Pages（静的フロント、無料・帯域無制限）+ Workers（地図CRUD API、embedトークン検証）+ R2（GeoJSON・画像、S3互換）+ D1（SQLite互換サーバーレスDB）
- **適合性**: R2は**egress（データ転送）が常に無料**なため地図閲覧＝読み出し中心のワークロードで構造的に有利。D1も読み取り無料枠が非常に大きい（Workers Paidプランで月250億行読み取りまで無料、書き込みも月5,000万行まで無料）ため数百件規模の書き込みは楽々収まる。
- **コスト試算**: Workers Paid $5/月（1000万リクエスト＋3000万CPU-ms込み、Freeプランでも10万リクエスト/日まで無料）、R2（無料枠10GBストレージ・Class A100万/Class B1000万操作/月内）$0、D1（無料枠内）$0、Pages無料。**合計目安: $0〜5/月**。3案中最安だが「AWS+Cloudflare中心」という要件からはCloudflare比重が大きくなり、AWS側の運用ノウハウ・IAM統制・他AWSリソースとの連携がしづらい点はトレードオフ。**D1の「行読み取り数」課金はインデックス未設計のクエリで実測が跳ねる事故報告あり**（1テーブル76.5万行でも月1.27億行超読み取りが発生し$134請求になった例）ため、クエリ・インデックス設計に注意が必要。
  出典: https://developers.cloudflare.com/workers/platform/pricing , https://developers.cloudflare.com/r2/pricing , https://developers.cloudflare.com/d1/platform/pricing , https://fullstacksveltekit.com/blog/cloudflare-d1-bill

### 案3: ハイブリッド構成（AWS=データ永続層／Cloudflare=エッジ・embed制御層）

- **構成**: S3（原本）+ DynamoDB（メタデータ・embed許可ドメイン一覧）+ API Gateway/Lambda（CRUD）をAWS側の正本とし、Cloudflare（DNSプロキシ・WAF・CDNキャッシュ、必要に応じWorkersでReferer/Origin検証・署名付きembedトークン検証・frame-ancestors付与）をエッジに配置。
- **適合性**: 第三者サイトへのiframe埋め込み要件（観点3の議論）に対し、ドメインallowlist検証やレート制限をオリジン（Lambda）に到達させずCloudflareエッジで捌けるため、不正埋め込み・過剰アクセスからのオリジン保護とレイテンシ低減を両立できる。データ正本はAWS側にあるため、AWSでの運用・バックアップ・IAM統制の知見をそのまま活かせる。
- **コスト試算**: AWS側は案1とほぼ同一で$1〜3/月、Cloudflareプロキシ（DNS/WAF/CDNキャッシュのみ、Workers不使用）はFreeプランで$0、embed制御をWorkersで実装する場合はWorkers Paid $5/月〜が加算。**合計目安: $2〜10/月**。
  出典: 案1・案2と同一ソースセット（上記参照）

### まとめ・示唆

3案とも目標月額（数千円=$20〜40）を大きく下回り、初期フェーズは無料枠中心で運用可能。「AWSの運用知見を活かしつつembed制御をエッジで強化したい」なら**案3**、「最小コスト・最小運用負荷を最優先」なら**案2**、「AWS単独でシンプルに始めたい」なら**案1**が妥当。トラフィック増加時のボトルネックは案1/3ではCloudFront/S3リクエスト課金、案2ではD1のrows-read課金（インデックス設計依存）である点に留意。

---

## 参照ソース一覧

### Geolonia Maps（技術仕様・料金・規約）
- https://docs.geolonia.com/embed-api/javascript — JavaScript API仕様、MapLibre GL JS互換性
- https://docs.geolonia.com/tutorial/002 — APIキー取得・ドメイン制限・開発環境無料枠
- https://docs.geolonia.com/geojson — GeoJSON/Simplestyle仕様
- https://docs.geolonia.com/geojson/marker-symbol — プリセットマーカーアイコン一覧
- https://docs.geolonia.com/cookbook/highlight_prefectures — addLayer実装例
- https://www.geolonia.com/pricing — 料金プラン・従量課金表
- https://www.geolonia.com/terms — 利用規約全文
- https://www.geolonia.com/products/faq — 料金・カウント方式・商用利用等FAQ
- https://www.geolonia.com/maps-dev — マーカーカスタマイズ（ロゴ表示）等コードサンプル紹介
- https://www.geolonia.com — トップページ（商用/印刷利用に関する記述）
- https://handbook.geolonia.com/プロダクト/geolonia-portfolio.html — 関連OSSツール一覧（mbgl-geolonia-control等）

### embed実装パターン・セキュリティ標準
- https://web.dev/articles/referrer-best-practices
- https://security.stackexchange.com/questions/66165/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- https://inventivehq.com/blog/x-frame-options-vs-csp-frame-ancestors
- https://medium.com/@shaialon/csp-frame-ancestors-vs-x-frame-options-for-clickjacking-prevention-30383a713772
- https://docs.lightdash.com/references/iframe-embedding
- https://mode.com/help/articles/white-label-embeds
- https://help.sigmacomputing.com/docs/create-an-embed-api-with-json-web-tokens
- https://community.nginx.org/t/restrict-access-to-iframe-only-using-jwt-or-alternative-options/5436
- https://developers.google.com/maps/documentation/embed/embedding-map

### 類似サービス比較
- https://uqlibrary.github.io/technology-training/uMap/umap_intro.html
- https://help.felt.com/sharing-and-collaboration/embedding
- https://help.felt.com/layers/spatial-analysis
- https://atlas.co/blog/atlas-vs-felt
- https://gis.stackexchange.com/questions/241395/how-do-i-combine-layers-in-google-maps
- https://support.google.com/earth/thread/233736834/merging-multiple-google-my-maps
- https://docs.umap-project.org/en/master/changelog
- https://blog.notmyidea.org/adding-real-time-collaboration-to-umap-first-week.html

### AWS + Cloudflare アーキテクチャ・料金
- https://aws.amazon.com/cloudfront/faqs/
- https://aws.amazon.com/cloudfront/pricing/
- https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html
- https://aws.amazon.com/pm/cloudfront/
- https://docs.aws.amazon.com/lambda/latest/dg/furls-http-invoke-decision.html
- https://aws.amazon.com/dynamodb/pricing/
- https://repost.aws/knowledge-center/lambda-reduce-costs
- https://aws.amazon.com/dynamodb/faqs/
- https://aws.amazon.com/amplify/faqs/
- https://aws.amazon.com/amplify/pricing/
- https://docs.aws.amazon.com/amplify/latest/userguide/custom-build-instance.html
- https://docs.aws.amazon.com/hands-on/latest/host-static-website/host-static-website.html
- https://docs.aws.amazon.com/amplify/latest/userguide/deploy-website-from-s3.html
- https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html
- https://aws.amazon.com/apprunner/pricing/
- https://docs.aws.amazon.com/apprunner/latest/dg/architecture.html
- https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html
- https://developers.cloudflare.com/workers/platform/pricing
- https://developers.cloudflare.com/r2/pricing
- https://developers.cloudflare.com/d1/platform/pricing
- https://developers.cloudflare.com/d1/observability/metrics-analytics
- https://fullstacksveltekit.com/blog/cloudflare-d1-bill
- https://mecanik.dev/en/posts/cloudflare-r2-pricing-explained-real-costs-vs-s3-and-backblaze
- https://egresscost.com/cloudflare

---

## 未確認・要追加調査事項

- Geolonia Mapsのカスタムマーカー画像表示の具体実装コード（HTML Marker方式かSymbolレイヤー+addImage方式か）は公式サンプル本文まで到達できておらず未確定。実装フェーズでCodePenサンプルの実コードを確認する必要あり。
- Geoloniaのクレジット/帰属表記義務の有無は利用規約条文からは確認できず。契約前に問い合わせフォームでの確認を推奨。

---

# 追加調査（技術設計フェーズ・2026-08-11）

前回調査の続き。技術設計書作成のため、(1) MapLibre GL JSカスタムマーカー実装方式、(2) 日本の住所ジオコーディング無償選択肢、(3) embed用動的CSP frame-ancestorsの実装位置、(4) Amazon Cognito User Poolの料金・適合性、の4点を調査した。

---

## 6. MapLibre GL JSのカスタムマーカー画像 実装方式比較

### 6-1. HTML要素ベースMarker vs Symbolレイヤー+addImage

| 観点 | (a) `new maplibregl.Marker()` + `<img>` | (b) `map.loadImage()`/`addImage()` + Symbolレイヤー |
|---|---|---|
| 仕組み | 地図の上にDOM要素（`<img>`等）を絶対配置し、地図の移動・ズームに追従させてJS側で座標変換 | 画像をWebGLスタイルのスプライトとして登録し、GeoJSONソース上の各Featureを`icon-image`でラスタ描画 |
| パフォーマンス（数百件） | 実用上問題ないとされるが、MapboxGL公式ドキュメントは「数百のMarkerを追加するとブラウザが重くなる/応答しなくなることがある」と明記 | 数百件では余裕。WebGL canvas上の描画のためDOM要素数が増えない |
| パフォーマンス（数千件） | 非推奨。MapLibre GL JS公式GitHub Discussionでメンテナが「Markerは結局DOM要素であり、追加できる数には限界がある」「Symbolレイヤーは桁違いに多くの要素を扱える」と明言 | 数千〜数万件でも実用的。ビューポート外のクリップ・collision detectionもWebGL側で処理される |
| クリック/ポップアップ対応 | `marker.setPopup(new Popup()...)`で1行、`dragstart`/`drag`/`dragend`イベントも標準サポートしドラッグ&ドロップも容易 | `map.on('click', 'layer-id', handler)`でレイヤー単位のクリックイベントを購読し、`queryRenderedFeatures`等でFeatureを特定してPopupを手動生成する必要があり実装コード量が増える |
| 実装の簡単さ | 圧倒的に簡単（画像URLを`className`や`style.backgroundImage`に設定するだけ）。任意のHTML/CSSでバッジ等の装飾も自由 | 各画像に一意のIDを付与して`hasImage()`チェック後`addImage()`する前処理が必要。アイコンサイズはすべて`icon-size`で統一的に扱う必要がありCSS装飾は不可 |
| 対応画像形式 | ブラウザが表示できる形式なら何でも可（SVGも可） | `map.loadImage()`は**PNG/JPEG/WebPのみ対応、SVGは非対応**（MapLibre/Mapbox公式ドキュメントに明記） |
| 推奨用途 | 選択中のスポット、ドラッグ編集中のピン、少数の強調表示など | 地図の主要な大量スポット表示 |

出典: https://docs.mapbox.com/help/dive-deeper/markers-vs-layers , https://github.com/maplibre/maplibre-gl-js/discussions/5207 , https://github.com/maplibre/maplibre-gl-js/discussions/6494 , https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker , https://maplibre.org/maplibre-gl-js/docs/API/classes/Map , https://docs.mapbox.com/mapbox-gl-js/example/add-image , https://dev.to/geoapify-maps-api/maplibre-gl-markers-custom-icons-popups-events-with-geoapify-gm8

**本構想（数百〜数千件のスポット）への示唆**: 公開・埋め込み用の閲覧画面は将来数千件まで想定しうるため**Symbolレイヤー+addImage方式を主軸に採用**すべき。一方、地図編集画面（ユーザーがピンを1件ずつ配置・ドラッグ調整する場面）では対象が同時に数件〜数十件程度に限られ、`setDraggable(true)`や`setPopup()`が1行で書けるHTML Marker方式の開発生産性が勝る。**「閲覧・埋め込み時はSymbolレイヤー、編集UIではMarker」のハイブリッド運用**が両立点として妥当。なお任意画像アップロード対応であれば、アップロード時にサーバー側でPNG/WebPへ変換・リサイズしておくとSymbolレイヤー側の`loadImage`制約（PNG/JPEG/WebPのみ）にもそのまま適合できる。

### 6-2. Geolonia JS APIでの互換性

前回調査（本ファイル冒頭）で確認済みの「`geolonia.Map`は`maplibregl.Map`のラッパークラスであり非互換点はAPIキー受け渡しとタイルスキーマの2点のみ」という結論のとおり、`map.loadImage()` / `map.addImage()` / `map.addLayer({type: 'symbol', ...})` / `new geolonia.Marker()` はいずれもMapLibre GL JSと同一シグネチャでそのまま利用可能と判断できる（Geolonia公式サンプルページ自体が「マーカーをカスタマイズして会社のロゴを表示することもできます」とCodePenサンプルを案内しており、独自画像マーカー表示が製品として想定されていることも傍証となる）。CodePenサンプルのソースコード本文は今回も直接取得できなかったため、**実装着手時に実際のサンプルコードでMarker/Symbol両方式のどちらが使われているか最終確認することを推奨**（未確認事項として維持）。

出典: https://www.geolonia.com/maps-dev , https://docs.geolonia.com/embed-api/javascript

---

## 7. 日本の住所・地名ジオコーディング 無償選択肢比較

### 7-1. 選択肢比較表

| 項目 | Geolonia Community Geocoder | 国土地理院 住所検索API（msearch.gsi.go.jp） | Geolonia 住所データ（japanese-addresses） |
|---|---|---|---|
| 提供形態 | GitHub Pages上に静的ファイルでホストされたジオコーディングAPI。`<script src="...">`で読み込み`getLatLng(address, callback)`をコールするJSONP的なJS API方式（fetch()ベースのJSON RESTではない） | `https://msearch.gsi.go.jp/address-search/AddressSearch?q=...` のGET REST API（GeoJSON応答） | 全国町丁目レベル（約27.7万件）の住所一覧データ。API（都道府県→市区町村→町丁目のツリー検索）とCSV/GeoJSON生データの両方を提供。**動的なジオコーディングAPIではなく静的な参照データ**という性質が上記2つと異なる |
| 精度 | 国交省「位置参照情報」の街区・大字町丁目レベルデータを利用。判定レベルは0〜3の4段階で**最大でも「3=町丁目まで判別」が上限**。番地・号レベルの個別ジオコーディングではなく、町丁目の代表点座標を返す（実利用者から「位置が若干ずれる」との報告あり） | 実データ比較（zenn.dev記事）では住所によって**街区・号レベルまで解決するケースが多い**（例:「栃木県宇都宮市旭一丁目1-5」→「旭一丁目１番５号」の座標を返す）が、住所によっては町丁目・街区止まりのケースもあり網羅性は一定でない | 町丁目の代表点座標のみ（Community Geocoderの内部データソースの一部でもある） |
| 商用利用 | 可。「取得した緯度経度の情報のご利用方法に制限はありません。他社の地図、アプリ、その他ご自由にご利用ください」と明記（MITライセンス） | 可。データ源の国交省「位置参照情報」は`国土数値情報（旧利用約款）`/位置参照情報の利用規約下で「商用利用も可能」と明記。出典表示（「国土地理院」等）が必要 | 同上（CC BY 4.0、要出典表示） |
| レート制限 | 明文の数値制限は確認できず（静的ファイル配信のためサーバー負荷懸念自体が小さい）。ただし本番運用のSLA保証はない一開発チームのOSSプロジェクトである点に留意 | 明文のQPS上限は確認できず。ただし複数のGSI API利用規約に共通して「サーバに過度の負荷を与えないでください」という努力義務規定があり、大量バッチ処理には不向き | 静的ファイル配信のためレート制限の懸念は最小 |
| フロントエンドから直接呼べるか | **可能（公式の想定用途）**。ただし方式は`<script>`タグでJSファイルを読み込みグローバル関数を呼ぶJSONP的パターンであり、fetch/XHRでのJSON取得ではない点に注意 | **可能**。レスポンスヘッダーに`Access-Control-Allow-Origin: *`が付与されておりCORS許可済み。fetch()で直接叩ける | API部分は静的JSONホスティングでCORS的にも直接呼び出し可能（詳細な明記は未確認、GitHub Pages系の類似構成のため実質問題なし） |
| 運用主体・可用性リスク | Geolonia社のOSSプロジェクト（GitHub Pages配信）。同社の商用APIとは別建てで、SLA無し | 国交省国土地理院（政府機関）。無償の公共サービスとして継続運用されているが「予告なく提供停止する場合がある」旨の免責あり | Geolonia社のOSSデータ（GitHub配信） |

出典: https://blog.geolonia.com/2020/06/01/community-geocoder.html , https://github.com/geolonia/community-geocoder , https://note.com/dngri/n/n21b2d78f2f5a , https://anko.education/archives/354 , https://zenn.dev/rescuenow/articles/7386e8b17a16c5 , https://memo.appri.me/programming/gsi-geocoding-api , https://analyzegear.co.jp/blog/2872 , https://nlftp.mlit.go.jp/ksj/other/agreement_05.html , https://geolonia.github.io/japanese-addresses , https://maps.gsi.go.jp/help/termsofuse.html , https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html

### 7-2. 推奨方針

本構想は「ユーザーが主題図にピンを立てる」用途であり、住所入力→座標変換の精度要求は決済・配送用途ほど厳密ではないため、**無償枠のみで完結する構成として妥当**。具体的には：

- **一次選択**: 国土地理院 住所検索API（`msearch.gsi.go.jp/address-search/AddressSearch`）。CORS許可済みでフロントエンドから直接fetch可能、街区・号レベルまで解決するケースが多く精度面で優位、政府機関運用のため継続性リスクが最も低い。出典表示（｢国土地理院｣）をフッター等に明記すれば商用利用も問題ない。
- **フォールバック/補完**: Geolonia Community Geocoderは、GSI APIが該当住所を解決できなかった場合の代替、または「町丁目名だけで大まかにピンを打ちたい」といった簡易ユースケースの補完として併用可能。ただしJSONP方式のスクリプト読み込みが必要な点、精度が町丁目止まりである点は実装・UX上の制約として認識しておく。
- Geolonia社の有償サービス「クイック住所変換」（番地・号レベル正規化＋座標付与、約98%精度）は今回の無償要件からは対象外だが、将来的に精度向上が必要になった際の有力な有償選択肢として記録しておく。

出典: 上記7-1と同一（https://www.geolonia.com/archives/5048 も参照＝クイック住所変換の精度98%の根拠）

---

## 8. embed用の動的CSP frame-ancestorsヘッダー生成 実装位置比較

### 8-1. 4方式比較表（月間数千リクエスト規模のembed配信を想定）

| 方式 | 仕組み | 実装の複雑さ | 追加コスト目安 | レイテンシ | 本構想への適合性 |
|---|---|---|---|---|---|
| (a) API Gateway + Lambda が embed用HTMLをヘッダー付きで直接返す | 通常のLambda（Node/TS, Hono等）内でDynamoDBから許可ドメインを引き、`Content-Security-Policy: frame-ancestors ...`ヘッダーを含むHTMLレスポンスをLambdaプロキシ統合でそのまま返す | **最小**。既存のCRUD用Lambda/DynamoDBスタックにルートを1本足すだけで、特別なAWSサービス知識が不要 | ほぼ$0（無料枠内。月数千回程度ならAPI Gateway/Lambda課金は実質発生しない） | 単一リージョン内で完結（東京リージョンなら日本のユーザーに対し数十ms程度）。ただしCloudFront等のグローバルエッジは経由しないため海外ユーザーには物理的に遠い | **月数千リクエスト規模では最有力**。DynamoDBに直接アクセスできるため許可ドメインの反映が即時。Lambda@Edgeのようなus-east-1縛りや分単位のレプリケーション遅延が発生しない |
| (b) CloudFront + Lambda@Edge | CloudFrontのorigin-request/viewer-requestイベントでLambda@Edgeを起動し、DynamoDB等へのネットワークアクセスを行った上でヘッダーを付与 | **中〜高**。us-east-1でのデプロイ必須、変更反映に数分のレプリケーション遅延、CloudWatch Logsもリージョンごとに分散し運用が煩雑 | リクエスト課金$0.60/100万件 + GB秒課金$0.00005001/GB秒（無料枠なし）。月数千件なら実質$0.01未満だが、CloudFrontディストリビューション自体の運用コストが別途乗る | エッジロケーション経由で世界的に低レイテンシだが、origin-requestはキャッシュミス時のみ発火するため動的コンテンツ（embed HTML）では実質毎回発火し利点が薄い | 低トラフィックでは複雑さに見合わない。将来グローバル配信・大規模化した際の選択肢 |
| (c) CloudFront Functions + KeyValueStore(KVS) | CloudFrontのviewer-request/viewer-responseイベントで軽量JSを実行し、CloudFront KVSから許可ドメインリストを読み取ってヘッダーを書き換える | **中**。CloudFront Functionsは**ネットワークアクセス不可**（DynamoDBに直接クエリできない）ため、DynamoDBの内容をKVSへ同期する別パイプライン（DynamoDB Streams→Lambda→KVS更新等）が別途必要になり、実質的に構成要素が増える | 呼び出し$0.10/100万回（無料枠200万回/月あり、月数千件なら実質$0）+ KVS読み取り$0.03/100万回・その他API操作$1/1000回。KVS同期用Lambdaの分だけ運用コストが追加 | サブミリ秒実行、ミリオン req/秒までスケール。エッジで完結するため理論上最速 | 低トラフィックでは「KVS同期パイプライン」を作るコストが割に合わない。数百万PV規模のSaaSマルチテナントルーティング等、大規模時に真価を発揮する構成 |
| (d) Cloudflare Workers | CloudflareのWorkerでリクエストを受け、KV等から許可ドメインを引いてヘッダーを付与したレスポンスを返す | **中**。AWSスタックとは別にCloudflareアカウント・Workers・DNS切り替えの追加運用が必要 | Freeプランで1日10万リクエストまで無料（月数千件なら無料枠内）。Paidプランでも$5/月〜 | Cloudflareのグローバルエッジ経由で低レイテンシ | 「AWS+Cloudflare中心」という前提（本ファイル冒頭）とは整合するが、embed配信のためだけに新規ベンダーを追加する投資対効果は低トラフィック時には薄い |

出典: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html , https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/helper-functions-origin-modification.html , https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-function-restrictions.html , https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/ , https://www.stormit.cloud/blog/cloudfront-functions-vs-lambda-at-edge , https://aws.amazon.com/blogs/networking-and-content-delivery/leveraging-external-data-in-lambdaedge , https://github.com/aws-samples/sample-simple-dynamic-origin-routing-using-amazon-cloudfront-functions , https://developers.cloudflare.com/workers/platform/pricing , https://www.srvrlss.io/provider/cloudflare , https://answers.netlify.com/t/how-to-set-dynamic-header-for-content-security-policy-frame-ancestors/49343

**推奨方針**: 月額$0〜10・月数千リクエストという本構想の規模では、**(a) API Gateway + Lambda が embed用HTMLを直接返す方式が最も費用対効果が高い**。DynamoDBの許可ドメインリストをLambda内で直接参照でき、追加のデータ同期パイプラインや別リージョン・別ベンダーの運用負荷が発生しない。CloudFront自体は静的アセット（SPA本体・GeoJSON・アイコン画像）配信用には引き続き有用だが、embed HTMLのCSPヘッダーだけを目的にLambda@EdgeやCloudFront Functions+KVSを導入するのは規模に対して過剰投資となる。将来的にembedのトラフィックが大規模化しグローバル配信の低レイテンシが必要になった時点で(b)または(c)への移行を検討すればよい。

### 8-2. サブリソースへのCSP適用要否の確認

MDN公式ドキュメントの定義上、`frame-ancestors`ディレクティブは「`<frame>`, `<iframe>`, `<object>`, `<embed>`を使ってページを埋め込むことを許可する親を指定する」ものであり、**embedされる文書自身（iframeのsrcが指すトップレベルHTML）のレスポンスヘッダーに対してのみ評価される**。またこのディレクティブは`<meta>`タグでは機能しない（HTTPレスポンスヘッダー必須）ことも明記されている。iframe内のHTMLが読み込むJS・タイル画像・GeoJSON等のサブリソースは、そのサブリソース自体が別途`<iframe>`等で埋め込まれるのでない限り`frame-ancestors`評価の対象にはならない。**したがって「親HTML（embed用HTMLドキュメントのレスポンス）にのみ動的CSPヘッダーを付与すればよく、JS/タイル等の個々のサブリソースには不要」という前提は正しい**。

出典: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors

---

## 9. Amazon Cognito User Pool（メール+パスワード + Googleフェデレーション） 料金・適合性

### 9-1. 現行料金体系（2026年8月時点）

2024年11月22日にCognitoの料金体系がLite/Essentials/Plusの3ティア制へ再編されており、**新規作成するユーザープールはこの新体系が適用される**（2024年11月22日より前に作成された既存プールは旧50,000MAU無料枠を維持できるが、本構想は新規プロジェクトのため以下が適用条件）。

| 項目 | 内容 |
|---|---|
| 無料枠 | 直接サインイン/ソーシャルログイン合算で**月10,000 MAU**（Lite/Essentialsティア共通、期限なし恒久無料枠）。SAML/OIDCフェデレーションは別枠で月50 MAUまで無料 |
| Essentialsティア単価（無料枠超過分） | $0.015/MAU（フラットレート） |
| Liteティア単価（無料枠超過分） | 階層型で$0.0055〜$0.0025/MAU（MAU数に応じ逓減）。Essentialsの60〜73%程度安いが後述の機能制限あり |
| Plusティア | 無料枠なし。$0.020/MAU〜。高度な脅威検知(旧ASF)向け |
| Essentials/Liteの機能差 | **Essentials**はLiteの全機能に加え、Managed Login（ホストUI刷新版）、パスキー/メール/SMSによるパスワードレスログイン、アクセストークンのカスタマイズ、パスワード再利用禁止などをサポート。**Lite**は基本的なパスワード認証・ソーシャル/SAML/OIDCログイン・従来型Hosted UI・MFA（TOTP/SMS）のみで、パスワードレスログインは非対応 |
| 新規プールのデフォルト | Essentialsティアがデフォルト。コスト最適化のためLiteへの切り替えは手動対応が必要 |

出典: https://aws.amazon.com/cognito/pricing , https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html , https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html , https://logto.io/compare/aws-cognito , https://costgoat.com/pricing/amazon-cognito

**本構想への示唆**: 月間MAUが数千〜1万人規模に収まる限りEssentials/Liteどちらでも実質無料（無料枠内）。「メール+パスワード + Googleフェデレーション」という要件はEssentials/Lite双方でカバーされる基本機能のため、パスワードレスログイン等の高度機能を使わないなら**Liteティアを明示的に選択した方が超過時のコストが最大73%安く済み合理的**（デフォルトのEssentialsのまま放置すると無駄にコストが高くなる点に注意）。

### 9-2. メール送信の制約

Cognitoの既定のメール送信機能（`EmailSendingAccount: COGNITO_DEFAULT`）には**アカウント全体で1日あたり50通という固定上限**があり、この制限は変更不可（コンソール等からの引き上げ申請不可）とAWS公式ドキュメントに明記されている（UTC 9:00にリセット）。50通/日を超える運用（サインアップ確認メール・パスワードリセット等を合算）が見込まれる場合は、**Amazon SESと連携する`EmailSendingAccount: DEVELOPER`構成が事実上必須**。SES連携時はSES側の送信クォータ（本番アクセス許可後は既定50,000通/日）が適用される。ただしSESを新規に使う場合はサンドボックスモード（検証済みアドレスにしか送れない）から本番アクセス申請が必要な点に留意（申請自体は無償・通常数時間〜1営業日程度で承認）。

出典: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_EmailConfigurationType.html , https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html , https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html , https://aws.amazon.com/blogs/messaging-and-targeting/all-about-ses-daily-quota , https://oneuptime.com/blog/post/2026-02-12-email-phone-verification-cognito/view

### 9-3. Hono(Lambda) + React SPAとの標準構成

Cognito User Pool + Hosted UI（Managed Login）を使い、**Authorization Code Grant + PKCE**フローで認可コードを取得しトークン交換するのが標準パターン。API Gateway（HTTP API）側は**JWT Authorizer**をネイティブサポートしており、REST APIと異なり別途Lambda Authorizer関数を書く必要がない（HTTP APIはJWTの署名検証・aud/iss検証をAPI Gateway自身が行う）。Hono側のLambdaハンドラは認可済みリクエストのみを受け取る形になり、Honoアプリ内で認可ロジックを重複実装する必要がない。

出典: https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html , https://github.com/aws-samples/rest-api-gateway-jwt-cognito , https://sanderknape.com/2020/08/amazon-cognito-jwts-authenticate-amazon-http-api , https://repost.aws/questions/QUA6VpTZZEQ2a58IWaPWqerA/api-gateway-http-api-with-jwt-authorizer-for-cognito-m2m-access-token

### 9-4. 代替（Auth.js等の自前実装）との運用リスク比較

| 観点 | Cognito（マネージド） | Auth.js/NextAuth等の自前実装 |
|---|---|---|
| 初期実装コスト | 低（コンソール/IaCで数十分〜数時間） | 高。業界目安として本番品質の認証実装に**40〜80時間以上**の開発工数が必要との指摘あり |
| MFA・パスキー・不正検知等の高度機能 | Essentials/Plusティアに標準搭載、追加実装不要 | 自前実装または追加ライブラリが必要。ボット対策・侵害検知などは標準では非搭載 |
| セッション/トークンストレージの運用 | Cognito側が管理、DBインフラ不要 | セッション用DBのホスティング・バックアップ・スケーリングを自前運用する必要 |
| 継続的なセキュリティメンテナンス | AWS側が脆弱性対応・アップデートを担う | フレームワークのメジャーバージョンアップ（例: NextAuth v4→v5の破壊的変更）への追従、脆弱性パッチ適用を継続的に自チームで負う必要 |
| ランニングコスト | 月1万MAU程度までは無料枠内で$0 | インフラ費用は別サービス（DB等）次第だが、小規模なら同程度に低コストも可能 |
| 本構想（個人開発・小規模SaaS、月額$0〜10目標）への適合性 | 運用工数を最小化でき、無料枠内に収まる可能性が高いため**妥当性が高い** | 学習目的や特殊なカスタム要件がない限り、小規模個人開発では認証まわりの独自運用リスク（セキュリティ・保守）を負うメリットが薄い |

出典: https://clerk.com/articles/user-authentication-for-nextjs-top-tools-and-recommendations-for-2025 , https://workos.com/blog/top-authentication-solutions-nextjs-2026 , https://fusionauth.io/blog/when-to-self-host , https://www.authgear.com/post/top-open-source-amazon-cognito-alternatives-in-2026-secure-self-hosted-options

**総合的な推奨**: 本構想の規模（月額$0〜10目標、想定MAUは数千〜1万人規模）であれば**Cognito User Pool（Liteティア明示指定）+ Hosted UI + Google Identity Provider連携 + API Gateway HTTP API JWT Authorizerの標準構成が最も運用リスクが低い**。ただし、サインアップ確認メール等の送信量が1日50通を超える可能性があるなら早期にSES本番アクセスを申請しておく（申請自体は無料で数時間〜1営業日）ことを設計に織り込むべき。

---

## 参照ソース一覧（追加調査分）

### MapLibre GL JS カスタムマーカー
- https://docs.mapbox.com/help/dive-deeper/markers-vs-layers
- https://github.com/maplibre/maplibre-gl-js/discussions/5207
- https://github.com/maplibre/maplibre-gl-js/discussions/6494
- https://maplibre.org/maplibre-gl-js/docs/API/classes/Marker
- https://maplibre.org/maplibre-gl-js/docs/API/classes/Map
- https://docs.mapbox.com/mapbox-gl-js/example/add-image
- https://dev.to/geoapify-maps-api/maplibre-gl-markers-custom-icons-popups-events-with-geoapify-gm8
- https://www.geolonia.com/maps-dev
- https://docs.geolonia.com/embed-api/javascript

### 日本の住所ジオコーディング無償選択肢
- https://blog.geolonia.com/2020/06/01/community-geocoder.html
- https://github.com/geolonia/community-geocoder
- https://note.com/dngri/n/n21b2d78f2f5a
- https://anko.education/archives/354
- https://zenn.dev/rescuenow/articles/7386e8b17a16c5
- https://memo.appri.me/programming/gsi-geocoding-api
- https://analyzegear.co.jp/blog/2872
- https://nlftp.mlit.go.jp/ksj/other/agreement_05.html
- https://geolonia.github.io/japanese-addresses
- https://maps.gsi.go.jp/help/termsofuse.html
- https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
- https://www.geolonia.com/archives/5048

### embed用動的CSP frame-ancestors 実装位置
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/helper-functions-origin-modification.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-function-restrictions.html
- https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/
- https://www.stormit.cloud/blog/cloudfront-functions-vs-lambda-at-edge
- https://aws.amazon.com/blogs/networking-and-content-delivery/leveraging-external-data-in-lambdaedge
- https://github.com/aws-samples/sample-simple-dynamic-origin-routing-using-amazon-cloudfront-functions
- https://developers.cloudflare.com/workers/platform/pricing
- https://www.srvrlss.io/provider/cloudflare
- https://answers.netlify.com/t/how-to-set-dynamic-header-for-content-security-policy-frame-ancestors/49343
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors

### Amazon Cognito User Pool 料金・適合性
- https://aws.amazon.com/cognito/pricing
- https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html
- https://logto.io/compare/aws-cognito
- https://costgoat.com/pricing/amazon-cognito
- https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_EmailConfigurationType.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html
- https://aws.amazon.com/blogs/messaging-and-targeting/all-about-ses-daily-quota
- https://oneuptime.com/blog/post/2026-02-12-email-phone-verification-cognito/view
- https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html
- https://github.com/aws-samples/rest-api-gateway-jwt-cognito
- https://sanderknape.com/2020/08/amazon-cognito-jwts-authenticate-amazon-http-api
- https://repost.aws/questions/QUA6VpTZZEQ2a58IWaPWqerA/api-gateway-http-api-with-jwt-authorizer-for-cognito-m2m-access-token
- https://clerk.com/articles/user-authentication-for-nextjs-top-tools-and-recommendations-for-2025
- https://workos.com/blog/top-authentication-solutions-nextjs-2026
- https://fusionauth.io/blog/when-to-self-host
- https://www.authgear.com/post/top-open-source-amazon-cognito-alternatives-in-2026-secure-self-hosted-options

---

## 追加調査分：未確認・要追加調査事項

- Geolonia CodePenサンプル（マーカーカスタマイズ）の実コードは今回も未取得。HTML Marker/Symbolレイヤーいずれの方式かは実装着手時に要確認（既存の未確認事項と重複・継続）。
- Geolonia Community Geocoderの正確なレート制限値・SLAは公式ドキュメントに数値記載がなく、負荷試験等での実測確認が望ましい。
- 国土地理院住所検索APIの精度は住所によりばらつきがあり（街区・号まで解決する場合と町丁目止まりの場合が混在）、本番投入前に実データでのサンプリング検証を推奨。
