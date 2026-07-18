# PHASE_009_menu_create_image

**作成日時**: 2026-07-19 05:22:31  
**最終更新日時**: 2026-07-19 05:24:44  
**Phase ID**: PHASE_009  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase009-menu-create-image`

## Related SSOT

- DB: `menus.image_url`（メイン）、`image_gallery`（JSON・未使用）
- LIFF: `image_url` → `photo_url`（1枚表示）

## 判断（枚数制限）

- LIFF カードは1枚表示のため **メイン画像1枚のみ** で十分
- `image_gallery` は今は使わない（複数枚UI・制限は不要）
- ファイル: jpeg/png/webp、最大 5MB

## Scope

- `MenuController` / routes / Create·UpdateMenuRequest
- `MenuCreateModal` / `MenuEditModal`（＋簡易画像コンポーネント）
- `resources/js/services/api.ts`
- `docs/process/**`

## DoD

- [x] 作成・編集で画像アップロードできる
- [x] `image_url` が保存され LIFF 向けに出せる
- [x] 作成フォームが簡素化されている
- [x] build / merge / push
