# PHASE_020_resource_drag_reorder

**作成日時**: 2026-07-19 06:15:31  
**最終更新日時**: 2026-07-19 06:16:29  
**Phase ID**: PHASE_020  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase020-resource-drag-reorder`

## Related SSOT

- PHASE_017 / 019 自動割当・優先順
- API: `PATCH /resources-order`

## 目的

スタッフ・設備の優先順をドラッグ＆ドロップで並べ替えできるようにする。

## 方針

- 新パッケージなし（HTML5 DnD）
- 既存 `resources-order` API を利用
- 「優先順を並べ替え」モード（開始時は種類をスタッフに絞る）

## Scope

- `resources/js/pages/admin/resources/ResourcesPage.tsx`
- `resources/js/components/admin/resources/ResourcePriorityList.tsx`
- `resources/js/services/api.ts`
- `docs/process/**`

## DoD

- [x] ドラッグで優先順が保存される
- [x] build / merge / push
