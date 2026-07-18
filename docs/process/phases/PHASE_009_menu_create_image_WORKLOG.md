# PHASE_009_menu_create_image WORKLOG

**作成日時**: 2026-07-19 05:22:31  
**最終更新日時**: 2026-07-19 05:24:44  

## Task1 - 枚数・DB判断

- 状態: 完了
- 判断: `image_url`（メイン1）で LIFF 十分。`image_gallery` は API/LIFF 未使用のため今回対象外。複数枚制限は不要
- 実施: PLAN に記載
- 確認: migration / LiffController の photo_url マッピングを確認

## Task2 - アップロードAPI + UI

- 状態: 完了
- 判断: URL手入力よりファイル選択の方が簡単。public disk + `/storage` で最短
- 実施:
  - `POST menus/upload-image`（jpeg/png/webp・5MB）
  - `image_url` バリデーションを相対パス対応
  - `MenuImageField` + 作成UI簡素化 + 編集に画像追加
  - `storage:link` 実行
- 確認: build OK。新規メニューモーダルに「画像を選ぶ」表示を確認
