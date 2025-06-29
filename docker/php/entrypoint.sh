#!/bin/sh

# Exit on any error
set -e

# Wait for database to be ready
wait_for_db() {
    echo "Waiting for database to be ready..."
    while ! nc -z database 3306; do
        sleep 1
    done
    echo "Database is ready!"
}

# Wait for Redis to be ready
wait_for_redis() {
    echo "Waiting for Redis to be ready..."
    while ! nc -z redis 6379; do
        sleep 1
    done
    echo "Redis is ready!"
}

# Install netcat for health checks
if ! command -v nc >/dev/null 2>&1; then
    apk add --no-cache netcat-openbsd
fi

# Execute different commands based on container role
case "${CONTAINER_ROLE:-app}" in
    "app")
        echo "Starting PHP-FPM..."
        wait_for_db
        wait_for_redis
        
        # Run Laravel optimizations if in production
        if [ "$APP_ENV" = "production" ]; then
            echo "Running Laravel optimizations..."
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache
        fi
        
        exec php-fpm
        ;;
    
    "queue")
        echo "Starting Queue Worker..."
        wait_for_db
        wait_for_redis
        
        # Wait a bit more for Laravel to be ready
        sleep 10
        
        exec php artisan queue:work --sleep=3 --tries=3 --max-time=3600
        ;;
    
    "scheduler")
        echo "Starting Scheduler..."
        wait_for_db
        wait_for_redis
        
        # Wait a bit more for Laravel to be ready
        sleep 15
        
        # Create crontab if it doesn't exist
        if [ ! -f /var/www/html/docker/cron/crontab ]; then
            mkdir -p /var/www/html/docker/cron
            echo "* * * * * cd /var/www/html && php artisan schedule:run >> /dev/null 2>&1" > /var/www/html/docker/cron/crontab
        fi
        
        exec supercronic /var/www/html/docker/cron/crontab
        ;;
    
    *)
        echo "Unknown container role: ${CONTAINER_ROLE}"
        exec "$@"
        ;;
esac 