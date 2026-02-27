# Phase Prompt for Cursor（Cursor用Phase開始プロンプト）

> 作業開始時にこのプロンプトをCursorに渡す

---

## 開始儀式（必ず読むSSOT）

以下を**必ず読んでから**作業開始：

1. `docs/process/README.md` - プロセス全体
2. `docs/process/templates/TEMPLATE_PHASE_WORKFLOW_SSOT.md` - SSOT優先順位
3. 当該Phaseの PLAN 文書（`docs/process/phases/`）
4. 関連する仕様書（`docs/仕様書/`）

---

## 今回の目的

（ここにPhaseの目的を記入）

---

## 対象/対象外宣言

**対象:**
- （変更する範囲を列挙）

**対象外:**
- （触らない範囲を列挙）

---

## Step0〜StepN の順序

1. Step0: （例）現状確認・仕様確認
2. Step1: （例）〇〇実装
3. Step2: （例）テスト・ビルド確認
4. StepN: （例）runlog記録

---

## DoD（Definition of Done）チェック

- [ ] 対象範囲のみ変更
- [ ] テスト/ビルド成功
- [ ] `git diff --name-only` 記録済み
- [ ] 1pushのみ（追加変更は別Phase）

---

## push前 diff 記録

```
git diff --name-only
# 出力をここに貼り付け
```

---

## ルール確認

- **1pushのみ**: このPhaseで1回だけpush
- **コード変更時**: テスト/ビルド必須
- **未依頼リファクタ禁止**
