# tugical プロジェクト現状ステータス

**最終確認日**: 2026-07-20 23:14:51  
**目的**: どこまで何をできているかを明確にし、再スタートの起点とする

> **再開時は PROGRESS.md を読む必要はありません。** 本ドキュメント（STATUS.md）が司令塔です。索引は `DOCS_INDEX.md`。  
> 時系列ログは `backend/docs/PROGRESS.md` に残してありますが、判断・優先度・次の一手は STATUS + REMAINING_TASKS_PLAN §4 に集約しています。

**業種特化の判断（ブレーキとして参照）**  
現フェーズでは業種特化は行わない。業種テンプレはリリース後にオプションとして追加する。業種要望が出てもコア機能に混ぜない。業種別に作り込みたくなったときは、この一文を優先する。

---

## 1. 概要

| 項目 | 状態 |
|------|------|
| アーキテクチャ | 単一 Laravel アプリ（統合済み） |
| フロント | `backend/resources/js/`（React + TypeScript + Vite） |
| 仕様書 | `backend/docs/` に集約 |
| MVP 進捗 | **27/40 タスク完了（68%）** — 詳細は `MVP_IMPLEMENTATION_PLAN.md` |
| 実行順序 | **#1〜18** — `REMAINING_TASKS_PLAN_v1.0.md` §4（v1.7） |
| 次に着手 | **#2 MVP-P4-02**（LINE 通知 E2E 実機確認） |
| 進捗ログ | `backend/docs/PROGRESS.md`（長大・時系列・参照任意） |
| ドキュメント索引 | `backend/docs/DOCS_INDEX.md` |

---

## 2. 完了しているもの ✅

### 2.1 インフラ・環境

- Docker 構成（app, nginx, database, redis, phpmyadmin）
- GitHub Actions 自動デプロイ（develop → テスト、main → 本番）
- ヘルスチェック `/health`
- Makefile コマンド（up, health, shell 等）

### 2.2 データベース

- テナント・店舗: `tenants`, `stores`
- リソース・スタッフ: `resources`, `staff_accounts`
- メニュー: `menus`, `menu_options`
- 顧客: `customers`
- 予約: `bookings`, **`booking_details`**（複数メニュー組み合わせ用）, `booking_options`
- 通知: `notifications`, `notification_templates`
- 営業カレンダー: `business_calendars`
- 時間スロット設定: `stores.time_slot_settings`（JSON）
- マイグレーション: 上記すべて実施済み

### 2.3 バックエンド（Laravel）

- **認証**: Sanctum（login, logout, user）
- **サービス層**: BookingService, AvailabilityService, HoldTokenService, NotificationService
- **予約 API**: CRUD, status 更新, **move**（タイムライン用）, **calculate / combination**（複数メニュー）
- **空き時間・仮押さえ**: availability, hold-slots
- **顧客・メニュー・リソース・店舗**: 各 API Resource CRUD
- **通知**: notifications, notification-templates
- **店舗設定**: time-slot-settings
- **郵便番号検索**: postal-search（認証不要）
- マルチテナント: store_id 分離・TenantScope 対応

### 2.4 管理画面（React）

- **SPA Router**: /admin/login と /admin 配下の各画面を定義（BrowserRouter basename=/admin）。Step 1 完了（2025-02-11）。
- **ルートガード**: 未認証で /admin 配下アクセス時は /admin/login へリダイレクト（ProtectedRoute）。Step 2 完了（2025-02-11）。
- **管理画面ナビ（導線復旧）**: ログイン後の全ページを **AdminShell**（MUI AppBar + 左 Drawer）でラップ。ダッシュボード・予約・メニュー・顧客・リソース・設定への導線を提供。Shell 配下ルートは /dashboard, /bookings, /menus, /customers, /resources, /settings。
- 認証: ログイン（store_id 選択含む）
- **ダッシュボード**（必須3ブロック・ひとことメッセージ）: 計画あり／ダッシュボード Step 7〜12 完了・安定。**Step 7 完了**（必須3ブロック MUI）。**Step 8 完了**（API 一元化: 1回取得→3ブロック反映、date_from/date_to 対応）。**Step 9 完了**（今日の予約で「次の予約」を Chip・背景・先頭で強調表示）。**Step 10 完了**（直近の変更・キャンセル表示強化：顧客名＋Chip、更新日時・予約日・相対表示）。**Step 11 完了**（要対応アクション拡張：type/severity/link、Chip「未確定」、予約管理へ link）。**Step 12 完了**（ひとことメッセージ：getOneLineMessage＋Container直下 MUI Alert）。UI は MUI 方針（ADMIN_DASHBOARD_IMPLEMENTATION_PLAN v1.2.1）。**MUI Phase 0 完了**（依存・テーマ・ThemeProvider/CssBaseline 適用済み）。**Phase 1 完了**（DatePicker → MUI）。**Phase 2 完了**（Modal / ConfirmDialog → MUI Dialog、方針A: 背景クリックで閉じる）。**Phase 3 完了**（FormField → MUI TextField 互換ラッパー、呼び出し側変更なし）。**Phase 4（Button/Card/Icons）Step 4-1〜4-3 完了**（AppButton/AppCard/AppIcon 追加、ダッシュボード・メニュー・リソースで AppButton に置換）。**Phase 5（一覧系検討）進行中**（評価ドキュメント `ADMIN_LIST_UI_DATAGRID_EVALUATION_v1.0.md` 作成済み、DataGrid 導入判断資料）。
- **予約管理**: 一覧・タイムライン（FullCalendar）、予約作成（単一・**複数メニュー組み合わせ**）、編集、移動（ドラッグ）、ステータス変更
- **顧客管理**: 一覧、詳細モーダル、作成モーダル、インライン編集
- **メニュー管理**: 一覧、CRUD、カテゴリ、オプション
- **リソース管理**: 一覧、CRUD、並び順
- **設定**: SettingsPage（**LINE 連携ウィザード** 1→4 ステップ、Webhook/LIFF URL コピー、**認証情報を確認**、テスト Push）
- **管理画面 UI（2026-07-07）**: `adminTokens` による落ち着いた SaaS 配色（背景 `#FAFAF9`）、**PageHeader** / **SetupStepCard**、**AdminTopBarActions**（通知・ユーザー・ログアウト）、ログイン MUI 化、認証トークン同期（401 解消）
- UI: Modal, Toast, ConfirmDialog, AddressForm 等

### 2.5 仕様・設計

- システム仕様書 v2.3（複数メニュー・電話予約ワークフロー・業種別UI）
- データベース設計書 v1.2（booking_details 含む）
- API 仕様書 v1.1/v1.2
- 要件定義書・UI/UX・テスト・デプロイメント各書

---

## 3. 未実装・部分実装 ⏳

### 3.1 LIFF（LINE 予約フロー）

- **状態**: **フェーズ1 実装済み**（単一メニュー完走・仮押さえ・予約確定・顧客の取得または作成）
- **API**: `LiffController` + `/api/v1/liff/*`（menus, availability, hold-slots, bookings, customers/get-or-create）
- **フロント**: `pages/liff/index.tsx` + `BookingFlow` の 4 ステップ（メニュー→おすすめ日時→確認→完了）。時期ショートカット（直近 / 1・3ヶ月後 / 〜ヶ月後）と空きなし時の候補日提案あり。リソース選択は時間枠＝担当表示で仕様充足（MVP-P3-06 完了）。
- **未完了（実行順）**: **#3** 実機 E2E 記録（MVP-P3-07）、**#12** 複数メニュー LIFF（MVP-P3-08）、**#8** 店舗別 `line_liff_id` + ID token（MVP-P6-03）
- **現状制約**: ビルド時 `VITE_LIFF_ID`（グローバル）。店舗別 LIFF・本人確認は #8 完了まで未対応

### 3.2 LINE 連携

| 項目 | 状態 | 実行順 |
|------|------|--------|
| 通知送信経路 | ✅ NotificationService 実装済。予約確定・変更で呼び出し | — |
| 結合テスト | ✅ `LineBookingNotificationTest` 3 passed（Http::fake） | — |
| 事前チェック | ✅ `php artisan tugical:verify-line-e2e --store=1` | — |
| **実機 E2E** | ⬜ チャネル・トークン・友だち追加後に要確認 | **#2** MVP-P4-02 |
| 店舗別トークン完全化 | ⬜ env フォールバック依存あり | **#6** MVP-P6-04 |
| Webhook + 店舗 routing | ⬜ 未実装（P6-05 は P4-01 に統合） | **#7** MVP-P4-01 |
| 店舗 LINE 設定 UI/API | ✅ 管理画面ウィザード + 疎通確認 API（`LineConnectionVerifier`） | **#5** ほぼ完了 |
| 顧客 line_user_id 詳細編集 | ⬜ API可・UIは作成時のみ（ADMIN-G1） | **#5** 残 |
| **暗号化（LINE/PII）** | 🟡 P6-01 実装済・要 DoD 確認 | **#4, #15** |
| **ログ機密（password 等）** | ✅ MVP-SEC-01 実装済 | **#1** 完了 |
| 多店舗 LINE E2E | ⬜ | **#13** MVP-P6-06 |

**参照**: `LINE_NOTIFICATION_E2E_GUIDE_v1.0.md`、`LINE_STORE_INTEGRATION_REQUIREMENTS_v1.0.md`、`LINE_STORE_INTEGRATION_FIT_GAP_v1.0.md`

### 3.3 その他

- **テスト**: **#9〜10, #14〜15**（MVP-P5-01/03/02/04）未着手。Feature/Unit は LINE 通知 3 件以外サンプル程度
- **Super user / Store administrator / RBAC**: 仕様・設計レベル。実装は未
- **リアルタイム更新**: WebSocket/SSE は未実装（Timeline は手動再取得）

---

## 4. 次にやること（再スタート時の優先候補）

> **実行順序の正**: `backend/docs/REMAINING_TASKS_PLAN_v1.0.md`（残タスク優先順位・ウェーブ定義）

### 即日（P0 — #2〜3）← **今ここ**

1. **#2 MVP-P4-02** … LINE 通知 E2E 実機確認
2. **#3 MVP-P3-07** … LIFF 単一メニュー実機 E2E 記録

### 完了済み（P0.5 — #1）

- **#1 MVP-SEC-01** … ログ機密除去（2026-07-07 コミット `3579a36`）

### β 直後（P1 — #4〜10）— 一部実装済

4. **#4 MVP-P6-01** … Store LINE 暗号化・integration 強化
5. **#5 MVP-P6-02** … LINE 設定 API + 管理画面 UI
6. **#6 MVP-P6-04** … 通知 store 別 token 完全化
7. **#7 MVP-P4-01** … Webhook（P6-05 店舗別 routing 含む）
8. **#8 MVP-P6-03** … LIFF 動的 liff_id + ID token 検証
9. **#9 MVP-P5-01 / #10 MVP-P5-03** … 予約 API・hold テスト

### MVP 拡張（P2 — #11〜15）

11. **#11 MVP-P2-10** … キャンセル期限・料金
12. **#12 MVP-P3-08** … LIFF 複数メニュー
13. **#13 MVP-P6-06** … 多店舗 LINE E2E
14. **#14 MVP-P5-02** … LIFF API テスト
15. **#15 MVP-P5-04** … セキュリティ・非機能（#1 以外の残）

### 並行可（P3 — #16〜18）

16. **UI-FIX-01** … MenuController 修正
17. **UI-P5-POC** … MenusPage DataGrid PoC
18. **UI-P5-DONE** … MUI Phase 5 完了判定

### β スコープ外（今はやらない）

- RBAC（Super user / Store administrator）
- WebSocket / SSE
- 決済連携

---

## 5. ドキュメント・参照の整理

| 用途 | ファイル |
|------|----------|
| **ドキュメント索引（1 ページ目次）** | **backend/docs/DOCS_INDEX.md** |
| **現状の全体像・次の一手（再スタート用）** | **backend/docs/STATUS.md**（本ファイル） |
| **残タスクの優先順位・実行ウェーブ（#1〜18）** | **backend/docs/REMAINING_TASKS_PLAN_v1.0.md** |
| MVP タスク台帳・DoD | backend/docs/MVP_IMPLEMENTATION_PLAN.md |
| MVP 実装フロー | backend/docs/MVP_EXECUTION_RULES.md |
| **LINE 通知 E2E 確認手順（#2）** | backend/docs/LINE_NOTIFICATION_E2E_GUIDE_v1.0.md |
| **LINE 店舗別連携 要件** | backend/docs/LINE_STORE_INTEGRATION_REQUIREMENTS_v1.0.md |
| **LINE 店舗別連携 Fit&Gap** | backend/docs/LINE_STORE_INTEGRATION_FIT_GAP_v1.0.md |
| **セキュリティ Fit&Gap** | backend/docs/SECURITY_FIT_GAP_v1.0.md |
| LIFF セットアップ | backend/docs/LIFF_PHASE1_SETUP.md |
| 時系列の開発ログ（参照任意） | backend/docs/PROGRESS.md |
| 直近焦点（短縮版） | backend/docs/CURRENT_FOCUS.md |
| **管理画面 認証・ロール・ダッシュボード** | backend/docs/admin_auth_and_role_dashboard_spec_v1.2.1.md（仕様書）、admin_auth_and_role_dashboard_requirements_v1.1.md（要件定義） |
| **tugical / tugical+ 境界** | backend/docs/TUGICAL_PLUS_BOUNDARY_v1.0.md（単店舗＝tugical、多店舗・横断＝tugical+ 将来） |
| 仕様の参照 | backend/docs/tugical_*.md（システム・DB・API・要件・UI・テスト・デプロイ） |
| 開発ルール | ルート `.cursorrules` |

---

## 6. 開発環境の起動

```bash
# ルートで
make up
make health

# 管理画面
# http://localhost/admin/

# API
# http://localhost/api/v1/
```

**Docker 運用時**: React（`resources/js`）を修正した場合は **必ずビルド** する。未ビルドのままではブラウザに反映されない。

```bash
# コンテナ内でビルド（例: app コンテナ名の場合）
docker compose exec app npm run build
# または ルートで make がある場合
# make build など
```

---

## 7. βリリース最低条件（定義）

以下が揃えば「外部テスト導入可」とする：

- **LIFF 予約（単一メニュー）完走** … 顧客が LINE から予約まで一連の流れを完了できる
- **仮押さえ（10分）→ 確定予約** … 10分間の保持と確定処理が動作する
- **LINE 通知（予約完了／変更）** … 送信経路実装済・結合テスト OK。**実機 E2E は LINE チャネル設定後**（`LINE_NOTIFICATION_E2E_GUIDE_v1.0.md` 参照）
- **管理画面での予約確認・編集** … 店舗側で LIFF で入った予約を確認・編集できる（※すでに実装済み）

→ この4つが満たれた時点で β リリース可能と判断する。

**2026-07-06 時点の β 達成度**: 3/4（**LINE 通知の実機 E2E #2 のみ未達**）

**外部公開の最低条件**: M0.5（#1）+ M0（#2〜3）+ M1（#4〜8）。社内限定の機能確認のみなら #2〜3 先行可だが、**#1（password ログ）は外部アクセス前に必須**。

**※ βリリース時点では以下は対応しない**（将来の自分へのブレーキ・スコープ固定）：

- 決済連携
- WebSocket によるリアルタイム更新
- 細かな権限分岐（RBAC）

---

## 8. 方針メモ（スコープ・将来拡張）

tugical は単店舗の相棒をコアとし、多店舗・本部・横断機能は tugical+（上位プラン/オプション）として将来追加する。境界の定義は `backend/docs/TUGICAL_PLUS_BOUNDARY_v1.0.md` を参照。MVP では多店舗・テナント機能を実装しない。

---

**まとめ**: 管理画面・複数メニュー組み合わせ予約・LIFF 単一メニュー・LINE 通知経路・**#1 SEC / #4〜8 LINE 基盤**まで実装済み（MVP 68%）。**次は #2 LINE 通知実機 E2E**（β ブロッカー）→ **#3 LIFF 実機 E2E**。管理画面 UI 刷新は `644c6b1`。再スタートは **DOCS_INDEX.md → STATUS.md → REMAINING_TASKS_PLAN §4**。
