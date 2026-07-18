# PHASE_015_dashboard_today_bookings

**作成日時**: 2026-07-19 05:54:36  
**最終更新日時**: 2026-07-19 05:54:58  
**Phase ID**: PHASE_015  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase015-dashboard-today-bookings`

## Related SSOT

- Admin Dashboard「本日の予約」表示
- API: `BookingResource` / bookings list
- LIFF/Notification は既に `booking_date` を `Y-m-d` で返している

## 目的

ダッシュボードに本日の予約が存在するのに表示されない不具合を修正する。

## 原因

`BookingResource` が `booking_date` を Carbon のまま返し、JSON では UTC ISO（例: `2026-07-18T15:00:00.000000Z`）になる。  
ダッシュボードはローカル `Y-m-d`（例: `2026-07-19`）と厳密一致するため、常に不一致となる。

## Scope

- `app/Http/Resources/BookingResource.php`
- `resources/js/pages/admin/dashboard/DashboardPage.tsx`（防御的正規化）
- `docs/process/**`

## DoD

- [x] API の `booking_date` が `Y-m-d` で返る
- [x] 本日の予約がダッシュボードに表示される
- [x] build / merge / push
