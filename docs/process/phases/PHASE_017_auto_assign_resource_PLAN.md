# PHASE_017_auto_assign_resource

**作成日時**: 2026-07-19 06:03:33  
**最終更新日時**: 2026-07-19 06:05:51  
**Phase ID**: PHASE_017  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase017-auto-assign-resource`

## Related SSOT

- 要件: おまかせ（自動割当）
- BookingService / AvailabilityService

## 目的

「指定なし」予約時に `resources.sort_order` 優先で空き担当へ自動割当し、競合チェックの穴を塞ぐ。

## Scope

- `app/Services/BookingService.php`
- `app/Services/AvailabilityService.php`
- Admin 予約モーダル・リソース tip / sort_order UI
- `docs/process/**`

## DoD

- [x] 指定なしで作成すると空き担当が sort_order 順で入る
- [x] 全員埋まっている時間はエラー
- [x] 指定なし→指名の二重予約を防止
- [x] combination でも競合＋自動割当
- [x] build / merge / push
