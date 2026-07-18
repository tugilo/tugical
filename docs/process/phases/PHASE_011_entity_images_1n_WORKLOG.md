# PHASE_011_entity_images_1n WORKLOG

**作成日時**: 2026-07-19 05:34:39  
**最終更新日時**: 2026-07-19 05:40:00  

## Task1 - 1対多テーブル設計

- 状態: 完了
- 判断: JSON gallery ではなく正規化テーブル。menu/resource 共通のためポリモーフィック `entity_images`。LIFF 互換のため primary を `image_url` / `photo_url` に同期
- 実施: migration + 既存単一画像の移行 + morph map（menu/resource）
- 確認: `php artisan migrate` 成功

## Task2 - API 同期

- 状態: 完了
- 判断: 作成・更新で `images[]` を完全置換。専用 CRUD エンドポイントは今回不要（フォーム保存と一体の方が簡単）
- 実施: `EntityImageSyncService`、Menu/Resource Request・Controller・Resource 出力
- 確認: 上限10枚、TenantScope 適用

## Task3 - 管理画面 UI

- 状態: 完了
- 判断: 複数 DnD・メイン指定（★）・削除を共通コンポーネント化
- 実施: `MultiImageUploadField`、Menu/Resource 作成・編集へ接続
- 確認: `npm run build` 成功
