# PHASE_020_resource_drag_reorder REPORT

**作成日時**: 2026-07-19 06:16:29  
**最終更新日時**: 2026-07-19 06:16:43  
**Phase ID**: PHASE_020  
**フェーズ種別**: implement  

## 結果サマリ

- スタッフ・設備画面で「優先順を並べ替え」→ ドラッグで sort_order を保存可能に

## Merge Evidence

```
merge commit id: a9236cf
source branch: feature/phase020-resource-drag-reorder
target branch: develop
phase id: 020
phase type: implement
related ssot: PHASE_017 自動割当 / resources-order API

test command: docker compose exec -T app npm run build
test result: success

changed files:
docs/process/PHASE_REGISTRY.md
docs/process/phases/PHASE_020_resource_drag_reorder_PLAN.md
docs/process/phases/PHASE_020_resource_drag_reorder_REPORT.md
docs/process/phases/PHASE_020_resource_drag_reorder_WORKLOG.md
resources/js/components/admin/resources/ResourcePriorityList.tsx
resources/js/pages/admin/resources/ResourcesPage.tsx
resources/js/services/api.ts

scope check: OK
ssot check: OK
dod check: OK
```
