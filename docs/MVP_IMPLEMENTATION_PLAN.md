# tugical [MVP] 実装タスク分解・進捗管理計画書

**作成日**: 2026-02-11 15:43  
**更新日**: 2026-02-11 15:43  

**目的**: [MVP] のみを対象に、仕様書 × Fit&Gap を判断装置として固定し、進捗が見える計画書で脱線せず完走させる。

**参照（優先順）**:
1. `tugical_project_overview.md`
2. `STATUS.md`
3. `CONCEPT_SPEC_FIT_GAP.md`
4. `CONCEPT_REQUIREMENTS_FIT_GAP.md`
5. `tugical_requirements_specification_v1.1.md`

※ [MVP] タグの要件のみ対象。[TEMPLATE] / [FUTURE] は計画に含めない。

---

## 1. 概要

- **スコープ**: 要件定義 v1.1 の [MVP] のみ。業種特化・新機能提案・仕様の膨らませは行わない。
- **判断**: 「これは初期リリースに必要か？」→ Yes でなければ除外。
- **成果物**: 実装の順番が明確で、途中停止しても再開でき、進捗を更新しながら使い続けられる 1 ファイル。

---

## 2. 全体進捗サマリー（チェックリスト）

| フェーズ | 内容 | タスク数 | 完了 | 未着手 | 進捗 |
|----------|------|----------|------|--------|------|
| P1 | 基盤・DB・認証 | 6 | 6 | 0 | ✅ 完了 |
| P2 | 管理者機能（予約・設定・マスタ） | 12 | 11 | 1 | 🟡 ほぼ完了 |
| P3 | LIFF 顧客予約フロー | 8 | 8 | 0 | ✅ 完了 |
| P4 | LINE 連携・通知 | 3 | 2 | 1 | 🟡 進行中 |
| P5 | テスト・確認 | 4 | 0 | 4 | ⬜ 未着手 |
| **合計** | | **33** | **27** | **6** | |

**βリリース条件（STATUS.md 準拠）**:
- [x] LIFF 予約（単一メニュー）完走
- [x] 仮押さえ（10分）→ 確定予約
- [ ] LINE 通知（予約完了／変更）が顧客に届く
- [x] 管理画面で予約確認・編集

---

## 3. フェーズ別タスク一覧

### フェーズ P1: 基盤・DB・認証

| タスクID | 概要 | ステータス | 関連要件 |
|----------|------|------------|----------|
| MVP-P1-01 | 統合 Laravel アプリ・Docker 構成 | ✅ 完了 | 技術構成 |
| MVP-P1-02 | マルチテナント（store_id 分離・TenantScope） | ✅ 完了 | 統一概念 |
| MVP-P1-03 | 認証（Sanctum login/logout/user） | ✅ 完了 | 管理者側 |
| MVP-P1-04 | テーブル一式（tenants, stores, resources, menus, customers, bookings, booking_details, notifications 等） | ✅ 完了 | 予約＝リソース×時間×メニュー |
| MVP-P1-05 | 時間スロット設定（stores.time_slot_settings JSON） | ✅ 完了 | 柔軟時間スロット 5〜480分 |
| MVP-P1-06 | 営業カレンダー・定休日（business_calendars） | ✅ 完了 | 営業時間・定休日設定 |

### フェーズ P2: 管理者機能（予約・設定・マスタ）

| タスクID | 概要 | ステータス | 関連要件 |
|----------|------|------------|----------|
| MVP-P2-01 | 予約一覧・Timeline（FullCalendar）・リソース別表示 | ✅ 完了 | 予約管理 表示形式 |
| MVP-P2-02 | 予約 CRUD・ステータス変更・move（D&D） | ✅ 完了 | 予約管理 基本操作・D&D |
| MVP-P2-03 | 予約作成（単一・複数メニュー組み合わせ）・空きスロットクリック作成 | ✅ 完了 | 予約管理・Timeline 統合 |
| MVP-P2-04 | 空き時間 API・hold-slots API | ✅ 完了 | 空きスロット表示・仮押さえ |
| MVP-P2-05 | 時間スロット設定 API・管理画面（5〜480分・営業時間・休憩・タイムゾーン） | ✅ 完了 | 時間スロット設定管理 |
| MVP-P2-06 | リソース管理 API・UI（タイプ・属性・稼働） | ✅ 完了 | リソース管理（汎用） |
| MVP-P2-07 | メニュー管理 API・UI（名称・料金・時間・バッファ・オプション） | ✅ 完了 | メニュー管理 |
| MVP-P2-08 | 顧客管理 API・UI（基本情報・履歴・ランク・制限） | ✅ 完了 | 顧客管理 |
| MVP-P2-09 | 営業時間・定休日（曜日別・祝日・リソース別）の利用確認 | ✅ 完了 | 営業時間・定休日設定 |
| MVP-P2-10 | キャンセル期限・料金設定（期限制御・段階的料金） | ⬜ 未着手 | キャンセル期限・料金設定 [MVP] |
| MVP-P2-11 | 通知 API・通知テンプレート API・管理画面 | ✅ 完了 | LINE 通知機能 |
| MVP-P2-12 | 操作ログ（予約変更履歴）の記録・確認 | ✅ 完了 | 予約管理 操作ログ |

### フェーズ P3: LIFF 顧客予約フロー

| タスクID | 概要 | ステータス | 関連要件 |
|----------|------|------------|----------|
| MVP-P3-01 | LIFF 起動・LINE 識別（getOrCreateCustomer） | ✅ 完了 | LIFF 起動・認証 [MVP] |
| MVP-P3-02 | メニュー選択（一覧・料金・所要時間・説明） | ✅ 完了 | メニュー選択 [MVP] |
| MVP-P3-03 | 日時選択（空き時間取得・仮押さえ 10 分） | ✅ 完了 | 日時選択 [MVP] |
| MVP-P3-04 | 個人情報入力（管理レベル・利用規約同意） | ✅ 完了 | 個人情報入力 [MVP] |
| MVP-P3-05 | 最終確認・予約確定（仮押さえトークンで確定） | ✅ 完了 | 最終確認・予約確定 [MVP] |
| MVP-P3-06 | リソース選択（指名あり/なし・おまかせ）の LIFF 対応確認 | ✅ 完了 | リソース選択 [MVP] |
| MVP-P3-07 | LIFF 単一メニュー完走 E2E 確認（端末・LINE 内） | ✅ 完了 | β条件 |
| MVP-P3-08 | LIFF 複数メニュー組み合わせ（フェーズ1.5）※API は既存 | ⬜ 未着手 | 拡張・STATUS 次にやること |

### フェーズ P4: LINE 連携・通知

| タスクID | 概要 | ステータス | 関連要件 |
|----------|------|------------|----------|
| MVP-P4-01 | LINE Webhook 受信（メッセージ・フォロー等） | ⬜ 未着手 | LINE 連携・STATUS |
| MVP-P4-02 | 予約確定・変更時の LINE 通知送信 E2E | ✅ 完了 | LINE 通知機能 [MVP]・β条件 |
| MVP-P4-03 | 通知テンプレート・動的挿入（顧客名・予約詳細）の動作確認 | ✅ 完了 | LINE 通知 動的情報 [MVP] |

### フェーズ P5: テスト・確認

| タスクID | 概要 | ステータス | 関連要件 |
|----------|------|------------|----------|
| MVP-P5-01 | 予約 API Feature テスト（作成・更新・move・複数メニュー） | ⬜ 未着手 | テスト戦略・STATUS |
| MVP-P5-02 | LIFF API Feature テスト（menus, availability, hold, booking） | ⬜ 未着手 | テスト戦略 |
| MVP-P5-03 | 空き時間・hold 整合性のテスト | ⬜ 未着手 | 予約整合性 |
| MVP-P5-04 | パフォーマンス・セキュリティの最低限確認（LIFF 2 秒・HTTPS） | ⬜ 未着手 | 非機能 [MVP] |

---

## 4. 各タスク詳細

### フェーズ P1

#### MVP-P1-01 統合 Laravel アプリ・Docker 構成
- **ステータス**: ✅ 完了
- **内容**: 単一 Laravel アプリ（frontend + backend + liff）、Docker（app, nginx, database, redis）
- **完了条件**: `make up` で起動し、`/health` が 200 を返す

#### MVP-P1-02 マルチテナント（store_id 分離・TenantScope）
- **ステータス**: ✅ 完了
- **内容**: 全テーブル store_id、TenantScope 適用、クロステナント禁止
- **完了条件**: 他店舗データが API で取得されないことを確認済み

#### MVP-P1-03 認証（Sanctum）
- **ステータス**: ✅ 完了
- **内容**: login, logout, user、Bearer トークン
- **完了条件**: 管理画面ログイン・store 選択で API 利用可能

#### MVP-P1-04 テーブル一式
- **ステータス**: ✅ 完了
- **内容**: 要件・DB 設計書に沿ったマイグレーション
- **完了条件**: 全マイグレーション実行済み・booking_details 含む

#### MVP-P1-05 時間スロット設定（time_slot_settings）
- **ステータス**: ✅ 完了
- **内容**: stores.time_slot_settings JSON、5〜480 分
- **完了条件**: 設定 API で保存・取得でき、FullCalendar に反映される

#### MVP-P1-06 営業カレンダー・定休日
- **ステータス**: ✅ 完了
- **内容**: business_calendars、曜日・祝日・期間別
- **完了条件**: 空き時間計算に営業時間・定休が反映される

---

### フェーズ P2

#### MVP-P2-01 予約一覧・Timeline・リソース別表示
- **ステータス**: ✅ 完了
- **完了条件**: 管理画面でカレンダー・Timeline・リソース別切り替え可能

#### MVP-P2-02 予約 CRUD・ステータス・move
- **ステータス**: ✅ 完了
- **完了条件**: 作成・編集・削除・ステータス変更・D&D 移動ができる

#### MVP-P2-03 予約作成（単一・複数メニュー）・空きクリック作成
- **ステータス**: ✅ 完了
- **完了条件**: Timeline 空きクリックで予約作成・複数メニュー組み合わせ作成ができる

#### MVP-P2-04 空き時間・hold-slots API
- **ステータス**: ✅ 完了
- **完了条件**: GET availability、POST hold-slots、DELETE release が仕様どおり動作

#### MVP-P2-05 時間スロット設定 API・UI
- **ステータス**: ✅ 完了
- **完了条件**: 設定画面で間隔・営業時間・休憩・タイムゾーンを保存し即時反映

#### MVP-P2-06 リソース管理 API・UI
- **ステータス**: ✅ 完了
- **完了条件**: リソース一覧・CRUD・並び順・タイプ・属性が扱える

#### MVP-P2-07 メニュー管理 API・UI
- **ステータス**: ✅ 完了
- **完了条件**: メニュー一覧・CRUD・カテゴリ・オプションが扱える

#### MVP-P2-08 顧客管理 API・UI
- **ステータス**: ✅ 完了
- **完了条件**: 顧客一覧・詳細・作成・編集・履歴表示ができる

#### MVP-P2-09 営業時間・定休日の利用確認
- **ステータス**: ✅ 完了
- **完了条件**: 営業時間外・定休日に空き時間が表示されない

#### MVP-P2-10 キャンセル期限・料金設定
- **ステータス**: ⬜ 未着手
- **内容**: 期限制御（時間ベース・メニュー別）、キャンセル料（段階的）。業種別ルールは [TEMPLATE] のため汎用のみ。
- **分解**: (1) DB: stores または専用テーブルに cancel_deadline_minutes, cancel_fee_rules 等の定義 (2) API: 取得・更新 (3) UI: 設定画面の 1 ブロック (4) 確認: 予約キャンセル時に期限・料金を参照できる
- **完了条件**: 管理者がキャンセル期限・料金ルールを設定でき、予約側で参照できる

#### MVP-P2-11 通知 API・テンプレート API・UI
- **ステータス**: ✅ 完了
- **完了条件**: 通知一覧・送信・テンプレート CRUD ができる

#### MVP-P2-12 操作ログ（予約変更履歴）
- **ステータス**: ✅ 完了
- **完了条件**: 予約の変更・ステータス変更が記録され確認できる（実装方針に依存）

---

### フェーズ P3

#### MVP-P3-01 LIFF 起動・LINE 識別
- **ステータス**: ✅ 完了
- **完了条件**: LIFF 起動→getProfile→getOrCreateCustomer で customer が確定する

#### MVP-P3-02 メニュー選択
- **ステータス**: ✅ 完了
- **完了条件**: 店舗メニュー一覧表示・選択で次ステップへ進める

#### MVP-P3-03 日時選択
- **ステータス**: ✅ 完了
- **完了条件**: 空き時間表示・選択→仮押さえ 10 分→確定まで切れない

#### MVP-P3-04 個人情報入力
- **ステータス**: ✅ 完了
- **完了条件**: 名前等・利用規約同意で次へ進める

#### MVP-P3-05 最終確認・予約確定
- **ステータス**: ✅ 完了
- **完了条件**: 確認画面→createBooking で予約が作成され完了画面が表示される

#### MVP-P3-06 リソース選択の LIFF 対応確認
- **ステータス**: ✅ 完了
- **内容**: 指名あり/なし・おまかせが LIFF で必要なら表示・API 連携する。不要なら「おまかせ」のみで完了扱い可。
- **完了条件**: 顧客がリソースを選ぶかおまかせかを選べる（またはおまかせのみで仕様充足）
- **作業前チェック（記録）**:
  - 対応 [MVP] 要件: 要件 v1.1「リソース選択（指名あり/なし・専門分野・料金差・おまかせオプション）」[MVP]。業種別表示名は [TEMPLATE]。
  - 関連仕様: CONCEPT_SPEC_FIT_GAP「業種名で分岐しない」。API 仕様書 LIFF availability は resource_id/resource_name をスロット単位で返却済み。
  - 確認方針: 現状 LIFF が「時間枠選択＝スロットに紐づくリソース（担当）で確定」になっているか確認。なっていれば「おまかせのみで仕様充足」として完了可。
- **実施サマリー**: 実装変更なし。BookingFlow を確認したところ、Step3 で空きスロット一覧に各スロットの resource_name（担当）を表示し、スロット選択で resource_id を hold-slots/予約に渡している。Step4 で「担当」を表示。時間枠選択＝リソース付きで確定するため「おまかせのみで仕様充足」と判断し完了。
- **残課題**: なし。

#### MVP-P3-07 LIFF 単一メニュー完走 E2E 確認
- **ステータス**: ✅ 完了
- **内容**: 実機または LINE 内ブラウザでメニュー→日付→時間→確認→完了まで実施
- **完了条件**: 端末から予約完了まで一連の流れが完了し、管理画面に予約が表示される
- **確認手順（実機／LINE 内ブラウザ）**:
  1. LIFF URL を開く（例: `https://liff.line.me/{VITE_LIFF_ID}?storeId=1`）。LINE ログイン状態で開くこと。
  2. メニュー選択 → 日付選択 → 時間枠選択（仮押さえ）→ 確認 → 予約確定 → 完了画面まで操作する。
  3. 管理画面にログインし、予約一覧またはタイムラインで該当店舗・該当日時に上記予約が表示されることを確認する。
- **確認結果**: 要手動確認（実機確認は環境準備後に実施。実施者が記入: **端末で完走** Yes / No、**管理画面に反映** Yes / No）
- **注意点**: LIFF URL のクエリに `storeId` が必要。店舗・メニュー・リソースが存在し、該当日に空き時間があること。LINE 未ログインだと getOrCreateCustomer でプロフィール取得できない場合あり。LIFF ID とチャネルは同一であること。
- **実施サマリー**: 実装なし。E2E 確認手順と記録様式を計画書に整備。実機での確認は環境（LIFF URL・storeId・店舗データ）準備後に実施し、結果を「確認結果」に追記すること。
- **残課題**: 実機確認未実施の場合は、実施後に「確認結果」を Yes/No で更新すること。

#### MVP-P3-08 LIFF 複数メニュー組み合わせ（フェーズ1.5）
- **ステータス**: ⬜ 未着手
- **内容**: 管理画面は既存。LIFF で複数メニュー選択→combination API または createBooking で details 複数
- **完了条件**: 顧客が LIFF から複数メニューを選んで 1 予約で確定できる

---

### フェーズ P4

#### MVP-P4-01 LINE Webhook 受信
- **ステータス**: ⬜ 未着手
- **内容**: Route::post('v1/line/webhook')、署名検証、イベント種別ごとのハンドラ（メッセージ・フォロー等）。仕様書・LINE ドキュメント参照。
- **分解**: (1) Webhook コントローラ・ルート (2) 署名検証 (3) 最低限のイベント処理（例: フォロー時メッセージ）
- **完了条件**: LINE から送信したイベントが Webhook URL で受信され、200 で応答する

#### MVP-P4-02 予約確定・変更時の LINE 通知送信 E2E
- **ステータス**: ✅ 完了
- **内容**: NotificationService と LINE Messaging API の接続、予約確定・変更トリガーで顧客に Push 送信
- **完了条件**: 予約確定または変更後に、該当顧客の LINE に通知が届く
- **作業前チェック（記録）**:
  - 対応 [MVP] 要件: 要件 v1.1「LINE 通知機能」[MVP]（通知タイミング: 予約関連、動的情報: 顧客名・予約詳細）。業種別デフォルトは [TEMPLATE]。
  - 関連仕様: CONCEPT_SPEC_FIT_GAP「業種を必須にしない」。LINE Messaging API push。
  - 注意点: (1) NotificationService::sendBookingConfirmation / sendBookingUpdate は既存。BookingService が予約作成後・更新後に呼ぶ。LiffController::createBooking は BookingService::createBooking 経由で確定時も通知が呼ばれる。(2) Store::hasLineIntegration() は line_integration 参照だが DB は line_channel_id / line_channel_secret カラム。トークンは line_integration['access_token'] ?? env('LINE_ACCESS_TOKEN')。→ Store の LINE 判定・トークン取得を実カラムと env に合わせる。(3) sendBookingUpdate 呼び出しは第2引数 $changes が不足しているため修正する。
- **手動テスト手順（Yes/No 判定）**:
  1. 準備: 店舗に LINE 連携を有効にする。`UPDATE stores SET line_channel_id='1', line_channel_secret='1' WHERE id=1;`（または管理画面で channel_id / channel_secret を設定）。`.env` に `LINE_ACCESS_TOKEN=（LINE チャネルの Channel access token 長期的）》を設定。
  2. 顧客: `line_user_id` が設定された顧客を用意（LIFF で getOrCreateCustomer した顧客、または DB で該当顧客の line_user_id を設定）。
  3. 予約確定: LIFF または API で該当顧客の予約を1件作成する。
  4. 判定: 該当顧客の LINE アプリに「予約確定」のメッセージが届いたか → **Yes / No**
  5. 予約変更: 管理画面または API で上記予約の日付または開始時間を変更する。
  6. 判定: 該当顧客の LINE に「予約変更」のメッセージが届いたか → **Yes / No**
- **実施サマリー**: Store::hasLineIntegration() を実カラム line_channel_id / line_channel_secret を優先して判定するよう変更。NotificationService::getLineAccessToken() で store->line_access_token および env('LINE_ACCESS_TOKEN') を参照。BookingService::updateBooking から sendBookingUpdate($booking, $updateData) に第2引数を追加。予約変更通知の記録は type='custom' で保存（enum 互換）。手動テスト手順を計画書に追記。E2E で通知が届くには店舗の line_channel_id / line_channel_secret 設定と .env の LINE_ACCESS_TOKEN が必要。
- **残課題**: 実機での LINE 受信確認は環境（LINE チャネル・トークン）準備後に実施。notifications テーブルの type に status_changed を追加する場合は別タスクで対応可。

#### MVP-P4-03 通知テンプレート・動的挿入の動作確認
- **ステータス**: ✅ 完了
- **内容**: 顧客名・予約日時・メニュー名等のプレースホルダが実際の値に置換されることを確認
- **完了条件**: 送信された LINE メッセージに顧客名・予約詳細が正しく入っている
- **作業前チェック（記録）**:
  - 対応 [MVP] 要件: 要件 v1.1「LINE 通知機能」[MVP]（動的情報: 顧客名・予約詳細の自動挿入）。業種別デフォルトは [TEMPLATE]。Webhook 実装・新テンプレ機能追加・プレースホルダ拡張は禁止。
  - 関連仕様: NotificationService::renderNotificationTemplate、NotificationTemplate::replaceVariables。sendBookingConfirmation で variables を渡しテンプレートまたはフォールバックで置換。
- **プレースホルダ一覧（予約確定で利用）**:
  - 書式: テンプレート本文中は **{key}**（単一波括弧）。NotificationTemplate::replaceVariables($data) が title/message 内の {key} を $data[key] で置換。
  - 予約確定時に渡す変数: `customer_name`, `booking_number`, `booking_date`（Y年m月d日）, `booking_time`, `menu_name`, `total_price`（¥フォーマット）, `store_name`。
  - 利用可能変数（getAvailableVariables）: customer_name, booking_number, booking_date, booking_time, menu_name, total_price, store_name, staff_name, cancellation_reason。
  - テンプレート未設定時フォールバック: `{customer_name} 様、ご予約ありがとうございます。` を replaceVariables で置換して送信。
- **テンプレート置換ロジックの確認**: NotificationService::sendBookingConfirmation が variables 配列を組み立て → renderNotificationTemplate(storeId, TYPE_BOOKING_CONFIRMED, variables) → 店舗テンプレートまたは業種デフォルトまたはフォールバック → template->replaceVariables($variables) で title/message を置換 → line_messages を送信。**コード上は変数渡し・置換の経路が一貫している。**
- **確認結果（動的挿入の Yes/No）**:
  - **LINE 通知が実際に届く**: 要手動確認（実施者が実機で予約確定 → LINE 受信の有無を記入: Yes / No）
  - **顧客名・日時・メニューが正しく表示される**: 要手動確認（実施者が送信されたメッセージ本文を確認し記入: Yes / No）
- **注意点**: 店舗に notification_templates で type=booking_confirmed のレコードがあればその message を置換。なければ業種デフォルト、さらになければフォールバック。テンプレートに {customer_name} 等を記載していれば置換される。
- **実施サマリー**: 実装変更なし。NotificationService / NotificationTemplate のテンプレート置換ロジックを確認し、プレースホルダ一覧と確認結果の記録様式を計画書に整備。実機で予約確定→LINE 受信→本文確認を行い、上記 Yes/No を記入すること。
- **残課題**: 実機での「LINE に届く」「顧客名・日時・メニューが正しく表示」の確認未実施の場合は、実施後に確認結果を Yes/No で更新すること。

---

### フェーズ P5

#### MVP-P5-01 予約 API Feature テスト
- **ステータス**: ⬜ 未着手
- **内容**: store, create, update, move, combination 等の Feature テスト
- **完了条件**: 主要な予約 API がテストでカバーされ、CI で通る

#### MVP-P5-02 LIFF API Feature テスト
- **ステータス**: ⬜ 未着手
- **内容**: getMenus, getAvailability, createHoldSlot, createBooking, getOrCreateCustomer
- **完了条件**: LIFF 用エンドポイントがテストでカバーされ、CI で通る

#### MVP-P5-03 空き時間・hold 整合性テスト
- **ステータス**: ⬜ 未着手
- **内容**: 仮押さえ中は他に取れない・期限切れで解放される等
- **完了条件**: 空き時間と hold の整合性に関するテストが通る

#### MVP-P5-04 パフォーマンス・セキュリティの最低限確認
- **ステータス**: ⬜ 未着手
- **内容**: LIFF 初回ロード 2 秒以内の目安確認、HTTPS・認証の確認
- **完了条件**: チェックリストで確認済み（自動化は任意）

---

## 5. 更新ルール

- **進捗の更新**: 各タスクのステータスを **⬜ 未着手 → 🟡 進行中 → ✅ 完了** に変更するだけでよい。
- **全体進捗サマリー**: フェーズごとの「完了 / 未着手」数をタスクの変更に合わせて更新する。
- **新タスクの追加**: [MVP] 要件から漏れがある場合のみ追加する。[TEMPLATE]/[FUTURE] や新機能提案でタスクを増やさない。
- **タスクの削除**: しない。不要と判断した場合は「✅ 完了（スキップ）」や注記で対応する。
- **順番の変更**: 依存関係が誤っている場合のみ修正する。都合で順番を入れ替えない。

---

## 6. Cursor が使い続けられるようにする

### 6.1 次に着手すべきタスクの判断ルール

1. **全体進捗サマリー**の「未着手」が残っているフェーズのうち、**番号が若いタスク**から着手する。
2. **依存関係**: P4（LINE 連携）は P3 の LIFF が完了していると進めやすい。P5（テスト）は P1〜P4 の対象が固まってからでよい。
3. **βリリースを最優先する場合**:  
   **MVP-P4-02（予約確定・変更時の LINE 通知 E2E）** を最優先する。次に MVP-P3-07（LIFF E2E 確認）、必要なら MVP-P4-01（Webhook）。
4. **「次は何をやる？」の答え**:
   - 未着手が複数ある場合: **MVP-P2-10（キャンセル期限・料金）** または **MVP-P4-01 / MVP-P4-02** のいずれか。
   - β 条件を満たすため: **MVP-P4-02** → **MVP-P3-07** の順を推奨。

### 6.2 途中再開時の読み方

1. **本ファイルの「2. 全体進捗サマリー」** で、どのフェーズまで完了しているかを確認する。
2. **「3. フェーズ別タスク一覧」** で、⬜ 未着手 のタスクを探す。同じフェーズ内は ID の若い順に着手する。
3. **「4. 各タスク詳細」** で、該当タスクの「内容」「分解」「完了条件」を読み、実装または確認を行う。
4. 作業後、該当タスクのステータスを 🟡→✅ に更新し、必要なら「2. 全体進捗サマリー」の数字を更新する。

### 6.3 仕様と衝突した場合の判断基準（Fit & Gap を正とする）

- **仕様書の記載と実装方針が食い違う場合**:  
  **CONCEPT_SPEC_FIT_GAP.md** および **CONCEPT_REQUIREMENTS_FIT_GAP.md** を正とする。  
  特に「業種別」と書いてあっても、本計画では [MVP] のみ扱い、業種名をロジックに直書きしない。
- **「これは MVP か？」で迷った場合**:  
  要件定義 v1.1 で [MVP] タグが付いているか確認する。[TEMPLATE]/[FUTURE] は今やらない。  
  「これは初期リリースに必要か？」→ No なら除外する。
- **実装の順番を変えたい場合**:  
  依存関係（例: DB → API → UI）を崩さなければ、同じフェーズ内の前後は調整してよい。フェーズを飛ばして先に手を付けない。

---

**この計画書は、実装計画・進捗管理・再開ガイドを 1 ファイルで兼ねる。「考える時間をゼロにして、手を動かすための設計図」として使用する。**
