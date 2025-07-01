<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\HoldTokenController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationTemplateController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

/*
|--------------------------------------------------------------------------
| tugical API v1 Routes
|--------------------------------------------------------------------------
|
| tugical_api_specification_v1.0.md 準拠のAPIルート定義
| - Version prefix: /api/v1/
| - Sanctum認証必須
| - マルチテナント対応
|
*/

// ヘルスチェック（認証不要）
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'environment' => app()->environment(),
        'version' => '1.0'
    ]);
});

// API v1 グループ
Route::prefix('v1')->group(function () {
    
    // 認証が必要なルート
    Route::middleware(['auth:sanctum'])->group(function () {
        
        /*
        |--------------------------------------------------------------------------
        | 予約管理API
        |--------------------------------------------------------------------------
        */
        
        // 予約CRUD操作
        Route::apiResource('bookings', BookingController::class);
        
        // 予約ステータス変更
        Route::patch('bookings/{booking}/status', [BookingController::class, 'updateStatus'])
            ->name('bookings.update-status');
        
        /*
        |--------------------------------------------------------------------------
        | 空き時間・可用性API
        |--------------------------------------------------------------------------
        */
        
        // 空き時間枠検索
        Route::get('availability', [AvailabilityController::class, 'index'])
            ->name('availability.index');
        
        // 月間可用性カレンダー
        Route::get('availability/calendar', [AvailabilityController::class, 'calendar'])
            ->name('availability.calendar');
        
        // リソース可用性チェック
        Route::get('availability/resource-check', [AvailabilityController::class, 'resourceCheck'])
            ->name('availability.resource-check');
        
        /*
        |--------------------------------------------------------------------------
        | Hold Token（仮押さえ）API
        |--------------------------------------------------------------------------
        */
        
        // Hold Token作成（仮押さえ）
        Route::post('hold-slots', [HoldTokenController::class, 'store'])
            ->name('hold-slots.store');
        
        // Hold Token詳細取得
        Route::get('hold-slots/{holdToken}', [HoldTokenController::class, 'show'])
            ->name('hold-slots.show');
        
        // Hold Token解放
        Route::delete('hold-slots/{holdToken}', [HoldTokenController::class, 'destroy'])
            ->name('hold-slots.destroy');
        
        // Hold Token延長
        Route::patch('hold-slots/{holdToken}/extend', [HoldTokenController::class, 'extend'])
            ->name('hold-slots.extend');
        
        // 店舗Hold Token一覧
        Route::get('hold-slots', [HoldTokenController::class, 'index'])
            ->name('hold-slots.index');
        
        /*
        |--------------------------------------------------------------------------
        | 通知管理API
        |--------------------------------------------------------------------------
        */
        
        // 通知履歴一覧取得
        Route::get('notifications', [NotificationController::class, 'index'])
            ->name('notifications.index');
        
        // 通知詳細取得
        Route::get('notifications/{notification}', [NotificationController::class, 'show'])
            ->name('notifications.show');
        
        // 手動通知送信
        Route::post('notifications/send', [NotificationController::class, 'send'])
            ->name('notifications.send');
        
        // 一括通知送信
        Route::post('notifications/bulk', [NotificationController::class, 'bulk'])
            ->name('notifications.bulk');
        
        // 通知再送
        Route::post('notifications/{notification}/retry', [NotificationController::class, 'retry'])
            ->name('notifications.retry');
        
        // 通知統計情報取得
        Route::get('notifications/stats', [NotificationController::class, 'stats'])
            ->name('notifications.stats');
        
        /*
        |--------------------------------------------------------------------------
        | 通知テンプレート管理API
        |--------------------------------------------------------------------------
        */
        
        // 通知テンプレートCRUD操作
        Route::apiResource('notification-templates', NotificationTemplateController::class, [
            'names' => [
                'index' => 'notification-templates.index',
                'store' => 'notification-templates.store',
                'show' => 'notification-templates.show',
                'update' => 'notification-templates.update',
                'destroy' => 'notification-templates.destroy',
            ]
        ]);
        
        // テンプレートプレビュー生成
        Route::post('notification-templates/{notificationTemplate}/preview', [NotificationTemplateController::class, 'preview'])
            ->name('notification-templates.preview');
        
        // デフォルトテンプレート取得
        Route::get('notification-templates/defaults', [NotificationTemplateController::class, 'defaults'])
            ->name('notification-templates.defaults');
        
        /*
        |--------------------------------------------------------------------------
        | 今後追加予定のルート
        |--------------------------------------------------------------------------
        
        // 顧客管理API
        Route::apiResource('customers', CustomerController::class);
        
        // リソース管理API
        Route::apiResource('resources', ResourceController::class);
        
        // メニュー管理API
        Route::apiResource('menus', MenuController::class);
        Route::apiResource('menus.options', MenuOptionController::class);
        
        */
    });
    
    /*
    |--------------------------------------------------------------------------
    | LIFF API（顧客向け）
    |--------------------------------------------------------------------------
    | 
    | LINE LIFF環境からアクセスするAPI
    | X-Line-User-Id ヘッダーによる認証
    | 
    */
    Route::prefix('liff')->middleware(['line.verify'])->group(function () {
        // 店舗情報取得
        // Route::get('stores/{slug}', [LiffController::class, 'getStore']);
        
        // メニュー一覧取得
        // Route::get('stores/{slug}/menus', [LiffController::class, 'getMenus']);
        
        // 空き時間取得
        // Route::get('stores/{slug}/availability', [LiffController::class, 'getAvailability']);
        
        // 予約申込み
        // Route::post('stores/{slug}/bookings', [LiffController::class, 'createBooking']);
        
        // 顧客情報取得・作成
        // Route::get('customers/profile', [LiffController::class, 'getCustomerProfile']);
        
        // 予約履歴取得
        // Route::get('customers/bookings', [LiffController::class, 'getCustomerBookings']);
    });
    
    /*
    |--------------------------------------------------------------------------
    | LINE Webhook
    |--------------------------------------------------------------------------
    */
    // Route::post('line/webhook', [LineWebhookController::class, 'handle'])
    //     ->middleware(['line.signature.verify']);
});
