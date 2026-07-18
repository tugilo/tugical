# PHASE_015_dashboard_today_bookings WORKLOG

**作成日時**: 2026-07-19 05:54:36  
**最終更新日時**: 2026-07-19 05:54:58  

## Task1 - 原因特定

- 状態: 完了
- 判断: API は本日予約を返しているが、フロントの `booking_date === today` が失敗していた
- 実施: DB `2026-07-19` → JSON `2026-07-18T15:00:00.000000Z`（UTC）を確認。JST カレンダー日と不一致
- 確認: LIFF/Notification は既に `format('Y-m-d')`、BookingResource のみ未対応

## Task2 - 修正

- 状態: 完了
- 判断: 根本は Resource 側でカレンダー日を返すこと。フロントは正規化を追加
- 実施: `BookingResource` で `format('Y-m-d')`、Dashboard の today 比較を `toBookingDateKey` 経由に
- 確認: tinker で api booking_date === today、npm build OK
