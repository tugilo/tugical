# PHASE_002_admin_ux_manualess_fix

**作成日時**: 2026-07-18 21:48:10  
**最終更新日時**: 2026-07-18 21:52:58  
**Phase ID**: PHASE_002  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase002-admin-ux-manualess-fix`

---

## 1. 目的

`ADMIN_UX_MANUALESS_AUDIT_v1.0.md` §7 の推奨順に従い、管理画面のマニュアルレス阻害要因（P0〜P2）を実装で解消する。

---

## 2. Related SSOT

- `docs/ADMIN_UX_MANUALESS_AUDIT_v1.0.md`
- `docs/admin_auth_and_role_dashboard_requirements_v1.1.md`
- `docs/admin_auth_and_role_dashboard_spec_v1.2.1.md`
- `docs/tugical_api_specification_v1.0.md`

---

## 3. Scope

### 変更可能

- `app/Http/Resources/BookingResource.php`
- `app/Http/Controllers/Api/BookingController.php`
- `app/Http/Controllers/Api/StoreLineSettingsController.php`
- `app/Services/BookingService.php`
- `resources/js/pages/admin/**`
- `resources/js/components/admin/**`
- `resources/js/services/api.ts`
- `resources/js/stores/authStore.ts`（参照のみ想定）
- `docs/**`

### 変更禁止

- `package.json` / `composer.json`（承認なし）
- 業種特化ロジック
- LIFF 顧客フローの仕様拡張

---

## 4. Tasks（実施順）

| Task | 監査 ID | 内容 |
|------|---------|------|
| T1 | P0-1 | BookingDetailModal（詳細・変更・キャンセル）＋ API unwrap / show eager load / status 実装 |
| T2 | P0-2 | 新規予約 CTA を「新規予約」1本化（旧ボタン非表示） |
| T3 | P0-3 | ダッシュボードに新規予約 CTA＋ `/bookings` state 連携 |
| T4 | P1-1 | end_time は DB 値優先 |
| T5 | P1-2 | bookingDetails eager load、メニュー/担当/料金表示改善 |
| T6 | P1-3 | モバイル既定ビューをリスト |
| T7 | P1-4 | 設定ナビ・ルート・LINE API のロールガード |
| T8 | P1-5 | ResourceCard 表示名ファースト |
| T9 | P2 | 通知ラベル明確化、ログインテスト情報は DEV のみ、空状態 CTA |
| T10 | — | ビルド・ブラウザ確認・docs・merge/push |

---

## 5. DoD

- [x] 予約クリックで詳細が開き、日時・担当・メモ変更とキャンセルができる
- [x] 新規予約ボタンが 1 つで、ダッシュボードからも到達できる
- [x] 一覧の終了時刻・メニュー・担当表示が実データに基づく
- [x] モバイル既定がリスト
- [x] staff は設定ナビ非表示・直接 URL でも拒否
- [x] リソースカード見出しが display_name
- [x] `npm run build`（コンテナ）成功
- [x] WORKLOG / REPORT / PHASE_REGISTRY / 監査 doc 更新

---

## 更新履歴

| 日時 | 内容 |
|------|------|
| 2026-07-18 21:48:10 | 初版 |
