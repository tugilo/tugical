# PHASE_010_resource_image_dnd WORKLOG

**作成日時**: 2026-07-19 05:28:37  
**最終更新日時**: 2026-07-19 05:28:37  

## Task1 - 共通 DnD 画像フィールド

- 状態: 完了
- 判断: メニュー・リソースで同じ UI を使うため共通コンポーネント化。DnD は UX 要件として必須
- 実施:
  - `ImageUploadField` を新設（クリック選択 + ドラッグ＆ドロップ + プレビュー + 削除）
  - `MenuImageField` を薄いラッパーに移行（ヒントに DnD を明記）
- 確認: `npm run build` 成功

## Task2 - リソース画像 API / 型整合

- 状態: 完了
- 判断: DB カラムは `photo_url`。旧 Request/Resource の `image_url` 表記はズレていたため `photo_url` に揃える
- 実施:
  - `POST /api/v1/resources/upload-image`（jpeg/png/webp・5MB・`resources/{store_id}/`）
  - Create/Update Request の `photo_url` を相対パス許容の string に変更
  - `ResourceResource` で `photo_url` を返し、`image_url` はエイリアス
  - フロント API / 型の `photo_url` 対応
- 確認: ルート登録・コントローラ実装を確認

## Task3 - リソース作成・編集 UI

- 状態: 完了
- 判断: メニューと同様、URL 手入力よりファイル/DnD の方が簡単。編集にも同フィールドを追加
- 実施:
  - `ResourceCreateModal`: 画像URL入力を `ImageUploadField` に置換
  - `ResourceEditModal`: `photo_url` をフォームに追加し同フィールドを配置
- 確認: build OK
