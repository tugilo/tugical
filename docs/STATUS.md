# tugical プロジェクト現状ステータス

**最終確認日**: 2025-02-11  
**目的**: どこまで何をできているかを明確にし、再スタートの起点とする

> **再開時は PROGRESS.md を読む必要はありません。** 本ドキュメント（STATUS.md）が司令塔です。  
> 時系列ログは `backend/docs/PROGRESS.md` に残してありますが、判断・優先度・次の一手はすべてここに集約しています。

**業種特化の判断（ブレーキとして参照）**  
現フェーズでは業種特化は行わない。業種テンプレはリリース後にオプションとして追加する。業種要望が出てもコア機能に混ぜない。業種別に作り込みたくなったときは、この一文を優先する。

---

## 1. 概要

| 項目 | 状態 |
|------|------|
| アーキテクチャ | 単一 Laravel アプリ（統合済み） |
| フロント | `backend/resources/js/`（React + TypeScript + Vite） |
| 仕様書 | `backend/docs/` に集約 |
| 進捗ログ | `backend/docs/PROGRESS.md`（長大・時系列） |
| 現在の焦点 | 本ドキュメント（STATUS.md）で再整理 |

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

- 認証: ログイン（store_id 選択含む）
- ダッシュボード
- **予約管理**: 一覧・タイムライン（FullCalendar）、予約作成（単一・**複数メニュー組み合わせ**）、編集、移動（ドラッグ）、ステータス変更
- **顧客管理**: 一覧、詳細モーダル、作成モーダル、インライン編集
- **メニュー管理**: 一覧、CRUD、カテゴリ、オプション
- **リソース管理**: 一覧、CRUD、並び順
- **設定**: SettingsPage（時間スロット設定等）
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
- **フロント**: `pages/liff/index.tsx` + `BookingFlow` の 5 ステップ（メニュー→日付→時間→確認→完了）。リソース選択は時間枠＝担当表示で仕様充足（MVP-P3-06 完了）。
- **未実装**: LINE Webhook、複数メニュー（フェーズ1.5）、本番 LIFF ID 設定・通知 E2E 確認

### 3.2 LINE 連携

- LINE Webhook（`Route::prefix('v1/line')`）: 未実装
- LINE Messaging API による通知送信: NotificationService は実装済み。予約確定・変更時に sendBookingConfirmation / sendBookingUpdate を呼ぶ経路を整備済み（MVP-P4-02 完了）。Store の LINE 判定は line_channel_id / line_channel_secret、トークンは line_access_token または env('LINE_ACCESS_TOKEN')。実機で届くかはチャネル・トークン設定後に要確認。

### 3.3 その他

- **テスト**: Feature/Unit はサンプルのみ。テスト戦略書に沿ったカバレッジは未達成
- **Super user / Store administrator / RBAC**: 仕様・設計レベル。実装は未
- **リアルタイム更新**: WebSocket/SSE は未実装（Timeline は手動再取得）

---

## 4. 次にやること（再スタート時の優先候補）

1. **LIFF 本実装**  
   - 5 ステップ予約フローと API 接続  
   - 空き時間取得・仮押さえ・予約作成  
   - **フェーズ1**: 単一メニューで完走させる（再開時の心理的ハードルを下げる）  
   - **フェーズ1.5**: 複数メニュー組み合わせ対応（管理画面側は既に実装済みのため API 連携が中心）

2. **LINE 連携の確定**  
   - Webhook 受信  
   - 通知送信の E2E 確認

3. **テスト強化**  
   - 重要 API（予約作成・複数メニュー・空き時間）の Feature テスト  
   - テスト戦略書に沿った優先順位

4. **権限・役割**  
   - Super user / Store administrator の要件整理と RBAC 実装計画

---

## 5. ドキュメント・参照の整理

| 用途 | ファイル |
|------|----------|
| **現状の全体像・次の一手（再スタート用）** | **backend/docs/STATUS.md**（本ファイル） ← ここだけ読めば再開できる |
| 時系列の開発ログ（参照任意） | backend/docs/PROGRESS.md ※再開時に読む必要はありません |
| セッションごとのメモ・焦点 | backend/docs/CURRENT_FOCUS.md（古い記述も含む） |
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

---

## 7. βリリース最低条件（定義）

以下が揃えば「外部テスト導入可」とする：

- **LIFF 予約（単一メニュー）完走** … 顧客が LINE から予約まで一連の流れを完了できる
- **仮押さえ（10分）→ 確定予約** … 10分間の保持と確定処理が動作する
- **LINE 通知（予約完了／変更）** … 予約確定・変更時に顧客へ LINE で通知が届く
- **管理画面での予約確認・編集** … 店舗側で LIFF で入った予約を確認・編集できる（※すでに実装済み）

→ この4つが満たれた時点で β リリース可能と判断する。

**※ βリリース時点では以下は対応しない**（将来の自分へのブレーキ・スコープ固定）：

- 決済連携
- WebSocket によるリアルタイム更新
- 細かな権限分岐（RBAC）

---

**まとめ**: 管理画面と複数メニュー組み合わせ予約まで実装済み。LIFF・LINE 連携・テスト・権限まわりが未実装または未完了。再スタート時は **STATUS.md** とセクション 4 を起点に、β リリースを目指す場合はセクション 7 の条件を満たすことを目標にする。
