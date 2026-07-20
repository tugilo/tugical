# PHASE_022_liff_horizon_suggestions

**作成日時**: 2026-07-20 23:13:33  
**最終更新日時**: 2026-07-20 23:15:12  
**Phase ID**: PHASE_022  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase022-liff-horizon-suggestions`

## Related SSOT

- コンセプト「提案型予約」
- `resources/js/components/liff/BookingFlow/BookingFlow.tsx`
- LIFF availability API（既存）

## 目的

希望時期のショートカット（直近・1ヶ月後・3ヶ月後・〜ヶ月後）で提案枠を出し、希望日に空きがない場合は候補日を複数提案する。

## Scope

- `resources/js/components/liff/**`
- `docs/process/**`

## Out of Scope

- バックエンド API 新規追加
- 管理画面変更
- 業種特化ロジック

## DoD

- [x] 時期チップ: 直近 / 1ヶ月後 / 3ヶ月後 / 〜ヶ月後（2・4・6ヶ月）
- [x] 選択時期の窓でおすすめ枠を表示
- [x] 窓内空きなし時は近傍の候補日を複数提案
- [x] 希望日空きなし時の候補日を最大5件
- [x] `npm run build`（Docker）成功
- [x] develop へ merge / push
