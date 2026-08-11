# タスク一覧: OriOriMap（仮称）

- 生成日: 2026-08-11
- 対応設計書: docs/spec/02_design.md（approved: 2026-08-11）
- ステータス: approved（2026-08-11 承認ゲート③通過。実行モードはhost + Remote Control運用）

## サマリー

| 総タスク数 | 並列可能 [P] | フェーズ構成 | 要件カバレッジ |
|---|---|---|---|
| 39 | 17 | Setup 1 / Foundational 11 / スライス 19 / Polish 8 | R1〜R8 全対応（R3.4・R9はP2で対象外） |

## 凡例

- `[P]`: 依存タスク完了後、他の[P]タスクと並列着手可能
- `[serial]`: 共有dev環境の排他的リソース（単一のSAMテンプレート・CD設定等）に触れるため単独実行
- `【人間】`: ユーザー本人の操作が必要なタスク（外部サービスのアカウント・契約・意思決定）
- `依存:`: 先に完了が必要なタスクID
- `_Requirements:_`: 対応する要件ID（docs/spec/01_requirements.md）

## 運用注記: 実行モードと【人間】タスクの扱い（2026-08-11改訂: host/microvm併用前提）

- **実行モードは波（run）ごとに選択する**（project-autopilot Phase 1で毎回確定）:
  - **host**: 在席またはRemote Control接続時。対話が要る波・人間ステップ内包タスク（T031/T032）・IaC対話実行向き。「気づく」= notify.sh（`SLACK_WEBHOOK_URL`設定時）またはPushNotification、「応える」= Remote Control。無人ラン中はMacのスリープを無効化（caffeinate等）
  - **microvm**: 発射後非接続でよい波（アプリスライス群）向き。`tools/proj start oriorimap --tasks docs/spec/03_tasks.md`。**注意**: 進行監視はpull型（`proj status`/`proj report`。汎用のpush通知・Remote Controlは不可）/ 直列実行 / R2 codexクロスレビュー不可（R1+3レンズ縮退が報告に明記される）/ IaCタスクは**mvm-gate Lambda（cfn-guard）が合格ChangeSetを自動執行**し、違反時のみntfyでスマホへpush通知→人間が`proj approve`（mvm-poc Phase 2・2026-08-01実装。VM内エージェントは実行権を恒久に持たない）
  - **デプロイ先AWSアカウント（2026-08-11 確定）**: ローカル profile **`smb-infra`**（同アカウントには同パターンの先行プロジェクト simple-cms が稼働。Google OAuth の SSM パラメータもここ）。`samconfig.toml` の全 config_env に `profile` を明記済み――未指定だと環境の既定プロファイルへ流れる（T002/T003 の dry-run で実際に別アカウントへ向けてしまった。いずれも撤去済み・残置ゼロ確認済み）。design §4.7 参照
  - **microvm の払い出しはアカウント違いのためやり直しが必要（2026-08-11 判明）**: 既存の `mvm-vend-oriorimap`（実行ロール・cfn-guard ゲート）は**別アカウント側**にあり、アプリを `smb-infra` へデプロイする本構成では VM 内エージェントから届かない。Phase C を microvm で回す前に (1) `smb-infra` へ mvm 共通基盤 `infra/vend-base.yaml` を人間レビューの下で1回デプロイ → (2) `tools/proj vend oriorimap` を `smb-infra` でやり直し → (3) 旧払い出しを `tools/proj retire` → (4) Geolonia APIキーの VM への注入経路（SSM）を用意 → (5) Phase C の Done条件を機械検証可能な形へ改訂（現状の「dev環境で〜手動確認」は VM で verify できない）。guardルールのリソース型allowlistへの Cognito 5型+Budgets 追記は再 vend 時に再適用する
  - **effect-plane（`*-eph-deployer` / `*-eph-tester` / `eph-env.yml`）は設置しない（2026-08-11 決定）**: IaC の実行経路は mvm-gate Lambda（cfn-guard）に一元化する。2系統持つと guard ルールの二重管理になるため。ただし T005 の CD 用 OIDC ロール（`DEV_DEPLOY_ROLE_ARN`）は別目的（人間が承認済み＝mainマージ済みの変更を dev へ反映する信頼された経路）であり、採否は T005 着手時に確定する
- 【人間】タスク（T008, T010, T011, T030, T039）は**どちらのモードでも無人キューに投入しない**。各波の投入前に、その波が依存する【人間】タスクを先に完了させる
- 具体的な先行実施の目安: ~~T008（Geoloniaキー発行）~~**完了(2026-08-11)**・T010（Google OAuth）・~~T011（問い合わせ送付）~~**不要につきクローズ(2026-08-11)**。T039（devドメイン登録）はT005完了直後。T030（Cloudflare DNS）はT031着手前
- **T010 の分割実施（2026-08-11 追記）**: Google OAuth は「①OAuth同意画面の構成」と「②クライアントID/シークレットの作成」に分けられる。①はリダイレクトURIを必要とせず**T003を待たずに先行実施できる**（スコープを `openid`/`email`/`profile` に限れば機微スコープなしのため Google の審査は不要。ただし「テスト」のままだと制約があるので「本番環境に公開」まで進める）。②は Cognito ドメイン確定後――リダイレクトURIは `https://<cognito-domain>/oauth2/idpresponse`。ドメインのプレフィックスは **スタック名と同一**（T003 実装で `!Ref AWS::StackName`）＝ **dev=`oriorimap-dev` / prod=`oriorimap-prod`**。正確な値は各スタックの Output `CognitoDomain` が返す（dry-run では `https://oriorimap-dryrun.auth.ap-northeast-1.amazoncognito.com` を実測確認済み）。格納先は SSM パラメータ `/oriorimap/dev/google/client-id`（String）と `/oriorimap/dev/google/client-secret`（SecureString）――Secrets Manager は $0.40/月かかるため不採用。T013 で CD が解決し `--parameter-overrides` で注入する（テンプレートに値を書かない）

## Phase A: Setup

- [x] T001 project-bootstrap による開発環境セットアップ（2026-08-11 完了）
  - 内容: docs/spec/ を入力として project-bootstrap Skill を実行し、Skill/MCP/Hooks/CLAUDE.md/Linter（P3: React+P2-Node構成）を構成する。npm workspaces（shared/backend/frontend/e2e）の初期化を含む
  - Done条件: bootstrap の Phase 5 検証（mcp list / hooks手動実行）が通り、`npm install` がルートで成功する
  - _Requirements: 全要件共通_

## Phase B: Foundational

- [ ] T002 [serial] SAM IaC: データ・API基盤の作成と使い捨てスタックdry-run（Wave 0）
  - 対象: template.yaml, samconfig.toml, backend/src/handlers/api.ts（healthのみ）
  - 内容: design §2/§3 のうち DynamoDB（シングルテーブル+GSI×2・PITR）/ S3×2（メディアはバージョニング+ライフサイクル30日）/ HTTP API / Lambda（`GET /api/health` のみ）/ EventBridge Scheduler（空のcleanup）/ CloudWatch Alarm / AWS Budgets($8/80%) をテンプレート化
  - Done条件: `sam validate` が通り、使い捨てスタックへ `sam deploy` 成功後 `curl <APIエンドポイント>/api/health` が200を返す。確認後 `sam delete` でスタック削除
  - 依存: T001
  - _Requirements: 全API/データ要件共通_

- [ ] T003 [serial] SAM IaC: Cognito User Pool + JWT Authorizer 追加とdry-run（Wave 0）
  - 対象: template.yaml
  - 内容: Cognito User Pool（Liteティア明示・メール+パスワード・メール検証必須・**確認メール本文は日本語**・Cognito既定メール送信）と HTTP API の JWT Authorizer 接続を追加（design §4.3。Google IdPはT013で追加）。Authorizer検証用に、既存healthハンドラを流用したAuthorizer付きルート `GET /api/health-auth` をテンプレートに追加（アプリコードの変更なし）
  - **2026-08-11 改訂（ログインUI方式の変更に伴う）**: 当初の「Hosted UI日本語」は AWS 仕様上成立しない（日本語化は managed login 限定＝Essentials 以上。Liteは英語のclassic hosted UIのみ）。**ログインUIは自前実装に変更**したため本タスクのスコープから Hosted UI の日本語化が外れ、代わりに **App client の `ExplicitAuthFlows`（`ALLOW_USER_SRP_AUTH`＋`ALLOW_REFRESH_TOKEN_AUTH`＋`ALLOW_ADMIN_USER_PASSWORD_AUTH`。`ALLOW_USER_PASSWORD_AUTH`は有効化しない）**と、Googleフェデレーション用の Cognito ドメイン（`ManagedLoginVersion: 1`）が対象に入る。詳細は design §4.3
  - Done条件（改訂）: 使い捨てスタックで User Pool・App client・ドメインが作成され、CLI でテストユーザーを作成（`admin-create-user` + `admin-set-user-password`）→ `admin-initiate-auth` で取得したJWT付き `curl /api/health-auth` が200・**JWTなしで401**・**不正な署名のJWTで401**
  - 依存: T002
  - _Requirements: R1.1, R1.3, R1.6_

- [ ] T004 [serial] SAM IaC: CloudFront配線の追加とdry-run（Wave 0）
  - 対象: template.yaml, frontend/（プレースホルダindex.html）
  - 内容: CloudFrontディストリビューション（default→S3 SPA[OAC] / `/media/*`→S3メディア / `/api/*`・`/embed/*`→API Gateway・キャッシュ無効）を追加（design §2）
  - Done条件: 使い捨てスタックで `curl https://<cf-domain>/api/health` が200、`https://<cf-domain>/` がプレースホルダHTMLを返す
  - 依存: T003
  - _Requirements: 全画面・embed要件共通_

- [ ] T005 [serial] CI（GitHub Actions）と共有dev環境の初回構築・疎通（Wave 0）
  - **2026-08-12 改訂（OIDC ロールを作らない設計に変更）**: 当初の「CI/CD + OIDC フェデレーション」から **CD ごと廃止**し、dev の更新経路を **mvm-gate Lambda（cfn-guard）に一元化**した。理由: gate は Function URL が `AuthType=AWS_IAM` で呼び出し元 ARN を `assumed-role/mvm-proj-<name>/…` に限定するため **GitHub Actions からは呼べず**（CD 専用ロールを作っても403）、かつ `s3 sync` / CloudFront invalidation は CloudFormation ではないので gate の管轄外――CD を残すと OIDC ロールに CFn 書き込みとデータプレーンの両方の権限が必要になり、IaC 実行経路が2系統になる。詳細は design §4.7「デプロイ経路」
  - 対象: `.github/workflows/pipeline-gates.yml`（**build ジョブを追加**）、`.github/workflows/deploy-dev.yml`（**削除**）。template.yaml の変更なし（OIDC 用 IAM ロールは作らない）
  - **ci.yml は新規作成しない（2026-08-12 判明）**: bootstrap が設置した `pipeline-gates.yml` のヘッダーに「対応: docs/spec/02_design.md §4.7（ci.yml 相当）」と明記されており、lint / 型チェック / format / 単体テスト / 結合 / mutation は既に PR トリガーで実行されている。**欠けているのは `sam validate` とビルド可能性の検証だけ**なので、新規ファイルを作らず同ファイルに `build` ジョブを足す（重複した CI 実行と重複したシグナルを避ける）
  - 内容: `pipeline-gates.yml` に `build` ジョブ（`npm ci` → `npm run sam:validate` → `npm run sam:build` → `npm run build -w frontend`。**AWS 認証情報は不要**）を追加し、bootstrap 設置の deploy-dev.yml を削除する。あわせて dev スタック（`oriorimap-dev`）を初回構築する
  - **注記（required status checks）**: `build` ジョブを追加したら、GitHub の branch ruleset の required status checks にも登録する（人間の操作）
  - **実施順序（2段階。CFn サービスロールのスティッキー参照のため分ける）**:
    - **T005-a（先行・いつでも可）**: ci.yml 作成 + deploy-dev.yml 削除
    - **T005-b（microvm 再 vend の後）**: dev スタックの初回構築。**必ず `--role-arn mvm-proj-oriorimap-cfn` を指定して作る**――CFn スタックはサービスロールをスティッキー参照するため、管理者権限で先に作ると後から VM が更新する際に役割が切り替わり、権限ギャップが本番同然の場所で初めて露見する（microvm-mode の落とし穴に実事故として記録あり）
  - Done条件: (1) PR に対して `pipeline-gates.yml` の `build` ジョブが `sam validate` / `sam build` / フロントビルドを実行して緑になる (2) dev スタックが `mvm-proj-oriorimap-cfn` をサービスロールとして構築され、`curl <dev CloudFrontドメイン>/api/health` が200（health-only。機能スライスへの依存は持たない） (3) `deploy-dev.yml` が削除され、リポジトリに AWS 認証情報を必要とするワークフローが存在しない
  - 依存: T004（+ T005-b は microvm 再 vend の完了）
  - **注記（ガード対象パス）**: `.github/workflows/` は project-autopilot 保護パス。**当該部分は人間著作差分**（人間がメインチェックアウトで著作→オーケストレータがblob検証つきverbatim移送・human-authored明記コミット）として扱うこと
  - **注記（esbuild）**: ci.yml で `sam validate` 以上（`sam build`）を行う場合は `npm ci` の後に **`npm run sam:build`** で呼ぶこと。素の `sam build` は npm workspaces の巻き上げにより `Cannot find esbuild` で失敗する（AGENTS.md P2-Node 規約）
  - _Requirements: 全要件共通（デプロイ経路）_

- [ ] T006 [P] バックエンド骨格（Hono + 共有Zodスキーマ + テスト基盤）
  - 対象: shared/schemas/, shared/constants.ts, backend/src/app.ts, backend/src/lib/, backend/tests/, vitest設定
  - 内容: Honoアプリ骨格（エラー形式 `{code,message,details?}`・Powertools Logger）、design §6 のエンティティZodスキーマと LIMITS/KASANE_COLORS 定数、Vitest+aws-sdk-client-mock のテスト基盤
  - Done条件: `npm test -w backend` が通り、`sam local start-api` で `/api/health` が200
  - 依存: T001
  - **注記（ガード対象パス）**: テストランナー設定ファイル（vitest.config）は保護パターンに交差するため**人間著作差分**として扱うこと
  - _Requirements: 全API要件共通_

- [ ] T007 [P] フロント骨格 + テーマ・共通レイアウトシェル
  - 対象: frontend/（Vite React TS雛形）, frontend/src/styles/tokens.css, frontend/src/components/layout/, フォントアセット, vitest設定
  - 内容: design §5.2 のデザイントークン（藤重: `#614C9B`系・かさね色パレット・Zen Old Mincho/Noto Sans JPセルフホスト・16px/44pxタップ）をTailwind @themeとして実装し、ヘッダー付き共通レイアウトとルーティング骨格（§5.1のパス）を構築。shadcn/ui導入とプライマリ色差し替え
  - Done条件: `npm run dev -w frontend` でサンプルページがトークン適用済みテーマ・共通レイアウトで表示され、`npm test -w frontend` が通る
  - 依存: T001
  - **注記（ガード対象パス）**: テストランナー設定ファイル（vitest.config）は保護パターンに交差するため**人間著作差分**として扱うこと
  - _Requirements: 全画面要件共通_

- [x] T008 [P] 【人間】Geoloniaアカウント作成・APIキー発行（2026-08-11 完了）
  - 内容: app.geolonia.com でアカウントを作成し、APIキーを発行する（開発用URL `http://localhost:*` 等は無料・カウント対象外のため登録不要。dev CloudFrontドメインの登録はT005完了後にT020の前提として実施する）
  - Done条件: APIキーが発行され、localhost での地図表示に使える状態（キー値は frontend の環境変数へ）
  - **完了記録（2026-08-11）**: キー発行済み。設置先は2箇所――(1) ローカル開発用 `frontend/.env.local` の `VITE_GEOLONIA_API_KEY`（`.gitignore` の `.env.*` で除外済み）、(2) CI/CDビルド用の GitHub Actions リポジトリ変数 `VITE_GEOLONIA_API_KEY`。**キー値は docs・リポジトリに一切記載しない**（URL制限付きの公開前提キーだが design §4.7 の方針に従う）
  - 依存: なし
  - _Requirements: R2, R4系の前提_

- [ ] T039 [P] 【人間】Geolonia APIキーへのdev CloudFrontドメイン登録
  - 内容: T005で確定したdev CloudFrontドメインを、T008で発行したGeolonia APIキーのURL一覧に登録する（dev環境での地図表示に必要）
  - Done条件: dev CloudFrontドメインがキーのURL一覧に表示されている
  - 依存: T005, T008
  - _Requirements: R2, R4系の前提_

- [ ] T009 地図コンポーネント基盤（Geolonia表示・Symbolレイヤー・現在地・帰属表記）
  - 対象: frontend/src/components/map/（GeoloniaMap, SymbolLayers, LegendCard骨格, GeolocateButton）
  - 内容: Geolonia JS APIのReactラッパを実装。GeoJSONのSymbolレイヤー+`addImage`描画、全スポットfitBounds（0件時は日本全体）、GeolocateControl（拒否時は通常表示継続）、帰属表記の常時表示（design §3, R2.10, R4.7-4.8）。Geolonia公式サンプルでカスタムマーカー実装方式を最終裏取りし、結果を設計書§10へ追記（詳細設計タスク）
  - Done条件: サンプルGeoJSON（カスタム画像アイコン含む3点）が表示され、fitBounds・現在地ボタン・位置情報拒否時の継続動作を localhost で手動確認（手順をタスク完了コメントに記録）
  - 依存: T007, T008
  - _Requirements: R2.10, R4.7, R4.8_

- [ ] T010 [P] 【人間】Google OAuthクライアント作成
  - 内容: Google Cloud Console でOAuth同意画面とクライアントID/シークレットを作成する（リダイレクトURIはCognitoドメイン。手順はタスク実行時にエージェントが提示）
  - Done条件: クライアントID/シークレットが取得され、SSMパラメータ（またはSecretsManager）に格納されている
  - 依存: T003
  - _Requirements: R1.2の前提_

- [x] T011 [P] 【人間】~~Geolonia帰属表記義務の問い合わせ送付~~ → **不要としてクローズ（2026-08-11・送付せず）**
  - **クローズ理由**: 問い合わせを送る前に調査で解決したため送付不要と判断。(a) ユーザー側でGeoloniaのホームページ・開発者ドキュメントを網羅確認したが帰属に関する記載なし、(b) エージェントがスタイル実体 `https://cdn.geolonia.com/style/geolonia/basic/ja.json` を直接検証し、主データソース `geolonia` に `attribution` フィールドが存在しないことを確認（提供者自身が表記を要求していない一次証拠）、(c) 無償OSSではなく商用サービスの契約利用。詳細は要件決定ログ #29-1
  - _Requirements: §4法務・表記（リリースゲート → 解除）_

## Phase C: 機能スライス

- [ ] T012 認証スライス①: 自前ログインUI・保護ルート・プロフィール
  - 対象: frontend/src/features/auth/, frontend/src/pages/(Login, Signup, Confirm), backend/src/routes/me.ts, e2e前提のテストユーザー手順
  - 内容: **`aws-amplify/auth`（headless）+ shadcn/ui で自前のログイン・登録・確認コード画面を実装**（登録→確認メール→確認コード入力→ログイン→ログアウト）。SRP認証・完全日本語・§5.2藤重トークン準拠・IME規約準拠。`@aws-amplify/ui-react` の Authenticator は使わない（design §4.3）。フロントの保護ルート（未ログインは `/login` へ誘導=R1.6）、`GET /api/me`（JWT必須）実装
  - **2026-08-11 改訂**: Hosted UI 連携から自前UI実装へ変更（design §3「認証」行・§4.3）。実装量が増える分、T013 のパスワード再設定UIも同じ基盤に乗る
  - Done条件: dev環境で メール登録→確認→ログイン→マイページ表示→ログアウト を手動確認。`curl`（JWTなし）で `/api/me` が401、JWT付きで200
  - 依存: T005, T006, T007
  - _Requirements: R1.1, R1.3, R1.5, R1.6_

- [ ] T013 認証スライス②: Google IdP・パスワード再設定・ロックアウト確認
  - 対象: template.yaml（Google IdP追加）, frontend/src/features/auth/
  - 内容: Google IdPをUser Poolへ追加し、**自前ログイン画面に「Googleでログイン」ボタンを実装**（`signInWithRedirect({provider:'Google'})`。`identity_provider` 指定によりCognitoは画面を描画せず即Googleへ転送するため英語画面は出ない）。パスワード再設定フロー（R1.4・自前画面）、パスワード無しアカウントへの案内表示（R1.9）、**Cognito標準ロックアウトの挙動確認と日本語エラー表示の実装**（R1.7。Hosted UIを使わないため表示は自前。design §7）
  - Done条件: dev環境で Googleログイン成功・再設定メール受信と再設定成功・誤パスワード連続入力で一時ロックを確認（各手順を記録）
  - 依存: T012, T010
  - _Requirements: R1.2, R1.4, R1.7, R1.9_

- [ ] T014 認証スライス③【詳細設計】: 同一メール自動リンクのスパイク検証と実装
  - 対象: backend/src/handlers/preSignup.ts, template.yaml（トリガー+IAM）
  - 内容: design §4.3 の `PreSignUp_ExternalProvider` + `ListUsers` + `AdminLinkProviderForUser` フローを実機スパイクで検証し、preSignupトリガーを実装。検証結果と決定を設計書§10・要件決定ログに追記。縮退（自動リンク断念）となる場合は要件R1.8の変更としてユーザーに確認する
  - Done条件: dev環境で (a)検証済みメールの既存アカウントにGoogleログイン→同一アカウントとしてログイン成立 (b)未検証アカウント→リンクされず案内エラー、の両方を確認
  - 依存: T013
  - _Requirements: R1.8, R1.11_

- [ ] T015 地図CRUDスライス: 作成・設定・公開切替・マイページ
  - 対象: backend/src/routes/maps.ts, frontend/src/pages/(MyPage, MapEdit設定部), backend/tests/
  - 内容: `POST/PUT/DELETE /api/maps`・`GET /api/me/maps`・`GET /api/maps/:id`（公開のみ）を実装（公開系/オーナー系分離=design §4.2）。作成フォーム（タイトル必須・説明・タグ）、非公開初期状態、公開切替UI、マイページ一覧
  - Done条件: `npm test -w backend`（maps系）が通り、dev環境で 作成→マイページ表示→公開切替 を手動確認。非公開地図に未ログインでアクセスすると404
  - 依存: T012
  - _Requirements: R2.1, R2.4_

- [ ] T016 スポット編集スライス: 地図クリック追加・編集・HTML Marker
  - 対象: backend/src/routes/spots.ts, frontend/src/pages/MapEdit, frontend/src/components/map/EditMarkers
  - 内容: スポットCRUD API（タイトル必須検証=R2.6）と編集画面（地図クリックで追加・HTML Markerドラッグで位置調整・タイトル/説明/外部リンクのフォーム。IME対応=design §5.5）
  - Done条件: `npm test -w backend`（spots系）が通り、dev環境で スポット追加→ドラッグ→編集→保存 を手動確認。タイトル空で保存するとインラインエラー
  - 依存: T015, T009
  - _Requirements: R2.2, R2.6_

- [ ] T017 [P] 住所・地名検索（ジオコーディング）
  - 対象: frontend/src/features/geocode/
  - 内容: 国土地理院AddressSearch（fetch・5sタイムアウト）→ Community Geocoder フォールバック → 0件時は地図クリック案内（design §3, §7）。検索UIを編集画面に統合。桐生市周辺の実住所でのサンプリング検証（§10詳細設計タスク）を行い結果を記録
  - Done条件: `npm test -w frontend`（geocodeのモックテスト）が通り、dev環境で 実住所3件がヒット・存在しない住所で案内表示 を確認。サンプリング結果が docs/spec/ に記録されている
  - 依存: T016
  - _Requirements: R2.2, R2.9_

- [ ] T018 [P] 画像アップロード: カスタムアイコン・写真
  - 対象: backend/src/routes/uploads.ts, frontend/src/features/upload/, backend/tests/
  - 内容: `POST /api/uploads`（UploadedImage=pending・presigned PUT・icon 1MB/photo 5MB制約）→ Canvas変換（icon 128px PNG / photo 1600px JPEG）→ `POST /api/uploads/:imageId/complete`（magic bytes・サイズ検証、不一致は即削除+400）→ 添付でattached（design §4.2, §6）。アイコン選択UI（プリセット+アップロード）と写真添付
  - Done条件: `npm test -w backend`（uploads系: 正常/偽装Content-Type/超過サイズ）が通り、dev環境で アイコン画像アップロード→スポットに反映 を確認。テキストファイルをリネームしたアップロードが拒否される
  - 依存: T016
  - _Requirements: R2.3, R2.7_

- [ ] T019 [P] 地図削除・スポット上限
  - 対象: backend/src/routes/maps.ts, spots.ts, frontend（削除確認ダイアログ）
  - 内容: 地図削除の連鎖（パーティションBatchWrite削除・画像の`PENDING_DELETE`記録・確認ダイアログ=design §5.5）、スポット上限1,000件の追加拒否
  - Done条件: `npm test -w backend`（削除連鎖・上限409・**削除時に画像キーが`PENDING_DELETE`へ記録されること**）が通り、dev環境で 地図削除→マイページから消える を確認
  - 依存: T016
  - _Requirements: R2.5, R2.8_

- [ ] T020 [P] 公開閲覧ページ: GeoJSON配信・スポット表示・現在地
  - 対象: backend/src/routes/maps.ts（geojson）, frontend/src/pages/MapView
  - 内容: `GET /api/maps/:id/geojson`（公開のみ）と閲覧ページ（Symbolレイヤー表示・スポットポップアップ（タイトル/説明/写真/リンク）・fitBounds・現在地ボタン・未ログイン閲覧）
  - Done条件: dev環境のシークレットウィンドウ（未ログイン）で公開地図が表示され、スポットクリックで詳細ポップアップ、現在地ボタンが動作。非公開地図のgeojsonは404（curl確認）
  - 依存: T015, T009, T039
  - _Requirements: R1.5, R2.10, R4.7, R4.8_

- [ ] T021 [P] 検索・一覧・トップページ
  - 対象: backend/src/routes/maps.ts（一覧/検索）, frontend/src/pages/Top
  - 内容: `GET /api/maps`（`?q=`部分一致・`?sort=created|updated`・Lambda内フィルタ/ソート=design §3）とトップページ（検索ボックス・新着/更新順切替・0件空状態=R3.3）
  - Done条件: `npm test -w backend`（フィルタ・ソート）が通り、dev環境で キーワード検索ヒット・0件時の専用表示・並び順切替 を確認
  - 依存: T015
  - _Requirements: R3.1, R3.2, R3.3_

- [ ] T022 重ね合わせ表示スライス
  - 対象: frontend/src/pages/MapView（重ね合わせUI）, frontend/src/components/map/LegendCard
  - 内容: 閲覧ページに「地図をかさねる」UI（公開地図の追加選択）・かさね色パレットによる凡例とレイヤー別表示切替・所属識別・参照型最新化（毎回geojson取得）・利用不可レイヤー表示・上限10（design §5.1, R4系）
  - Done条件: dev環境で 2枚の公開地図を重ねて凡例付き表示→片方を非公開化→再読込で利用不可表示 を確認。11枚目の追加が拒否される
  - 依存: T020, T021
  - _Requirements: R4.1, R4.2, R4.3, R4.4, R4.5, R4.6_

- [ ] T023 重ね合わせ地図の保存・共有スライス
  - 対象: backend/src/routes/overlays.ts, frontend/src/pages/OverlayView, backend/tests/
  - 内容: `POST /api/overlays`・`GET /api/overlays/:id`（sources: title/ownerName/status解決=R5.5）・`GET /api/me/overlays/:id`・公開切替・固有URL閲覧（未ログイン可）・出典表示・全レイヤー利用不可時の空表示。**公開overlayを一覧/検索（`GET /api/maps`・GSI1 `PUBLIC#OVL`）とトップページの表示対象に統合**（R3.1/R3.2の「重ね合わせ地図」部分）
  - Done条件: `npm test -w backend`（overlays系・一覧統合）が通り、dev環境で 保存→発行URLをシークレットウィンドウで開く→出典付き重ね合わせ再現 を確認。公開overlayがトップの一覧・キーワード検索・並び順切替に表示される
  - 依存: T022
  - _Requirements: R5.1, R5.2, R5.3, R5.4, R5.5, R3.1, R3.2_

- [ ] T024 embedスライス: 許可ドメイン管理・CSP付き配信
  - 対象: backend/src/routes/embed.ts, backend/src/views/embed.ts, backend/src/lib/csp.ts, frontend/src/pages/EmbedSettings, EmbedView
  - 内容: 許可ドメインCRUD+iframeコード発行UI（非公開時は発行拒否=R6.5）、`GET /embed/:type/:id` のCSP `frame-ancestors` 動的生成HTML（閲覧専用・帰属表記・「OriOriMapで開く」リンク。design §4.4）
  - Done条件: `npm test -w backend`（CSP生成: 登録あり/なし/非公開/サブドメイン）が通り、`curl -I <dev>/embed/map/<id>` と `curl -I <dev>/embed/overlay/<id>` のCSPヘッダーに登録ドメインのみ含まれる。検証用ページ（登録ドメイン）でmap・overlay両方のiframe表示成功、未登録ドメインのページでブラウザが描画拒否、**許可ドメイン削除後に同一ページを再読込すると拒否される**（R6.6）
  - 依存: T023
  - _Requirements: R6.1, R6.2, R6.3, R6.4, R6.5, R6.6_

- [ ] T025 [P] インポート①: クライアント側パーサ群（KML/KMZ/CSV）
  - 対象: frontend/src/features/import/parsers/, frontend/tests/
  - 内容: クライアント側パース（KMZ=fflateで`doc.kml`抽出 / KML=@tmcw/togeojson / CSV=papaparse）を実装し、共通のスポット配列+スキップ情報（非ポイント図形・KMZ添付画像）+行番号付きエラーに正規化する
  - Done条件: `npm test -w frontend`（パーサ: 正常KML/KMZ/CSV・不正ファイル・線面混在・`.kml`エントリなしKMZ）が通る
  - 依存: T016
  - _Requirements: R7.1, R7.2, R7.3, R7.4_

- [ ] T038 [P] インポート②: 一括登録APIと取り込みUI
  - 対象: backend/src/routes/spots.ts（bulk）, backend/tests/, frontend/src/pages/MapEdit（インポートUI）
  - 内容: `POST /api/maps/:id/spots/bulk`（Zod全件検証・上限チェック・応答 `{totalCount, importedCount, skippedCount, skippedReasons[]}`）と編集画面の取り込みUI（結果件数表示・行番号付きエラー表示）
  - Done条件: `npm test -w backend`（bulk: 正常・不正行400・上限超過）が通り、dev環境で Googleマイマップから書き出したKMZの取り込み→件数報告 を確認。不正CSVは行番号付きエラーで0件登録
  - 依存: T025, T019
  - _Requirements: R7.1, R7.2, R7.3, R7.4, R7.5_

- [ ] T026 [P] 通報スライス
  - 対象: backend/src/routes/reports.ts, backend/src/lib/rateLimit.ts, frontend（通報ダイアログ）
  - 内容: `POST /api/reports`（対象: 地図/スポット/重ね合わせ地図・理由・IPハッシュのレート制限10件/時=DynamoDBカウンタ+TTL）と閲覧画面（地図・重ね合わせ地図）の通報UI
  - Done条件: `npm test -w backend`（受付・11件目の429）が通り、dev環境で 未ログインでの地図・重ね合わせ地図それぞれの通報送信→完了トースト を確認
  - 依存: T020, T023
  - _Requirements: R8.1, R8.3_

- [ ] T027 管理者スライス: 通報対応
  - 対象: backend/src/routes/admin.ts, backend/src/lib/auth.ts（adminグループ検証）, frontend/src/pages/Admin
  - 内容: `GET /api/admin/reports`・`POST /api/admin/actions`（地図/重ね合わせ=非公開化or削除、スポット=個別削除。即時に検索/一覧/重ね合わせ/embedから除外）と管理者画面。管理者シード手順（Cognitoグループ付与runbook）の文書化
  - Done条件: `npm test -w backend`（admin認可: 一般ユーザー403）が通り、dev環境で (a)通報→管理者で地図を非公開化→一覧から消え重ね合わせに利用不可表示・**embedビューでも非表示** (b)**スポット個別削除→当該スポットのみ消える** を確認
  - 依存: T026, T024
  - _Requirements: R8.1, R8.2_

- [ ] T028 [P] 退会・アカウント設定スライス
  - 対象: backend/src/routes/me.ts, frontend/src/pages/Settings
  - 内容: 表示名変更と `DELETE /api/me`（tombstone: status=pending_delete・所有コンテンツ即時非公開化・AdminDisableUser・202応答=design §4.2）。確認は「退会する」の文言入力（design §5.5）
  - Done条件: `npm test -w backend`（me系）が通り、dev環境で 退会→即ログイン不可→公開していた地図が一覧から消える を確認
  - 依存: T012
  - _Requirements: R1.10_

- [ ] T029 cleanupバッチスライス（3系統）
  - 対象: backend/src/handlers/cleanup.ts, backend/tests/
  - 内容: design §4.5 の3系統（PENDING_DELETE 7日回収 / 未添付画像回収 / 退会の段階削除→最後にAdminDeleteUser+USERレコード削除）を冪等に実装し、Schedulerと結合
  - Done条件: `npm test -w backend`（3系統+途中失敗からの再実行）が通り、dev環境で手動invoke（`aws lambda invoke`）し退会済みユーザーのコンテンツが削除される
  - 依存: T018, T019, T028
  - _Requirements: R2.11, R1.10_

## Phase D: Polish・リリース準備

- [ ] T030 [P] 【人間】Cloudflare DNSレコード登録とGeoloniaキー本番URL登録
  - 内容: Cloudflareダッシュボード（`kiryu.tech` ゾーン）で ①ACM検証用CNAME ②`oriorimap.kiryu.tech` → prod CloudFrontドメインのCNAME を登録する（**いずれもプロキシOFF＝DNS onlyモード必須**。二重CDN回避のため）。加えてGeolonia APIキーに `https://oriorimap.kiryu.tech` を登録。具体的なレコード値はT031実行中にエージェントが提示する（ACM検証CNAMEはT031の証明書作成後に確定するため、T031と協調して実施）
  - Done条件: `dig +short oriorimap.kiryu.tech CNAME` がprod CloudFrontドメインを返し、ACM証明書のステータスがISSUEDになっている
  - 依存: T005
  - _Requirements: §4非機能（本番公開の前提）_

- [ ] T031 [serial] 独自ドメイン（oriorimap.kiryu.tech）・ACMのIaC組み込みとprod初期デプロイ
  - 対象: template.yaml, samconfig.toml（prod）
  - 内容: ACM証明書（us-east-1・DNS検証）とCloudFrontエイリアス `oriorimap.kiryu.tech` をテンプレートへ追加し、prodスタックを初期デプロイ（health-only疎通）。証明書作成後に検証CNAMEの値を出力してT030（人間のCloudflare登録）を依頼し、ISSUEDを待って続行する。Route 53は使用しない（DNSはCloudflare管理・design §3）
  - Done条件: `curl https://oriorimap.kiryu.tech/api/health` が200、`https://oriorimap.kiryu.tech/` が200でSPAを配信する（health-only。地図表示を含む本番動作確認はT034で実施し、機能スライスへの依存は持たない）
  - 依存: T030, T005
  - _Requirements: §4非機能（本番環境）_

- [ ] T032 [serial] SES連携（【人間】本番アクセス申請を含む）
  - 対象: template.yaml（Cognito EmailSendingAccount=DEVELOPER + SES設定）
  - 内容: SESのドメイン検証・本番アクセス申請（人間がAWSコンソールで申請）→ 承認後にCognitoのメール送信をSES連携へ切替（design §3。50通/日制限の解除）
  - Done条件: prod環境の新規登録で確認メールがSES経由（送信元=独自ドメイン）で届く
  - 依存: T031
  - _Requirements: R1.1, R1.4（本番運用の前提）_

- [x] T033 【人間】~~Geolonia帰属表記の回答確認~~ → **リリースゲート解除としてクローズ（2026-08-11）**
  - **判定結果: 公開可**。T011 の調査結果をもって要件§9 のリリースゲートを解除した。記録先: 要件定義書 §4法務・表記 / 決定ログ #29 #29-1 / §9、設計書 §10
  - **T009 への申し送り（実装は変更なし）**: Geolonia 自身のクレジットは不要だが、同スタイルの `dem` ソースが `© GSI Japan` を宣言しており国土地理院の出典明記義務は課金の有無と独立に残る。MapLibre の `AttributionControl` は既定で有効でこれを自動表示するため**追加実装は不要**。T009 の受入条件は「**`attributionControl: false` を渡してコントロールを無効化しないこと**」のみ
  - _Requirements: §4法務・表記_

- [ ] T034 運用仕上げ: runbook・復元テスト・アラート確認
  - 対象: README.md（運用手順書）, docs/
  - 内容: Geolonia表示回数ルーチン（design §4.8）・DynamoDB PITR/S3バージョニングからの復元手順・管理者シード手順をrunbook化し、devで復元テストを1回実施。Budgets/Alarmの通知先を確認。本番ドメインでの動作確認（地図トップ表示・Geolonia地図ロード）を実施
  - Done条件: PITRからの復元テストが成功し手順どおり文書化されている。Budgetsのテスト通知が届く。`https://<本番ドメイン>/` で地図トップが表示されGeolonia地図がロードされる
  - 依存: T029, T031, T022
  - _Requirements: §4可用性・運用・コスト_

- [ ] T035 [P] 性能検証（LCP・p95）
  - 内容: dev環境の地図閲覧ページをLighthouse（モバイル・Slow 4G）で計測しLCP≤3秒を確認。CloudWatchで主要API（一覧・geojson）のp95≤500msを確認。未達の場合は改善タスクを起票
  - Done条件: 計測結果（スクリーンショット/数値）が記録され、目標達成または改善タスクが起票されている
  - 依存: T022, T025
  - _Requirements: §4性能_

- [ ] T036 E2E検証手順の実施（Playwright + 手動）
  - 対象: e2e/, playwright設定
  - 内容: 要件定義書§10の手順1〜10をPlaywrightシナリオ化（メール確認はCognitoテストAPI代替・embedは`curl -I`のCSP検証併用）し、dev環境で全手順を通しで実施
  - Done条件: `npx playwright test` が全シナリオ成功し、§10全手順の実施結果が記録されている
  - 依存: T014, T017, T024, T038, T027, T029
  - **注記（ガード対象パス）**: テストランナー設定ファイル（playwright.config）は保護パターンに交差するため**人間著作差分**として扱うこと
  - _Requirements: 全要件（代表シナリオ）_

- [ ] T037 OSS公開準備
  - 対象: LICENSE, README.md, .gitignore
  - 内容: ライセンス決定（MIT想定・人間承認）・README（構想/セットアップ/運用）・シークレット混入スキャン（gitleaks等）を実施し、リポジトリ公開の準備を整える。**公開操作自体は人間が実施**
  - Done条件: gitleaksがクリーンで、LICENSEとREADMEが揃い、ユーザーが公開可否を判断できる状態
  - 依存: T005
  - _Requirements: §7前提（OSS公開）_

## 要件⇔タスク対応表

| 要件ID | 対応タスク | 備考 |
|---|---|---|
| R1.1 | T003, T012, T032 | 登録・確認メール（本番はSES） |
| R1.2 | T013 | Google IdP |
| R1.3 | T003, T012 | Cognitoに委譲 |
| R1.4 | T013, T032 | |
| R1.5 | T020, T023 | 未ログイン閲覧 |
| R1.6 | T003, T012 | 401→ログイン誘導 |
| R1.7 | T013 | Cognito標準ロックアウトの確認 |
| R1.8 | T014 | スパイク検証込み |
| R1.9 | T013 | |
| R1.10 | T028, T029 | 受付+段階削除 |
| R1.11 | T014 | |
| R2.1 | T015 | |
| R2.2 | T016, T017 | クリック追加+住所検索 |
| R2.3 | T018 | |
| R2.4 | T015 | |
| R2.5 | T019 | |
| R2.6 | T016 | |
| R2.7 | T018 | |
| R2.8 | T019 | |
| R2.9 | T017 | |
| R2.10 | T009, T020 | |
| R2.11 | T019, T029 | 削除時の`PENDING_DELETE`記録+バッチ回収 |
| R3.1 | T021, T023 | 地図=T021 / 重ね合わせ地図の統合=T023 |
| R3.2 | T021, T023 | 同上 |
| R3.3 | T021 | |
| R3.4 | —（P2） | MVP対象外（要件定義でP2指定） |
| R4.1 | T022 | |
| R4.2 | T022 | |
| R4.3 | T022 | |
| R4.4 | T022 | |
| R4.5 | T022, T023 | |
| R4.6 | T022 | |
| R4.7 | T009, T020 | |
| R4.8 | T009, T020 | |
| R5.1 | T023 | |
| R5.2 | T023 | |
| R5.3 | T023 | |
| R5.4 | T023 | |
| R5.5 | T023 | |
| R6.1 | T024 | |
| R6.2 | T024 | |
| R6.3 | T024 | |
| R6.4 | T024 | |
| R6.5 | T024 | |
| R6.6 | T024 | |
| R7.1 | T025, T038 | パーサ+API/UI |
| R7.2 | T025, T038 | |
| R7.3 | T025, T038 | |
| R7.4 | T025, T038 | |
| R7.5 | T038 | |
| R8.1 | T026, T027 | |
| R8.2 | T027 | |
| R8.3 | T026 | |
| R9.1〜R9.4 | —（P2） | 第2段階（MVP対象外。データモデル考慮はdesign §6で担保） |
| §4 非機能 | T031, T032, T034, T035 | |
| §4 法務・表記 | T009, T011, T033 | リリースゲート |
| §10 E2E | T036 | |

## design.md §10 未決事項 → タスク対応

| §10項目 | タスク |
|---|---|
| 独自ドメイン決定・取得 | T030, T031 |
| Geolonia帰属表記の正式回答 | T011, T033 |
| SES本番アクセス申請 | T032 |
| カスタムマーカー実装方式の最終裏取り | T009 |
| ジオコーダ精度サンプリング検証 | T017 |
| OSSライセンス・公開 | T037 |
| 検索方式見直し（1,000件超）/ 空間クエリ要件 / ownerName再同期 | 運用後判断（タスク化しない） |
| 管理者シード手順 | T027, T034 |
