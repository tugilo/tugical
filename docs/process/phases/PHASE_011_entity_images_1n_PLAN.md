# PHASE_011_entity_images_1n

**作成日時**: 2026-07-19 05:34:39  
**最終更新日時**: 2026-07-19 05:40:00  
**Phase ID**: PHASE_011  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase011-entity-images-1n`

## Related SSOT

- DB: `menus.image_url` / `resources.photo_url`（互換用メイン画像）
- PHASE_009 / PHASE_010: 単一画像アップロード UI

## 目的

メニュー・リソースの画像を **1対多** で管理し、複数枚登録できるようにする。

## 設計判断

| 項目 | 決定 |
|------|------|
| テーブル | `entity_images`（ポリモーフィック: menu / resource） |
| テナント | `store_id` + TenantScope |
| 上限 | 1エンティティあたり最大 10 枚 |
| メイン画像 | `is_primary`（先頭を既定）。`menus.image_url` / `resources.photo_url` に同期（LIFF互換） |
| 既存データ | 既存の単一URLを1行として移行 |
| JSON gallery | `menus.image_gallery` は使わない（正規化テーブルへ） |

## Scope

- migration / `EntityImage` model / Menu·Resource relations
- Create·Update sync（`images[]`）+ API Resource 出力
- `MultiImageUploadField`（DnD・複数）+ Menu/Resource 作成・編集モーダル
- `docs/process/**`

## DoD

- [x] `entity_images` で 1:N 管理できる
- [x] メニュー・リソースで複数枚追加・削除・メイン指定できる
- [x] 既存単一画像が移行される
- [x] LIFF 用 `image_url` / `photo_url` が primary と同期される
- [x] build / migrate / merge / push
