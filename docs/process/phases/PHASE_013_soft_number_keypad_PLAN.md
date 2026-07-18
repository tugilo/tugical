# PHASE_013_soft_number_keypad

**作成日時**: 2026-07-19 05:45:00  
**最終更新日時**: 2026-07-19 05:47:00  
**Phase ID**: PHASE_013  
**フェーズ種別**: implement  
**ブランチ**: `feature/phase013-soft-number-keypad`

## Related SSOT

- Admin UX: 片手操作・電話予約最適化（UI/UX 設計）
- PHASE_012: FormField / FieldLabel

## 目的

数字入力はソフトウェアテンキーで完結させ、物理/フルキーボードを極力使わなくてよいようにする（全管理画面）。

## 設計判断

| 項目 | 決定 |
|------|------|
| UI | タップで下部テンキーを開く（入力欄は readOnly で OS キーボード抑制） |
| 共通化 | `SoftNumberField` + `FormField type=number` に内蔵 |
| 生 input | リソース等の raw number も `SoftNumberField` に置換 |
| 電話番号 | `inputMode=tel`（OS テンキー）で十分。金額・分数は SoftNumber |

## Scope

- `SoftNumberKeypad` / `SoftNumberField`
- `FormField`（number）
- Resource Create/Edit の number 入力
- `docs/process/**`

## DoD

- [x] 数値フィールドでソフトテンキーが開く
- [x] FormField number が全画面でテンキー利用
- [x] OS キーボードが出にくい（readOnly）
- [x] build / merge / push
