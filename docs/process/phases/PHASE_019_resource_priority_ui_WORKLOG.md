# PHASE_019_resource_priority_ui WORKLOG

**作成日時**: 2026-07-19 06:10:57  
**最終更新日時**: 2026-07-19 06:12:01  

## Task1 - テンキー操作不能の修正

- 状態: 完了
- 判断: MUI Dialog の overflow / focus trap が SoftNumberKeypad を阻害
- 実施: createPortal(document.body)、z-index 2000、Modal に disableEnforceFocus
- 確認: build OK

## Task2 - 優先順 UI の可視化

- 状態: 完了
- 判断: フィールドが詳細設定の下に埋もれていた。カードにも表示が無い
- 実施: Create/Edit で強調ボックスへ移動、ResourceCard に優先順表示、creating の `!$sort_order` を null 判定に修正
- 確認: build OK
