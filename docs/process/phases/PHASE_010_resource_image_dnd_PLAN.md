# PHASE_010_resource_image_dnd

**作成日時**: 2026-07-19 05:25:40  
**最終更新日時**: 2026-07-19 05:28:37  
**Phase ID**: PHASE_010  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase010-resource-image-dnd`

## Related SSOT

- DB: `resources.photo_url`
- PHASE_009: メニュー画像1枚アップロード

## 目的

スタッフ・設備（リソース）にも画像1枚登録。画像UIはドラッグ＆ドロップ対応（メニュー共通化）。

## Scope

- 共通 `ImageUploadField`（DnD）+ MenuImageField 移行
- Resource upload API / Request / Create·Edit モーダル
- `docs/process/**`

## DoD

- [x] リソース作成・編集で画像アップロード（DnD可）
- [x] メニュー画像も DnD 可
- [x] build / merge / push
