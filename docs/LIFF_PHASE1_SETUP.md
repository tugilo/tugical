# LIFF 予約フロー フェーズ1 セットアップ

**作成日**: 2026-02-11 15:43  
**更新日**: 2026-07-20 23:16:59  

**目的**: βリリース最低条件のうち「LIFFから単一メニュー予約が完走する」を満たすための最小手順。

**実行順序上の位置**: **#2 MVP-P3-07**（実機 E2E 記録）。店舗別 LIFF ID 動的化は **#11 MVP-P6-03**（本ドキュメントの `VITE_LIFF_ID` は暫定）。

**関連**: `DOCS_INDEX.md`、`REMAINING_TASKS_PLAN_v1.0.md`、`LINE_STORE_INTEGRATION_REQUIREMENTS_v1.0.md`

## 前提

- `backend/docs/STATUS.md` を参照済みであること
- Docker で `make up` 済み、管理画面で店舗・メニュー・リソースが登録されていること

## 1. 環境変数（LIFF 本番時）

`.env` に以下を追加（LINE Developers で LIFF アプリ作成後に取得した ID を指定）:

```env
# LIFF アプリ ID（LINE Developers で作成）
# ※ MVP 現状: ビルド時グローバル。店舗別は stores.line_liff_id（#11 完了後）
VITE_LIFF_ID=1234567890-xxxxxxxxxx
```

- 開発時は未設定でも可。未設定の場合は「LINEでログイン」せずに開発用ユーザーでフローを試せる（LIFF 外のブラウザで `/liff?store_id=1` を開いた場合の挙動）。

## 2. アクセスURL

- **開発**: `http://localhost/liff?store_id=1` または `http://localhost/liff/1`
- **本番**: `https://your-domain.com/liff?store_id=1`（LIFF のエンドポイントURLとして LINE に登録する）

`store_id` は店舗ID。省略時は `1` が使われる。

## 3. フロー概要（4ステップ・提案型）

1. **メニュー選択** … `GET /api/v1/liff/stores/{storeId}/menus`
2. **日時（おすすめ）** … 時期ショートカット（直近 / 1・3ヶ月後 / 〜ヶ月後）で空き窓を切り替え。`GET /api/v1/liff/availability` を日別に取得しおすすめ枠を先出し。空きなし時は候補日を複数提案。希望日指定も可。枠選択で `POST /api/v1/liff/hold-slots`（仮押さえ）
3. **確認** … 内容・仮押さえ残り時間表示 → 「予約確定」で `POST /api/v1/liff/bookings`
4. **完了** … 予約番号・日時表示。LINE 通知は `NotificationService::sendBookingConfirmation` で送信（店舗の LINE 連携・顧客の `line_user_id` が設定されている場合）

実装: `resources/js/components/liff/BookingFlow/BookingFlow.tsx`（PHASE_021 / PHASE_022）

## 4. 完了条件チェックリスト（#2 実機 E2E 用）

- [ ] LIFF から予約完了画面まで到達できる
- [ ] 10分仮押さえ → 確定が動作する
- [ ] LINE に予約完了通知が届く（**#1** と共通: 店舗 LINE 連携＋顧客 `line_user_id`）
- [ ] 管理画面で予約を確認・編集できる（既存機能）
- [ ] 結果を `MVP_IMPLEMENTATION_PLAN.md` MVP-P3-07 に記録

**LINE 通知の事前チェック**: `php artisan tugical:verify-line-e2e --store=1`（`LINE_NOTIFICATION_E2E_GUIDE_v1.0.md`）

## 5. 今回スコープ外

- 複数メニュー予約（**#10** MVP-P3-08 / booking_details）
- 店舗別 LIFF ID 動的ロード（**#11** MVP-P6-03）
- 決済・RBAC・WebSocket・UI の美調整

## 6. 参照

- 実装: `backend/resources/js/pages/liff/`、`LiffController`
- API: `/api/v1/liff/*`
