# tugical Development Makefile
# Make commands for Docker environment management

.PHONY: help build up down restart logs shell test install migrate seed fresh status health

help: ## Show this help message
	@echo 'usage: make [target]'
	@echo ''
	@echo 'targets:'
	@egrep '^(.+)\:\ ##\ (.+)' $(MAKEFILE_LIST) | column -t -c 2 -s ':#'

build: ## Build Docker containers
	docker compose build --no-cache

up: ## Start all services
	docker compose up -d
	@echo "Services starting..."
	@echo "API: http://localhost/health"
	@echo "phpMyAdmin: http://localhost:8080"
	@echo "Admin Panel: http://localhost/admin"
	@echo "LIFF App: http://localhost/liff"

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## Show logs
	docker compose logs -f

logs-app: ## Show app container logs
	docker compose logs -f app

logs-nginx: ## Show nginx container logs
	docker compose logs -f nginx

logs-db: ## Show database container logs
	docker compose logs -f database

logs-phpmyadmin: ## Show phpMyAdmin container logs
	docker compose logs -f phpmyadmin

logs-frontend: ## Show frontend container logs
	docker compose logs -f frontend

logs-liff: ## Show LIFF container logs
	docker compose logs -f liff

shell: ## Access app container shell
	docker compose exec app sh

shell-db: ## Access database shell
	docker compose exec database mysql -u tugical_dev -pdev_password_123 tugical_dev

shell-frontend: ## Access frontend container shell
	docker compose exec frontend sh

shell-liff: ## Access LIFF container shell
	docker compose exec liff sh

test: ## Run tests
	docker compose exec app php artisan test
	# Frontend/LIFF tests
	docker compose exec frontend npm test
	docker compose exec liff npm test

install: ## Install dependencies
	docker compose exec app composer install
	# Frontend/LIFF npm install
	docker compose exec frontend npm install
	docker compose exec liff npm install

migrate: ## Run database migrations
	docker compose exec app php artisan migrate

migrate-fresh: ## Fresh migration with data loss warning
	@echo "⚠️  WARNING: This will drop all data! Continue? [y/N]" && read ans && [ $${ans:-N} = y ]
	docker compose exec app php artisan migrate:fresh

seed: ## Run database seeders
	docker compose exec app php artisan db:seed

fresh: ## Fresh installation with seeders
	@echo "⚠️  WARNING: This will drop all data and volumes! Continue? [y/N]" && read ans && [ $${ans:-N} = y ]
	@echo "🛑 Stopping all containers..."
	docker compose down
	@echo "🗑️  Removing old volumes..."
	docker volume rm tugical_db_data tugical_redis_data tugical_mailpit_data 2>/dev/null || true
	@echo "🚀 Starting fresh setup..."
	make setup

status: ## Show container status
	docker compose ps

health: ## Check health status
	@echo "=== tugical Health Check ==="
	@echo "Checking API health..."
	@curl -f http://localhost/health 2>/dev/null && echo " ✅ API OK" || echo " ❌ API Error"
	@echo "Checking database..."
	@docker compose exec database mysql -u tugical_dev -pdev_password_123 -e "SELECT 1" tugical_dev >/dev/null 2>&1 && echo " ✅ Database OK" || echo " ❌ Database Error"
	@echo "Checking Redis..."
	@docker compose exec redis redis-cli -a redis_password_123 ping 2>/dev/null | grep -q PONG && echo " ✅ Redis OK" || echo " ❌ Redis Error"

clean: ## Complete cleanup (containers, volumes, networks)
	@echo "🧹 tugical環境を完全クリーンアップ中..."
	docker compose down -v 2>/dev/null || true
	docker volume rm tugical_db_data tugical_redis_data 2>/dev/null || true
	docker network rm tugical_tugical-network 2>/dev/null || true
	docker system prune -f
	@echo "✅ クリーンアップ完了"

rebuild: ## Rebuild and restart everything
	make down
	make build
	make up

setup: ## Complete tugical development environment setup
	@echo "🚀 tugical開発環境を初期化しています..."
	@echo ""
	@echo "🛑 既存環境をクリーンアップ中..."
	docker compose down -v 2>/dev/null || true
	docker volume rm tugical_db_data tugical_redis_data 2>/dev/null || true
	@echo ""
	@echo "📝 環境設定ファイルを作成中..."
	@echo '# tugical Development Environment Configuration' > backend/.env
	@echo '# アプリケーション設定' >> backend/.env
	@echo 'APP_NAME="tugical"' >> backend/.env
	@echo 'APP_ENV=local' >> backend/.env
	@echo 'APP_KEY=' >> backend/.env
	@echo 'APP_DEBUG=true' >> backend/.env
	@echo 'APP_URL=http://localhost' >> backend/.env
	@echo '' >> backend/.env
	@echo '# データベース設定（Docker MariaDB）' >> backend/.env
	@echo 'DB_CONNECTION=mysql' >> backend/.env
	@echo 'DB_HOST=database' >> backend/.env
	@echo 'DB_PORT=3306' >> backend/.env
	@echo 'DB_DATABASE=tugical_dev' >> backend/.env
	@echo 'DB_USERNAME=tugical_dev' >> backend/.env
	@echo 'DB_PASSWORD=dev_password_123' >> backend/.env
	@echo '' >> backend/.env
	@echo '# Redis設定（Docker Redis）' >> backend/.env
	@echo 'REDIS_HOST=redis' >> backend/.env
	@echo 'REDIS_PASSWORD=redis_password_123' >> backend/.env
	@echo 'REDIS_PORT=6379' >> backend/.env
	@echo 'REDIS_DB=0' >> backend/.env
	@echo 'REDIS_PREFIX=tugical_dev:' >> backend/.env
	@echo '' >> backend/.env
	@echo '# キャッシュ設定' >> backend/.env
	@echo 'CACHE_DRIVER=redis' >> backend/.env
	@echo 'CACHE_PREFIX=tugical_dev' >> backend/.env
	@echo 'BROADCAST_DRIVER=log' >> backend/.env
	@echo 'FILESYSTEM_DISK=local' >> backend/.env
	@echo '' >> backend/.env
	@echo '# キュー設定' >> backend/.env
	@echo 'QUEUE_CONNECTION=redis' >> backend/.env
	@echo 'QUEUE_PREFIX=tugical_dev' >> backend/.env
	@echo '' >> backend/.env
	@echo '# セッション設定' >> backend/.env
	@echo 'SESSION_DRIVER=redis' >> backend/.env
	@echo 'SESSION_LIFETIME=120' >> backend/.env
	@echo '' >> backend/.env
	@echo '# メール設定（開発環境はログ出力）' >> backend/.env
	@echo 'MAIL_MAILER=log' >> backend/.env
	@echo 'MAIL_HOST=smtp.mailtrap.io' >> backend/.env
	@echo 'MAIL_PORT=2525' >> backend/.env
	@echo 'MAIL_USERNAME=null' >> backend/.env
	@echo 'MAIL_PASSWORD=null' >> backend/.env
	@echo 'MAIL_ENCRYPTION=null' >> backend/.env
	@echo 'MAIL_FROM_ADDRESS="dev@tugical.com"' >> backend/.env
	@echo 'MAIL_FROM_NAME="$${APP_NAME}"' >> backend/.env
	@echo '' >> backend/.env
	@echo '# LINE API設定（開発環境用）' >> backend/.env
	@echo 'LINE_CHANNEL_ID=' >> backend/.env
	@echo 'LINE_CHANNEL_SECRET=' >> backend/.env
	@echo 'LINE_ACCESS_TOKEN=' >> backend/.env
	@echo 'LINE_LIFF_ID=' >> backend/.env
	@echo '' >> backend/.env
	@echo '# ログ設定' >> backend/.env
	@echo 'LOG_CHANNEL=stack' >> backend/.env
	@echo 'LOG_DEPRECATIONS_CHANNEL=null' >> backend/.env
	@echo 'LOG_LEVEL=debug' >> backend/.env
	@echo '' >> backend/.env
	@echo '# テナント設定（マルチテナント）' >> backend/.env
	@echo 'TENANT_SCOPE_ENABLED=true' >> backend/.env
	@echo '' >> backend/.env
	@echo '# 開発環境特有の設定' >> backend/.env
	@echo 'VITE_APP_NAME="$${APP_NAME}"' >> backend/.env
	@echo 'VITE_APP_ENV="$${APP_ENV}"' >> backend/.env
	@echo ""
	@echo "🔨 Dockerコンテナをビルド中..."
	docker compose build --no-cache
	@echo ""
	@echo "🚀 サービスを起動中..."
	docker compose up -d
	@echo ""
	@echo "⏳ データベース初期化を待機中（30秒）..."
	sleep 30
	@echo ""
	@echo "🔑 アプリケーションキーを生成中..."
	cd backend && php artisan key:generate
	@echo ""
	@echo "📦 Composerパッケージをインストール中..."
	docker compose exec app composer install --no-interaction
	@echo ""
	@echo "📁 データベースマイグレーションを実行中..."
	docker compose exec app php artisan migrate --force
	@echo ""
	@echo "🌱 初期データをシード中..."
	docker compose exec app php artisan db:seed --force
	@echo ""
	@echo "🧹 キャッシュをクリア中..."
	docker compose exec app php artisan config:clear
	docker compose exec app php artisan cache:clear
	@echo ""
	@echo "🔍 ヘルスチェック実行中..."
	@sleep 5
	@make health
	@echo ""
	@echo "✅ tugical開発環境のセットアップが完了しました！"
	@echo ""
	@echo "🌐 利用可能なサービス:"
	@echo "  • API Health Check: http://localhost/health"
	@echo "  • phpMyAdmin:       http://localhost:8080"
	@echo "  • Admin Panel:      http://localhost/admin"
	@echo "  • LIFF App:         http://localhost/liff"
	@echo ""
	@echo "📝 次のステップ:"
	@echo "  • ビジネスロジック実装: cd backend && php artisan make:service BookingService"
	@echo "  • フロントエンド開発: make npm-admin cmd=\"run dev\""
	@echo "  • LIFF開発:         make npm-liff cmd=\"run dev\""
	@echo ""

# Production commands
prod-build: ## Build for production
	docker compose -f docker-compose.prod.yml build

prod-up: ## Start production services
	docker compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production services
	docker compose -f docker-compose.prod.yml down

# Development utilities
artisan: ## Run artisan command (use: make artisan cmd="route:list")
	docker compose exec app php artisan $(cmd)

composer: ## Run composer command (use: make composer cmd="require package")
	docker compose exec app composer $(cmd)

npm-admin: ## Run npm command in admin frontend (use: make npm-admin cmd="install")
	docker compose exec frontend npm $(cmd)

npm-liff: ## Run npm command in LIFF app (use: make npm-liff cmd="install")
	docker compose exec liff npm $(cmd)

build-liff: ## Build LIFF application for production
	docker compose exec liff npm run build

dev-liff: ## Start LIFF development server
	docker compose exec liff npm run dev

backup-db: ## Backup database
	@mkdir -p backups
	docker compose exec database mysqldump -u tugical_dev -pdev_password_123 tugical_dev > backups/tugical_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backup created in backups/"

restore-db: ## Restore database (use: make restore-db file="backups/file.sql")
	@test -f $(file) || (echo "❌ File not found: $(file)" && exit 1)
	docker compose exec -T database mysql -u tugical_dev -pdev_password_123 tugical_dev < $(file)
	@echo "✅ Database restored from $(file)" 