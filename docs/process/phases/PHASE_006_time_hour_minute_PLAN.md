# PHASE_006_time_hour_minute

**作成日時**: 2026-07-19 05:10:15  
**最終更新日時**: 2026-07-19 05:11:46  
**Phase ID**: PHASE_006  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase006-time-hour-minute`

## Related SSOT

- 会話合意: 開始時間は時→分の二段タップ。時選択後に分を表示。時の再選択は容易に

## 目的

新規予約モーダルの開始時間を「時チップ → 分チップ」に分離する。

## Scope

- `resources/js/components/admin/booking/CombinationBookingModal.tsx`
- `docs/process/**`

## 実装内容

1. 時（08〜21）を常時表示してタップ選択
2. 時選択後に分（00/15/30/45）を表示（21時は 00 のみ）
3. 時を付け替えても分が有効なら引き継ぎ、start_time を更新

## DoD

- [x] 時→分の順で選択できる
- [x] 時の再タップで変更できる
- [x] `npm run build` 成功
- [x] develop へ merge + push
