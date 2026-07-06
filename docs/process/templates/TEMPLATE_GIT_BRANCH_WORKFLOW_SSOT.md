# Git Branch Workflow SSOT

> tugilo標準 - ブランチ運用の唯一の正

## ブランチ構成

- **main**: 本番相当・安定版
- **develop**: 開発統合・常に安定状態を保つ
- **feature/<name>**: 新規機能開発
- **hotfix/<name>**: 緊急バグ修正
- **chore/<name>**: 雑務（ドキュメント・設定等）

## バグ修正フロー

1. `develop` で修正
2. テストサーバ確認
3. `main` へマージ
4. push

## 新規機能フロー

1. `develop` から `feature/<name>` を作成
2. `feature` で開発
3. 完了後 `develop` へマージ
4. テストサーバ確認
5. `main` へマージ
6. push

## 重要ルール

- **feature → main 直マージ禁止**: 必ず develop 経由
- **develop は常に安定状態**: 壊れたら即修正
- **feature 開発中にバグが入った場合**:
  - `develop` で修正
  - `main` 反映
  - `feature` へ `develop` を取り込む（rebase または merge）

## 命名規則

| 種別 | 形式 | 例 |
|------|------|-----|
| 新規機能 | feature/<name> | feature/booking-details |
| 緊急修正 | hotfix/<name> | hotfix/login-fix |
| 雑務 | chore/<name> | chore/update-deps |
