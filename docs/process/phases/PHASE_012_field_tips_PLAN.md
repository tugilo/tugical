# PHASE_012_field_tips

**作成日時**: 2026-07-19 05:41:26  
**最終更新日時**: 2026-07-19 05:45:00  
**Phase ID**: PHASE_012  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase012-field-tips`

## Related SSOT

- DB/仕様: `resources.hourly_rate_diff`（指名料金差）、`efficiency_rate`（作業効率）
- Resource モデル: `calculateAdditionalFee` / `calculateAdjustedDuration`

## 目的

プルダウン・数値入力の意味がすぐ分かるようにする。  
難解ラベルを言い換え、ⓘ アイコン + TIPS で「全メニューへの効果」をどの画面でも同じ言葉で説明できる。

## 設計判断

| 項目 | 決定 |
|------|------|
| UI | 共通 `FieldTip`（ⓘ + MUI Tooltip）+ `FieldLabel` |
| FormField | `tip` prop 追加（メニュー等で即利用） |
| 文言辞書 | `fieldTips.ts` で一元管理 |
| 言い換え | 「時間料金差」→「指名料金」 |

## Scope

- `FieldTip` / `FieldLabel` / `fieldTips.ts` / `FormField`
- Resource 作成・編集・カード
- Menu 作成・編集
- 顧客作成など FormField 利用箇所の主要 tip
- `docs/process/**`

## DoD

- [x] ⓘ TIPS が共通コンポーネントで使える
- [x] 時間料金差が「指名料金」になり効果説明がある
- [x] メニュー・リソースの主要数値/選択に tip がある
- [x] build / merge / push
