# Phase Workflow SSOT（Single Source of Truth）

> tugilo標準 - Phase管理における唯一の正

## SSOT優先順位（絶対遵守）

1. **既存設計/仕様**（プロジェクト固有SSOT）
   - `docs/仕様書/` 配下の仕様書
   - 要件定義・API仕様・DB設計・UI設計など

2. **Phase PLAN**
   - 当該Phaseの `docs/process/phases/` 内のPLAN文書
   - スコープ・目的・DoDが明記されたもの

3. **既存実装**
   - すでに動いているコード
   - 仕様・PLANに沿った実装

4. **新提案**
   - 提案止まり。実装前にPLAN更新・承認必須

## 禁止事項

- **未依頼の方式変更禁止**: ユーザー依頼なくアーキテクチャ・フロー・命名を変更しない
- **別方式への勝手な差し替え禁止**: 既存方式を別方式に置き換えない
- **トラック混在禁止**: 並行ラインがある場合、命名で明確に区別する

## スコープロック手順

1. **対象/対象外宣言**（Phase開始時に必須）
   - 対象: 今回変更する範囲を明記
   - 対象外: 触らない範囲を明記

2. **途中追加のルール**
   - 理由・影響・最小化を文書化
   - PLANに追記してから実施

## 1pushルール

- **1Phase = 1push**
- push前に `git diff --name-only` を記録
- runlog または Phase REPORT に記載

## コード変更時の必須事項

- **テスト実行**: `php artisan test` または `npm test` 等
- **ビルド確認**: `npm run build` 等
- 失敗時はpush禁止

## 正の所在

- **docs/process/** が唯一の正
- Phase管理・テンプレ・runlogはここに集約
