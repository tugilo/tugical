# tugical デプロイガイド（VPS統一版）
## GitHub Actions CI/CD Pipeline

**Version**: 1.1  
**Date**: 2025年6月28日  
**Project**: tugical（ツギカル）  
**Strategy**: VPS統一運用 → 段階的クラウド移行

---

## 🚀 デプロイメント概要

### VPS統一戦略
```
さくらのVPS 8GBプラン（¥4,400/月）
├─ 開発環境 (dev.tugical.com)
├─ ステージング環境 (staging.tugical.com)  
└─ 本番環境 (tugical.com)

💰 従来比較
- VPS+クラウド混在: ¥17,200/月
- VPS統一運用: ¥4,400/月
- 年間節約: ¥154,000
```

### Docker環境分離
```yaml
# docker-compose.yml（3環境統一）
version: '3.8'
services:
  # Laravel API（環境別設定）
  app:
    build: 
      context: ./docker/php
      args:
        - PHP_VERSION=8.2
    volumes:
      - ./backend:/var/www/html
      - ./docker/php/php.ini:/usr/local/etc/php/php.ini
    environment:
      - APP_ENV=${DEPLOY_ENV:-local}
      - CONTAINER_ROLE=app
    depends_on:
      - database
      - redis
    networks:
      - tugical-network

  # Nginx（環境別ルーティング）
  nginx:
    image: nginx:1.24-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/sites:/etc/nginx/sites-available
      - ./backend/public:/var/www/html/backend/public
      - ./frontend/dist:/var/www/html/frontend
      - ./liff/dist:/var/www/html/liff
      - ./docker/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - tugical-network

  # MariaDB（データベース分離）
  database:
    image: mariadb:10.11
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_USER: tugical
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
      - ./docker/mysql/my.cnf:/etc/mysql/conf.d/custom.cnf
      - db_data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - tugical-network

  # Redis（環境別プレフィックス）
  redis:
    image: redis:7.2-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
      - ./docker/redis/redis.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "6379:6379"
    networks:
      - tugical-network

  # Queue Worker
  queue:
    build: 
      context: ./docker/php
      args:
        - PHP_VERSION=8.2
    volumes:
      - ./backend:/var/www/html
    environment:
      - APP_ENV=${DEPLOY_ENV:-local}
      - CONTAINER_ROLE=queue
    command: php artisan queue:work --sleep=3 --tries=3 --max-time=3600
    depends_on:
      - database
      - redis
    networks:
      - tugical-network

  # Cron
  scheduler:
    build: 
      context: ./docker/php
      args:
        - PHP_VERSION=8.2
    volumes:
      - ./backend:/var/www/html
    environment:
      - APP_ENV=${DEPLOY_ENV:-local}
      - CONTAINER_ROLE=scheduler
    command: supercronic /var/www/html/docker/cron/crontab
    depends_on:
      - database
      - redis
    networks:
      - tugical-network

volumes:
  db_data:
    driver: local
  redis_data:
    driver: local

networks:
  tugical-network:
    driver: bridge
```

---

## 📁 プロジェクト構造

```
tugical/
├── backend/                 # Laravel API
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── routes/
│   └── .env.example
├── frontend/                # React管理画面
│   ├── src/
│   ├── public/
│   └── package.json
├── liff/                    # React LIFF アプリ
│   ├── src/
│   ├── public/
│   └── package.json
├── docker/                  # Docker設定
│   ├── php/
│   │   ├── Dockerfile
│   │   └── php.ini
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── sites/
│   ├── mysql/
│   │   ├── init/
│   │   └── my.cnf
│   └── redis/
│       └── redis.conf
├── scripts/                 # 運用スクリプト
│   ├── deploy.sh
│   ├── backup.sh
│   └── health-check.sh
├── .github/workflows/       # GitHub Actions
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 🔄 ブランチ戦略

### Git Flow準拠
```
main                    # 本番環境 (tugical.com)
├─ develop             # ステージング環境 (staging.tugical.com)
├─ feature/*           # 機能開発
├─ hotfix/*            # 緊急修正
└─ release/*           # リリース準備
```

### デプロイトリガー
```bash
# 自動デプロイ
develop branch → staging.tugical.com
main branch    → tugical.com

# 手動デプロイ
workflow_dispatch → 任意環境
```

---

## ⚙️ GitHub Actions設定

### 1. CI/CDパイプライン

#### `.github/workflows/ci.yml`
```yaml
name: CI Pipeline

on:
  push:
    branches: [ develop, main ]
  pull_request:
    branches: [ develop, main ]

env:
  NODE_VERSION: '18'
  PHP_VERSION: '8.2'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mariadb:10.11
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: tugical_test
          MYSQL_USER: tugical
          MYSQL_PASSWORD: tugical
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

      redis:
        image: redis:7.2-alpine
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ env.PHP_VERSION }}
        extensions: pdo, mysql, redis, gd, zip, bcmath, intl
        coverage: xdebug
        tools: composer:v2

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    # Backend Tests
    - name: Install PHP dependencies
      working-directory: ./backend
      run: |
        composer install --prefer-dist --no-progress --no-suggest
        cp .env.testing .env

    - name: Generate application key
      working-directory: ./backend
      run: php artisan key:generate

    - name: Run database migrations
      working-directory: ./backend
      run: php artisan migrate --force

    - name: Execute PHP tests
      working-directory: ./backend
      run: |
        php artisan test --coverage-clover=coverage.xml
        vendor/bin/phpstan analyse --memory-limit=2G
        vendor/bin/php-cs-fixer fix --dry-run --diff

    # Frontend Tests
    - name: Install Frontend dependencies
      working-directory: ./frontend
      run: npm ci

    - name: Frontend tests
      working-directory: ./frontend
      run: |
        npm run test:coverage
        npm run lint
        npm run type-check
        npm run build

    # LIFF Tests
    - name: Install LIFF dependencies
      working-directory: ./liff
      run: npm ci

    - name: LIFF tests
      working-directory: ./liff
      run: |
        npm run test:coverage
        npm run lint
        npm run type-check
        npm run build

    # Security & Quality
    - name: Security audit
      run: |
        cd backend && composer audit
        cd frontend && npm audit --audit-level=high
        cd liff && npm audit --audit-level=high

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage.xml,./frontend/coverage/lcov.info,./liff/coverage/lcov.info
```

### 2. 環境別デプロイ

#### `.github/workflows/deploy.yml`
```yaml
name: Deploy to VPS

on:
  push:
    branches: [ develop, main ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production
      force_deploy:
        description: 'Force deploy without approval'
        required: false
        default: false
        type: boolean

jobs:
  determine-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
      domain: ${{ steps.env.outputs.domain }}
    steps:
    - name: Determine environment
      id: env
      run: |
        if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
          echo "environment=${{ github.event.inputs.environment }}" >> $GITHUB_OUTPUT
        elif [ "${{ github.ref }}" = "refs/heads/main" ]; then
          echo "environment=production" >> $GITHUB_OUTPUT
        else
          echo "environment=staging" >> $GITHUB_OUTPUT
        fi
        
        if [ "${{ steps.env.outputs.environment || 'staging' }}" = "production" ]; then
          echo "domain=tugical.com" >> $GITHUB_OUTPUT
        else
          echo "domain=staging.tugical.com" >> $GITHUB_OUTPUT
        fi

  build:
    runs-on: ubuntu-latest
    needs: determine-environment
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.2'
        extensions: pdo, mysql, redis, gd, zip, bcmath

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Build Backend
      working-directory: ./backend
      run: |
        composer install --no-dev --optimize-autoloader --no-scripts
        php artisan config:cache
        php artisan route:cache
        php artisan view:cache

    - name: Build Frontend
      working-directory: ./frontend
      run: |
        npm ci
        if [ "${{ needs.determine-environment.outputs.environment }}" = "production" ]; then
          npm run build:production
        else
          npm run build:staging
        fi

    - name: Build LIFF
      working-directory: ./liff
      run: |
        npm ci
        if [ "${{ needs.determine-environment.outputs.environment }}" = "production" ]; then
          npm run build:production
        else
          npm run build:staging
        fi

    - name: Create deployment package
      run: |
        tar -czf tugical-${{ needs.determine-environment.outputs.environment }}.tar.gz \
          --exclude=node_modules \
          --exclude=.git \
          --exclude=tests \
          --exclude=.env \
          --exclude=coverage \
          backend/ frontend/dist/ liff/dist/ docker/ scripts/

    - name: Upload deployment artifact
      uses: actions/upload-artifact@v3
      with:
        name: tugical-${{ needs.determine-environment.outputs.environment }}
        path: tugical-${{ needs.determine-environment.outputs.environment }}.tar.gz
        retention-days: 7

  deploy:
    needs: [determine-environment, build]
    runs-on: ubuntu-latest
    environment: ${{ needs.determine-environment.outputs.environment }}
    
    steps:
    - name: Download deployment artifact
      uses: actions/download-artifact@v3
      with:
        name: tugical-${{ needs.determine-environment.outputs.environment }}

    - name: Deploy to VPS
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USER }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          set -e
          
          ENV="${{ needs.determine-environment.outputs.environment }}"
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          APP_DIR="/var/www/tugical"
          BACKUP_DIR="/var/backups/tugical/deployments"
          
          echo "🚀 Starting deployment to $ENV environment..."
          
          # Create backup directory
          sudo mkdir -p $BACKUP_DIR
          
          # Backup current deployment
          if [ -d "$APP_DIR" ]; then
            echo "📦 Creating backup..."
            sudo tar -czf $BACKUP_DIR/tugical-${ENV}-backup-${TIMESTAMP}.tar.gz -C /var/www tugical
          fi
          
          # Download deployment package
          cd /tmp
          curl -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" \
               -L -o tugical-${ENV}.tar.gz \
               "${{ github.server_url }}/${{ github.repository }}/actions/artifacts/..."
          
          # Stop services
          echo "⏹️ Stopping services..."
          sudo docker-compose -f $APP_DIR/docker-compose.yml down || true
          
          # Extract new deployment
          echo "📂 Extracting deployment..."
          sudo rm -rf $APP_DIR/*
          sudo tar -xzf tugical-${ENV}.tar.gz -C $APP_DIR/
          
          # Set permissions
          sudo chown -R 1000:1000 $APP_DIR/
          sudo chmod -R 755 $APP_DIR/
          
          # Copy environment file
          sudo cp $APP_DIR/.env.${ENV} $APP_DIR/backend/.env
          
          # Start services
          echo "🔄 Starting services..."
          cd $APP_DIR
          sudo docker-compose -f docker-compose.yml -f docker-compose.${ENV}.yml up -d --build
          
          # Wait for services to be ready
          echo "⏳ Waiting for services..."
          sleep 30
          
          # Run migrations and optimizations
          echo "🗄️ Running migrations..."
          sudo docker-compose exec -T app php artisan migrate --force
          sudo docker-compose exec -T app php artisan config:cache
          sudo docker-compose exec -T app php artisan route:cache
          sudo docker-compose exec -T app php artisan view:cache
          sudo docker-compose exec -T app php artisan queue:restart
          
          # Clean up old backups (keep last 5)
          sudo find $BACKUP_DIR -name "tugical-${ENV}-backup-*.tar.gz" | sort -r | tail -n +6 | sudo xargs rm -f
          
          echo "✅ Deployment completed successfully!"

    - name: Health check
      run: |
        echo "🏥 Running health checks..."
        sleep 30
        
        # API Health Check
        response=$(curl -s -o /dev/null -w "%{http_code}" https://${{ needs.determine-environment.outputs.domain }}/api/v1/health)
        if [ "$response" != "200" ]; then
          echo "❌ API health check failed: $response"
          exit 1
        fi
        
        # Frontend Check
        response=$(curl -s -o /dev/null -w "%{http_code}" https://${{ needs.determine-environment.outputs.domain }}/admin/)
        if [ "$response" != "200" ]; then
          echo "❌ Frontend health check failed: $response"
          exit 1
        fi
        
        # LIFF Check
        response=$(curl -s -o /dev/null -w "%{http_code}" https://${{ needs.determine-environment.outputs.domain }}/liff/)
        if [ "$response" != "200" ]; then
          echo "❌ LIFF health check failed: $response"
          exit 1
        fi
        
        echo "✅ All health checks passed!"

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#tugical-deployments'
        text: |
          🚀 tugical deployment to ${{ needs.determine-environment.outputs.environment }}
          • Status: ${{ job.status }}
          • Environment: ${{ needs.determine-environment.outputs.environment }}
          • URL: https://${{ needs.determine-environment.outputs.domain }}
          • Commit: ${{ github.sha }}
          • Author: ${{ github.actor }}
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()
```

---

## 🔧 Docker設定

### PHP Dockerfile
```dockerfile
# docker/php/Dockerfile
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    git \
    oniguruma-dev \
    icu-dev \
    autoconf \
    g++ \
    make \
    && docker-php-ext-configure intl \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        intl

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install supercronic for cron jobs
RUN curl -fsSLO "https://github.com/aptible/supercronic/releases/download/v0.2.24/supercronic-linux-amd64" \
    && echo "0bdd3db7b4b3bc5b7dd7e0d7f0b0e1e16b74b62e  supercronic-linux-amd64" | sha1sum -c - \
    && chmod +x supercronic-linux-amd64 \
    && mv supercronic-linux-amd64 /usr/local/bin/supercronic

# Set working directory
WORKDIR /var/www/html

# Copy application
COPY backend/ ./

# Install dependencies
RUN composer install --optimize-autoloader --no-dev

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 storage bootstrap/cache

# Copy entrypoint script
COPY docker/php/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
```

### Nginx設定
```nginx
# docker/nginx/sites/tugical.conf
map $host $environment {
    ~^dev\.            "development";
    ~^staging\.        "staging";
    default            "production";
}

# Development Environment
server {
    listen 80;
    server_name dev.tugical.com;
    root /var/www/html/backend/public;
    index index.php;

    # API routes
    location /api/ {
        try_files $uri $uri/ /index.php?$query_string;
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        fastcgi_param APP_ENV development;
        include fastcgi_params;
    }

    # Admin panel
    location /admin/ {
        alias /var/www/html/frontend/;
        try_files $uri $uri/ /admin/index.html;
    }

    # LIFF application
    location /liff/ {
        alias /var/www/html/liff/;
        try_files $uri $uri/ /liff/index.html;
    }

    # PHP files
    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param APP_ENV development;
        include fastcgi_params;
    }
}

# Staging Environment
server {
    listen 80;
    listen 443 ssl http2;
    server_name staging.tugical.com;
    root /var/www/html/backend/public;
    index index.php;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/staging.tugical.com.crt;
    ssl_certificate_key /etc/nginx/ssl/staging.tugical.com.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API routes
    location /api/ {
        try_files $uri $uri/ /index.php?$query_string;
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        fastcgi_param APP_ENV staging;
        include fastcgi_params;
    }

    # Admin panel
    location /admin/ {
        alias /var/www/html/frontend/;
        try_files $uri $uri/ /admin/index.html;
    }

    # LIFF application
    location /liff/ {
        alias /var/www/html/liff/;
        try_files $uri $uri/ /liff/index.html;
    }

    # PHP files
    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param APP_ENV staging;
        include fastcgi_params;
    }
}

# Production Environment
server {
    listen 80;
    server_name tugical.com www.tugical.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tugical.com www.tugical.com;
    root /var/www/html/backend/public;
    index index.php;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/tugical.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tugical.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' static.line-scdn.net; style-src 'self' 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=global:10m rate=50r/s;

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req zone=global burst=100 nodelay;
        
        try_files $uri $uri/ /index.php?$query_string;
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
        fastcgi_param APP_ENV production;
        include fastcgi_params;
    }

    # Admin panel
    location /admin/ {
        alias /var/www/html/frontend/;
        try_files $uri $uri/ /admin/index.html;
        
        # Basic auth for extra security
        auth_basic "tugical Admin";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }

    # LIFF application
    location /liff/ {
        alias /var/www/html/liff/;
        try_files $uri $uri/ /liff/index.html;
    }

    # PHP files
    location ~ \.php$ {
        fastcgi_pass app:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param APP_ENV production;
        include fastcgi_params;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Health check endpoint
    location = /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## 🗄️ データベース設定

### 環境別データベース初期化
```sql
-- docker/mysql/init/01-create-databases.sql
CREATE DATABASE IF NOT EXISTS tugical_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS tugical_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS tugical_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Development user
CREATE USER IF NOT EXISTS 'tugical_dev'@'%' IDENTIFIED BY 'dev_password_123';
GRANT ALL PRIVILEGES ON tugical_dev.* TO 'tugical_dev'@'%';

-- Staging user
CREATE USER IF NOT EXISTS 'tugical_staging'@'%' IDENTIFIED BY 'staging_password_456';
GRANT ALL PRIVILEGES ON tugical_staging.* TO 'tugical_staging'@'%';

-- Production user (limited permissions)
CREATE USER IF NOT EXISTS 'tugical_prod'@'%' IDENTIFIED BY 'prod_password_789';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON tugical_prod.* TO 'tugical_prod'@'%';

FLUSH PRIVILEGES;
```

### MariaDB最適化設定
```ini
# docker/mysql/my.cnf
[mysqld]
# Basic settings
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+09:00'

# Performance tuning
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Connection settings
max_connections = 200
connect_timeout = 60
wait_timeout = 28800

# Query cache
query_cache_type = 1
query_cache_size = 128M
query_cache_limit = 2M

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Binary log settings
log-bin = mysql-bin
expire_logs_days = 7
max_binlog_size = 100M

[mysql]
default-character-set = utf8mb4

[client]
default-character-set = utf8mb4
```

---

## 📊 監視・ヘルスチェック

### アプリケーション監視
```php
<?php
// backend/routes/web.php

Route::get('/health', function () {
    $checks = [
        'timestamp' => now()->toISOString(),
        'environment' => app()->environment(),
        'version' => config('app.version', '1.0.0'),
        'status' => 'healthy'
    ];

    try {
        // Database check
        $checks['database'] = DB::connection()->getPdo() ? 'connected' : 'disconnected';
        
        // Redis check
        $checks['redis'] = Redis::ping() === '+PONG' ? 'connected' : 'disconnected';
        
        // Storage check
        $checks['storage'] = Storage::disk('local')->exists('.gitignore') ? 'accessible' : 'inaccessible';
        
        // Queue check
        $queueSize = Queue::size();
        $checks['queue'] = [
            'size' => $queueSize,
            'status' => $queueSize < 1000 ? 'healthy' : 'warning'
        ];

        // Memory usage
        $checks['memory'] = [
            'usage' => memory_get_usage(true),
            'peak' => memory_get_peak_usage(true),
            'limit' => ini_get('memory_limit')
        ];

        // Determine overall status
        $hasError = in_array('disconnected', $checks) || in_array('inaccessible', $checks);
        $hasWarning = isset($checks['queue']['status']) && $checks['queue']['status'] === 'warning';
        
        $overallStatus = $hasError ? 'error' : ($hasWarning ? 'warning' : 'healthy');
        $checks['status'] = $overallStatus;

    } catch (Exception $e) {
        $checks['status'] = 'error';
        $checks['error'] = $e->getMessage();
    }

    return response()->json($checks, $checks['status'] === 'error' ? 503 : 200);
});

Route::get('/health/detailed', function () {
    // Detailed health check for monitoring systems
    return response()->json([
        'application' => [
            'name' => config('app.name'),
            'environment' => app()->environment(),
            'debug' => config('app.debug'),
            'url' => config('app.url'),
            'timezone' => config('app.timezone'),
        ],
        'database' => [
            'default' => config('database.default'),
            'connections' => collect(config('database.connections'))->map(function ($config, $name) {
                try {
                    $pdo = DB::connection($name)->getPdo();
                    return [
                        'status' => 'connected',
                        'driver' => $config['driver'] ?? 'unknown'
                    ];
                } catch (Exception $e) {
                    return [
                        'status' => 'error',
                        'error' => $e->getMessage()
                    ];
                }
            })
        ],
        'cache' => [
            'default' => config('cache.default'),
            'stores' => collect(config('cache.stores'))->map(function ($config, $name) {
                try {
                    Cache::store($name)->put('health_check', true, 60);
                    return ['status' => 'accessible'];
                } catch (Exception $e) {
                    return [
                        'status' => 'error',
                        'error' => $e->getMessage()
                    ];
                }
            })
        ],
        'queue' => [
            'default' => config('queue.default'),
            'connections' => collect(config('queue.connections'))->map(function ($config, $name) {
                try {
                    $size = Queue::connection($name)->size();
                    return [
                        'status' => 'accessible',
                        'size' => $size
                    ];
                } catch (Exception $e) {
                    return [
                        'status' => 'error',
                        'error' => $e->getMessage()
                    ];
                }
            })
        ]
    ]);
});
```

### 外部監視設定
```yaml
# scripts/monitoring/uptime-kuma.yml
version: '3.8'
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: tugical-monitoring
    volumes:
      - kuma-data:/app/data
    ports:
      - "3001:3001"
    restart: unless-stopped
    environment:
      - NODE_ENV=production

volumes:
  kuma-data:

# Monitoring configuration
monitors:
  - name: "tugical Production API"
    type: "http"
    url: "https://tugical.com/api/v1/health"
    interval: 60
    retries: 3
    timeout: 30
    
  - name: "tugical Staging API"
    type: "http"
    url: "https://staging.tugical.com/api/v1/health"
    interval: 300
    retries: 3
    timeout: 30

  - name: "tugical LIFF"
    type: "http"
    url: "https://tugical.com/liff/"
    interval: 300
    keyword: "tugical"
    
  - name: "tugical Admin"
    type: "http"
    url: "https://tugical.com/admin/"
    interval: 300
    keyword: "ログイン"

  - name: "tugical Database"
    type: "postgres"  # Use appropriate type
    hostname: "localhost"
    port: 3306
    database: "tugical_prod"
    username: "tugical_prod"
    interval: 300
```

---

## 🔒 セキュリティ強化

### 1. GitHub Secrets管理
```bash
# Required secrets for VPS deployment
VPS_HOST=your-vps-ip-or-domain
VPS_USER=deploy
VPS_SSH_KEY=<your-private-ssh-key>

# Database credentials
DB_ROOT_PASSWORD=<secure-root-password>
DB_DEV_PASSWORD=<dev-password>
DB_STAGING_PASSWORD=<staging-password>
DB_PROD_PASSWORD=<production-password>

# Redis credentials
REDIS_PASSWORD=<redis-password>

# LINE API credentials (per environment)
DEV_LINE_CHANNEL_ID=<dev-line-channel>
DEV_LINE_CHANNEL_SECRET=<dev-line-secret>
DEV_LINE_ACCESS_TOKEN=<dev-line-token>

STAGING_LINE_CHANNEL_ID=<staging-line-channel>
STAGING_LINE_CHANNEL_SECRET=<staging-line-secret>
STAGING_LINE_ACCESS_TOKEN=<staging-line-token>

PRODUCTION_LINE_CHANNEL_ID=<production-line-channel>
PRODUCTION_LINE_CHANNEL_SECRET=<production-line-secret>
PRODUCTION_LINE_ACCESS_TOKEN=<production-line-token>

# Notification webhooks
SLACK_WEBHOOK=<slack-webhook-url>
DISCORD_WEBHOOK=<discord-webhook-url>
```

### 2. SSL/TLS設定
```bash
#!/bin/bash
# scripts/ssl-setup.sh

# Install Certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificates
sudo certbot --nginx -d tugical.com -d www.tugical.com
sudo certbot --nginx -d staging.tugical.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet --nginx

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Firewall設定
```bash
#!/bin/bash
# scripts/firewall-setup.sh

# Reset UFW to defaults
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH access
sudo ufw allow ssh

# HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Database (internal only)
sudo ufw allow from 172.0.0.0/8 to any port 3306
sudo ufw allow from 10.0.0.0/8 to any port 3306

# Redis (internal only)
sudo ufw allow from 172.0.0.0/8 to any port 6379
sudo ufw allow from 10.0.0.0/8 to any port 6379

# Enable firewall
sudo ufw --force enable

# Show status
sudo ufw status verbose
```

---

## 📝 運用スクリプト

### バックアップスクリプト
```bash
#!/bin/bash
# scripts/backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/tugical"
RETENTION_DAYS=30
S3_BUCKET="tugical-backups"

echo "🗄️ Starting backup process: $TIMESTAMP"

# Create backup directory
sudo mkdir -p $BACKUP_DIR

# Database backups
for env in dev staging prod; do
    echo "Backing up tugical_${env} database..."
    docker-compose exec -T database mysqldump \
        --single-transaction \
        --routines \
        --triggers \
        tugical_${env} > ${BACKUP_DIR}/db_${env}_${TIMESTAMP}.sql
done

# Application files backup
echo "Backing up application files..."
tar -czf ${BACKUP_DIR}/app_${TIMESTAMP}.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=vendor \
    /var/www/tugical/backend/storage/app

# Configuration backup
echo "Backing up configuration..."
tar -czf ${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz \
    /var/www/tugical/.env.* \
    /var/www/tugical/docker-compose*.yml \
    /etc/nginx/sites-available/tugical

# Upload to S3 (if configured)
if command -v aws &> /dev/null && [ ! -z "$S3_BUCKET" ]; then
    echo "Uploading to S3..."
    aws s3 sync $BACKUP_DIR s3://$S3_BUCKET/$(date +%Y/%m/%d)/
fi

# Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed: $TIMESTAMP"
```

### ヘルスチェックスクリプト
```bash
#!/bin/bash
# scripts/health-check.sh

ENVIRONMENTS=("production" "staging")
ENDPOINTS=("/api/v1/health" "/admin/" "/liff/")

check_endpoint() {
    local env=$1
    local endpoint=$2
    local domain=""
    
    if [ "$env" = "production" ]; then
        domain="tugical.com"
    else
        domain="${env}.tugical.com"
    fi
    
    local url="https://${domain}${endpoint}"
    local response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$url")
    local status_code=$(echo $response | cut -d',' -f1)
    local response_time=$(echo $response | cut -d',' -f2)
    
    if [ "$status_code" = "200" ]; then
        echo "✅ $env $endpoint: OK (${response_time}s)"
        return 0
    else
        echo "❌ $env $endpoint: FAILED ($status_code)"
        return 1
    fi
}

echo "🏥 tugical Health Check - $(date)"
echo "=================================="

failed_checks=0

for env in "${ENVIRONMENTS[@]}"; do
    echo "Checking $env environment..."
    for endpoint in "${ENDPOINTS[@]}"; do
        if ! check_endpoint "$env" "$endpoint"; then
            ((failed_checks++))
        fi
    done
    echo ""
done

if [ $failed_checks -eq 0 ]; then
    echo "✅ All health checks passed!"
    exit 0
else
    echo "❌ $failed_checks health check(s) failed!"
    exit 1
fi
```

### ログ分析スクリプト
```bash
#!/bin/bash
# scripts/log-analysis.sh

LOG_DIR="/var/www/tugical/backend/storage/logs"
NGINX_LOG="/var/log/nginx"
DATE=${1:-$(date +%Y-%m-%d)}

echo "📊 tugical Log Analysis for $DATE"
echo "=================================="

# Laravel error analysis
echo "🚨 Laravel Errors:"
if [ -f "$LOG_DIR/laravel-$DATE.log" ]; then
    grep -i "error\|exception\|fatal" "$LOG_DIR/laravel-$DATE.log" | tail -10
else
    echo "No Laravel logs found for $DATE"
fi

echo ""

# Nginx access analysis
echo "🌐 Top 10 IP addresses:"
if [ -f "$NGINX_LOG/access.log" ]; then
    awk '{print $1}' "$NGINX_LOG/access.log" | sort | uniq -c | sort -nr | head -10
fi

echo ""

# API endpoint usage
echo "📈 API Endpoint Usage:"
if [ -f "$NGINX_LOG/access.log" ]; then
    grep "/api/" "$NGINX_LOG/access.log" | awk '{print $7}' | sort | uniq -c | sort -nr | head -10
fi

echo ""

# Response time analysis
echo "⏱️ Slow requests (>2s):"
if [ -f "$NGINX_LOG/access.log" ]; then
    awk '$NF > 2 {print $7, $NF"s"}' "$NGINX_LOG/access.log" | tail -10
fi

echo ""

# Error rate
echo "💥 Error Rate Analysis:"
if [ -f "$NGINX_LOG/access.log" ]; then
    total_requests=$(wc -l < "$NGINX_LOG/access.log")
    error_requests=$(awk '$9 >= 400' "$NGINX_LOG/access.log" | wc -l)
    if [ $total_requests -gt 0 ]; then
        error_rate=$(echo "scale=2; $error_requests * 100 / $total_requests" | bc)
        echo "Total requests: $total_requests"
        echo "Error requests: $error_requests"
        echo "Error rate: $error_rate%"
    fi
fi
```

---

## 🚀 VPS → クラウド移行準備

### 移行判断基準（更新版）
```bash
# 移行トリガー判定スクリプト
#!/bin/bash
# scripts/migration-readiness-check.sh

echo "🔍 tugical Migration Readiness Assessment"
echo "========================================"

# 店舗数チェック
STORE_COUNT=$(docker-compose exec -T database mysql -u tugical_prod -p -se "SELECT COUNT(*) FROM tugical_prod.stores WHERE is_active = 1")
echo "Active stores: $STORE_COUNT"

# 月間予約数チェック（過去30日）
MONTHLY_BOOKINGS=$(docker-compose exec -T database mysql -u tugical_prod -p -se "SELECT COUNT(*) FROM tugical_prod.bookings WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
echo "Monthly bookings: $MONTHLY_BOOKINGS"

# リソース使用率チェック
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
DISK_USAGE=$(df -h /var/lib/docker | awk 'NR==2{print $5}' | sed 's/%//')

echo "CPU usage: ${CPU_USAGE}%"
echo "Memory usage: ${MEM_USAGE}%"
echo "Disk usage: ${DISK_USAGE}%"

# レスポンス時間チェック
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://tugical.com/api/v1/health)
echo "Response time: ${RESPONSE_TIME}s"

# 収益チェック（実装は別途）
# MONTHLY_REVENUE=...

# 判定
migration_triggers=0

if [ $STORE_COUNT -gt 20 ]; then
    echo "✅ Store count trigger: $STORE_COUNT > 20"
    ((migration_triggers++))
fi

if [ $MONTHLY_BOOKINGS -gt 5000 ]; then
    echo "✅ Booking volume trigger: $MONTHLY_BOOKINGS > 5000"
    ((migration_triggers++))
fi

if (( $(echo "$CPU_USAGE > 80" | bc -l) )) || (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "✅ Resource usage trigger: CPU ${CPU_USAGE}%, Memory ${MEM_USAGE}%"
    ((migration_triggers++))
fi

if (( $(echo "$RESPONSE_TIME > 3.0" | bc -l) )); then
    echo "✅ Performance trigger: ${RESPONSE_TIME}s > 3.0s"
    ((migration_triggers++))
fi

echo ""
echo "Migration triggers: $migration_triggers / 4"

if [ $migration_triggers -ge 2 ]; then
    echo "🚀 RECOMMENDATION: Ready for cloud migration"
    echo "Consider planning migration within 30 days"
else
    echo "📊 RECOMMENDATION: Continue VPS operation"
    echo "Monitor metrics and reassess next month"
fi
```

### クラウド移行準備チェックリスト
```markdown
## VPS → クラウド移行チェックリスト

### 移行前準備（4週間前）
- [ ] クラウドインフラ設計完了
- [ ] コスト見積もり承認
- [ ] 移行計画書作成
- [ ] 移行テスト環境構築

### 移行前準備（2週間前）
- [ ] クラウド環境構築完了
- [ ] SSL証明書設定
- [ ] DNS設定準備
- [ ] データ移行スクリプト作成・テスト
- [ ] ロールバック手順確立

### 移行前準備（1週間前）
- [ ] 全データバックアップ
- [ ] 移行リハーサル実行
- [ ] 関係者への通知
- [ ] 緊急連絡体制確立
- [ ] 監視設定準備

### 移行当日
- [ ] 最終バックアップ実行
- [ ] メンテナンスモード開始
- [ ] データ移行実行
- [ ] DNS切り替え
- [ ] 動作確認
- [ ] メンテナンスモード解除
- [ ] 移行完了通知

### 移行後（1週間）
- [ ] 日次パフォーマンス監視
- [ ] エラーログ確認
- [ ] ユーザーフィードバック収集
- [ ] VPS環境保持（バックアップ用）
```

---

## 📚 運用マニュアル

### 日常運用タスク
```bash
# 日次チェック項目
□ ヘルスチェック実行
□ エラーログ確認
□ バックアップ状況確認
□ リソース使用率確認

# 週次チェック項目
□ セキュリティアップデート適用
□ パフォーマンス分析
□ データベース最適化
□ ログローテーション

# 月次チェック項目
□ SSL証明書期限確認
□ バックアップ復旧テスト
□ 容量・スケール見直し
□ 監視アラート調整
```

### トラブルシューティング
```bash
# 一般的な問題と解決方法

# 1. サービスが応答しない
docker-compose ps
docker-compose logs app
docker-compose restart

# 2. データベース接続エラー
docker-compose logs database
docker-compose restart database

# 3. 高CPU使用率
docker stats
docker-compose exec app php artisan optimize:clear
docker-compose restart

# 4. ディスク容量不足
df -h
docker system prune -f
sudo rm -rf /var/log/nginx/*.log.*.gz

# 5. SSL証明書期限切れ
sudo certbot renew
sudo systemctl reload nginx
```

---

## 🎯 成功指標・KPI

### 技術指標
```yaml
Performance Metrics:
  - API Response Time: < 2s (avg)
  - Page Load Time: < 3s (95th percentile)
  - Uptime: > 99.5%
  - Error Rate: < 1%

Resource Metrics:
  - CPU Usage: < 70% (avg)
  - Memory Usage: < 80% (avg)
  - Disk Usage: < 80%
  - Network Latency: < 100ms

Security Metrics:
  - Vulnerability Count: 0 (critical/high)
  - Failed Login Attempts: < 100/day
  - SSL Score: A+ (SSL Labs)
  - Security Headers: 100% (securityheaders.com)
```

### 運用指標
```yaml
Deployment Metrics:
  - Deployment Frequency: Daily
  - Lead Time: < 30 minutes
  - Failure Rate: < 5%
  - Recovery Time: < 1 hour

Monitoring Metrics:
  - Alert Response Time: < 15 minutes
  - False Positive Rate: < 10%
  - Coverage: 100% (critical services)
  - MTTR: < 2 hours
```

---

## 📞 緊急対応手順

### 障害レベル定義
```yaml
Critical (P0):
  - 全サービス停止
  - データ損失
  - セキュリティ侵害
  Response: 15分以内

High (P1):
  - 主要機能停止
  - パフォーマンス大幅劣化
  Response: 1時間以内

Medium (P2):
  - 一部機能停止
  - 軽微なパフォーマンス問題
  Response: 4時間以内

Low (P3):
  - 表示崩れ
  - 非重要機能の問題
  Response: 24時間以内
```

### エスカレーション手順
```
1. 自動アラート検知
   ↓
2. オンコール担当者通知
   ↓ (15分後、未対応の場合)
3. DevOpsリーダー通知
   ↓ (30分後、未解決の場合)
4. CTO通知
   ↓ (1時間後、未解決の場合)
5. CEO通知
```

---

## 🔮 将来拡張計画

### Phase 1: VPS最適化（6ヶ月）
- Docker最適化
- キャッシュ戦略強化
- データベースパフォーマンスチューニング
- 監視・アラート整備

### Phase 2: クラウド移行準備（12ヶ月）
- インフラ自動化（Terraform）
- CI/CD高度化
- マイクロサービス化検討
- コンテナオーケストレーション（Kubernetes）

### Phase 3: 大規模運用（18ヶ月）
- Multi-region展開
- CDN導入
- AI/ML基盤整備
- データレイク構築

---
