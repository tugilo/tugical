# PHASE_018_backfill_unassigned_resources

**作成日時**: 2026-07-19 06:08:49  
**最終更新日時**: 2026-07-19 06:09:30  
**Phase ID**: PHASE_018  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase018-backfill-unassigned-resources`

## Related SSOT

- PHASE_017 担当者自動割当（sort_order 優先）
- BookingService / AvailabilityService

## 目的

既存の `resource_id = null` 予約へ、優先順に従い担当者を一括割当する。

## 方針

- Artisan コマンドで実行（再実行可能・未割当のみ対象）
- 自己衝突を除外し、バックフィル中は他の未割当同士はブロックしない（順次割当）
- 明細（booking_details）の null も同じ担当で更新
- ステータス: confirmed / pending / completed（cancelled 除外）

## Scope

- `app/Services/BookingService.php`
- `app/Services/AvailabilityService.php`
- `app/Console/Commands/*`
- `docs/process/**`

## DoD

- [x] 未割当予約がすべて resource_id 付きになる（割当不能時はログ）
- [x] コマンド実行済み
- [x] merge / push
