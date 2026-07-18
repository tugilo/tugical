# PHASE_005_booking_modal_ux

**作成日時**: 2026-07-19 05:04:38  
**最終更新日時**: 2026-07-19 05:07:32  
**Phase ID**: PHASE_005  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase005-booking-modal-ux`

## Related SSOT

- `backend/docs/tugical_ui_design_system_v1.0.md`（タッチターゲット・片手操作）
- `backend/docs/ADMIN_UX_MANUALESS_AUDIT_v1.0.md`（電話予約 UX）
- 会話合意: 電話優先 / 時間・担当チップ / メニュー一覧上・選択下 sticky / 直近お客様なし

## 目的

新規予約モーダルを電話対応向けに刷新する。

## Scope

- `resources/js/components/admin/booking/CombinationBookingModal.tsx`
- `resources/js/components/admin/booking/MultiMenuSelector.tsx`
- `docs/process/**`

## 実装内容

1. 顧客: 電話番号ファースト、1件なら自動確定、0件ならその場で新規（直近お客様は無し）
2. 開始時間・担当: プルダウンではなくチップ選択
3. メニュー: 一覧が上、選択中が下＋スクロール時は下部固定

## DoD

- [x] 上記3点が動作する
- [x] `npm run build` 成功
- [x] develop へ merge + push
