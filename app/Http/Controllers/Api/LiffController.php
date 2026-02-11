<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Menu;
use App\Models\Resource;
use App\Models\Store;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\HoldTokenService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * LiffController
 *
 * LIFF（LINE Front-end Framework）予約フロー用API
 * 認証はLIFF前提（Sanctum不要）。store_id はクエリ/bodyで受け取りマルチテナント分離。
 *
 * フェーズ1: 単一メニュー予約のみ（booking_details は使用しない）
 *
 * @package App\Http\Controllers\Api
 */
class LiffController extends Controller
{
    public function __construct(
        protected AvailabilityService $availabilityService,
        protected HoldTokenService $holdTokenService,
        protected BookingService $bookingService
    ) {
    }

    /**
     * 店舗のメニュー一覧取得（LIFF用・認証不要）
     *
     * GET /api/v1/liff/stores/{storeId}/menus
     */
    public function getMenus(int $storeId): JsonResponse
    {
        $this->validateStore($storeId);

        $menus = Menu::where('store_id', $storeId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Menu $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'display_name' => $m->display_name ?? $m->name,
                'description' => $m->description,
                'base_price' => $m->base_price,
                'base_duration' => $m->prep_duration + $m->base_duration + $m->cleanup_duration,
                'tax_included' => (bool) ($m->tax_included ?? true),
                'category' => $m->category ?? 'default',
                'photo_url' => $m->image_url ?? null,
            ]);

        return response()->json([
            'success' => true,
            'data' => ['menus' => $menus],
            'meta' => ['timestamp' => now()->toISOString()],
        ]);
    }

    /**
     * 空き時間枠取得（LIFF用・認証不要）
     *
     * GET /api/v1/liff/availability?store_id=1&menu_id=1&date=2025-02-15
     */
    public function getAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
            'menu_id' => 'required|integer|exists:menus,id',
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
        ], [
            'store_id.required' => '店舗IDは必須です',
            'menu_id.required' => 'メニューIDは必須です',
            'date.required' => '日付は必須です',
            'date.after_or_equal' => '今日以降の日付を指定してください',
        ]);

        $storeId = (int) $validated['store_id'];
        $this->validateStore($storeId);
        $this->validateMenuBelongsToStore($storeId, (int) $validated['menu_id']);

        $slots = $this->availabilityService->getAvailableSlots(
            $storeId,
            $validated['date'],
            (int) $validated['menu_id'],
            null
        );

        // 1スロット × 利用可能リソースでフラット化（resource_id, resource_name 付き）
        $resourceIds = collect($slots)->pluck('available_resources')->flatten()->unique()->values()->all();
        $resources = Resource::where('store_id', $storeId)->whereIn('id', $resourceIds)->get()->keyBy('id');

        $availableSlots = [];
        foreach ($slots as $slot) {
            foreach ($slot['available_resources'] ?? [] as $rid) {
                $resource = $resources->get($rid);
                $availableSlots[] = [
                    'start_time' => $slot['start_time'],
                    'end_time' => $slot['end_time'],
                    'duration' => $slot['menu_duration'] ?? 60,
                    'resource_id' => $rid,
                    'resource_name' => $resource ? ($resource->display_name ?? $resource->name) : '',
                    'is_available' => true,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => ['available_slots' => $availableSlots],
            'meta' => ['timestamp' => now()->toISOString()],
        ]);
    }

    /**
     * 顧客の取得または作成（LINE userId ベース）
     *
     * POST /api/v1/liff/customers/get-or-create
     * body: store_id, line_user_id, display_name (optional)
     */
    public function getOrCreateCustomer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
            'line_user_id' => 'required|string|max:255',
            'display_name' => 'nullable|string|max:255',
        ], [
            'store_id.required' => '店舗IDは必須です',
            'line_user_id.required' => 'LINEユーザーIDは必須です',
        ]);

        $storeId = (int) $validated['store_id'];
        $this->validateStore($storeId);

        $customer = Customer::where('store_id', $storeId)
            ->where('line_user_id', $validated['line_user_id'])
            ->first();

        if (!$customer) {
            $customer = Customer::create([
                'store_id' => $storeId,
                'line_user_id' => $validated['line_user_id'],
                'name' => $validated['display_name'] ?? 'LINEのお客様',
                'is_active' => true,
            ]);
            Log::info('LIFF顧客を新規作成', ['store_id' => $storeId, 'customer_id' => $customer->id]);
        } else {
            if (!empty($validated['display_name']) && $customer->name !== $validated['display_name']) {
                $customer->update(['name' => $validated['display_name']]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'line_user_id' => $customer->line_user_id,
                ],
            ],
            'meta' => ['timestamp' => now()->toISOString()],
        ]);
    }

    /**
     * 仮押さえ（10分）作成（LIFF用・認証不要）
     *
     * POST /api/v1/liff/hold-slots
     * body: store_id, menu_id, resource_id, booking_date, start_time, customer_id (optional)
     */
    public function createHoldSlot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
            'menu_id' => 'required|integer|exists:menus,id',
            'resource_id' => 'required|integer|exists:resources,id',
            'booking_date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'customer_id' => 'nullable|integer|exists:customers,id',
        ], [
            'store_id.required' => '店舗IDは必須です',
            'menu_id.required' => 'メニューIDは必須です',
            'resource_id.required' => 'リソースIDは必須です',
            'booking_date.required' => '予約日は必須です',
            'start_time.required' => '開始時間は必須です',
        ]);

        $storeId = (int) $validated['store_id'];
        $this->validateStore($storeId);
        $this->validateMenuBelongsToStore($storeId, (int) $validated['menu_id']);
        $this->validateResourceBelongsToStore($storeId, (int) $validated['resource_id']);
        if (!empty($validated['customer_id'])) {
            $this->validateCustomerBelongsToStore($storeId, (int) $validated['customer_id']);
        }

        $menu = Menu::where('store_id', $storeId)->findOrFail($validated['menu_id']);
        $totalDuration = $menu->prep_duration + $menu->base_duration + $menu->cleanup_duration;
        $endTime = \Carbon\Carbon::createFromFormat('H:i', $validated['start_time'])
            ->addMinutes($totalDuration)
            ->format('H:i');

        $slotData = [
            'resource_id' => $validated['resource_id'],
            'booking_date' => $validated['booking_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $endTime,
            'menu_id' => $validated['menu_id'],
            'customer_id' => $validated['customer_id'] ?? null,
        ];

        try {
            $holdToken = $this->holdTokenService->createHoldToken($storeId, $slotData);
        } catch (\Exception $e) {
            if (strpos($e->getMessage(), '既に仮押さえ') !== false) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'HOLD_TOKEN_CONFLICT',
                        'message' => $e->getMessage(),
                    ],
                    'meta' => ['timestamp' => now()->toISOString()],
                ], 409);
            }
            Log::error('LIFF Hold Token作成エラー', ['store_id' => $storeId, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => ['code' => 'HOLD_TOKEN_CREATION_ERROR', 'message' => '仮押さえに失敗しました'],
                'meta' => ['timestamp' => now()->toISOString()],
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'hold_token' => $holdToken,
                'expires_at' => now()->addMinutes(10)->toISOString(),
                'booking_slot' => [
                    'date' => $validated['booking_date'],
                    'start_time' => $validated['start_time'],
                    'end_time' => $endTime,
                    'resource_id' => $validated['resource_id'],
                    'menu_id' => $validated['menu_id'],
                    'duration_minutes' => $totalDuration,
                ],
            ],
            'message' => '時間枠を10分間仮押さえしました',
            'meta' => ['timestamp' => now()->toISOString()],
        ], 201);
    }

    /**
     * 予約確定（LIFF用・認証不要）
     * 仮押さえトークン必須。単一メニューのみ（booking_details は使わない）
     *
     * POST /api/v1/liff/bookings
     * body: store_id, hold_token, customer_id, customer_notes (optional)
     */
    public function createBooking(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => 'required|integer|exists:stores,id',
            'hold_token' => 'required|string|min:32|max:60',
            'customer_id' => 'required|integer|exists:customers,id',
            'customer_notes' => 'nullable|string|max:1000',
        ], [
            'store_id.required' => '店舗IDは必須です',
            'hold_token.required' => '仮押さえトークンは必須です',
            'customer_id.required' => '顧客IDは必須です',
        ]);

        $storeId = (int) $validated['store_id'];
        $this->validateStore($storeId);
        $this->validateCustomerBelongsToStore($storeId, (int) $validated['customer_id']);

        $holdData = $this->holdTokenService->getHoldTokenData($validated['hold_token']);
        if (!$holdData) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'HOLD_TOKEN_NOT_FOUND',
                    'message' => '仮押さえの有効期限が切れています。再度時間を選んでください。',
                ],
                'meta' => ['timestamp' => now()->toISOString()],
            ], 410);
        }
        if ($holdData['store_id'] !== $storeId) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'UNAUTHORIZED_ACCESS', 'message' => '店舗が一致しません'],
                'meta' => ['timestamp' => now()->toISOString()],
            ], 403);
        }

        $bookingData = [
            'hold_token' => $validated['hold_token'],
            'customer_id' => (int) $validated['customer_id'],
            'menu_id' => $holdData['menu_id'],
            'resource_id' => $holdData['resource_id'],
            'booking_date' => $holdData['booking_date'],
            'start_time' => $holdData['start_time'],
            'end_time' => $holdData['end_time'],
            'customer_notes' => $validated['customer_notes'] ?? null,
            'auto_approval' => true,
            'booking_source' => 'liff',
        ];

        try {
            $booking = $this->bookingService->createBooking($storeId, $bookingData);
        } catch (\App\Exceptions\HoldTokenExpiredException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'HOLD_TOKEN_EXPIRED', 'message' => '仮押さえの有効期限が切れています。'],
                'meta' => ['timestamp' => now()->toISOString()],
            ], 410);
        } catch (\Exception $e) {
            Log::error('LIFF予約作成エラー', ['store_id' => $storeId, 'error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_CREATION_ERROR',
                    'message' => '予約の確定に失敗しました。しばらくしてからやり直してください。',
                ],
                'meta' => ['timestamp' => now()->toISOString()],
            ], 500);
        }

        $booking->load(['customer', 'menu', 'resource']);

        return response()->json([
            'success' => true,
            'data' => [
                'booking' => [
                    'id' => $booking->id,
                    'booking_number' => $booking->booking_number,
                    'booking_date' => $booking->booking_date?->format('Y-m-d'),
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'menu_name' => $booking->menu?->name ?? $booking->menu?->display_name,
                    'resource_name' => $booking->resource?->name ?? $booking->resource?->display_name,
                    'total_price' => $booking->total_price,
                    'status' => $booking->status,
                ],
            ],
            'message' => '予約が完了しました',
            'meta' => ['timestamp' => now()->toISOString()],
        ], 201);
    }

    /** 店舗が存在しアクティブであることを確認 */
    private function validateStore(int $storeId): void
    {
        $store = Store::find($storeId);
        if (!$store || $store->status !== 'active') {
            throw ValidationException::withMessages(['store_id' => '指定された店舗は利用できません']);
        }
    }

    private function validateMenuBelongsToStore(int $storeId, int $menuId): void
    {
        if (!Menu::where('store_id', $storeId)->where('id', $menuId)->where('is_active', true)->exists()) {
            throw ValidationException::withMessages(['menu_id' => '指定されたメニューは利用できません']);
        }
    }

    private function validateResourceBelongsToStore(int $storeId, int $resourceId): void
    {
        if (!Resource::where('store_id', $storeId)->where('id', $resourceId)->where('is_active', true)->exists()) {
            throw ValidationException::withMessages(['resource_id' => '指定された担当は利用できません']);
        }
    }

    private function validateCustomerBelongsToStore(int $storeId, int $customerId): void
    {
        if (!Customer::where('store_id', $storeId)->where('id', $customerId)->exists()) {
            throw ValidationException::withMessages(['customer_id' => '指定された顧客は利用できません']);
        }
    }
}
