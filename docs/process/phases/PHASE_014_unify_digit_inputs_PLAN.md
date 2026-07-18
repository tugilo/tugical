# PHASE_014_unify_digit_inputs

**作成日時**: 2026-07-19 05:50:04  
**最終更新日時**: 2026-07-19 05:52:30  
**Phase ID**: PHASE_014  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase014-unify-digit-inputs`

## Related SSOT

- PHASE_013: SoftNumberKeypad（数値）
- Admin UX: 片手操作・キーボード最小化

## 目的

数字系入力を全画面で同じソフトウェアテンキー操作に統一する。  
料金・分数だけでなく、電話番号・郵便番号もキーボードなしで入力できるようにする。

## 設計判断

| 項目 | 決定 |
|------|------|
| 拡張 | SoftNumberKeypad に `digits` モード追加 |
| 電話/郵便 | `SoftDigitField`（文字列・桁制限） |
| FormField | `type=tel` も SoftDigitField に統一 |
| 対象外 | 検索・パスワード・LINE 認証キー・日付 |

## Scope

- SoftNumberKeypad / SoftDigitField / FormField
- Customer Create/Detail、CombinationBooking、AddressForm
- `docs/process/**`

## DoD

- [x] 電話・郵便がソフトテンキーで入力できる
- [x] admin に raw `type=tel` / 郵便のキーボード入力が残っていない
- [x] build / merge / push
