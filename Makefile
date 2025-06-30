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
	@echo ""
	@echo "Phase 3で実装予定:"
	@echo "- Admin Panel: http://localhost/admin"
	@echo "- Frontend: http://localhost:3000"
	@echo "- LIFF: http://localhost:5173"

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

shell: ## Access app container shell
	docker compose exec app sh

shell-db: ## Access database shell
	docker compose exec database mysql -u tugical_dev -pdev_password_123 tugical_dev

test: ## Run tests
	docker compose exec app php artisan test
	# Frontend/LIFF tests (Phase 3で実装予定)
	# docker compose exec frontend npm test
	# docker compose exec liff npm test

install: ## Install dependencies
	docker compose exec app composer install
	# Frontend/LIFF npm install (Phase 3で実装予定)
	# docker compose exec frontend npm install
	# docker compose exec liff npm install

migrate: ## Run database migrations
	docker compose exec app php artisan migrate

migrate-fresh: ## Fresh migration with data loss warning
	@echo "⚠️  WARNING: This will drop all data! Continue? [y/N]" && read ans && [ $${ans:-N} = y ]
	docker compose exec app php artisan migrate:fresh

seed: ## Run database seeders
	docker compose exec app php artisan db:seed

fresh: ## Fresh installation with seeders
	@echo "⚠️  WARNING: This will drop all data! Continue? [y/N]" && read ans && [ $${ans:-N} = y ]
	@echo "🔑 Generating application key..."
	docker compose exec app php artisan key:generate
	@echo "🧹 Clearing configuration cache..."
	docker compose exec app php artisan config:clear
	docker compose exec app php artisan cache:clear
	@echo "🗑️  Fresh migration with seeding..."
	docker compose exec app php artisan migrate:fresh --seed

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

clean: ## Clean up containers and volumes
	docker compose down -v
	docker system prune -f

rebuild: ## Rebuild and restart everything
	make down
	make build
	make up

setup: ## Initial project setup
	@echo "🚀 Setting up tugical development environment..."
	cp .env.example .env || echo "Create .env file manually"
	make build
	make up
	sleep 10
	make install
	@echo "🔑 Generating application key..."
	make artisan cmd="key:generate"
	@echo "🧹 Clearing configuration cache..."
	make artisan cmd="config:clear"
	make artisan cmd="cache:clear"
	@echo "📁 Running database migrations..."
	make migrate
	@echo "🌱 Seeding database..."
	make seed
	@echo "✅ Setup complete!"
	@echo "API Health: http://localhost/health"
	@echo "phpMyAdmin: http://localhost:8080"
	@echo ""
	@echo "Phase 2: ビジネスロジック実装準備完了"
	@echo "Next: cd backend && php artisan make:service BookingService"

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

backup-db: ## Backup database
	@mkdir -p backups
	docker compose exec database mysqldump -u tugical_dev -pdev_password_123 tugical_dev > backups/tugical_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backup created in backups/"

restore-db: ## Restore database (use: make restore-db file="backups/file.sql")
	@test -f $(file) || (echo "❌ File not found: $(file)" && exit 1)
	docker compose exec -T database mysql -u tugical_dev -pdev_password_123 tugical_dev < $(file)
	@echo "✅ Database restored from $(file)" 