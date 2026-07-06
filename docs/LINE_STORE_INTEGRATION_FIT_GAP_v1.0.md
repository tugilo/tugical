# 店舗別 LINE 連携 Fit & Gap v1.0

**Version**: 1.4  
**作成日時**: 2026-07-06 16:41:56  
**最終更新日時**: 2026-07-06 17:08:52  
**目的**: `LINE_STORE_INTEGRATION_REQUIREMENTS_v1.0.md` と現行実装・各仕様書の一致／差分を整理し、実装判断の正とする  
**関連**: `DOCS_INDEX.md`、`SECURITY_FIT_GAP_v1.0.md`、`CONCEPT_SPEC_FIT_GAP.md` §10、`REMAINING_TASKS_PLAN_v1.0.md` §4

---

## 1. 結論（要約）

| 観点 | 判定 |
|------|------|
| **アーキテクチャ上の実現可能性** | ✅ 可能。store_id 分離と stores カラムで設計済み |
| **DB** | 🟡 カラム充足。暗号化・UNIQUE index・cast が未実装 |
| **API** | 🟡 LIFF/store 分離 OK。LINE 設定 API・Webhook ルーティング未実装 |
| **フロント** | ❌ LIFF がグローバル `VITE_LIFF_ID` 依存。SettingsPage はプレースホルダーのみ |
| **管理画面（顧客・LINE・LIFF）** | 🟡 顧客 CRUD は可。店舗 LINE/LIFF 設定 UI なし。`line_user_id` 詳細編集不可 |
| **通知** | 🟡 store token 対応済みだが env フォールバック残存 |
| **本番 SaaS 就绪** | ❌ 上記 Gap 解消後 |

---

## 2. データベース設計書 v1.2 との Fit & Gap

### 2.1 Fit（そのまま使える）

| 項目 | 根拠 |
|------|------|
| `stores.line_channel_id` | migration `2025_06_29_235127_create_stores_table.php` L59 |
| `stores.line_channel_secret` | 同上 L60（comment: 暗号化） |
| `stores.line_access_token` | 同上 L61 |
| `stores.line_liff_id` | 同上 L62 |
| `stores.line_integration_active` | 同上 L63 |
| `customers.line_user_id` + `store_id` | 店舗スコープ顧客 |
| `notifications.store_id` | 通知履歴の店舗分離 |

### 2.2 Gap（実装で埋める）

| Gap ID | 仕様/要件 | 現状 | 対応 |
|--------|-----------|------|------|
| DB-G1 | secret/token 暗号化 | 平文 TEXT 保存可能 | Store モデル `encrypted` cast |
| DB-G2 | `line_channel_id` UNIQUE | インデックスなし | migration 追加（NULL 許容 UNIQUE） |
| DB-G3 | `(store_id, line_user_id)` UNIQUE | 要確認 | なければ migration 追加 |
| DB-G4 | 監査ログテーブル | なし | Phase 1 は `settings` JSON または log ファイルで代替可。専用テーブルは [FUTURE] |

### 2.3 変更不要（スコープ固定）

- 新規 `line_channels` テーブル … **Phase 1 では作らない**（stores カラムで足りる）
- tenant 横断 LINE 設定 … tugical+ [FUTURE]

---

## 3. API 仕様書 v1.2 との Fit & Gap

### 3.1 Fit

| 項目 | 根拠 |
|------|------|
| LIFF API store_id 前提 | `LiffController` 全エンドポイント |
| `POST /api/v1/line/webhook` | api spec §10（未実装だが URL 設計一致） |
| Webhook `destination` フィールド | api spec L1080 |
| Push は Messaging API | NotificationService |

### 3.2 Gap

| Gap ID | 仕様 | 現状 | 対応 |
|--------|------|------|------|
| API-G1 | LINE 設定 CRUD | StoreController に LINE 専用なし | `GET/PUT stores/line-settings` 追加 |
| API-G2 | Webhook store 解決 | ルートコメントアウト | `LineWebhookController` + destination lookup |
| API-G3 | LIFF liff_id 取得 API | なし | `GET /api/v1/liff/stores/{id}/config` 等 |
| API-G4 | 接続テスト API | artisan のみ | `POST stores/line-settings/test-push` |
| API-G5 | 署名検証 | NotificationService::handleLineWebhook 骨格のみ | Controller で secret 取得→検証 |

### 3.3 Webhook ルーティング設計（確定案）

```
POST /api/v1/line/webhook
  ↓
body.destination (= Channel ID)
  ↓
Store::where('line_channel_id', $destination)->first()
  ↓
store.line_channel_secret で HMAC-SHA256 署名検証
  ↓
store_id スコープでイベント処理
```

**エラー方針**:

| ケース | HTTP | 理由 |
|--------|------|------|
| 署名不一致 | 401 | セキュリティ |
| 未知 destination | 200 | LINE 無限再送回避 |
| store inactive | 200 + skip | 運用上安全 |

---

## 4. システム仕様・実装コード Fit & Gap

### 4.1 Store モデル

| 項目 | 現状 | Gap |
|------|------|-----|
| `hasLineIntegration()` | channel_id + secret のみ | token + active チェック追加（REQ N-04） |
| `getLiffUrl()` | line_liff_id 参照 OK | — |
| 暗号化 cast | なし | DB-G1 |

### 4.2 NotificationService

| 項目 | 現状 | Gap |
|------|------|-----|
| `getLineAccessToken($storeId)` | store → env fallback | 本番 env 禁止（REQ N-02） |
| `sendLineMessage` | store token 使用 OK | — |
| `recordNotification` | 2026-07-06 修正済（channel 整合） | message 空時フォールバック要検討 |

### 4.3 LIFF フロント

| ファイル | 現状 | Gap |
|----------|------|-----|
| `pages/liff/index.tsx` L36 | `VITE_LIFF_ID` 固定 init | store API から liff_id 取得後 init |
| store_id 取得 | URL クエリ OK | — |

**推奨フロー**:

```
1. getStoreIdFromUrl()
2. GET /api/v1/liff/stores/{storeId}/line-config → { liff_id, integration_active }
3. liff.init({ liffId: config.liff_id })
4. 以降現行フロー
```

### 4.4 管理画面（2026-07-06 コード監査）

> 監査対象: 利用者（顧客）管理 / 店舗 LINE 設定 / LIFF 設定 / `/admin/settings`

#### 4.4.1 サマリ表

| 領域 | 要件（REQ §3） | 現状 | 判定 | Gap ID | 対応タスク |
|------|----------------|------|------|--------|------------|
| **顧客一覧・CRUD** | 店舗スコープ顧客管理 | `CustomersPage` + `CustomerController` CRUD | ✅ Fit | — | MVP-P2-08 完了 |
| **顧客 LINE プロフィール** | 表示名・画像 | 詳細モーダルで表示・編集可 | ✅ Fit | — | — |
| **顧客 `line_user_id`** | Push 送信先 | API は更新可。UI は**作成時のみ**入力、詳細は**表示のみ** | 🟡 Gap | ADMIN-G1 | **#4 P6-02** に含める |
| **店舗 LINE 設定 UI** | Settings「LINE 連携」ブロック | `SettingsPage` は「実装中」プレースホルダーのみ | ❌ Gap | ADMIN-G2 | **#4 P6-02** |
| **LINE 設定 API** | GET/PUT/test-push | ルート未定義。`StoreController` は time-slot のみ | ❌ Gap | API-G1 | **#4 P6-02** |
| **Webhook / LIFF URL 表示** | コピー可能表示 | なし（`Store::getLiffUrl()` はモデルのみ） | ❌ Gap | ADMIN-G3 | **#4 P6-02** |
| **LIFF 動的 init** | store 別 `line_liff_id` | `liff/index.tsx` が `VITE_LIFF_ID` 固定 | ❌ Gap | ADMIN-G4 | **#8 P6-03** |
| **接続テスト UI** | 管理画面から test Push | `tugical:verify-line-e2e` のみ | 🟡 Gap | ADMIN-G5 | **#4 P6-02**（API 連携） |
| **時間スロット設定 UI** | 設定画面 | API のみ（Timeline 内部 GET）。Settings 未接続 | 🟡 Gap | ADMIN-G6 | MVP-P2-05 範囲外（別途） |
| **スタッフアカウント管理** | RBAC | DB `staff_accounts` のみ。管理 UI なし | — | ADMIN-G7 | [FUTURE] RBAC |

#### 4.4.2 根拠（コード参照）

| 項目 | ファイル | 内容 |
|------|----------|------|
| Settings 未実装 | `resources/js/pages/admin/settings/SettingsPage.tsx` L28 | `設定機能は実装中です...` |
| LINE 設定 API なし | `routes/api.php` L107-108 | `store/time-slot-settings` のみ。`line-settings` なし |
| 顧客 API（line_user_id 更新可） | `UpdateCustomerRequest.php` L46 | `line_user_id` nullable 許可 |
| 顧客 UI（詳細で編集不可） | `CustomerDetailModal.tsx` L669-677 | `line_user_id` は `<p>` 表示のみ |
| 顧客 UI（作成で入力可） | `CustomerCreateModal.tsx` L421-444 | 新規作成時のみ入力フィールド |
| LIFF 固定 ID | `pages/liff/index.tsx` L36 | `liff.init({ liffId: VITE_LIFF_ID })` |
| DB カラム | `create_stores_table.php` L58-63 | LINE 4 項目 + `line_integration_active` |

#### 4.4.3 #1 E2E への影響（暫定回避）

| 必要設定 | 管理画面から | 現状の回避策 |
|----------|--------------|--------------|
| 店舗 Channel ID / Secret / Token | ❌ | SQL で `stores` 更新 + `.env` `LINE_ACCESS_TOKEN` |
| LIFF ID | ❌ | `.env` `VITE_LIFF_ID` + `npm run build` |
| 顧客 `line_user_id` | ⚠️ 作成時のみ | 新規顧客作成モーダル、LIFF getOrCreateCustomer、または SQL |

**#5 P6-02 完了後**: 上記 3 点を管理画面のみで設定可能にする（LIFF init 動的化は **#8**）。

#### 4.4.4 旧 4.4（SettingsPage LINE ブロック）

| 項目 | 現状 | Gap |
|------|------|-----|
| SettingsPage LINE ブロック | なし | MVP-P6-02（ADMIN-G2） |
| Webhook/LIFF URL 表示 | なし | 設定 API レスポンスに含める（ADMIN-G3） |

### 4.5 環境変数

| 変数 | 現状用途 | 将来 |
|------|----------|------|
| `LINE_ACCESS_TOKEN` | 全店舗 fallback | 開発のみ |
| `VITE_LIFF_ID` | ビルド時 LIFF | 開発のみ |
| `LINE_LIFF_ID` | .env.example | 開発のみ |

本番: **すべて stores カラムから解決**。

---

## 5. セキュリティ Fit & Gap

> **詳細（暗号化・ログ・LIFF・他要件外リスク）**: `SECURITY_FIT_GAP_v1.0.md`

| 要件 | 現状 | Gap ID | 対応 |
|------|------|--------|------|
| S-01 暗号化 | 未実装 | SEC-G01/G02 | **#4 P6-01** encrypted cast |
| S-02 API マスク | 未実装 | — | **#4 P6-02** Resource |
| S-03 監査ログ | 未実装 | — | **#4 P6-02** Log::info |
| S-05 テナント分離 | TenantScope あり | — | LINE 設定 API でも store_id 強制 |
| 顧客 PII 部分暗号化 | phone/email/address のみ | SEC-G03/G04 | **#14 P5-04** スコープ明文化 |
| ログへの機密 | password/PII ログあり | SEC-R01〜R03 | **#14 P5-04** |
| LIFF line_user_id なりすまし | クライアント申告のみ | SEC-L01 | **#8 P6-03** ID token 検証 |

---

## 6. テスト Fit & Gap

| 項目 | 現状 | 必要 |
|------|------|------|
| `LineBookingNotificationTest` | 1 store / Http::fake | ✅ あり |
| 多 store 通知分離 | なし | store A token ≠ store B |
| Webhook routing | test_strategy 記載のみ | Feature test 追加 |
| LIFF config API | なし | Feature test 追加 |

---

## 7. 実装優先順位（REMAINING_TASKS_PLAN 統合順）

| # | 優先 | Gap / タスク | 備考 |
|---|------|--------------|------|
| 1〜2 | P0 | β E2E | LINE 通知・LIFF 実機（現行 env でも可） |
| 3 | P1 | DB-G1, API-G1 一部 / **P6-01** | 暗号化・integration |
| 4 | P1 | API-G1 / **P6-02** | 設定 API + UI |
| 5 | P1 | Notification env / **P6-04** | token 完全化 |
| 6 | P1 | API-G2, API-G5 / **P4-01 + P6-05** | Webhook routing |
| 7〜8 | P1 | **P5-01, P5-03** | コアテスト |
| 9〜10 | P2 | **P2-10, P3-08** | キャンセル・LIFF 複数メニュー |
| 11 | P2 | API-G3, LIFF フロント / **P6-03** | 動的 liff_id（ADMIN-G4） |
| 12 | P2 | **P6-06** | 多店舗 E2E |
| 13〜14 | P2 | **P5-02, P5-04** | 残テスト |
| — | P6-02 に含む | ADMIN-G1, ADMIN-G3, ADMIN-G5 | 顧客 line_user_id 編集・URL 表示・test-push UI |
| — | [FUTURE] | ADMIN-G7 | スタッフアカウント管理 UI |
| — | P6-01 に含む | DB-G2, DB-G3 | index・ユニーク制約 |

---

## 8. 判断ルール（実装時）

1. **仕様書に単一 LINE 設定の記載があっても**、本 Fit&Gap を正とし店舗 DB 管理に寄せる
2. **env フォールバック**は `APP_ENV=local` のみ。staging/production では token 未設定 = 送信スキップ + ログ
3. **業種名による LINE 分岐**は禁止（`.cursorrules` 準拠）
4. **1 チャネル複数店舗**要件が出たら別 RFC。本 Gap スコープ外

---

## 9. 変更履歴

| Version | 日時 | Changes | Author |
|---------|------|---------|--------|
| 1.4 | 2026-07-06 17:08:52 | §5 を SECURITY_FIT_GAP へ拡張・SEC-* Gap ID 連携 | tugilo inc. |
| 1.3 | 2026-07-06 17:05:25 | §4.4 管理画面 Fit&Gap 詳細（コード監査）。ADMIN-G1〜G7。#1 E2E 暫定回避表 | tugilo inc. |
| 1.2 | 2026-07-06 16:50:15 | DOCS_INDEX・CONCEPT_SPEC §10 参照追加 | tugilo inc. |
| 1.2 | 2026-07-06 17:13:11 | PLAN v1.7 番号同期（#4/#5/#8） | tugilo inc. |
| 1.1 | 2026-07-06 16:47:00 | 優先順位を REMAINING_TASKS_PLAN #1〜18 に統合 | tugilo inc. |
| 1.0 | 2026-07-06 16:41:56 | 初版 | tugilo inc. |
