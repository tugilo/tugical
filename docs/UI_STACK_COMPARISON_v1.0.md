# UI技術スタック検討：Tailwind vs Material UI

**Version**: 1.1  
**作成日**: 2025-02-11  
**更新日**: 2026-02-11 20:14  
**Project**: tugical（ツギカル）  
**参照**: `tugical_ui_design_system_v1.0.md`

---

## 1. 目的

本ドキュメントは、フロントエンドUIの技術スタックとして  
**現行方針（React + Tailwind CSS + Framer Motion）** と  
**代替案（React + Material UI）** を比較し、方針決定の材料を整理する。

---

## 2. 現行方針（UI設計書 v1.1 の前提）

| 項目 | 内容 |
|------|------|
| **Framework** | React + TypeScript + Tailwind CSS + Framer Motion |
| **デザイン** | 独自デザインシステム（ミントグリーン primary、Nunito / Noto Sans JP） |
| **コンポーネント** | Button / Card / Input 等を Tailwind で自作 |
| **スタイル** | `className` + `cn()` による条件付きクラス、必要時のみ Framer Motion |
| **テスト** | Jest + React Testing Library、Storybook |

---

## 3. Material UI を採用した場合

### 3.1 メリット

| 観点 | 内容 |
|------|------|
| **開発速度** | Button / TextField / Card / DataGrid / DatePicker 等がそのまま使え、フォーム・テーブル・日付系を早く実装できる |
| **一貫性・a11y** | コンポーネント単位でキーボード・スクリーンリーダー対応が組み込まれている |
| **管理画面向き** | ダッシュボード・一覧・フィルタ・モーダルなど、管理画面でよく使うパターンが豊富 |
| **テーマ** | テーマで primary / secondary 等を差し替えれば、設計書のカラー（#10b981 等）に寄せられる |
| **メンテナンス** | コンポーネントのバグ修正・仕様変更の多くをライブラリ側に任せられる |

### 3.2 デメリット・注意点

| 観点 | 内容 |
|------|------|
| **デザインの自由度** | Material Design の見た目・構造に寄るため、「tugical 専用の見せ方」にしたい部分はオーバーライドが増える |
| **バンドルサイズ** | 使うコンポーネントを絞らないと、Tailwind のみより重くなりがち（tree-shake と import の仕方に注意） |
| **LIFF（LINE）側** | スマホ・軽さ重視の LIFF では、MUI をそのまま全画面に載せると重くなる可能性がある |
| **設計書・既存コード** | 設計書の「Tailwind 使用例」「クラス名」「Phase 1 の Tailwind 設定」と実装がずれる。既存の Tailwind ベース実装の書き換えも発生する |

### 3.3 現行（Tailwind + Framer Motion）の利点

- 設計書と 1:1 で対応しやすく、**tugical 専用のビジュアル**をそのまま実装しやすい
- スタイルはクラス中心で軽く、**LIFF の「2秒以内」などのパフォーマンス目標**と相性が良い
- 既存の「Tailwind で書く」方針や、.cursorrules の「Tailwind CSS（tugical デザインシステム準拠）」との整合が取りやすい

---

## 4. 方針の選択肢

### 案A: 現行維持（Tailwind + Framer Motion）

- 設計書・.cursorrules と一致したまま開発を進める
- 管理画面・LIFF ともに Tailwind で統一

### 案B: 管理画面のみ Material UI

- **管理画面**: React + Material UI（開発効率・コンポーネント豊富さを優先）
- **LIFF**: React + Tailwind のまま（軽さ・パフォーマンス目標を維持）
- 設計書は「管理画面は MUI」「LIFF は Tailwind」と役割を分けて記載

### 案C: 全体を Material UI に統一

- 管理画面・LIFF ともに MUI
- 設計書・.cursorrules・overview を MUI 前提に更新
- カラー・タイポグラフィは「MUI テーマでの実現方法」に書き換え

---

## 5. 方針変更時に更新すべきドキュメント

| ドキュメント | 更新内容（MUI 採用時） |
|--------------|------------------------|
| `tugical_ui_design_system_v1.0.md` | Framework 表記、スタイリングルール、Phase 1 のテーマ設定、コンポーネント例を MUI ベースに変更 |
| `.cursorrules` | Frontend 技術スタックの記述を「Tailwind」から「Material UI」または「MUI + Tailwind（役割分担）」に変更 |
| `tugical_project_overview.md` | 技術スタックの記載を上記に合わせて変更 |

---

## 6. 結論（判断はプロジェクトで実施）

- **開発スピード・管理画面の作りやすさ**を最優先するなら **Material UI（案B または 案C）** が有効
- **デザインの独自性・LIFF の軽さ・既存ドキュメントとの一致**を優先するなら **現行維持（案A）** が無難

技術スタックの変更は影響範囲が大きいため、**方針決定後に**上記ドキュメントを一括で更新することを推奨する。

---

## 7. 採用方針（正式決定）

**採用方針**: **案B**（管理画面のみ Material UI、LIFF は Tailwind 維持）

### 理由

- **管理画面は業務効率重視** … DataGrid・DatePicker・Dialog・TextField 等で開発効率と保守性を向上。SaaS としての拡張も見据える。
- **LIFFは軽量性・UX重視** … スマホ・2秒以内の応答を維持し、ブランド体験（ミントグリーン・タッチフレンドリー）を Tailwind + Framer Motion で実現。
- **開発スピードとブランド体験の両立** … 役割分担により、管理画面の生産性と顧客向け体験の両方を満たす。

上記に伴い、`tugical_ui_design_system_v1.0.md`・`tugical_project_overview.md`・`.cursorrules` を案Bに合わせて更新済み。

---

## 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-02-11 | 初版作成（Tailwind vs MUI 比較・案A/B/C） | tugilo inc. |
| 1.1 | 2025-02-11 | 案B採用を正式決定、セクション7「採用方針」追加、関連ドキュメント更新を反映 | tugilo inc. |
