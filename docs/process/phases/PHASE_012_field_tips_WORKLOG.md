# PHASE_012_field_tips WORKLOG

**作成日時**: 2026-07-19 05:41:26  
**最終更新日時**: 2026-07-19 05:45:00  

## Task1 - 共通 TIPS UI

- 状態: 完了
- 判断: 画面ごとに説明文を書くとズレるため `fieldTips.ts` で一元管理。表示は ⓘ + MUI Tooltip
- 実施: `FieldTip` / `FieldLabel` / `FormField.tip` / `FIELD_TIPS`
- 確認: build OK

## Task2 - 難解ラベルの言い換え + 適用

- 状態: 完了
- 判断: 「時間料金差」は仕様上の指名料金差。全メニューに時給換算で上乗せされる旨を tip に明記
- 実施:
  - リソース: 指名料金 / 作業時間の調整、選択肢を短め・そのまま・長めに簡略化
  - メニュー・顧客・予約作成の主要フィールドに tip
- 確認: Resource/Menu 作成・編集で ⓘ 表示を想定
