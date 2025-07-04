<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\HoldTokenController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationTemplateController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;

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

// ===========================
// 認証API（tugical_api_specification_v1.0.md Section 1）
// ===========================
Route::prefix('v1/auth')->name('auth.')->group(function () {
    // 管理者ログイン（認証不要）
    Route::post('login', [AuthController::class, 'login'])->name('login');
    
    // 認証必須ルート
    Route::middleware('auth:sanctum')->group(function () {
        // ログアウト
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        
        // ユーザー情報取得
        Route::get('user', [AuthController::class, 'user'])->name('user');
    });
});

// ===========================
// 管理者API（認証必須・マルチテナント対応）
// ===========================
Route::prefix('v1')->middleware(['auth:sanctum'])->name('api.v1.')->group(function () {
    
    // 予約管理API（tugical_api_specification_v1.0.md Section 2）
    Route::apiResource('bookings', BookingController::class);
    Route::patch('bookings/{booking}/status', [BookingController::class, 'updateStatus'])->name('bookings.update-status');

    // 空き時間・可用性API（tugical_api_specification_v1.0.md Section 3）
    Route::get('availability', [AvailabilityController::class, 'index'])->name('availability.index');
    Route::get('availability/calendar', [AvailabilityController::class, 'calendar'])->name('availability.calendar');
    Route::post('availability/resource-check', [AvailabilityController::class, 'resourceCheck'])->name('availability.resource-check');

    // Hold Token（仮押さえ）管理API
    Route::prefix('hold-slots')->name('hold-slots.')->group(function () {
        Route::post('/', [HoldTokenController::class, 'store'])->name('store');
        Route::get('/', [HoldTokenController::class, 'index'])->name('index');
        Route::get('{token}', [HoldTokenController::class, 'show'])->name('show');
        Route::delete('{token}', [HoldTokenController::class, 'destroy'])->name('destroy');
        Route::patch('{token}/extend', [HoldTokenController::class, 'extend'])->name('extend');
    });

    // 通知管理API（tugical_api_specification_v1.0.md Section 7）
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('stats', [NotificationController::class, 'stats'])->name('stats');
        Route::post('send', [NotificationController::class, 'send'])->name('send');
        Route::post('bulk', [NotificationController::class, 'bulk'])->name('bulk');
        Route::get('{notification}', [NotificationController::class, 'show'])->name('show');
        Route::post('{notification}/retry', [NotificationController::class, 'retry'])->name('retry');
    });

    // 通知テンプレート管理API
    Route::prefix('notification-templates')->name('notification-templates.')->group(function () {
        Route::get('/', [NotificationTemplateController::class, 'index'])->name('index');
        Route::get('defaults', [NotificationTemplateController::class, 'defaults'])->name('defaults');
        Route::post('/', [NotificationTemplateController::class, 'store'])->name('store');
        Route::get('{notificationTemplate}', [NotificationTemplateController::class, 'show'])->name('show');
        Route::put('{notificationTemplate}', [NotificationTemplateController::class, 'update'])->name('update');
        Route::delete('{notificationTemplate}', [NotificationTemplateController::class, 'destroy'])->name('destroy');
        Route::post('{notificationTemplate}/preview', [NotificationTemplateController::class, 'preview'])->name('preview');
    });

    // 顧客管理API
    Route::apiResource('customers', CustomerController::class);
});

// ===========================
// LIFF API（LINE認証・顧客向け）
// ===========================
Route::prefix('v1/liff')->name('liff.')->group(function () {
    // TODO: Phase 4.3 LIFF実装時に追加
    // Route::get('stores/{slug}', [LiffController::class, 'getStore'])->name('store');
    // Route::get('stores/{slug}/menus', [LiffController::class, 'getMenus'])->name('menus');
    // Route::get('stores/{slug}/resources', [LiffController::class, 'getResources'])->name('resources');
    // Route::get('stores/{slug}/availability', [LiffController::class, 'getAvailability'])->name('availability');
    // Route::post('stores/{slug}/hold-slots', [LiffController::class, 'createHoldSlot'])->name('hold-slots');
    // Route::post('stores/{slug}/bookings', [LiffController::class, 'createBooking'])->name('bookings');
    // Route::get('customers/profile', [LiffController::class, 'getCustomerProfile'])->name('customer.profile');
    // Route::get('customers/bookings', [LiffController::class, 'getCustomerBookings'])->name('customer.bookings');
});

// ===========================
// LINE Webhook（LINE Platform認証）
// ===========================
Route::prefix('v1/line')->name('line.')->group(function () {
    // TODO: Phase 4.4 LINE連携実装時に追加
    // Route::post('webhook', [LineWebhookController::class, 'handle'])->name('webhook');
});

// ===========================
// ヘルスチェック・システム情報
// ===========================
Route::get('health', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => 'tugical API',
        'version' => '1.0',
        'timestamp' => now()->toISOString(),
        'environment' => app()->environment(),
        'database' => [
            'status' => 'connected',
            'driver' => config('database.default'),
        ],
        'cache' => [
            'status' => 'operational',
            'driver' => config('cache.default'),
        ],
    ]);
})->name('health');

// ===========================
// 未対応ルート（404対応）
// ===========================
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'error' => [
            'code' => 'ENDPOINT_NOT_FOUND',
            'message' => '指定されたAPIエンドポイントが見つかりません',
            'details' => [
                'available_versions' => ['v1'],
                'documentation' => 'https://docs.tugical.com/api',
            ],
        ],
        'meta' => [
            'timestamp' => now()->toISOString(),
        ]
    ], 404);
});
