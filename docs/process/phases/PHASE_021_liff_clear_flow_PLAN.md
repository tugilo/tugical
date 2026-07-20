# PHASE_021_liff_clear_flow

**作成日時**: 2026-07-20 23:11:10  
**最終更新日時**: 2026-07-20 23:12:31  
**Phase ID**: PHASE_021  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase021-liff-clear-flow`

## Related SSOT

- コンセプト「提案型予約」
- BookingFlow / LiffController

## 目的

LIFF を「メニュー → おすすめ日時 → 確認 → 完了」のわかりやすい導線に再構成する。

## Scope

- `resources/js/components/liff/**`
- `resources/js/pages/liff/index.tsx`（必要時）
- `docs/process/**`

## DoD

- [x] 4ステップ導線
- [x] 空きなし時の近い日提案
- [x] 仮押さえ残り時間・完了情報
- [x] 日付に曜日
- [x] build / merge / push
