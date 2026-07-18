# PHASE_016_dashboard_menu_display WORKLOG

**作成日時**: 2026-07-19 05:58:18  
**最終更新日時**: 2026-07-19 05:58:46  

## Task1 - 原因特定

- 状態: 完了
- 判断: 本日予約 id=14 は `menu_id=null`、メニューは `booking_details`（service_name=cut）にある
- 実施: Dashboard は `b.menu.name` のみ参照 → 空文字表示
- 確認: BookingResource は `details` を返している。BookingsPage は既に details 対応済み

## Task2 - 表示修正

- 状態: 完了
- 判断: BookingsPage.getMenuName と同方針で resolve。リソース表示名も display_name 優先
- 実施: `resolveMenuName` 追加、`mapToTodayBookings` で適用
- 確認: npm build OK
