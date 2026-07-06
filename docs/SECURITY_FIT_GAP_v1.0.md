# tugical セキュリティ Fit & Gap v1.0

**Version**: 1.1  
**最終更新日時**: 2026-07-06 17:13:11  
**目的**: 暗号化・個人情報・認証・公開 API 等のセキュリティ要件と現行実装の差分を整理し、PLAN への漏れなく反映する  
**関連**: `LINE_STORE_INTEGRATION_FIT_GAP_v1.0.md` §5、`LINE_STORE_INTEGRATION_REQUIREMENTS_v1.0.md` §3.5、`REMAINING_TASKS_PLAN_v1.0.md` §4.6

---

## 1. 結論（要約）

| 観点 | 判定 | 備考 |
|------|------|------|
| **LINE 秘密情報の保存** | ❌ 平文可能 | secret/token に encrypted cast なし |
| **顧客 PII 暗号化** | 🟡 部分のみ | phone/email/address のみ。構造化住所・氏名等は平文 |
| **スタッフ password** | ✅ bcrypt ハッシュ | `StaffAccount` `hashed` cast |
| **テナント分離** | 🟡 概ね OK | TenantScope + Controller 403。LIFF は store_id パラメータ依存 |
| **LIFF 公開 API** | 🟡 要 hardening | `line_user_id` をクライアント申告のみ（なりすましリスク） |
| **ログへの機密混入** | ❌ 複数箇所 | ログイン credentials・request->all() 等 |
| **要件 S-01〜S-05** | 🟡 一部未達 | 詳細 §3 |

**「キー・個人情報は必ず暗号化保存」には未達。** DB 設計書・LINE 要件の記載と実装にギャップあり。

---

## 2. 暗号化・個人情報（保存時）

### 2.1 Fit（実装済み）

| ID | 対象 | 実装 | 根拠 |
|----|------|------|------|
| SEC-E01 | スタッフ `password` | bcrypt ハッシュ | `StaffAccount` `'password' => 'hashed'` |
| SEC-E02 | 顧客 `phone` | Laravel `encrypt()`（保存時 mutator） | `Customer::setPhoneAttribute` |
| SEC-E03 | 顧客 `email` | 同上 | `Customer::setEmailAttribute` |
| SEC-E04 | 顧客 `address`（旧・完全住所 TEXT） | 同上 | `Customer::setAddressAttribute` |
| SEC-E05 | 復号 | accessor + `eyJpdiI6` 判定 | `Customer::getPhoneAttribute` 等 |
| SEC-E06 | 暗号化列長 | migration 500 文字拡張 | `2025_07_04_214148_fix_customers_encrypted_fields_length.php` |

**方式**: アプリケーション層暗号化（`APP_KEY` 依存）。MariaDB TDE は未使用。

### 2.2 Gap（未暗号化・不完全）

| Gap ID | 対象 | 設計/要件 | 現状 | リスク | PLAN 対応 |
|--------|------|-----------|------|--------|-----------|
| **SEC-G01** | `stores.line_channel_secret` | 暗号化（S-01, DB-G1） | 平文 TEXT | **高** — LINE チャネル乗っ取り | **#3 P6-01** |
| **SEC-G02** | `stores.line_access_token` | 同上 | 平文 TEXT | **高** — Push 不正送信 | **#3 P6-01** |
| **SEC-G03** | 顧客 `postal_code`〜`address_line2` | DB 設計「住所暗号化」意図 | 平文 | **中** — PII 漏えい | **#14 P5-04** チェックリスト + 将来 PII 統一 |
| **SEC-G04** | 顧客 `name`, `name_kana`, `birthday`, `notes` | 要件明示なし | 平文 | **中** — 業務上 PII | **#14 P5-04** で MVP スコープ明文化 |
| **SEC-G05** | Eloquent バイパス | 暗号化は mutator 経由のみ | SQL/`DB::` 直書きで平文 | **中** | **#3 P6-01** テスト + 運用ルール |
| **SEC-G06** | 顧客 phone/email 検索 | — | LIKE on 暗号化列 → **検索不能** | **低〜中**（機能+設計不整合） | **#14 P5-04** または顧客検索 refactor [FUTURE] |
| **SEC-G07** | `.env` `LINE_ACCESS_TOKEN` | 開発用 | 本番でも fallback 可能 | **高**（本番） | **#5 P6-04** |
| **SEC-G08** | セッション DB 暗号化 | — | `session.encrypt => false` | **低**（Sanctum 主体） | **#14 P5-04** 確認 |

### 2.3 暗号化の前提・制約

- **APP_KEY ローテーション**時は既存 `encrypt()` データの再暗号化が必要（手順未整備 → **SEC-G09** [FUTURE]）
- **`$encrypted` プロパティ**（Customer L127）は Laravel 標準 cast ではなく**宣言のみ**（mutator が実体）
- **二重暗号化**: mutator は平文判定なしで再 `encrypt()` する可能性（更新パス要確認 → **SEC-G10** 低）

---

## 3. 要件 S-01〜S-05 との対応（LINE 店舗別）

| 要件 ID | 内容 | 状態 | Gap / タスク |
|---------|------|------|--------------|
| S-01 | secret/token encrypted cast | ❌ | SEC-G01/G02 → **#3** |
| S-02 | API で secret/token 平文返却禁止 | ❌（設定 API 未実装） | **#4 P6-02** Resource マスク |
| S-03 | 設定変更監査ログ | ❌ | **#4 P6-02** Log::info 最低限 |
| S-04 | 店舗障害の連鎖ブロックなし | 未評価 | **#14 P5-04** |
| S-05 | クロステナント 403 | 🟡 管理 API は Controller 確認あり | LINE 設定 API 追加時も必須（**#4**） |

---

## 4. ログ・機密情報露出（他要件外リスク）

| Gap ID | 箇所 | 内容 | リスク | PLAN |
|--------|------|------|--------|------|
| **SEC-R01** | `AuthController::login` L59-64 | `credentials` + `raw_input` => `$request->all()` を Log::info。**password 含む可能性** | **高** | **#14 P5-04** DoD |
| **SEC-R02** | `CustomerController::update` L199 | `request->all()` を Log::info（PII 含む） | **中** | **#14 P5-04** |
| **SEC-R03** | 各 Controller 多数 | `request->all()` / `request_params` の広範ログ | **中** | **#14 P5-04** 一括見直し |
| **SEC-R04** | `GET /api/health` | `environment` を JSON 返却 | **低**（本番情報露出） | **#14 P5-04** |
| **SEC-R05** | `CustomerResource` | 認証済み管理者に `line_user_id` 等フル返却 | **想定内** | ロール分離は [FUTURE] RBAC |

**推奨**: ログは `except(['password','line_access_token',...])` + 本番 debug ログ無効化。

---

## 5. LIFF・公開 API（他要件外リスク）

| Gap ID | 内容 | 現状 | リスク | PLAN |
|--------|------|------|--------|------|
| **SEC-L01** | LIFF 顧客 identity | `POST /liff/customers/get-or-create` が body の `line_user_id` を**そのまま信頼** | **高** — 任意 userId なりすまし | **#11 P6-03** hardening（ID token 検証） |
| **SEC-L02** | LIFF 予約 API | Sanctum 不要・store_id パラメータのみ | **中** — スパム予約・hold 占有 | **#13 P5-02** + rate limit 検討 |
| **SEC-L03** | LIFF 開発 bypass | `liff` 未ロード時 `dev-user` 固定 ID | **高**（本番混入禁止） | **#14 P5-04** 本番ビルド確認 |
| **SEC-L04** | CORS | localhost のみ allow | **低**（dev） | 本番ドメイン追加はデプロイ書 |

**SEC-L01 詳細**: 本番では LIFF SDK `getIDToken()` をバックエンドで検証し、`sub` を `line_user_id` とする必要がある（現状未実装）。

---

## 6. 認証・トークン・フロント

| Gap ID | 内容 | 現状 | リスク | PLAN |
|--------|------|------|--------|------|
| **SEC-A01** | 管理 API 認証 | Sanctum Bearer | ✅ Fit | — |
| **SEC-A02** | フロント token 保存 | `localStorage`（api.ts） | **中** — XSS で token 窃取 | **#14 P5-04** 確認・HttpOnly 検討 [FUTURE] |
| **SEC-A03** | RBAC | 全スタッフ同等権限 | **中** | [FUTURE] |
| **SEC-A04** | Hold token ログ | 先頭 8 文字マスク | ✅ 良い例 | SEC-R03 の模範 |

---

## 7. テナント分離（Fit）

| 項目 | 状態 |
|------|------|
| `TenantScope` on Customer 等 | ✅ |
| `CustomerController` store_id 403 | ✅ |
| `HoldTokenController` クロステナント警告 | ✅ |
| LIFF `validateStore($storeId)` | ✅（store 存在・active） |

---

## 8. PLAN マッピング（漏れ防止チェックリスト）

| # | タスク | 吸収する Gap |
|---|--------|--------------|
| **1** | MVP-SEC-01 | SEC-R01, SEC-R02, SEC-R03（最小） |
| **2〜3** | P4-02, P3-07 | β 機能 E2E |
| **4** | P6-01 | SEC-G01, SEC-G02, SEC-G05, S-01 |
| **5** | P6-02 | S-02, S-03, ADMIN-G* |
| **6** | P6-04 | SEC-G07 |
| **7** | P4-01 | Webhook routing |
| **8** | P6-03 | SEC-L01, ADMIN-G4 |
| **9〜10** | P5-01, P5-03 | コアテスト |
| **11〜14** | P2-10, P3-08, P6-06, P5-02 | MVP 拡張 |
| **15** | P5-04 | SEC-G03/G04, SEC-L03, SEC-L04, S-04（**#1 以外の残**） |
| **16〜18** | UI | DataGrid 等 |

### #1 MVP-SEC-01 DoD（ホットフィックス）

- [ ] SEC-R01: ログイン処理で password / token をログに出さない
- [ ] SEC-R03: 主要 Controller の `request->all()` ログを PII マスクまたは削除

### #15 P5-04 追加 DoD（#1 完了後の残セキュリティ）

- [ ] SEC-L03: 本番ビルドに LIFF `dev-user` bypass が残っていない
- [ ] SEC-G03/G04: MVP で平文のままとする PII 範囲を文書化（または encrypt 拡張を判断）
- [ ] HTTPS・CORS 本番設定確認
- [ ] `/api/health` の environment 露出方針（本番は非表示 or 制限）

~~SEC-R01/R03~~ → **#1 MVP-SEC-01 で吸収**

### #4 P6-01 追加 DoD（暗号化）

- [ ] `line_channel_secret` / `line_access_token` に Laravel `encrypted` cast
- [ ] Eloquent 保存・読取の round-trip テスト
- [ ] 既存平文データの移行方針（再保存 or 一度 null クリア — 手順を PLAN に記載）
- [ ] `hasLineIntegration()` が token + active を含む（REQ N-04）

---

## 9. [FUTURE]（MVP スコープ外だが記録）

| ID | 内容 |
|----|------|
| SEC-F01 | APP_KEY ローテーション手順 |
| SEC-F02 | 顧客 PII 全項目暗号化方針統一 |
| SEC-F03 | 検索可能暗号化 / ハッシュ索引（phone 検索） |
| SEC-F04 | RBAC・最小権限 |
| SEC-F05 | 監査ログ専用テーブル |
| SEC-F06 | LIFF / 公開 API rate limiting（WAF） |

---

## 10. 変更履歴

| Version | 日時 | Changes | Author |
|---------|------|---------|--------|
| 1.1 | 2026-07-06 17:13:11 | PLAN v1.7 マッピング更新（#1〜18）。SEC-01 追加 | tugilo inc. |
| 1.0 | 2026-07-06 17:08:52 | 初版。暗号化・ログ・LIFF・PLAN マッピング | tugilo inc. |
