# PHASE_008_always_show_name_search

**作成日時**: 2026-07-19 05:17:22  
**最終更新日時**: 2026-07-19 05:17:55  
**Phase ID**: PHASE_008  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase008-always-show-name-search`

## Related SSOT

- 会話指示: 名前で探すは補助トグルではなく常時表示

## 目的

新規予約モーダルの顧客名検索を常に表示する。

## Scope

- `resources/js/components/admin/booking/CombinationBookingModal.tsx`
- `docs/process/**`

## DoD

- [x] 未選択時に名前検索が常時表示される
- [x] `npm run build` 成功
- [x] develop へ merge + push
