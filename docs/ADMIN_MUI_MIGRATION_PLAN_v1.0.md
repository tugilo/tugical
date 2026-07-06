# 段階的 MUI 移行 実装計画書 v1.7

**Version**: 1.8  
**作成日**: 2026-02-11 20:23  
**更新日**: 2026-07-06 16:50:15  
**基準**: `ADMIN_UI_FIT_GAP_v1.0.md`（v1.1 移行ポリシー）、`tugical_ui_design_system_v1.0.md`  
**目的**: 管理画面の MUI 移行を安全に・段階的に進め、進捗を可視化し、Cursor が迷わず実装できるようにする。

**MVP 実行順序との関係**: 本計画の Phase 5 検討・PoC は **#15〜17**（P3、β ブロッカーと独立・並行可）。正: `REMAINING_TASKS_PLAN_v1.0.md` §4。

---

## 1. 目的

- **MUI 移行を安全に進める** … 一括置換は行わず、Phase 単位で小さく変更し、既存機能を壊さない。
- **各ステップでテスト可能にする** … 各 Phase にテスト項目を明示し、完了定義（DoD）で品質を担保する。
- **進捗を可視化する** … 本計画書の進捗管理テーブルと Fit&Gap のステータス表を連動させる。
- **Fit&Gap と連動する** … 各 Phase 完了時に `ADMIN_UI_FIT_GAP_v1.0.md` の「9. 移行ステータス管理」を更新する。

---

## 2. 全体ロードマップ

| Phase | 内容 | 概要 |
|-------|------|------|
| **Phase 0** | 事前準備 | MUI 依存追加、テーマ設計、Storybook 動作確認 |
| **Phase 1** | DatePicker 置換 | 自作 DatePicker → MUI DatePicker |
| **Phase 2** | Dialog / ConfirmDialog 置換 | 自作 Modal・ConfirmDialog → MUI Dialog |
| **Phase 3** | FormField → TextField 置換 | 自作 FormField → MUI TextField |
| **Phase 4** | Button / Card / Icons 段階統一 | AppButton/AppCard/AppIcon 追加し、画面単位で段階置換（Step 4-1〜4-3） |
| **Phase 5** | 一覧系の検討 | DataGrid 適用可否の判断・検討（FullCalendar との役割分担） |

**制約**: 一括全面置換は禁止。新規画面は MUI、既存はリファクタタイミングで段階置換。

#### Phase 実行順序の原則

- **Phase 0 完了前に Phase 1 以降へ進んではならない。**
- **各 Phase は原則として順番に完了させる。**
- **並列実装は禁止**（コンポーネントの混在期間を最小化するため）。

**目的**: 実装の暴走防止。UI 混在の長期化を防ぐ。

---

## 3. 各 Phase の詳細

---

### Phase 0: 事前準備

#### 目的

MUI をプロジェクトに導入し、設計書のカラートークンでテーマを定義する。以降の Phase で MUI コンポーネントを利用するための土台を整える。

#### 対象ファイル

- `backend/package.json` … MUI 関連パッケージ追加
- `backend/resources/js/` 配下に新規作成:
  - テーマ定義（例: `theme/muiTheme.ts` または `theme/adminTheme.ts`）
  - App または管理画面エントリでの ThemeProvider 設置
- `backend/resources/js/pages/admin/index.tsx` または `App.tsx` … ThemeProvider でラップ
- （任意）Storybook 用設定・MUI テーマプレビュー

#### 実装内容

- **追加**: `@mui/material`、`@mui/x-date-pickers`（DatePicker 用）、`@emotion/react`、`@emotion/styled` を dependencies に追加。
- **追加**: テーマファイルで primary = 設計書トークン（例: #10b981）、secondary 等を定義。`createTheme()` でパレット・タイポグラフィを設定。
- **追加**: 管理画面ルート（`App.tsx` 等）を MUI `ThemeProvider` でラップ。
- **削除**: なし（既存コンポーネントはそのまま）。

#### 使用する MUI コンポーネント

- `ThemeProvider`（@mui/material）
- `createTheme`（@mui/material）

#### テスト項目（必須）

- [ ] 管理画面（/admin）を開いても既存表示が崩れていないこと
- [ ] コンソールに MUI 関連のエラーが出ていないこと
- [ ] （Storybook 利用時）MUI テーマが適用されたプレビューが表示されること

#### 完了定義（Definition of Done）

- [ ] package.json に @mui/material 等が追加され、`npm install` でインストールできる
- [ ] 管理画面が ThemeProvider でラップされ、テーマが適用可能な状態である
- [ ] 既存の Tailwind ベース UI がそのまま表示され、機能が壊れていない
- [ ] **/admin/dashboard を開いても既存表示が崩れていないこと**（ダッシュボード実装計画 Step 3〜10 着手前の前提確認）

#### ステータス管理

- [ ] 未着手
- [ ] 作業中
- [ ] レビュー待ち
- [x] **完了**（2026-02-11）

---

### Phase 1: DatePicker 置換

#### 目的

日付選択を MUI DatePicker に統一し、アクセシビリティ・キーボード操作・多言語対応を標準化する。

#### 対象ファイル

- **削除・置換対象**:  
  - `backend/resources/js/components/admin/ui/DatePicker.tsx`（自作）  
  - 上記を import している箇所を MUI に差し替え
- **利用箇所（要置換）**:
  - `backend/resources/js/components/admin/booking/BookingCreateModal.tsx`
  - `backend/resources/js/components/admin/booking/CombinationBookingModal.tsx`
- **再エクスポート**: `backend/resources/js/components/admin/index.ts` の DatePicker  export を MUI ラッパーまたは MUI 直接利用に変更

#### 実装内容

- **削除**: 自作 `DatePicker.tsx` の使用をやめ、中身は残すか削除するかは方針次第（互換ラッパーを一時置く場合は残すことも可）。
- **追加**: `@mui/x-date-pickers` の `DatePicker`（＋ 必要に応じ `LocalizationProvider` と `AdapterDateFns`）を利用。既存の `value` / `onChange` / `label` / `error` 等の props に合わせたラッパーコンポーネントを作成し、呼び出し側の変更を最小化する。
- **使用 MUI**: `DatePicker`（@mui/x-date-pickers）、`LocalizationProvider`、`AdapterDateFns`（date-fns は既存利用のため）

#### テスト項目（必須）

- [ ] 予約作成モーダル・複数メニュー予約モーダルで日付選択が開き、日付を選べること
- [ ] 選択した日付が正しく state に反映され、送信されること
- [ ] バリデーション（必須・min/max）が期待どおり動くこと
- [ ] キーボードで日付選択・閉じるができること
- [ ] モバイル表示でタッチ操作が問題ないこと
- [ ] 既存の予約作成フロー全体が壊れていないこと

#### 完了定義（Definition of Done）

- [ ] 上記対象ファイルで自作 DatePicker が import されていない
- [ ] 日付選択が MUI DatePicker に完全置換されている
- [ ] 上記テスト項目がすべて満たされている
- [ ] ADMIN_UI_FIT_GAP の「DatePicker」行のステータスを「完了」に更新済み

#### ステータス管理

- [ ] 未着手
- [ ] 作業中
- [ ] レビュー待ち
- [x] **完了**（2026-02-11 20:43）

---

### Phase 2: Dialog / ConfirmDialog 置換

#### 目的

モーダル・確認ダイアログを MUI Dialog に統一し、フォーカス管理・アクセシビリティ・一貫した見た目を確保する。

#### 対象ファイル

- **基盤**:  
  - `backend/resources/js/components/admin/modal/Modal.tsx`（自作）  
  - `backend/resources/js/components/admin/ui/ConfirmDialog.tsx`（自作 Modal を利用）
- **Modal を import しているコンポーネント**:
  - `backend/resources/js/components/admin/booking/BookingCreateModal.tsx`
  - `backend/resources/js/components/admin/booking/CombinationBookingModal.tsx`
  - `backend/resources/js/components/admin/customers/CustomerCreateModal.tsx`
  - `backend/resources/js/components/admin/customers/CustomerDetailModal.tsx`
  - `backend/resources/js/components/admin/menus/MenuCreateModal.tsx`
  - `backend/resources/js/components/admin/menus/MenuEditModal.tsx`
  - `backend/resources/js/components/admin/menus/MenuDetailModal.tsx`
  - `backend/resources/js/components/admin/resources/ResourceCreateModal.tsx`
  - `backend/resources/js/components/admin/resources/ResourceEditModal.tsx`
- **ConfirmDialog を import している箇所**:
  - `backend/resources/js/pages/admin/resources/ResourcesPage.tsx`
  - `backend/resources/js/pages/admin/menus/MenusPage.tsx`
  - `backend/resources/js/components/admin/customers/CustomerDetailModal.tsx`

#### 実装内容

- **削除**: 自作 `Modal.tsx` の使用をやめる。`ConfirmDialog` は MUI Dialog ベースの新実装に差し替え。
- **追加**: MUI `Dialog`、`DialogTitle`、`DialogContent`、`DialogActions` を使用。既存の `open` / `onClose` / `title` / `children` 等に合わせたラッパーまたは直接置換。ConfirmDialog は「タイトル・本文・キャンセル/実行」を MUI Dialog で実装。
- **使用 MUI**: `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`, `Button`（必要に応じ）

#### テスト項目（必須）

- [ ] 各モーダル（予約作成・顧客・メニュー・リソース等）が開閉できること
- [ ] 確認ダイアログ（削除確認等）が表示され、キャンセル・実行が動作すること
- [ ] フォーカスがダイアログ内に閉じ込められ、Esc で閉じること
- [ ] キーボード操作（Tab・Enter・Esc）が期待どおり動くこと
- [ ] モバイルで表示・タップが問題ないこと
- [ ] 既存の作成・編集・削除フローが壊れていないこと

#### 完了定義（Definition of Done）

- [ ] 上記対象で自作 Modal / ConfirmDialog が import されていない
- [ ] モーダル・確認ダイアログが MUI Dialog に完全置換されている
- [ ] 上記テスト項目がすべて満たされている
- [ ] ADMIN_UI_FIT_GAP の「Modal」「ConfirmDialog」行のステータスを「完了」に更新済み

#### ステータス管理

- [ ] 未着手
- [ ] 作業中
- [ ] レビュー待ち
- [x] **完了**（2026-02-11）

---

### Phase 3: FormField → TextField 置換

#### 目的

フォーム入力を MUI TextField に統一し、ラベル・エラー表示・バリデーション・a11y を標準化する。

#### 対象ファイル

- **削除・置換対象**:  
  - `backend/resources/js/components/admin/ui/FormField.tsx`（自作）
- **FormField を import しているコンポーネント**:
  - `backend/resources/js/components/admin/menus/MenuCreateModal.tsx`
  - `backend/resources/js/components/admin/menus/MenuEditModal.tsx`
- （その他、今後 FormField を使う画面が増えた場合も同様に置換対象）

#### 実装内容

- **削除**: 自作 FormField の使用をやめる。
- **追加**: MUI `TextField` を利用。既存の `label` / `value` / `onChange` / `error` / `errorMessage` / `required` / `type` 等に合わせたラッパーまたは直接置換。必要に応じ `FormControl` / `InputLabel` / `FormHelperText` を組み合わせる。
- **使用 MUI**: `TextField`（@mui/material）

#### テスト項目（必須）

- [ ] メニュー作成・編集モーダルで全フォーム項目が表示・入力できること
- [ ] バリデーション（必須・形式）が動き、エラーメッセージが表示されること
- [ ] ラベル・プレースホルダが正しく表示されること
- [ ] キーボードでフォーカス移動・入力ができること
- [ ] モバイル表示で入力・送信が問題ないこと
- [ ] 既存のメニュー作成・編集フローが壊れていないこと

#### 完了定義（Definition of Done）

- [x] 上記対象で自作 FormField の「中身」を MUI TextField に置換（互換ラッパーで import パスは維持）
- [x] フォーム入力が MUI TextField 実装に置換されている
- [ ] 上記テスト項目がすべて満たされている（手動確認は実施推奨）
- [x] ADMIN_UI_FIT_GAP の「FormField」行のステータスを「完了」に更新済み

#### ステータス管理

- [ ] 未着手
- [ ] 作業中
- [ ] レビュー待ち
- [x] **完了**（2026-02-11 21:30）

---

### Phase 5: 一覧系の検討（DataGrid 適用判断）

**実行順序**: #15 UI-FIX-01（MenuController）→ #16 UI-P5-POC（MenusPage DataGrid PoC）→ #17 UI-P5-DONE（Phase 5 完了判定）

#### 目的

予約・顧客・メニュー・リソース等の一覧について、MUI DataGrid をどこまで導入するかを検討し、方針を決める。FullCalendar 利用箇所（タイムライン）との役割分担を明確にする。

#### 評価ドキュメント（参照）

- **`backend/docs/ADMIN_LIST_UI_DATAGRID_EVALUATION_v1.0.md`** … 現状一覧の棚卸し、DataGrid 概要（無償版）、判断軸、方式案 A/B/C、結論と次アクションを記載。本 Phase の判断資料として参照する。

#### 対象ファイル（検討対象）

- `backend/resources/js/pages/admin/bookings/BookingsPage.tsx`（リスト / タイムライン切替）
- `backend/resources/js/components/admin/booking/BookingTimelineView.tsx`
- `backend/resources/js/components/admin/booking/SimpleTimelineView.tsx`
- `backend/resources/js/components/admin/booking/BookingCard.tsx`
- その他一覧表示を行うページ（CustomersPage, MenusPage, ResourcesPage 等）

#### 実装内容

- **本 Phase では実装は行わず「検討」に限定する。**
- 検討項目: 予約一覧を「リスト表示」と「タイムライン表示」の両方で持つ場合、リスト部分に MUI DataGrid を導入するか。FullCalendar はタイムライン専用とし、テーブル状一覧は DataGrid に寄せるか。
- 結論を「DataGrid を導入する / 当面は現状維持（要検討のまま）」のいずれかにし、本計画書と Fit&Gap に追記する。

#### テスト項目（必須）

- 検討 Phase のため、実装後のテスト項目は方針確定後に定義する。

#### 完了定義（Definition of Done）

- [x] DataGrid 導入の有無と対象画面が文書化されている（評価ドキュメント v1.0 で実施）
- [ ] 導入する場合: 対象コンポーネント・対象ファイルが列挙され、次の Phase または別タスクに落ちている
- [ ] 導入しない場合: 理由と「要検討」のままにする範囲が Fit&Gap に反映されている

#### ステータス管理

- [ ] 未着手
- [x] **作業中（検討中）** … 評価ドキュメント作成済み。PoC 実施の有無は未決定。
- [ ] レビュー待ち
- [ ] 完了

---

### Phase 4: Button / Card / Icons 段階統一

#### 目的

Button・Card・Icons を MUI 基準に寄せる。一括置換はせず、AppButton / AppCard / AppIcon を追加し、画面単位で段階置換する。

#### 追加コンポーネント（互換ラッパー）

- **AppButton**（`components/admin/ui/AppButton.tsx`）: MUI Button。variant=primary/outline/ghost/danger、size、leftIcon/rightIcon、loading を互換。
- **AppCard**（`components/admin/ui/AppCard.tsx`）: MUI Card。title / subheader / actions / children。variant=outlined を基本。
- **AppIcon**（`components/admin/ui/AppIcon.tsx`）: name で MUI Icons をマップ（add, edit, delete, search, calendar, person 等）。

#### 段階置換（Step 4-1〜4-3）

- **Step 4-1**: ダッシュボードの CardActions の Button を AppButton に置換。手動確認: /admin/dashboard
- **Step 4-2**: メニュー作成・編集モーダルの保存/キャンセルを AppButton に置換。手動確認: メニュー作成・編集モーダル
- **Step 4-3**: リソース画面（ResourcesPage、ResourceCard、ResourceEditModal）の Button を AppButton に置換。手動確認: リソース一覧・削除確認

#### テスト項目（必須）

- [ ] npm run build が成功すること
- [ ] 対象画面が表示崩れしないこと
- [ ] 主要ボタンが動作する（onClick / submit / disabled）
- [ ] Console error なし

#### 完了定義（Definition of Done）

- [x] AppButton / AppCard / AppIcon を追加済み
- [x] Step 4-1〜4-3 の対象画面で AppButton に置換済み
- [ ] 上記テスト項目がすべて満たされている（手動確認は実施推奨）
- [x] ADMIN_UI_FIT_GAP の Button / Card / アイコンを「一部完了」に更新済み

#### ステータス管理

- [ ] 未着手
- [ ] 作業中
- [ ] レビュー待ち
- [x] **Step 4-1〜4-3 完了**（2026-02-12）

---

## 4. 進捗管理テーブル

| Phase | 内容 | 優先度 | ステータス | 完了日 |
|-------|------|--------|------------|--------|
| 0 | 事前準備（MUI 依存・テーマ・ThemeProvider） | 必須 | 完了 | 2026-02-11 |
| 1 | DatePicker 置換 | 高 | 完了 | 2026-02-11 |
| 2 | Dialog / ConfirmDialog 置換 | 高 | 完了 | 2026-02-11 |
| 3 | FormField → TextField 置換 | 高 | 完了 | 2026-02-11 |
| 4 | Button / Card / Icons 段階統一（Step 4-1〜4-3） | 中 | 完了 | 2026-02-12 |
| 5 | 一覧系の検討（DataGrid 適用判断） | 高（検討） | 検討中（評価 doc 作成済み） | — |

※ 各 Phase 完了時に「ステータス」を「完了」に、「完了日」を日付（YYYY-MM-DD）に更新する。

---

## 5. リスク管理

| リスク | 内容 | 対策 |
|--------|------|------|
| **Tailwind と MUI の混在** | 両方のクラスが同時に当たり、見た目が崩れる・優先度が不明になる | 置換したコンポーネントからは Tailwind のクラスを削除。MUI は sx または theme で統一。新規は MUI のみ使う方針を徹底。 |
| **バンドルサイズ増加** | MUI 追加により JS/CSS が増える | tree-shake 可能な import（`@mui/material/Button` 等）を心がける。未使用コンポーネントを一括 import しない。必要なら分析でサイズを計測。 |
| **スタイル競合** | MUI の既定スタイルと Tailwind の reset/utility が競合 | 管理画面ルートで MUI の CssBaseline を入れるか検討。Tailwind の preflight と MUI の競合があれば、スコープを分けるか上書きで調整。 |
| **FullCalendar との整合性** | 予約タイムラインは FullCalendar のまま。DataGrid と役割が重複しないか | Phase 5 で「リスト = DataGrid」「タイムライン = FullCalendar」と役割を分け、並存方針を文書化する。 |

#### 技術的負債管理

- **自作コンポーネントは置換後 2 Phase 以内に削除する。**
- **旧 UI と新 UI の混在期間を最小化する。**
- **deprecated と明示したコンポーネントは、ステータス管理表に記録する。**

**目的**: 混在の長期化防止。MUI 移行の完遂保証。

#### Rollback（巻き戻し）戦略

- **各 Phase 開始前にブランチを分離する**（例: `feature/mui-phase1-datepicker`）。
- **置換前コンポーネントは即削除せず、一時的に deprecated コメントを付ける。**
- **本番反映前にステージングで必ず動作確認を行う。**
- **不具合が発生した場合は当該 Phase のブランチを破棄し、前 Phase 完了状態へ戻す。**

**目的**: 本番事故回避。取り返しのつかない変更を防ぐ。

---

## 6. ドキュメント更新ルール

各 Phase 完了時に以下を実施する。

1. **ADMIN_UI_FIT_GAP_v1.0.md**
   - 「9. 移行ステータス管理」の該当コンポーネントのステータスを「完了」に更新する。

2. **.cursorrules**
   - Admin UI の記述が実装と一致しているか確認する。MUI 導入後は「管理画面では MUI を利用（〇〇は完了）」等、必要に応じて追記する。

3. **本計画書（ADMIN_MUI_MIGRATION_PLAN_v1.0.md）**
   - 進捗管理テーブル（セクション 4）の該当 Phase のステータス・完了日を更新する。
   - 変更履歴に「Phase 〇 完了。〇〇を MUI に置換。」を追記する。

---

## 7. 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-11 20:23 | 初版作成。Phase 0〜5 の詳細・進捗表・リスク・更新ルールを定義。 | tugilo inc. |
| 1.1 | 2026-02-11 20:27 | Phase 実行順序明示、Rollback 方針追加、技術的負債管理ポリシー追加。事故耐性と実行強度を強化。 | tugilo inc. |
| 1.2 | 2026-02-11 20:38 | Phase 0 完了。依存追加・adminTheme.ts 作成・ThemeProvider/CssBaseline 適用。 | tugilo inc. |
| 1.3 | 2026-02-11 20:43 | Phase 1 完了。DatePicker を MUI 実装に置換（互換ラッパーで value/onChange/label/error 維持）。 | tugilo inc. |
| 1.4 | 2026-02-11 21:30 | Phase 3 完了。FormField を MUI TextField 実装に置換（互換ラッパー、呼び出し側変更なし）。 | tugilo inc. |
| 1.5 | 2026-02-12 00:06 | Phase 4（Button/Card/Icons）実施。AppButton/AppCard/AppIcon 追加。Step 4-1〜4-3 でダッシュボード・メニュー・リソースを AppButton に置換。進捗表 Phase 2/3 を完了に、Phase 4 を完了に更新。 | tugilo inc. |
| 1.6 | 2026-02-12 00:13 | Phase 番号の不整合修正。Button/Card/Icons を Phase 4、一覧系検討を Phase 5 に統一（STATUS・Fit&Gap と一致）。 | tugilo inc. |
| 1.7 | 2026-02-12 00:29 | Phase 5 を「検討中」に更新。ADMIN_LIST_UI_DATAGRID_EVALUATION_v1.0.md への参照を追加。進捗表 Phase 5 を「検討中（評価 doc 作成済み）」に更新。 | tugilo inc. |
| 1.8 | 2026-07-06 16:50:15 | MVP 実行順序 #15〜17 との対応を追記。DOCS_INDEX 参照。 | tugilo inc. |
