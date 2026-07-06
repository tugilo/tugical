# 管理画面 UI フィット＆ギャップ調査 v1.4

**Version**: 1.4  
**作成日**: 2026-02-11 20:15  
**更新日**: 2026-02-12 00:06  
**基準**: `tugical_ui_design_system_v1.0.md`（技術方針 v1.1）、`UI_STACK_COMPARISON_v1.0.md`（案B採用）、`.cursorrules`  
**目的**: 管理画面の UI 実装が「管理画面＝Material UI」方針とどれだけ合致しているかを Fit（一致）／Gap（ギャップ）で整理する。

---

## 1. 調査対象の範囲

| 対象 | 内容 |
|------|------|
| **方針** | 案B採用：管理画面は React + Material UI（MUI）。DataGrid・DatePicker・Dialog・TextField を優先利用。 |
| **実装範囲** | `backend/resources/js/pages/admin/` および `backend/resources/js/components/admin/` |
| **除外** | 認証・ロール・ダッシュボードの**機能**の Fit&Gap は `ADMIN_DASHBOARD_FIT_GAP_v1.2.1.md` に委ねる。本ドキュメントは **UI 層（技術スタック・コンポーネント・デザインシステム準拠）** に限定する。 |

---

## 2. 現状の実装サマリ

### 2.1 技術スタック（実装）

| 項目 | 現状 | 方針（設計書・cursorrules） |
|------|------|-----------------------------|
| UI ライブラリ | **MUI ThemeProvider 適用済み**（Phase 0 完了）。Tailwind + 自作コンポーネントは混在（Phase 1〜 で順次 MUI へ）。 | **Material UI** |
| コンポーネント | Button, Card, Modal, DatePicker, FormField, LoadingScreen, ConfirmDialog, Toast 等を **Tailwind で自作** | MUI の DataGrid, DatePicker, Dialog, TextField を優先 |
| アイコン | **@heroicons/react** | 方針では未規定（MUI 利用時は MUI Icons が自然） |
| アニメーション | **Framer Motion**（Button, Layout 等で使用） | 管理画面では MUI のトランジションで足りる想定 |
| 日付・テーブル | 自作 DatePicker、FullCalendar、自作リスト/タイムライン | MUI DatePicker, MUI DataGrid の利用を推奨 |

### 2.2 依存関係（package.json）

- **@mui/material, @mui/x-date-pickers, @mui/icons-material, @emotion/react, @emotion/styled** : **導入済み**（Phase 0 完了）
- tailwindcss, framer-motion, @heroicons/react, @headlessui/react, @fullcalendar/* : 導入済み

### 2.3 主要コンポーネントの所在と実装方式

| コンポーネント | パス | 実装方式 |
|----------------|------|----------|
| Button | `components/admin/ui/Button.tsx` | Tailwind + Framer Motion（既存）。**AppButton**（MUI ラッパー）を追加し Step 4-1〜4-3 で一部置換済み。 |
| AppButton | `components/admin/ui/AppButton.tsx` | MUI Button（互換ラッパー） |
| AppCard | `components/admin/ui/AppCard.tsx` | MUI Card（互換ラッパー、任意利用） |
| AppIcon | `components/admin/ui/AppIcon.tsx` | MUI Icons マップ（name 指定、任意利用） |
| Card | `components/admin/ui/Card.tsx` | Tailwind |
| Modal | `components/admin/modal/Modal.tsx` | MUI Dialog（ラッパー） |
| DatePicker | `components/admin/ui/DatePicker.tsx` | MUI DatePicker（ラッパー） |
| FormField | `components/admin/ui/FormField.tsx` | MUI TextField（互換ラッパー） |
| ConfirmDialog | `components/admin/ui/ConfirmDialog.tsx` | MUI Dialog |
| LoadingScreen | `components/admin/ui/LoadingScreen.tsx` | Tailwind |
| DashboardLayout | `components/admin/layout/DashboardLayout.tsx` | Tailwind + Framer Motion + Heroicons |
| 予約一覧・タイムライン | BookingTimelineView, BookingCard, SimpleTimelineView | Tailwind + FullCalendar（DataGrid 相当は自作） |

---

## 3. Fit（方針・設計と一致している点）

| 観点 | 判定 | 根拠 |
|------|------|------|
| **React + TypeScript** | ✅ Fit | 全ページ・コンポーネントが React + TypeScript で実装されている。 |
| **コンポーネント化** | ✅ Fit | Button / Card / Modal / DatePicker 等が共通化され、再利用されている。 |
| **デザイン原則の意識** | ✅ Fit | 設計書の「Mobile First」「Touch Friendly」「Accessibility」「Consistency」をコメントや構造で意識した実装（例: DatePicker の 44px タッチターゲット）。 |
| **カラー・トークン** | ✅ Fit（傾向） | ミントグリーン（emerald 系）を中心に、設計書のカラーシステムに近い利用がされている。MUI 導入時もテーマで同一トークンを適用可能。 |
| **管理画面の画面構成** | ✅ Fit | ログイン・ダッシュボード・予約・顧客・メニュー・リソース・設定の構成が揃っている。 |
| **レイアウト** | ✅ Fit | DashboardLayout でサイドバー・ヘッダー・メインコンテンツの構成が実装されている。 |

---

## 4. Gap（方針とのギャップ）

### 4.1 技術スタックのギャップ

| 観点 | 判定 | 根拠・推奨 |
|------|------|------------|
| **Material UI 基盤** | ✅ 解消（Phase 0） | MUI 依存追加・ThemeProvider・adminTheme 適用済み。管理画面エントリ（index.tsx）でラップ。コンポーネント置換は Phase 1〜 で実施。 |
| **DataGrid 相当** | ❌ Gap | 予約一覧・タイムラインは **FullCalendar + 自作カード/リスト**。方針では MUI DataGrid の優先利用。一覧・ソート・フィルタ・ページネーションを MUI DataGrid で統一するかは検討余地あり。 |
| **DatePicker** | ❌ Gap | **完全自作の DatePicker** が利用されている。方針では MUI DatePicker を優先。 |
| **Dialog / Modal** | ✅ 解消（Phase 2） | Modal・ConfirmDialog を MUI Dialog に置換済み。方針A: 背景クリック・Esc で閉じる。 |
| **フォーム入力** | ✅ 解消（Phase 3） | FormField を MUI TextField 実装に置換済み（互換ラッパー、呼び出し側 props 維持）。 |
| **アイコン** | ⚠️ 軽微な Gap | Heroicons を多数使用。**AppIcon**（MUI Icons マップ）を追加済み。新規・置換時は AppIcon 利用を推奨。 |

### 4.2 ドキュメント・開発指示との不整合

| 観点 | 判定 | 根拠 |
|------|------|------|
| **.cursorrules** | ✅ 整合 | Admin UI は MUI 使用方針。**Phase 0 完了により ThemeProvider 適用済み**。コンポーネント置換は Phase 1〜 で順次実施。 |
| **UI 設計書** | ✅ 整合（基盤） | 設計書 v1.2「管理画面: React + TypeScript + Material UI」。Phase 0 で MUI 基盤（テーマ・ThemeProvider）を導入済み。コンポーネントは Phase 1〜 で置換。 |

### 4.3 今後の SaaS 展開を踏まえたギャップ

| 観点 | 内容 |
|------|------|
| **テーマ・カラートークン共通化** | 設計書では「カラートークンは共通管理し、両 UI で一貫性」とある。現状は Tailwind のクラスで色を書いているため、MUI 導入時に **テーマで primary/secondary を設計書トークンに合わせる** 必要がある。 |
| **アクセシビリティ** | 方針では「管理画面は業務効率・アクセシビリティを優先」。MUI コンポーネントは a11y が組み込み済みのため、**MUI 導入により Gap が解消される**。 |

---

## 5. まとめ（Gap 一覧と対応方針）

### 5.1 Gap 一覧

| 優先度 | Gap | 対応の方向性 |
|--------|-----|----------------|
| 高 | 管理画面で MUI が未導入（Tailwind のまま） | MUI を依存に追加し、新規画面・コンポーネントから MUI を採用。既存は段階的に MUI へ移行するか、当面 Tailwind のまま運用するかを方針決定。 |
| 高 | DataGrid / DatePicker / Dialog / TextField が自作のまま | 新規実装では MUI を優先。既存の Button, Card, Modal, DatePicker は「MUI 版に差し替え」タスクとしてリスト化可能。 |
| 中 | .cursorrules・UI 設計書と実装の不整合 | MUI 導入後に「実装済み」に更新。または「移行期間中は管理画面も Tailwind を許容」とドキュメントで明記し、移行計画を記載。 |
| 低 | アイコン（Heroicons vs MUI Icons） | MUI 導入後、アイコン方針を 1 つに決め、設計書に記載。 |

### 5.2 対応方針の選択肢（採用済み）

**本方針として A. 段階的 MUI 導入 を採用する（意思決定済み）。** 一括全面置換（B）は行わず、新規は MUI・既存はリファクタタイミングで段階的に置換する。

- **A. 段階的 MUI 導入** ✅ 採用  
  新規画面・新規コンポーネントは MUI で実装。既存画面はリファクタ時に MUI へ差し替え。カラートークンは MUI テーマで設計書に合わせる。

- **B. 一括 MUI 移行**  
  管理画面の共通コンポーネント（Button, Card, Modal, DatePicker, FormField 等）を MUI に差し替え、全ページを MUI ベースに揃える。工数は大きいが、一貫性は最も高い。**本方針では行わない。**

- **C. 方針の一時見直し**  
  当面は「管理画面も Tailwind のまま」とし、UI 設計書・cursorrules を「移行期間中は Tailwind 許容」と更新。MUI 導入時期を別途マイルストーンで決める。**本方針では行わない。**

---

## 7. 戦略的観点

MUI 移行は単なる UI 統一ではなく **「事業基盤強化」** として位置づける。

- **一覧・フォーム・アクセシビリティの標準化**  
  業務画面の一覧・フォーム・ダイアログを MUI で統一し、操作パターンと a11y を標準化する。

- **将来のマルチテナント SaaS 展開**  
  テーマ・トークンの共通化により、テナント別カスタマイズやブランドの拡張がしやすい基盤を整備する。

- **AI 駆動開発との親和性向上**  
  構造が明確な MUI コンポーネントを活用することで、AI が「どの部品をどこで使うか」を判断しやすくし、実装の一貫性を高める。

---

## 8. 管理画面 MUI 移行ポリシー

### 基本方針（正式決定）

- **新規管理画面は Material UI で実装する。**
- **既存 UI はリファクタタイミングで段階的に置換する。**
- **一括全面置換は行わない。**

### 優先置換対象（高優先度）

1. **DatePicker** → MUI DatePicker  
2. **Modal / ConfirmDialog** → MUI Dialog  
3. **FormField** → MUI TextField  
4. **一覧表示** → 将来的に MUI DataGrid を検討（FullCalendar 利用箇所は要検討）

### 中優先度

- **Button** → MUI Button  
- **Card** → MUI Card  

### 低優先度

- **Heroicons** → MUI Icons への統一（移行後期または新規画面から適用）

---

## 9. 移行ステータス管理

実装優先順位と進捗を下表で管理する。完了時は本表のステータスを更新する。

| コンポーネント | 現状 | 目標 | 優先度 | ステータス |
|---------------|------|------|--------|------------|
| DatePicker | MUI DatePicker（ラッパー） | MUI DatePicker | 高 | 完了 |
| Modal | MUI Dialog（ラッパー） | MUI Dialog | 高 | 完了 |
| ConfirmDialog | MUI Dialog | MUI Dialog | 高 | 完了 |
| FormField | MUI TextField（ラッパー） | MUI TextField | 高 | 完了 |
| 一覧 | 自作 + FullCalendar | MUI DataGrid（要検討） | 高 | 要検討 |
| Button | 自作（残存）＋ **AppButton**（MUI ラッパー） | MUI Button | 中 | 一部完了（Step 4-1〜4-3 でダッシュボード・メニュー・リソースで AppButton に置換） |
| Card | 自作（残存）＋ **AppCard**（MUI ラッパー） | MUI Card | 中 | 一部（AppCard 導入済み、画面置換は未実施） |
| アイコン | Heroicons（残存）＋ **AppIcon**（MUI マップ） | MUI Icons | 低 | 一部（AppIcon 導入済み、画面置換は段階的） |

---

## 6. 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-11 20:15 | 初版作成（管理画面 UI の Fit&Gap、MUI 未導入を Gap として整理） | tugilo inc. |
| 1.1 | 2026-02-11 20:19 | 段階的 MUI 導入を正式採用。セクション 7 戦略的観点・8 移行ポリシー・9 移行ステータス管理を追加。移行ロードマップとして明確化。 | tugilo inc. |
| 1.2 | 2026-02-11 20:43 | Phase 1 完了。DatePicker を MUI 実装に置換。9. 移行ステータス管理の DatePicker を「完了」に更新。 | tugilo inc. |
| 1.2.1 | 2026-02-11 21:15 | Phase 2 完了。Modal・ConfirmDialog を MUI Dialog に置換。4.1 Dialog/Modal を「解消」、9. 移行ステータス管理の Modal/ConfirmDialog を「完了」に更新。 | tugilo inc. |
| 1.3 | 2026-02-11 21:30 | Phase 3 完了。FormField を MUI TextField 実装に置換（互換ラッパー）。2.3 FormField を MUI TextField、4.1 フォーム入力を「解消」、9. FormField を「完了」に更新。 | tugilo inc. |
| 1.4 | 2026-02-12 00:06 | Phase 4（Button/Card/Icons）実施。AppButton/AppCard/AppIcon 追加。Step 4-1〜4-3 でダッシュボード・メニュー・リソースの Button を AppButton に置換。9. Button/Card/アイコンを「一部完了」に更新。 | tugilo inc. |
