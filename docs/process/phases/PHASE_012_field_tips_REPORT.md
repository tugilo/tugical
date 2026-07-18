# PHASE_012_field_tips REPORT

**作成日時**: 2026-07-19 05:45:00  
**最終更新日時**: 2026-07-19 05:45:00  
**Phase ID**: PHASE_012  
**フェーズ種別**: implement  

## 結果サマリ

- ⓘ TIPS を共通化（`FieldTip` / `FormField.tip` / `fieldTips.ts`）
- 「時間料金差」→「指名料金（円/時）」に言い換え、全メニューへの効果を tip で説明
- 効率率→「作業時間の調整」、選択肢を分かりやすい文言に簡略化

## Merge Evidence

```
merge commit id: (merge後に記録)
source branch: feature/phase012-field-tips
target branch: develop
phase id: 012
phase type: implement
related ssot: hourly_rate_diff / efficiency_rate

test command: docker compose exec -T app npm run build
test result: success

changed files:
(merge後に記録)

scope check: OK
ssot check: OK
dod check: OK
```
