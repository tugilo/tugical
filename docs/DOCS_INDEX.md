# tugical ドキュメント索引（司令塔）

**Version**: 1.4  
**作成日時**: 2026-07-06 16:50:15  
**最終更新日時**: 2026-07-18 21:36:11  
**目的**: 再開・実装・判断時に参照するドキュメントの優先順位と役割を 1 ページに集約する。

---

## 1. 再開時（この順で読む）

| 順 | ドキュメント | 役割 |
|----|--------------|------|
| 1 | **STATUS.md** | 現状サマリ・β 条件・未完了領域 |
| 2 | **REMAINING_TASKS_PLAN_v1.0.md** §4 | **実行順序 #1〜18**（着手順の正・v1.7） |
| 3 | **MVP_IMPLEMENTATION_PLAN.md** | タスク ID・DoD・実施記録 |
| 4 | 該当タスクの要件 / Fit&Gap | 下表「テーマ別」参照 |

**次に着手**: **#1 MVP-SEC-01**（ログ機密除去・P0.5）

---

## 2. 進捗・計画

| ドキュメント | 用途 |
|--------------|------|
| `STATUS.md` | 司令塔（現状） |
| `REMAINING_TASKS_PLAN_v1.0.md` | 優先順位 P0.5→P3、#1〜18、Wave 0〜5 |
| `MVP_IMPLEMENTATION_PLAN.md` | MVP タスク台帳（P1〜P6 フェーズ ID） |
| `MVP_EXECUTION_RULES.md` | 実装フロー・禁止事項 |
| `PROGRESS.md` | 時系列ログ（参照任意） |
| `CURRENT_FOCUS.md` | 直近セッション焦点（STATUS への短縮版） |

---

## 3. LINE 連携

| ドキュメント | 用途 |
|--------------|------|
| `LINE_NOTIFICATION_E2E_GUIDE_v1.0.md` | #2 P0：通知 E2E 手順・verify コマンド |
| `LINE_STORE_INTEGRATION_REQUIREMENTS_v1.0.md` | 店舗別公式アカウント要件（v1.2 追補） |
| `LINE_STORE_INTEGRATION_FIT_GAP_v1.0.md` | DB/API/実装 Gap・**§4.4 管理画面監査** |
| `SECURITY_FIT_GAP_v1.0.md` | **暗号化・PII・ログ・LIFF セキュリティ Gap** |
| `LIFF_PHASE1_SETUP.md` | LIFF 単一メニュー・URL・チェックリスト |

**実行順序上の LINE タスク**: #2〜3（P0）→ #4〜8（P1）→ #13（P2）

---

## 4. 管理画面 UI（MUI）

| ドキュメント | 用途 |
|--------------|------|
| **`ADMIN_UX_MANUALESS_AUDIT_v1.0.md`** | **マニュアルレス UX 監査（ケース判定・P0〜P3）** |
| `ADMIN_MUI_MIGRATION_PLAN_v1.0.md` | Phase 0〜5（Phase 5 検討中） |
| `ADMIN_LIST_UI_DATAGRID_EVALUATION_v1.0.md` | DataGrid 評価（案 B 推奨） |
| `ADMIN_MENUS_IMPLEMENTATION_AUDIT_v1.0.md` | MenusPage 棚卸し・PoC 案 |
| `ADMIN_DASHBOARD_IMPLEMENTATION_PLAN_v1.2.1.md` | ダッシュボード Step 計画 |
| `docs/process/phases/PHASE_001_admin_ux_manualess_audit_PLAN.md` | 監査 Phase PLAN |

**実行順序**: #16〜18（P3、β と独立・並行可）  
**UX 改善の着手順**: `ADMIN_UX_MANUALESS_AUDIT_v1.0.md` §7（P0-1 予約詳細が最優先）

---

## 5. 仕様・判断

| ドキュメント | 用途 |
|--------------|------|
| `tugical_requirements_specification_v1.1.md` | 要件辞書（[MVP]/[TEMPLATE]/[FUTURE]） |
| `CONCEPT_SPEC_FIT_GAP.md` | 仕様書の読み方 |
| `CONCEPT_REQUIREMENTS_FIT_GAP.md` | 要件の読み方 |
| `TUGICAL_PLUS_BOUNDARY_v1.0.md` | tugical / tugical+ 境界 |
| `tugical_system_specification_v2.0.md` 等 | 詳細仕様 |

---

## 6. MVP 進捗サマリ（2026-07-06）

| フェーズ | 完了/総数 | 状態 |
|----------|-----------|------|
| P1 基盤 | 6/6 | ✅ |
| P2 管理画面 | 11/12 | 🟡 |
| P3 LIFF | 7/8 | 🟡 |
| P4 LINE | 2/3 | 🟡 |
| P5 テスト | 0/4 | ⬜ |
| P6 LINE 店舗別 | 0/6 | ⬜（#4〜8, #13 に統合実行） |
| SEC | 0/1 | ⬜（#1 MVP-SEC-01） |
| **合計** | **27/40** | **68%** |

**β 未達**: LINE 通知の実機 E2E（#2）。**外部公開前必須**: ログ機密除去（#1）

---

## 7. 変更履歴

| Version | 日時 | Changes |
|---------|------|---------|
| 1.4 | 2026-07-18 21:36:11 | ADMIN_UX_MANUALESS_AUDIT / PHASE_001 を索引追加 |
| 1.3 | 2026-07-06 17:13:11 | v1.7 同期。#1〜18、P0.5 SEC-01、次着手 #1 |
| 1.2 | 2026-07-06 17:08:52 | SECURITY_FIT_GAP 追加 |
| 1.1 | 2026-07-06 17:05:25 | Fit&Gap §4.4 管理画面監査への参照 |
| 1.0 | 2026-07-06 16:50:15 | 初版。司令塔・LINE・MUI・進捗サマリを索引化 |
