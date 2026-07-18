# PHASE_016_dashboard_menu_display

**作成日時**: 2026-07-19 05:58:18  
**最終更新日時**: 2026-07-19 05:58:46  
**Phase ID**: PHASE_016  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase016-dashboard-menu-display`

## Related SSOT

- Admin Dashboard「本日の予約」一覧表示
- 複数メニュー予約: `booking_details`（`menu_id` が null の場合あり）
- BookingsPage / BookingCard のメニュー名解決ロジック

## 目的

ダッシュボード「本日の予約」一覧でメニュー名が表示されない不具合を修正する。

## 原因

組み合わせ予約は `bookings.menu_id` が null で、メニューは `details`（booking_details）側にある。  
ダッシュボードは `b.menu.name` のみ参照しており空になる。

## Scope

- `resources/js/pages/admin/dashboard/DashboardPage.tsx`
- `docs/process/**`

## DoD

- [x] 本日の予約一覧にメニュー名が表示される（単一・複数とも）
- [x] build / merge / push
