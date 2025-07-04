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
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\ResourceController;
use Illuminate\Support\Facades\Http;

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
    Route::get('bookings', [BookingController::class, 'index']);
    Route::post('bookings', [BookingController::class, 'store']);
    Route::get('bookings/{booking}', [BookingController::class, 'show']);
    Route::put('bookings/{booking}', [BookingController::class, 'update']);
    Route::delete('bookings/{booking}', [BookingController::class, 'destroy']);
    Route::patch('bookings/{booking}/status', [BookingController::class, 'updateStatus']);
    Route::patch('bookings/{booking}/move', [BookingController::class, 'move']);

    // 空き時間・可用性API（tugical_api_specification_v1.0.md Section 3）
    Route::get('availability', [AvailabilityController::class, 'index']);
    Route::post('hold-slots', [HoldTokenController::class, 'create']);
    Route::delete('hold-slots/{token}', [HoldTokenController::class, 'release']);

    // 通知管理API（tugical_api_specification_v1.0.md Section 7）
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications', [NotificationController::class, 'store']);
    Route::get('notification-templates', [NotificationTemplateController::class, 'index']);
    Route::post('notification-templates', [NotificationTemplateController::class, 'store']);

    // 顧客管理API
    Route::apiResource('customers', CustomerController::class);

    // メニュー管理API
    Route::apiResource('menus', MenuController::class);
    Route::get('menus/{menu}/options', [MenuController::class, 'getOptions'])->name('menus.options');
    Route::get('menus-categories', [MenuController::class, 'categories'])->name('menus.categories');
    Route::patch('menus-order', [MenuController::class, 'updateOrder'])->name('menus.update-order');

    // リソース管理API（tugical_api_specification_v1.0.md Section 5）
    Route::apiResource('resources', ResourceController::class);
    Route::get('resources-types', [ResourceController::class, 'getTypes'])->name('resources.types');
    Route::patch('resources-order', [ResourceController::class, 'updateOrder'])->name('resources.update-order');
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

// 郵便番号検索（認証不要）
Route::get('v1/postal-search', function (Request $request) {
    $zipcode = $request->query('zipcode');

    if (!$zipcode || !preg_match('/^\d{7}$/', $zipcode)) {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'INVALID_ZIPCODE',
                'message' => '郵便番号は7桁の数字で入力してください'
            ]
        ], 400);
    }

    try {
        $response = Http::get("https://zipcloud.ibsnet.co.jp/api/search", [
            'zipcode' => $zipcode
        ]);

        if (!$response->successful()) {
            throw new \Exception('郵便番号検索APIでエラーが発生しました');
        }

        $data = $response->json();

        if ($data['status'] !== 200 || empty($data['results'])) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => '該当する住所が見つかりませんでした'
            ]);
        }

        $result = $data['results'][0];

        return response()->json([
            'success' => true,
            'data' => [
                'prefecture' => $result['address1'],
                'city' => $result['address2'],
                'town' => $result['address3']
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'POSTAL_SEARCH_ERROR',
                'message' => '郵便番号検索に失敗しました'
            ]
        ], 500);
    }
});

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
