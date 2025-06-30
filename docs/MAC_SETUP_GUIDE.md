# tugical Mac miniセットアップガイド

## 🚀 Mac mini（別端末）での開発継続手順

### 前提条件
- macOS 12.0以降
- Docker Desktop for Mac インストール済み
- Git インストール済み
- Make インストール済み（通常はXcode Command Line Toolsに含まれる）

### 1. リポジトリクローン

```bash
# SSHキー設定済みの場合
git clone git@github.com:tugilo/tugical.git
cd tugical

# HTTPS経由の場合
git clone https://github.com/tugilo/tugical.git
cd tugical

# developブランチに切り替え
git checkout develop
```

### 2. Docker Compose Pluginの確認

```bash
# Docker Composeプラグインがインストールされているか確認
docker compose version

# 出力例: Docker Compose version v2.xx.x
```

**注意**: Mac版Docker Desktopでは `docker compose`（スペース区切り）を使用します。  
古い `docker-compose`（ハイフン）は使用しません。

### 3. 環境設定

```bash
# .envファイル作成（Laravel backend/ディレクトリ内）
cp backend/.env.example backend/.env

# 必要に応じて.envファイルを編集
nano backend/.env
```

### 4. プロジェクトセットアップ

```bash
# 一括セットアップ（推奨）
make setup

# 手動セットアップの場合
make build
make up
sleep 10
make install
make artisan cmd="key:generate"
make artisan cmd="config:clear"
make artisan cmd="cache:clear"
make migrate
make seed
```

### 5. 動作確認

```bash
# ヘルスチェック
make health

# コンテナ状況確認
make status

# ログ確認
make logs
```

### 6. アクセス確認

**開発サーバー:**
- Admin Panel: http://localhost/admin
- LIFF App: http://localhost:5173
- API: http://localhost/api/health
- phpMyAdmin: http://localhost:8080

**phpMyAdmin ログイン情報:**
- サーバー: database
- ユーザー名: tugical_dev
- パスワード: dev_password_123
- データベース: tugical_dev

### 7. 開発コマンド一覧

```bash
# コンテナ管理
make up          # サービス開始
make down        # サービス停止
make restart     # サービス再起動
make logs        # 全ログ表示
make status      # コンテナ状況

# データベース
make migrate     # マイグレーション実行
make seed        # シーダー実行
make fresh       # フレッシュインストール（データ削除注意）
make backup-db   # データベースバックアップ

# 開発ツール
make shell       # Laravelコンテナに入る
make shell-db    # データベースコンテナに入る
make artisan cmd="route:list"  # Artisanコマンド実行
make composer cmd="require package"  # Composerコマンド実行

# テスト
make test        # 全テスト実行
```

### 8. トラブルシューティング

#### ポート競合エラー
```bash
# ポート使用状況確認
lsof -i :80
lsof -i :3306
lsof -i :8080

# 使用中のポートを変更する場合、docker-compose.ymlを編集
```

#### コンテナ起動エラー
```bash
# コンテナとボリューム削除
make clean

# 再構築
make rebuild
```

#### 権限エラー
```bash
# Laravel storage権限設定
make shell
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### データベース接続エラー（Connection refused）
```bash
# APP_KEY未生成が原因の場合
make artisan cmd="key:generate"
make artisan cmd="config:clear"
make artisan cmd="cache:clear"

# データベース接続テスト
make shell-db

# ヘルスチェック
make health
```

### 9. 開発継続時の注意点

#### Git管理
```bash
# 作業開始前に必ず最新版取得
git pull origin develop

# 作業完了後にプッシュ
git add .
git commit -m "作業内容の説明"
git push origin develop
```

#### データベース同期
```bash
# 最新のマイグレーション実行
make migrate

# 必要に応じてシーダー実行
make seed
```

#### 環境の違いの確認
```bash
# PHP拡張モジュール確認
make shell
php -m

# Laravel設定確認
make artisan cmd="config:cache"
make artisan cmd="route:cache"
```

### 10. Phase 2 開発準備

現在のプロジェクト状況：
- ✅ Phase 0: Docker環境構築完了
- ✅ Phase 1: バックエンド基盤（17テーブル + 13モデル）完了
- 🚀 **Phase 2**: ビジネスロジック サービス実装（次回作業）

**Phase 2で実装予定:**
1. BookingService.php - 予約システム中核
2. AvailabilityService.php - 空き時間管理
3. HoldTokenService.php - 仮押さえシステム
4. NotificationService.php - LINE通知
5. IndustryTemplateService.php - 業種テンプレート

### 11. サポート情報

**プロジェクト概要:**
- サービス名: tugical（ツギカル）
- コンセプト: "次の時間が、もっと自由になる。"
- 技術スタック: Laravel + React + Vite + LINE API + MariaDB + Docker
- リポジトリ: https://github.com/tugilo/tugical

**進捗確認:**
- docs/PROGRESS.md - 全体進捗
- docs/CURRENT_FOCUS.md - 現在の作業詳細

**困った時は:**
1. make health でヘルスチェック
2. make logs でログ確認
3. Git履歴で前回作業内容確認
4. ドキュメント参照（docs/ディレクトリ）

---

## ✅ セットアップ完了チェックリスト

- [ ] リポジトリクローン完了
- [ ] Docker Composeバージョン確認
- [ ] .envファイル作成・設定
- [ ] make setup実行完了
- [ ] make health で全サービス正常
- [ ] http://localhost:8080 でphpMyAdminアクセス可能
- [ ] tugical_devデータベースに17テーブル存在確認
- [ ] Phase 2開発準備完了

**セットアップ完了後、Phase 2のビジネスロジック実装を開始できます！** 