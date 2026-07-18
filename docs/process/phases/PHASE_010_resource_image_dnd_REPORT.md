# PHASE_010_resource_image_dnd REPORT

**作成日時**: 2026-07-19 05:28:37  
**最終更新日時**: 2026-07-19 05:29:05  
**Phase ID**: PHASE_010  
**フェーズ種別**: implement  

## 結果サマリ

- スタッフ・設備などリソースに画像1枚（`photo_url`）のアップロードを追加
- メニュー・リソース共通の `ImageUploadField` でドラッグ＆ドロップ対応
- Request/API レスポンスを DB カラム `photo_url` に整合

## Merge Evidence

```
merge commit id: 44ac3a2
source branch: feature/phase010-resource-image-dnd
target branch: develop
phase id: 010
phase type: implement
related ssot: resources.photo_url / PHASE_009 menu image

test command: docker compose exec -T app npm run build
test result: success

changed files:
app/Http/Controllers/Api/ResourceController.php
app/Http/Requests/CreateResourceRequest.php
app/Http/Requests/UpdateResourceRequest.php
app/Http/Resources/ResourceResource.php
docs/process/PHASE_REGISTRY.md
docs/process/phases/PHASE_010_resource_image_dnd_PLAN.md
docs/process/phases/PHASE_010_resource_image_dnd_REPORT.md
docs/process/phases/PHASE_010_resource_image_dnd_WORKLOG.md
frontend/src/types/index.ts
resources/js/components/admin/menus/MenuImageField.tsx
resources/js/components/admin/resources/ResourceCreateModal.tsx
resources/js/components/admin/resources/ResourceEditModal.tsx
resources/js/components/admin/ui/ImageUploadField.tsx
resources/js/services/api.ts
routes/api.php

scope check: OK
ssot check: OK
dod check: OK
```
