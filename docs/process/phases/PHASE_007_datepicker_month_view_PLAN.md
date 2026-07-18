# PHASE_007_datepicker_month_view

**作成日時**: 2026-07-19 05:13:29  
**最終更新日時**: 2026-07-19 05:15:17  
**Phase ID**: PHASE_007  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase007-datepicker-month-view`

## Related SSOT

- 会話報告: 年はタップ選択できるが月は月送りのみ

## 目的

管理画面 DatePicker で月も年と同様にタップ選択できるようにする。

## Scope

- `resources/js/components/admin/ui/DatePicker.tsx`
- `docs/process/**`

## 実装内容

- MUI DatePicker の `views` に `month` を含め `['year', 'month', 'day']` とする（デフォルトは day/year のみのため月ビューが無効）

## DoD

- [x] カレンダーヘッダから月をタップ選択できる
- [x] `npm run build` 成功
- [x] develop へ merge + push
