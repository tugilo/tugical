# PHASE_019_resource_priority_ui

**作成日時**: 2026-07-19 06:10:57  
**最終更新日時**: 2026-07-19 06:12:01  
**Phase ID**: PHASE_019  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase019-resource-priority-ui`

## Related SSOT

- PHASE_017 自動割当（sort_order）
- Admin Modal / SoftNumberKeypad

## 目的

スタッフ・設備管理で優先順を確実に設定・確認できるようにする。

## 原因

- SoftNumberKeypad が MUI Dialog 内にあり、overflow / focus trap で操作不能になりうる
- 優先順フィールドが詳細設定の下に埋もれていた
- 作成時 `sort_order=0` が falsy 扱いで上書きされていた

## Scope

- SoftNumberKeypad / Modal
- Resource Create/Edit/Card
- Resource model creating hook
- docs/process/**

## DoD

- [x] 編集モーダルで優先順テンキーが操作できる
- [x] 一覧カードに優先順が表示される
- [x] sort_order=0 が意図どおり扱われる
- [x] build / merge / push
