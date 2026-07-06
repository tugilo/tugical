# tugical 残タスク優先順位・実行計画書 v1.0

**Version**: 1.7  
**作成日時**: 2026-07-06 16:29:20  
**最終更新日時**: 2026-07-06 17:13:11  
**目的**: 未完了タスクを優先順位付けし、β リリースから MVP 完走までの実行順序を 1 ファイルで固定する。  
**位置づけ**: `STATUS.md`（現状）・`MVP_IMPLEMENTATION_PLAN.md`（タスク台帳）の**実行順序レイヤー**

> **v1.7 再整理（2026-07-06）**: 管理画面・セキュリティ監査を反映。**#1〜18** に拡張。P0.5 セキュリティゲート追加。P6-03 を P1 前段へ繰り上げ（外部 LIFF 前の SEC-L01）。

---

## 1. 参照ドキュメント（Related SSOT）

| 優先 | ドキュメント | 用途 |
|------|--------------|------|
| 1 | `DOCS_INDEX.md` | ドキュメント索引（再開用 1 ページ目次） |
| 2 | `MVP_EXECUTION_RULES.md` | Phase A スコープ・禁止事項 |
| 3 | `MVP_IMPLEMENTATION_PLAN.md` | タスク ID・完了条件の正 |
| 4 | `STATUS.md` | 現状サマリ・β 条件 |
| 5 | `CONCEPT_SPEC_FIT_GAP.md` / `CONCEPT_REQUIREMENTS_FIT_GAP.md` | 仕様解釈の判断 |
| 6 | `tugical_requirements_specification_v1.1.md` | [MVP] 要件タグ |
| 7 | `tugical_api_specification_v1.0.md` | LINE Webhook 等 API |
| 8 | `tugical_test_strategy_v1.0.md` | テスト優先順位 |
| 9 | `ADMIN_MUI_MIGRATION_PLAN_v1.0.md` | 管理画面 UI 改善（β とは独立） |
| 10 | `SECURITY_FIT_GAP_v1.0.md` | 暗号化・PII・ログ・LIFF セキュリティ Gap |
| 11 | `LINE_STORE_INTEGRATION_REQUIREMENTS_v1.0.md` | 店舗別 LINE 公式アカウント（P6 タスクの要件） |

**業種特化ブレーキ**: 現フェーズでは業種名をロジックに含めない。業種テンプレはリリース後オプション。

---

## 2. 現状サマリ（2026-07-06 時点）

| 領域 | 完了 | 残 | 備考 |
|------|------|-----|------|
| P1 基盤 | 6/6 | 0 | ✅ |
| P2 管理画面 | 11/12 | 1 | キャンセル期限・料金のみ |
| P3 LIFF | 7/8 | 1 | 複数メニュー LIFF |
| P4 LINE | 2/3 | 1 | Webhook 未実装 |
| P5 テスト | 0/4 | 4 | 未着手 |
| P6 LINE 店舗別 | 0/6 | 6 | ⬜（**P1/P2 に統合実行**。下表参照） |
| MUI Phase 5 | — | 検討中 | DataGrid PoC 未決 |
| **MVP 合計** | **27/40** | **13** | 69%（SEC-01 追加） |

### β リリース条件（4 項目中 1 未達）

| # | 条件 | 状態 |
|---|------|------|
| 1 | LIFF 予約（単一メニュー）完走 | ✅ 実装済（実機 E2E 要記録） |
| 2 | 仮押さえ 10 分 → 確定 | ✅ |
| 3 | LINE 通知（予約完了／変更）が届く | ⬜ **結合テスト OK・実機未確認** |
| 4 | 管理画面で予約確認・編集 | ✅ |

---

## 3. 優先順位の定義

| 優先度 | 名称 | 判断基準 | 着手タイミング |
|--------|------|----------|----------------|
| **P0.5** | セキュリティゲート | 外部テスト・本番相当環境の**前**に必須。β 機能確認とは別軸 | **#1 最優先**（数時間〜1日） |
| **P0** | β ブロッカー | STATUS §7 の未達条件。機能として外部デモ可能か | P0.5 の致命ログ修正後 |
| **P1** | MVP 必須（β 直後） | LINE 店舗基盤・Webhook・コアテスト・**LIFF 本人確認** | P0 完了後 |
| **P2** | MVP 拡張 | キャンセル料・複数メニュー・多店舗 E2E・残テスト | P1 の主要タスク後 |
| **P3** | 品質・UI 改善 | DataGrid 等。機能欠落ではない | P0 と**並行可** |
| **—** | スコープ外 | RBAC・WebSocket・決済・本部横断 | 実装しない |

### 3.1 v1.7 再整理の判断根拠（2026-07-06）

| 変更 | 旧 | 新 | 理由 |
|------|-----|-----|------|
| ログ機密除去 | #14 末尾 | **#1 P0.5** | SEC-R01（password ログ）は外部テスト前に**即修正** |
| LIFF 動的化 + ID token | #11 P2 | **#8 P1** | SEC-L01 なりすまし。外部 LIFF 利用前に必須 |
| セキュリティ残チェック | #14 全体 | **#15 P2** | ホットフィックス後の確認・PII スコープ明文化 |
| LINE 基盤順 | #3→4→5→6 | **維持** | 暗号化→UI→token→Webhook の依存関係 |
| β E2E | #1〜2 | **#2〜3** | #1 セキュリティゲートの直後 |

**2 つのゲート**:

1. **M0（β 機能）**: #2〜3 … LINE 通知・LIFF 実機 E2E
2. **M0.5（安全な外部公開）**: #1 + #4〜8 … ログ・暗号化・設定 UI・LIFF 本人確認

※ 社内限定の**機能確認のみ**なら #2〜3 先行可。ただし **password ログ（#1）はいかなる外部アクセス前にも必須**。

**P6 の扱い**（変更なし）:
- フェーズ ID は P6 のまま。実行順は P0.5→P0→P1→P2→P3 に統合。
- `MVP-P6-05` は `MVP-P4-01`（#7）に吸収。

**原則**:
- 番号の小さい未完了 # から着手（`MVP_EXECUTION_RULES.md`）。
- P3 は P0 と並行可だが、**β 判定に P3 を含めない**。
- 1 セッション = 1 タスク ID。

---

## 4. 残タスク一覧（統合優先順位 P0.5→P3）

> **この表が実行順序の正**。番号 1 から順に着手する。（**v1.7: #1〜18**）

| 順 | 優先 | タスク ID | 名称 | 種別 | 依存 |
|----|------|-----------|------|------|------|
| **1** | P0.5 | MVP-SEC-01 | ログ機密除去（SEC-R01/R03 最小） | 実装 | なし |
| **2** | P0 | MVP-P4-02（確認） | LINE 通知 E2E 実機確認 | 確認 | LINE 設定（暫定可） |
| **3** | P0 | MVP-P3-07（確認） | LIFF 単一メニュー実機 E2E 記録 | 確認 | LIFF URL・storeId |
| **4** | P1 | MVP-P6-01 | Store LINE 暗号化・integration 強化 | 実装 | なし |
| **5** | P1 | MVP-P6-02 | LINE 設定 API + 管理画面 UI | 実装 | P6-01 |
| **6** | P1 | MVP-P6-04 | 通知 store 別 token 完全化 | 実装 | P6-01 |
| **7** | P1 | MVP-P4-01 | LINE Webhook（**P6-05 routing 含む**） | 実装 | P6-01、#2 推奨 |
| **8** | P1 | MVP-P6-03 | LIFF 動的 liff_id + **ID token 検証** | 実装 | P6-02 |
| **9** | P1 | MVP-P5-01 | 予約 API Feature テスト | 実装 | #2 と並行可 |
| **10** | P1 | MVP-P5-03 | 空き時間・hold 整合性テスト | 実装 | P5-01 と並行可 |
| **11** | P2 | MVP-P2-10 | キャンセル期限・料金設定 | 実装 | なし |
| **12** | P2 | MVP-P3-08 | LIFF 複数メニュー組み合わせ | 実装 | #3 推奨 |
| **13** | P2 | MVP-P6-06 | 多店舗 LINE E2E（2 store 以上） | 確認 | P6-03、P4-01、P6-04 |
| **14** | P2 | MVP-P5-02 | LIFF API Feature テスト | 実装 | P3-08 または #3 後 |
| **15** | P2 | MVP-P5-04 | セキュリティ・非機能確認（**残項目**） | 確認 | #1、P5-01〜03 後 |
| **16** | P3 | UI-FIX-01 | MenuController `is_active` 修正 | バグ修正 | なし |
| **17** | P3 | UI-P5-POC | MenusPage DataGrid PoC | 実装 | UI-FIX-01 推奨 |
| **18** | P3 | UI-P5-DONE | MUI Phase 5 完了判定 | ドキュメント | UI-P5-POC 結果 |

※ `MVP-P6-05` は **#7 MVP-P4-01 の DoD に含める**（単独着手しない）。

### 4.5 管理画面 Fit&Gap サマリ（2026-07-06 コード監査）

> **詳細**: `LINE_STORE_INTEGRATION_FIT_GAP_v1.0.md` §4.4

| 領域 | Fit | Gap | 対応 # |
|------|-----|-----|--------|
| 顧客 CRUD・LINE プロフィール | ✅ | — | P2-08 完了 |
| 顧客 `line_user_id` 詳細編集 | API ✅ | UI ❌（ADMIN-G1） | **#5** |
| 店舗 LINE/LIFF 設定 UI | DB ✅ | Settings 未実装（ADMIN-G2） | **#5** |
| LIFF 店舗別 init | store_id URL ✅ | `VITE_LIFF_ID` 固定（ADMIN-G4） | **#8** |
| スタッフ管理 UI | DB のみ | [FUTURE] | — |

**#2 実機 E2E**: #5 完了前は SQL + `.env` + 顧客作成モーダルで暫定設定可能。

### 4.6 セキュリティ Fit&Gap サマリ（2026-07-06 監査）

> **詳細**: `SECURITY_FIT_GAP_v1.0.md`

| 領域 | 判定 | 主な Gap | 対応 # |
|------|------|----------|--------|
| LINE secret/token 暗号化 | ❌ | SEC-G01/G02 | **#4** |
| ログ password/PII | ❌ | SEC-R01〜R03 | **#1**（即）+ **#15**（残） |
| LIFF なりすまし | ❌ | SEC-L01 | **#8** |
| env token fallback | ❌ | SEC-G07 | **#6** |
| スタッフ password | ✅ ハッシュ | — | — |

**結論**: 「キー・個人情報は必ず暗号化」には**未達**。設計書記載と実装にギャップあり。

---

### P0.5 — セキュリティゲート（#1）

| 順 | タスク ID | 名称 |
|----|-----------|------|
| 1 | MVP-SEC-01 | ログ機密除去（SEC-R01/R03 最小） |

**#1 完了条件（DoD）**:
- [ ] `AuthController::login` から password / raw credentials を Log に出さない（SEC-R01）
- [ ] `CustomerController::update` 等の `request->all()` ログを PII マスク or 削除
- [ ] 変更後にログイン・顧客更新の smoke 確認
- [ ] `MVP_IMPLEMENTATION_PLAN.md` MVP-SEC-01 を ✅

---

### P0 — β ブロッカー（#2〜3）

| 順 | タスク ID | 名称 |
|----|-----------|------|
| 2 | MVP-P4-02（確認） | LINE 通知 E2E 実機確認 |
| 3 | MVP-P3-07（確認） | LIFF 単一メニュー実機 E2E 記録 |

**#2 完了条件（DoD）**:
- [x] 結合テスト: `LineBookingNotificationTest` 3 passed（2026-07-06）
- [x] 事前チェック: `php artisan tugical:verify-line-e2e` 追加
- [ ] 予約確定後、顧客 LINE に通知が届く（Yes）— **実機・要 LINE 設定**
- [ ] 予約変更後、顧客 LINE に通知が届く（Yes）— **実機・未実施**
- [ ] 送信メッセージに顧客名・日時・メニューが正しい（Yes）— **実機・未実施**
- [ ] 結果を `MVP_IMPLEMENTATION_PLAN.md` に記入 — 結合テスト分は記入済

**#2 手順（要約）**:
1. 店舗 LINE 設定（**暫定: SQL**。#5 完了後は管理画面）
2. `.env` `LINE_ACCESS_TOKEN`（**暫定**。#6 完了後は store token のみ）
3. 顧客 `line_user_id`（作成モーダル / LIFF / SQL）
4. 予約作成 → LINE 受信確認
5. 予約変更 → LINE 受信確認

**#3 完了条件（DoD）**:
- [ ] LINE 内ブラウザでメニュー→日付→時間→確認→完了まで完走（Yes）
- [ ] 管理画面に該当予約が表示される（Yes）
- [ ] 結果を `MVP_IMPLEMENTATION_PLAN.md` MVP-P3-07「確認結果」に記入

---

### P1 — MVP 必須（#4〜10）

| 順 | タスク ID | 名称 | 備考 |
|----|-----------|------|------|
| 4 | MVP-P6-01 | Store LINE 暗号化 | SEC-G01/G02 |
| 5 | MVP-P6-02 | LINE 設定 API + 管理画面 UI | ADMIN-G* |
| 6 | MVP-P6-04 | 通知 store 別 token 完全化 | SEC-G07 |
| 7 | MVP-P4-01 | Webhook + P6-05 routing | |
| 8 | MVP-P6-03 | LIFF 動的 liff_id + ID token | SEC-L01 |
| 9 | MVP-P5-01 | 予約 API Feature テスト | |
| 10 | MVP-P5-03 | hold 整合性テスト | |

**P1-4（MVP-P6-01）DoD** — Gap: SEC-G01, SEC-G02, SEC-G05, S-01:

- [ ] `line_channel_secret` / `line_access_token` に Laravel `encrypted` cast
- [ ] Eloquent 保存・読取 round-trip テスト
- [ ] 既存平文データの移行方針を PLAN に記載
- [ ] `hasLineIntegration()` が token + `line_integration_active` を含む
- [ ] `line_channel_id` UNIQUE index（NULL 許容）

**P1-5（MVP-P6-02）DoD** — Gap: ADMIN-G1〜G3, G5 / API-G1, G4:

- [ ] `GET /api/v1/store/line-settings` … マスク済み設定 + Webhook URL + LIFF URL
- [ ] `PUT /api/v1/store/line-settings` … Channel ID / Secret / Token / LIFF ID / 有効フラグ
- [ ] `POST /api/v1/store/line-settings/test-push` … 接続テスト
- [ ] `SettingsPage` … 「LINE 連携」ブロック（保存・有効/無効・test-push ボタン）
- [ ] `CustomerDetailModal` … `line_user_id` を編集可能に（ADMIN-G1。API は既存）
- [ ] 他店舗の設定を参照・更新不可

**P1-7（MVP-P4-01 + P6-05）DoD**:
- [ ] `POST /api/v1/line/webhook` ルート有効化
- [ ] `destination`（Channel ID）で store 特定
- [ ] 店舗別 `line_channel_secret` で署名検証
- [ ] 最低限: フォローイベントで 200 応答
- [ ] 店舗 A のイベントが店舗 B に混ざらない

**P1-8（MVP-P6-03）DoD** — Gap: SEC-L01, ADMIN-G4:

- [ ] `GET /api/v1/liff/stores/{id}/line-config` … liff_id + integration_active
- [ ] `liff/index.tsx` が store 別 liff_id で init（local のみ VITE_LIFF_ID fallback）
- [ ] `get-or-create` が LIFF ID token 検証済み `sub` のみ受け付ける

**P1-9 / P1-10 DoD**:
- [ ] 予約作成・更新・move・複数メニュー combination の Feature テストが CI で通る
- [ ] 仮押さえ中は他取得不可・期限切れ解放のテストが通る

---

### P2 — MVP 拡張（#11〜15）

| 順 | タスク ID | 名称 | 備考 |
|----|-----------|------|------|
| 11 | MVP-P2-10 | キャンセル期限・料金設定 | |
| 12 | MVP-P3-08 | LIFF 複数メニュー | |
| 13 | MVP-P6-06 | 多店舗 LINE E2E | |
| 14 | MVP-P5-02 | LIFF API Feature テスト | |
| 15 | MVP-P5-04 | セキュリティ・非機能（**#1 以外の残**） | SEC-G03/G04 等 |

**P2-9（MVP-P2-10）分解**:
1. DB: `stores` または専用設定に `cancel_deadline_minutes`, `cancel_fee_rules` 等
2. API: 取得・更新
3. UI: 設定画面 1 ブロック
4. 予約キャンセル時に期限・料金を参照

**P2-10（MVP-P3-08）分解**:
1. LIFF `BookingFlow` に複数メニュー選択 UI
2. 既存 combination / createBooking API 連携
3. 管理画面と同様に `booking_details` 複数行で確定

**P2-12（MVP-P6-06）DoD**:
- [ ] 店舗 A/B が別公式 LINE で LIFF + Push + Webhook が独立動作
- [ ] 本番で env LINE トークンに依存しない

**P2-15（MVP-P5-04）DoD** — #1 完了後の残項目:

- [ ] **SEC-G03/G04**: MVP で平文のままとする PII 範囲を文書化
- [ ] **SEC-L03**: 本番に LIFF `dev-user` bypass が残っていない
- [ ] HTTPS・CORS 本番設定確認
- [ ] `/api/health` の environment 露出方針
- [ ] LIFF 初回ロード 2 秒目安

~~SEC-R01/R03~~ → **#1 MVP-SEC-01 で吸収**

---

### P3 — 品質・UI 改善（#16〜18・β と独立・並行可）

| 順 | タスク ID | 名称 |
|----|-----------|------|
| 16 | UI-FIX-01 | MenuController `is_active` 修正 |
| 17 | UI-P5-POC | MenusPage DataGrid PoC |
| 18 | UI-P5-DONE | MUI Phase 5 完了判定 |

**根拠**:
- `ADMIN_LIST_UI_DATAGRID_EVALUATION_v1.0.md` → **案 B（段階導入）** 推奨
- `ADMIN_MENUS_IMPLEMENTATION_AUDIT_v1.0.md` → list ビューのみ PoC、grid は維持

**UI-FIX-01 内容**: `MenuController` index の `where('is_active', true)` 固定により非アクティブフィルタが 0 件になる問題を修正。

**UI-P5-POC DoD**:
- [ ] `@mui/x-data-grid` 利用（未導入なら追加）
- [ ] `viewMode === 'list'` のみ DataGrid 差し替え
- [ ] サーバページング・検索・フィルタを既存 `menuApi.getList` に接続
- [ ] grid カード表示・モーダルフローは変更なし
- [ ] `docker compose exec app npm run build` 成功

---

### スコープ外（実装しない）

| 項目 | 理由 |
|------|------|
| RBAC（Super user / Store administrator） | STATUS §7 β 対象外 |
| WebSocket / SSE | STATUS §7 β 対象外 |
| 決済連携 | STATUS §7 β 対象外 |
| 本部による LINE 一括管理 | tugical+（`TUGICAL_PLUS_BOUNDARY_v1.0.md`） |
| 業種テンプレ・業種分岐 | Phase A 方針 |

---

## 5. 実行ウェーブ（v1.7 推奨スケジュール）

```
Wave 0（即日）       #1      P0.5: ログ機密除去（SEC-R01）← 最優先
Wave 1（即日〜2日）  #2〜3   P0: LINE通知E2E + LIFF E2E → M0 β機能ゲート
Wave 2（1 週間）     #4〜8   P1-A: LINE基盤(暗号化→UI→token→Webhook→LIFF本人確認)
Wave 3（並行可）     #9〜10  P1-B: コア Feature テスト
Wave 4（1〜2 週）    #11〜15 P2: キャンセル + LIFF複数 + 多店舗E2E + 残セキュリティ
Wave 5（並行可）     #16〜18 P3: MenuController → DataGrid → Phase5
```

### 5.1 マイルストーン

| マイルストーン | 達成条件 | 対象（#） |
|----------------|----------|-----------|
| **M0.5: 安全ゲート** | password ログなし | **1** |
| **M0: β 機能ゲート** | STATUS §7 4 条件 Yes | **2, 3** |
| **M1: LINE 基盤完成** | 暗号化 + UI + Webhook + LIFF 本人確認 | **4〜8** |
| **M2: コアテスト** | 予約・hold CI 通過 | **9, 10** |
| **M3: MVP 機能完走** | P2 すべて ✅ | **11〜15** |
| **M4: 管理画面 UI** | Phase 5 完了 or PoC 確定 | **16〜18** |

**外部公開の最低条件**: **M0.5 + M0 + M1**（#1〜8）

### 5.2 次に着手すべき 1 タスク

**#1 `MVP-SEC-01` — ログ機密除去（P0.5）**

理由: SEC-R01（password ログ）は数時間で修正可能かつ外部テスト前必須。v1.7 で最優先に繰り上げ。

---

## 6. セッション運用ルール

1. **開始時**: 本 PLAN **§4 統合優先順位表**で `#` が最小の未完了タスクを選ぶ
2. **作業中**: `MVP_IMPLEMENTATION_PLAN.md` の該当タスク詳細を参照
3. **完了時**:
   - タスクステータスを `MVP_IMPLEMENTATION_PLAN.md` で ✅ に更新
   - 全体サマリー数字を更新
   - `PROGRESS.md` に日時・変更ファイル・要約を追記
   - P0/P1 完了時は `STATUS.md` の β 条件チェックを更新
4. **判断に迷ったら**: 実装を止め、`CONCEPT_*_FIT_GAP.md` を参照して PLAN に判断を追記

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| LINE トークン・チャネル未設定 | P0 が進まない | `LIFF_PHASE1_SETUP.md`・店舗 DB 設定を先に確認 |
| Webhook と通知の責務混在 | 保守性低下 | Webhook は受信・イベント振分のみ。Push は既存 NotificationService |
| DataGrid PoC が β を遅らせる | スコープ逸脱 | P3 は P0 完了を待たず並行可だが、**β 判定に P3 を含めない** |
| キャンセル料金の業種特化要求 | スコープ膨張 | 汎用ルールのみ。業種別は [TEMPLATE] として却下 |
| CURRENT_FOCUS.md | 直近焦点の短縮版（STATUS と同期） | 詳細は STATUS + 本 PLAN |

---

## 8. ドキュメント更新チェックリスト

タスク完了ごとに:

- [ ] `MVP_IMPLEMENTATION_PLAN.md` … ステータス・確認結果
- [ ] `PROGRESS.md` … 日時付きログ
- [ ] `STATUS.md` … β 条件・「次にやること」（M0/M1 到達時）
- [ ] UI タスク時 … `ADMIN_MUI_MIGRATION_PLAN_v1.0.md` Phase 5 ステータス
- [ ] 本 PLAN … 「最終更新日時」と必要なら進捗メモ

---

## 9. 変更履歴

| Version | 日時 | Changes | Author |
|---------|------|---------|--------|
| 1.7 | 2026-07-06 17:11:19 | **優先順位再整理**。#1〜18。P0.5 SEC-01 追加。P6-03 を #8 に繰上。Wave/Milestone 刷新 | tugilo inc. |
| 1.6 | 2026-07-06 17:08:52 | SECURITY_FIT_GAP 連携。§4.6 セキュリティサマリ。#3/#11/#14 DoD 拡充 | tugilo inc. |
| 1.5 | 2026-07-06 17:05:25 | 管理画面 Fit&Gap 反映。#4 P6-02 DoD 拡充（ADMIN-G1 顧客 line_user_id 編集）。#1 暫定回避手順 | tugilo inc. |
| 1.4 | 2026-07-06 16:50:15 | 関連ドキュメント全面同期。DOCS_INDEX 追加。P0-1→#1 表記統一 | tugilo inc. |
| 1.3 | 2026-07-06 16:47:00 | P6 を P0〜P3 に統合。#1〜17 の一本化優先順位表。P6-05 を P4-01 に吸収。Wave 2.5 / P1.5 廃止 | tugilo inc. |
| 1.2 | 2026-07-06 16:41:56 | P1.5 LINE 店舗別連携タスク・Wave 2.5 追加 | tugilo inc. |
| 1.1 | 2026-07-06 16:33:39 | P0-1 着手。結合テスト・verify コマンド・recordNotification 修正 | tugilo inc. |
| 1.0 | 2026-07-06 16:29:20 | 初版。残 6 MVP タスク + UI 改善 3 タスクの優先順位・ウェーブ・DoD を定義。 | tugilo inc. |
