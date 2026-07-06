# tugical 店舗別 LINE 公式アカウント連携 要件定義書 v1.0

**Version**: 1.0（要件定義 v1.2 追補）  
**作成日時**: 2026-07-06 16:41:56  
**最終更新日時**: 2026-07-06 17:08:52  
**Author**: tugilo inc.  
**位置づけ**: `tugical_requirements_specification_v1.1.md` の LINE 連携要件を、**複数公式アカウント・DB 管理**の観点で具体化する追補仕様  
**関連**: `DOCS_INDEX.md`、`TUGICAL_PLUS_BOUNDARY_v1.0.md`、`LINE_STORE_INTEGRATION_FIT_GAP_v1.0.md`、`REMAINING_TASKS_PLAN_v1.0.md` §4（#3〜6, #11〜12）

---

## 1. 概要

### 1.1 目的

1 つの tugical システム上で、**店舗ごとに独立した LINE 公式アカウント**（Messaging API チャネル + LIFF）を登録・運用できるようにする。

- 店舗 A の顧客 → 店舗 A の公式 LINE から LIFF 予約・Push 通知
- 店舗 B の顧客 → 店舗 B の公式 LINE から LIFF 予約・Push 通知
- データ・認証情報は **store_id で完全分離**

### 1.2 スコープ

| 区分 | 内容 |
|------|------|
| **含む [MVP]** | 店舗 DB による LINE 設定管理、LIFF 動的 init、store 別 Push、Webhook の store 解決、管理画面設定 UI、接続テスト |
| **含まない** | 1 公式アカウントで複数店舗運用、本部による一括 LINE 設定（tugical+）、リッチメニュー本格運用、業種別 LINE 分岐 |
| **将来 [FUTURE]** | 短期トークン自動更新、リッチメニュー編集、Messaging API レート監視ダッシュボード |

### 1.3 tugical / tugical+ 境界

- **tugical（本要件）**: 1 契約 = 1 店舗が **自店舗の** LINE 公式アカウントを登録する
- **tugical+（対象外）**: 本部が複数店舗の LINE 設定を横断管理・一括配布する

複数店舗が **同一システムに共存**することは tugical SaaS の前提。**横断管理 UI** は tugical+。

---

## 2. 用語

| 用語 | 定義 |
|------|------|
| **Messaging API チャネル** | LINE Developers 上のチャネル。公式アカウント 1 つに相当 |
| **Channel ID** | Webhook の `destination` と一致。store 特定キー |
| **Channel Secret** | Webhook 署名検証用 |
| **Channel Access Token** | Push メッセージ送信用 |
| **LIFF ID** | 店舗公式アカウント配下の LIFF アプリ ID |
| **line_user_id** | LINE ユーザーの一意 ID。顧客は store_id と組み合わせて管理 |

---

## 3. 機能要件

### 3.1 店舗 LINE 連携設定（管理者） **[MVP]**

#### 3.1.1 登録項目

| 項目 | DB カラム | 必須 | 説明 |
|------|-----------|------|------|
| Channel ID | `stores.line_channel_id` | ○ | Messaging API チャネル ID |
| Channel Secret | `stores.line_channel_secret` | ○ | 暗号化保存 |
| Channel Access Token | `stores.line_access_token` | ○ | 暗号化保存。Push 用 |
| LIFF ID | `stores.line_liff_id` | ○ | 当店舗 LIFF アプリ |
| 連携有効 | `stores.line_integration_active` | ○ | false 時は LIFF/通知/Webhook 処理を停止 |

#### 3.1.2 管理画面

- 設定画面（Settings）に **「LINE 連携」ブロック**を追加
- 表示専用: Webhook URL、LIFF URL（コピー可能）
- 操作: 保存、有効/無効切替、**接続テスト**（テスト Push）
- Secret / Token は **マスク表示**（入力時のみ更新、一覧に平文表示しない）

#### 3.1.3 API

- `GET /api/v1/stores/line-settings` … マスク済み設定取得
- `PUT /api/v1/stores/line-settings` … 設定更新（自 store_id のみ）
- `POST /api/v1/stores/line-settings/test-push` … 接続テスト

#### 3.1.4 受け入れ条件

- [ ] 店舗管理者が Channel ID / Secret / Token / LIFF ID を登録できる
- [ ] 他店舗の設定を参照・更新できない
- [ ] 接続テストで Push API が成功する（または失敗理由が表示される）

#### 3.1.5 実装状況（2026-07-06 コード監査）

| 項目 | 状態 |
|------|------|
| 管理画面 SettingsPage | ❌ プレースホルダーのみ（ADMIN-G2） |
| LINE 設定 API | ❌ 未実装（API-G1） |
| 顧客 `line_user_id` 詳細編集 | 🟡 API可・UI未（ADMIN-G1） |

**Fit&Gap 詳細**: `LINE_STORE_INTEGRATION_FIT_GAP_v1.0.md` §4.4  
**対応タスク**: `REMAINING_TASKS_PLAN` **#4** MVP-P6-02

---

### 3.2 LIFF（顧客予約） **[MVP]**

| ID | 要件 |
|----|------|
| L-01 | LIFF 初期化は **`store_id` から `line_liff_id` を API 取得**し、動的に `liff.init({ liffId })` する |
| L-02 | グローバル `VITE_LIFF_ID` は **開発フォールバックのみ**（本番ビルドでは未設定可） |
| L-03 | LIFF URL 形式: `https://{app-domain}/liff?store_id={id}` または `/liff/{id}` |
| L-04 | LINE Developers の LIFF エンドポイント URL は上記形式で **店舗共通パス + store_id クエリ** |
| L-05 | `getOrCreateCustomer` は `store_id` + `line_user_id` で顧客特定（現状維持） |
| L-06 | 同一 LINE ユーザーが店舗 A/B で予約 → **別 customers レコード**（現状維持） |
| L-07 | `line_integration_active=false` の店舗は LIFF で「現在予約を受け付けていません」表示 |

#### 受け入れ条件

- [ ] 店舗 A・B が異なる LIFF ID でそれぞれ独立に予約完走できる
- [ ] store_id 未指定・無効店舗はエラー表示

---

### 3.3 Messaging API / 通知 **[MVP]**

| ID | 要件 |
|----|------|
| N-01 | Push 送信は **対象 store の `line_access_token` のみ**使用 |
| N-02 | 本番環境で `env('LINE_ACCESS_TOKEN')` フォールバック **禁止** |
| N-03 | 開発環境のみ env フォールバック可（`.env.example` に明記） |
| N-04 | `hasLineIntegration()` = channel_id + secret + active + token 存在 |
| N-05 | 予約確定・変更・キャンセル・リマインダーは N-04 満たす場合のみ送信 |
| N-06 | 送信結果を `notifications` に store_id 付きで記録 |

#### 受け入れ条件

- [ ] 店舗 A の予約 → 店舗 A の token で Push
- [ ] 店舗 B の token が店舗 A の送信に使われない

---

### 3.4 Webhook **[MVP]**

| ID | 要件 |
|----|------|
| W-01 | エンドポイント: `POST /api/v1/line/webhook`（全店舗共通 URL） |
| W-02 | ペイロード `destination`（Channel ID）で **store を特定** |
| W-03 | 署名検証: 該当 store の `line_channel_secret` |
| W-04 | イベント処理は store_id スコープ（follow / message 等） |
| W-05 | 未知 destination: HTTP 200 + ログ記録（LINE 再送抑制） |
| W-06 | 管理画面に Webhook URL を表示（LINE Developers 設定用） |

#### 受け入れ条件

- [ ] 店舗 A の follow イベントが店舗 B に影響しない
- [ ] 署名不一致は 401/403

---

### 3.5 セキュリティ・非機能 **[MVP]**

| ID | 要件 |
|----|------|
| S-01 | `line_channel_secret` / `line_access_token` は **暗号化保存**（Laravel encrypted cast） |
| S-02 | API レスポンスに secret/token 平文を返さない |
| S-03 | 設定変更は監査ログ（store_id, user_id, changed_fields, timestamp） |
| S-04 | 1 店舗の LINE API 障害が他店舗処理をブロックしない |
| S-05 | クロステナント: store_id 不一致アクセスは 403 |

#### 3.5.1 実装状況（2026-07-06）

| 要件 | 状態 | 参照 |
|------|------|------|
| S-01 | ❌ 平文保存可能 | SEC-G01/G02 → **#3** |
| S-02〜S-03 | ❌ API/UI 未実装 | **#4** |
| S-05 | 🟡 管理 API のみ | **#4** で LINE 設定も |
| 顧客 PII 暗号化 | 🟡 部分 | `SECURITY_FIT_GAP_v1.0.md` §2 |
| ログ・LIFF リスク | ❌ 複数 Gap | `SECURITY_FIT_GAP_v1.0.md` §4〜5 |

---

## 4. データ要件

### 4.1 現行スキーマ（変更不要を基本）

`stores` テーブル既存カラムで足りる。新規テーブルは **Phase 1 では不要**。

| カラム | 用途 |
|--------|------|
| `line_channel_id` | Webhook routing key |
| `line_channel_secret` | 署名検証（暗号化） |
| `line_access_token` | Push（暗号化） |
| `line_liff_id` | LIFF init |
| `line_integration_active` | 有効フラグ |

### 4.2 インデックス（追加検討）

- `stores.line_channel_id` に **UNIQUE インデックス**（Webhook ルックアップ高速化・重複防止）

### 4.3 顧客

- `customers.line_user_id` + `customers.store_id` でユニーク制約（同一店舗内）

---

## 5. 運用・オンボーディング

### 5.1 新店舗 LINE 設定チェックリスト

1. LINE Developers で Messaging API チャネル作成
2. 公式アカウント開設・友だち追加 URL 確認
3. Channel access token（長期）発行
4. LIFF アプリ作成（エンドポイント = tugical LIFF URL + store_id）
5. Webhook URL = `{APP_URL}/api/v1/line/webhook`、Webhook 利用 ON
6. tugical 管理画面で 4 項目登録 → 接続テスト

### 5.2 開発環境

- 単一チャネルで `store_id=1` のみ設定すれば E2E 可能
- `php artisan tugical:verify-line-e2e --store=1` で事前チェック

---

## 6. 実装順序（REMAINING_TASKS_PLAN 連動）

> **実行順序の正**: `REMAINING_TASKS_PLAN_v1.0.md` §4（#1〜18）

| # | 優先 | タスク ID | 内容 |
|---|------|-----------|------|
| 1〜2 | P0 | P4-02, P3-07 | β E2E 確認 |
| 3 | P1 | P6-01 | 暗号化 + integration |
| 4 | P1 | P6-02 | 設定 API + UI |
| 5 | P1 | P6-04 | token 完全化 |
| 6 | P1 | P4-01 | Webhook（**P6-05 吸収**） |
| 7〜8 | P1 | P5-01, P5-03 | コアテスト |
| 9〜10 | P2 | P2-10, P3-08 | キャンセル + LIFF 複数メニュー |
| 11 | P2 | P6-03 | LIFF 動的 liff_id |
| 12 | P2 | P6-06 | 多店舗 E2E |
| 13〜14 | P2 | P5-02, P5-04 | 残テスト |

※ P6-05 は #6 に含め、単独着手しない。

---

## 7. 変更履歴

| Version | 日時 | Changes | Author |
|---------|------|---------|--------|
| 1.3 | 2026-07-06 17:05:25 | §3.1.5 管理画面実装状況（Fit&Gap 参照） | tugilo inc. |
| 1.3 | 2026-07-06 17:08:52 | §3.5.1 セキュリティ実装状況。SECURITY_FIT_GAP 参照 | tugilo inc. |
| 1.2 | 2026-07-06 16:50:15 | DOCS_INDEX・CONCEPT_SPEC §10 参照追加 | tugilo inc. |
| 1.1 | 2026-07-06 16:47:00 | 実装順序を REMAINING_TASKS_PLAN #1〜17 に統合 | tugilo inc. |
| 1.0 | 2026-07-06 16:41:56 | 初版 | tugilo inc. |
