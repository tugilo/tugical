# tugilo標準 - 開発プロセス

> Phase管理 + SSOT固定 + スコープロック + 1push + Gitブランチ分離

Cursorが暴走せず、どのプロジェクトでも再現可能な安全開発体制を構築するための基盤です。

---

## まず読む

### SSOT（Single Source of Truth）

1. **既存設計/仕様**（`docs/仕様書/`）
2. **Phase PLAN**（`docs/process/phases/`）
3. **既存実装**
4. **新提案**（提案止まり）

### テンプレート

| ファイル | 用途 |
|----------|------|
| `templates/TEMPLATE_PHASE_WORKFLOW_SSOT.md` | Phase作業のSSOT・優先順位 |
| `templates/TEMPLATE_PHASE_PROMPT_FOR_CURSOR.md` | Cursor用Phase開始プロンプト |
| `templates/TEMPLATE_GIT_BRANCH_WORKFLOW_SSOT.md` | Gitブランチ運用 |

### Git運用概要

- **main**: 本番相当
- **develop**: 開発統合（常に安定）
- **feature/<name>**: 新規機能（develop経由でmainへ）
- **feature → main 直マージ禁止**

詳細は `templates/TEMPLATE_GIT_BRANCH_WORKFLOW_SSOT.md` を参照。

---

## Phase管理方法

1. **PLAN作成**: `phases/` に Phase ごとの PLAN を配置
2. **開始時**: `TEMPLATE_PHASE_PROMPT_FOR_CURSOR.md` をコピーし、目的・対象/対象外を記入
3. **作業**: Step0〜StepN の順序で実施
4. **完了時**: DoDチェック、`git diff --name-only` 記録、1push

### 1pushルール

- **1Phase = 1push**
- push前に `git diff --name-only` を runlog または REPORT に記録

---

## runlogs の使い方

`runlogs/` に以下を記録：

- 実行日時
- 変更ファイル一覧（`git diff --name-only`）
- 導入内容概要
- 次回からの運用方法

---

## 禁止事項

- 未依頼の方式変更
- 未依頼のリファクタ
- テンプレ非準拠の作業
- スコープ外への変更
- feature → main 直マージ
- 1Phase で複数 push（原則）

---

## コード変更時の必須

- テスト実行: `php artisan test`（Laravel）等
- ビルド確認: `npm run build` 等
- 失敗時は push 禁止

---

## ディレクトリ構成

```
docs/process/
├── phases/      # Phase PLAN 文書
├── templates/   # テンプレート（SSOT）
├── runlogs/     # 実行ログ
└── README.md    # 本ファイル
```
