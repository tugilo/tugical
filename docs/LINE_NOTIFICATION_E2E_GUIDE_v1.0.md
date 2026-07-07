# LINE 予約通知 E2E 確認ガイド v1.0

**Version**: 1.1  
**作成日時**: 2026-07-06 16:29:20  
**最終更新日時**: 2026-07-07 19:49:38  
**目的**: **#2 MVP-P4-02** — β 条件「予約確定・変更時に LINE 通知が届く」の実機確認手順  
**関連**: `REMAINING_TASKS_PLAN_v1.0.md` §4 #2、`MVP_IMPLEMENTATION_PLAN.md` MVP-P4-02、`DOCS_INDEX.md`

---

## 1. 確認の 2 段階

| 段階 | 内容 | 実施者 |
|------|------|--------|
| **A. 自動結合テスト** | Http::fake で LINE API 呼び出しを検証 | `php artisan test` |
| **B. 実機 E2E** | 実 LINE アプリで Push 受信を確認 | 開発者（本ガイド） |

**β 判定に必要なのは B（実機）**。A が通っていても B が No なら **#1 未完了**。

---

## 2. 事前準備チェックリスト

### 2.1 LINE Developers

- [ ] Messaging API チャネル作成済み
- [ ] Channel access token（長期）を取得
- [ ] LIFF アプリと同一チャネル（または Push 可能な設定）
- [ ] テスト用 LINE アカウントがチャネルを友だち追加済み

### 2.2 tugical 環境

```bash
# ルートで
make up
make health
```

### 2.3 店舗設定（store_id=1 の例）

```sql
UPDATE stores
SET
  line_channel_id = 'YOUR_CHANNEL_ID',
  line_channel_secret = 'YOUR_CHANNEL_SECRET'
WHERE id = 1;
```

`backend/.env`:

```env
LINE_ACCESS_TOKEN=YOUR_LONG_LIVED_CHANNEL_ACCESS_TOKEN
```

### 2.4 顧客の line_user_id

LIFF で `getOrCreateCustomer` した顧客、または手動設定:

```sql
UPDATE customers
SET line_user_id = 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
WHERE id = 1 AND store_id = 1;
```

`U` で始まる LINE ユーザー ID は、LIFF `liff.getProfile().userId` または Webhook イベントから取得。

---

## 3. 事前チェックコマンド

```bash
docker compose exec app php artisan tugical:verify-line-e2e --store=1
```

すべて ✓ なら `--send` でテスト Push:

```bash
docker compose exec app php artisan tugical:verify-line-e2e --store=1 --send
```

既存予約で確定通知を試す場合:

```bash
docker compose exec app php artisan tugical:verify-line-e2e --store=1 --send --booking=BOOKING_ID
```

---

## 4. 実機 E2E 手順（β 判定用）

### 4.1 予約確定通知

1. テスト用 LINE アカウントで LIFF を開く  
   例: `https://liff.line.me/{VITE_LIFF_ID}?storeId=1`
2. メニュー → 日付 → 時間 → 確認 → **予約確定**
3. **判定**: 該当 LINE アカウントに予約完了メッセージが届く → **Yes / No**
4. **判定**: メッセージに顧客名・日時・メニュー名が正しい → **Yes / No**

### 4.2 予約変更通知

1. 管理画面 `/admin/bookings` にログイン
2. 上記予約の日付または開始時間を変更して保存
3. **判定**: LINE に変更通知が届く → **Yes / No**

### 4.3 記録場所

`MVP_IMPLEMENTATION_PLAN.md` の MVP-P4-02 / P4-03「確認結果」に記入:

```markdown
- LINE 通知が実際に届く: Yes / No（実施日: YYYY-MM-DD HH:MM）
- 顧客名・日時・メニューが正しく表示: Yes / No
- 予約変更通知が届く: Yes / No
```

#1 完了時は `REMAINING_TASKS_PLAN_v1.0.md` の **#1 DoD** チェックも更新する。

---

## 6. 確認ログ

| 日時 | コマンド | 結果 |
|------|----------|------|
| 2026-07-07 19:49:38 | `tugical:verify-line-e2e --store=1` | ✗ 3項目（channel/token/customer 未設定）— **実機 E2E ブロック中** |
| 2026-07-07 19:49:38 | `LineBookingNotificationTest` | ✅ 3 passed |

**次のアクション（実機 E2E 実施者向け）**:
1. 管理画面 `/admin/settings` で Channel ID / Secret / Token / LIFF ID を入力 → 保存 →「認証情報を確認」
2. 友だち追加済み LINE アカウントの User ID を顧客に設定
3. `tugical:verify-line-e2e --store=1` がすべて ✓ になることを確認
4. `--send` → 予約作成/変更 → LINE 受信を Yes/No で記録

---

## 5. 自動結合テスト

```bash
docker compose exec app php artisan test --filter=LineBookingNotificationTest
```

検証内容:
- 予約確定 → `POST https://api.line.me/v2/bot/message/push`
- 予約日時変更 → 同上
- LINE 未連携時 → API 未呼び出し

---

## 6. トラブルシューティング

| 症状 | 確認ポイント |
|------|--------------|
| 通知が届かない | `tugical:verify-line-e2e` で ✗ 項目を解消 |
| API 401 | `LINE_ACCESS_TOKEN` の有効期限・チャネル一致 |
| 顧客に届かない | 友だち追加済みか、`line_user_id` が正しいか |
| 管理画面からの変更で届かない | 日付または start_time を変更しているか（`updateBooking` の通知条件） |
| notifications が failed | `storage/logs/laravel.log` の LINE API レスポンス |

---

## 7. 現在の環境ステータス（2026-07-06 16:33:39）

| 項目 | 状態 |
|------|------|
| store_id=1 line_channel | 未設定 |
| LINE_ACCESS_TOKEN (.env) | 未設定 |
| line_user_id 付き顧客 | 0 件 |
| 結合テスト | **3 passed**（`LineBookingNotificationTest`） |
| 事前チェック | `php artisan tugical:verify-line-e2e --store=1` |
| 実機 E2E | **ブロック中** — 上記 3 項目設定後に `LINE_NOTIFICATION_E2E_GUIDE_v1.0.md` §4 を実施 |

---

## 8. 変更履歴

| Version | 日時 | Changes | Author |
|---------|------|---------|--------|
| 1.1 | 2026-07-06 16:50:15 | #1 表記統一、DOCS_INDEX 参照追加 | tugilo inc. |
| 1.0 | 2026-07-06 16:29:20 | 初版。2 段階確認・コマンド・実機手順・トラブルシュート | tugilo inc. |
