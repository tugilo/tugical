# PHASE_014_unify_digit_inputs WORKLOG

**作成日時**: 2026-07-19 05:51:51  
**最終更新日時**: 2026-07-19 05:52:30  

## Task1 - SoftNumberKeypad digits モード

- 状態: 完了
- 判断: 金額・分数（number）と電話・郵便（digits）を同一 UI で揃え、OS キーボード差をなくす
- 実施: `mode: 'number' | 'digits'`、`maxLength` を追加。`SoftDigitField`（phone / postal）を新設
- 確認: build OK

## Task2 - 全画面の電話・郵便へ接続

- 状態: 完了
- 判断: FormField `type=tel` も SoftDigitField に寄せ、個別モーダルは直接 SoftDigitField を使う
- 実施: Customer Create/Detail、CombinationBooking（電話検索）、AddressForm（郵便）。未使用の `onPostalCodeChange` を削除し `onAfterChange` で住所補完
- 確認: admin 内 raw `type=tel` なし。build OK
