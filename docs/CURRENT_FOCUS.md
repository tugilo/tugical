# tugical Current Focus

**最終更新日時**: 2026-07-20 23:16:59  

> **判断・優先順位の正**: `STATUS.md` → `REMAINING_TASKS_PLAN_v1.0.md` §4（**#1〜18**）

---

## 次に着手すべき 1 タスク

**#2 MVP-P4-02** — LINE 通知 E2E **実機確認**（P0 / β ブロッカー）

- #1 SEC-01〜#8 LINE 基盤は **コード実装済み**
- 手順: `LINE_NOTIFICATION_E2E_GUIDE_v1.0.md`
- 管理画面 **設定 → LINE 連携** から Channel / Token / LIFF を設定可能（#5 完了）

---

## 統合優先順位（抜粋）

| # | タスク | 状態 |
|---|--------|------|
| 1 | MVP-SEC-01 | ✅ |
| 2 | MVP-P4-02 LINE E2E | ⬜ **実機** ← **今** |
| 3 | MVP-P3-07 LIFF E2E | ⬜ 実機記録 |
| 4〜8 | LINE 基盤 | ✅ 実装済 |
| 9〜10 | P5-01/03 テスト | 🟡 一部 |
| 11 | P2-10 キャンセル | 🟡 API のみ |
| 12 | P3-08 LIFF 複数メニュー | ⬜ |
| 16 | UI-FIX-01 MenuController | ✅ |
| 17〜18 | DataGrid PoC / Phase5 | ⬜ |

---

## 直近完了（DevOS Phase）

| Phase | 内容 | merge |
|-------|------|-------|
| PHASE_022 | LIFF 時期ショートカット・候補日提案 | `8e0dee4` |
| PHASE_021 | LIFF 4ステップ提案型導線 | `0245fd8` |
| PHASE_020 | スタッフ優先度ドラッグ並べ替え | `a9236cf` |

LIFF 現状: メニュー → おすすめ日時（時期チップ付き）→ 確認 → 完了。詳細は `STATUS.md` §3.1 / `LIFF_PHASE1_SETUP.md`。
