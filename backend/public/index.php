<?php
/**
 * tugical Development Environment Test
 * PHP Info and Health Check Endpoint
 */

// Set timezone
date_default_timezone_set('Asia/Tokyo');

// Check if health check endpoint
if ($_SERVER['REQUEST_URI'] === '/health') {
    header('Content-Type: text/plain');
    echo "healthy\n";
    exit;
}

// API endpoint simulation
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'tugical API is working',
        'timestamp' => date('Y-m-d H:i:s'),
        'environment' => $_ENV['APP_ENV'] ?? 'local',
        'version' => '1.0.0-dev'
    ], JSON_PRETTY_PRINT);
    exit;
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tugical Development Environment</title>
    <style>
        body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
            color: #064e3b;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px; 
            border-bottom: 2px solid #10b981;
        }
        .status-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }
        .status-card { 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #10b981;
            background: #f0fdfa;
        }
        .status-ok { color: #059669; }
        .status-error { color: #dc2626; border-left-color: #dc2626; background: #fef2f2; }
        h1 { color: #10b981; margin: 0; }
        h2 { color: #064e3b; margin-top: 0; }
        .endpoint-list { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 10px 0; }
        .endpoint { margin: 5px 0; }
        .endpoint a { color: #10b981; text-decoration: none; }
        .endpoint a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 tugical Development Environment</h1>
            <p>LINE連携型予約管理SaaS - "次の時間が、もっと自由になる。"</p>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <h2>🐘 PHP Status</h2>
                <p class="status-ok">✅ PHP <?= phpversion(); ?> Running</p>
                <p>Timezone: <?= date_default_timezone_get(); ?></p>
                <p>Current Time: <?= date('Y-m-d H:i:s'); ?></p>
            </div>

            <div class="status-card">
                <h2>🗄️ Database Extensions</h2>
                <p class="<?= extension_loaded('pdo_mysql') ? 'status-ok' : 'status-error' ?>">
                    <?= extension_loaded('pdo_mysql') ? '✅' : '❌' ?> PDO MySQL
                </p>
                <p class="<?= extension_loaded('mysqli') ? 'status-ok' : 'status-error' ?>">
                    <?= extension_loaded('mysqli') ? '✅' : '❌' ?> MySQLi
                </p>
            </div>

            <div class="status-card">
                <h2>🔧 Required Extensions</h2>
                <p class="<?= extension_loaded('redis') ? 'status-ok' : 'status-error' ?>">
                    <?= extension_loaded('redis') ? '✅' : '❌' ?> Redis
                </p>
                <p class="<?= extension_loaded('mbstring') ? 'status-ok' : 'status-error' ?>">
                    <?= extension_loaded('mbstring') ? '✅' : '❌' ?> mbstring
                </p>
                <p class="<?= extension_loaded('intl') ? 'status-ok' : 'status-error' ?>">
                    <?= extension_loaded('intl') ? '✅' : '❌' ?> Intl
                </p>
                <p class="<?= extension_loaded('gd') ? 'status-ok' : 'status-error' ?>">
                    <?= extension_loaded('gd') ? '✅' : '❌' ?> GD
                </p>
            </div>

            <div class="status-card">
                <h2>🌐 Available Endpoints</h2>
                <div class="endpoint-list">
                    <div class="endpoint">🏥 <a href="/health">Health Check</a></div>
                    <div class="endpoint">🔗 <a href="/api/test">API Test</a></div>
                    <div class="endpoint">⚡ <a href="http://localhost:3000/admin">Admin Panel (Dev)</a></div>
                    <div class="endpoint">📱 <a href="http://localhost:5173/liff">LIFF App (Dev)</a></div>
                </div>
            </div>
        </div>

        <div style="margin-top: 30px; text-align: center; color: #6b7280;">
            <p>Environment: <strong><?= $_ENV['APP_ENV'] ?? 'local' ?></strong></p>
            <p>Docker Container: <strong><?= gethostname() ?></strong></p>
        </div>
    </div>
</body>
</html> 