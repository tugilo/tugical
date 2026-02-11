# LIFF 予約フロー フェーズ1 セットアップ

**作成日**: 2026-02-11 15:43  
**更新日**: 2026-02-11 15:43  

**目的**: βリリース最低条件のうち「LIFFから単一メニュー予約が完走する」を満たすための最小手順。

## 前提

- `backend/docs/STATUS.md` を参照済みであること
- Docker で `make up` 済み、管理画面で店舗・メニュー・リソースが登録されていること

## 1. 環境変数（LIFF 本番時）

`.env` に以下を追加（LINE Developers で LIFF アプリ作成後に取得した ID を指定）:

```env
# LIFF アプリ ID（LINE Developers で作成）
VITE_LIFF_ID=1234567890-xxxxxxxxxx
```

- 開発時は未設定でも可。未設定の場合は「LINEでログイン」せずに開発用ユーザーでフローを試せる（LIFF 外のブラウザで `/liff?store_id=1` を開いた場合の挙動）。

## 2. アクセスURL

- **開発**: `http://localhost/liff?store_id=1` または `http://localhost/liff/1`
- **本番**: `https://your-domain.com/liff?store_id=1`（LIFF のエンドポイントURLとして LINE に登録する）

`store_id` は店舗ID。省略時は `1` が使われる。

## 3. フロー概要（5ステップ）

1. **メニュー選択** … `GET /api/v1/liff/stores/{storeId}/menus`
2. **日付選択** … 今日〜14日後から選択
3. **時間選択** … `GET /api/v1/liff/availability` → スロット選択で `POST /api/v1/liff/hold-slots`（10分仮押さえ）
4. **確認** … 内容表示 → 「予約確定」で `POST /api/v1/liff/bookings`
5. **完了** … 予約番号表示。LINE 通知は `NotificationService::sendBookingConfirmation` で送信（店舗の LINE 連携・顧客の `line_user_id` が設定されている場合）

## 4. 完了条件チェックリスト

- [ ] LIFF から予約完了画面まで到達できる
- [ ] 10分仮押さえ → 確定が動作する
- [ ] LINE に予約完了通知が届く（店舗LINE連携＋顧客 line_user_id 設定時）
- [ ] 管理画面で予約を確認・編集できる（既存機能）

## 5. 今回スコープ外

- 複数メニュー予約（booking_details）
- 決済・RBAC・WebSocket・UI の美調整

詳細は `backend/docs/STATUS.md` の「βリリース最低条件」「今回やらないこと」を参照。
