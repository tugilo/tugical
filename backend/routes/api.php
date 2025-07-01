<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BookingController;

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
        | 今後追加予定のルート
        |--------------------------------------------------------------------------
        
        // 空き時間・可用性API
        Route::get('availability', [AvailabilityController::class, 'index']);
        Route::post('hold-slots', [HoldTokenController::class, 'create']);
        Route::delete('hold-slots/{token}', [HoldTokenController::class, 'release']);
        
        // 顧客管理API
        Route::apiResource('customers', CustomerController::class);
        
        // リソース管理API
        Route::apiResource('resources', ResourceController::class);
        
        // メニュー管理API
        Route::apiResource('menus', MenuController::class);
        Route::apiResource('menus.options', MenuOptionController::class);
        
        // 通知管理API
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/send', [NotificationController::class, 'send']);
        Route::get('notification-templates', [NotificationTemplateController::class, 'index']);
        
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
