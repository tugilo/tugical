<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Menu;
use App\Models\Resource;
use App\Models\Customer;
use App\Models\Booking;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use App\Services\HoldTokenService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * LIFF API Controller
 * 
 * 顧客向けLINE予約システムのAPI
 * マルチテナント対応・LINE認証統合
 */
class LiffController extends Controller
{
    protected $availabilityService;
    protected $bookingService;
    protected $holdTokenService;

    public function __construct(
        AvailabilityService $availabilityService,
        BookingService $bookingService,
        HoldTokenService $holdTokenService
    ) {
        $this->availabilityService = $availabilityService;
        $this->bookingService = $bookingService;
        $this->holdTokenService = $holdTokenService;
    }

    /**
     * 店舗情報取得
     * 
     * @param string $storeSlug
     * @return JsonResponse
     */
    public function getStore(string $storeSlug): JsonResponse
    {
        try {
            $store = Store::where('slug', $storeSlug)->first();

            if (!$store) {
                return response()->json([
                    'success' => false,
                    'message' => '店舗が見つかりません'
                ], 404);
            }

            // 営業時間の取得（business_hours JSONカラムから）
            $businessHours = is_string($store->business_hours) 
                ? json_decode($store->business_hours, true) 
                : ($store->business_hours ?? []);

            return response()->json([
                'success' => true,
                'data' => [
                    'store' => [
                        'id' => $store->id,
                        'name' => $store->name,
                        'description' => $store->description,
                        'address' => $store->address,
                        'phone' => $store->phone,
                        'business_hours' => $businessHours,
                        'booking_settings' => [
                            'approval_mode' => $store->approval_mode ?? 'auto',
                            'advance_booking_days' => $store->advance_booking_days ?? 30,
                            'cancellation_hours' => $store->cancellation_hours ?? 24
                        ]
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '店舗情報の取得に失敗しました'
            ], 500);
        }
    }

    /**
     * 顧客プロフィール取得・作成
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getCustomerProfile(Request $request): JsonResponse
    {
        try {
            $lineUserId = $request->header('X-Line-User-Id');
            $storeId = $request->header('X-Store-Id');

            if (!$lineUserId || !$storeId) {
                return response()->json([
                    'success' => false,
                    'message' => 'LINE認証情報が不足しています'
                ], 400);
            }

            // 既存顧客を検索
            $customer = Customer::where('line_user_id', $lineUserId)
                ->where('store_id', $storeId)
                ->first();

            if (!$customer) {
                // 新規顧客として作成
                $customer = Customer::create([
                    'store_id' => $storeId,
                    'line_user_id' => $lineUserId,
                    'name' => 'LINEユーザー',
                    'loyalty_rank' => 'new',
                    'is_active' => true
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'customer' => [
                        'id' => $customer->id,
                        'name' => $customer->name,
                        'phone' => $customer->phone,
                        'email' => $customer->email,
                        'loyalty_rank' => $customer->loyalty_rank,
                        'total_bookings' => $customer->total_bookings,
                        'total_spent' => $customer->total_spent,
                        'no_show_count' => $customer->no_show_count,
                        'is_restricted' => $customer->is_restricted,
                        'first_visit_at' => $customer->first_visit_at,
                        'last_visit_at' => $customer->last_visit_at,
                        'allergies' => $customer->allergies,
                        'preferences' => $customer->preferences
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '顧客情報の取得に失敗しました'
            ], 500);
        }
    }

    /**
     * メニュー一覧取得
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getMenus(Request $request): JsonResponse
    {
        try {
            $storeId = $request->header('X-Store-Id');

            if (!$storeId) {
                return response()->json([
                    'success' => false,
                    'message' => '店舗IDが指定されていません'
                ], 400);
            }

            $menus = Menu::where('store_id', $storeId)
                ->where('is_active', true)
                ->with(['options'])
                ->orderBy('sort_order', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'menus' => $menus->map(function ($menu) {
                        return [
                            'id' => $menu->id,
                            'category' => $menu->category,
                            'name' => $menu->name,
                            'display_name' => $menu->display_name,
                            'description' => $menu->description,
                            'base_duration' => $menu->base_duration,
                            'prep_duration' => $menu->prep_duration,
                            'cleanup_duration' => $menu->cleanup_duration,
                            'base_price' => $menu->base_price,
                            'tax_included' => $menu->tax_included,
                            'available_resources' => $menu->available_resources,
                            'options' => $menu->options->map(function ($option) {
                                return [
                                    'id' => $option->id,
                                    'name' => $option->name,
                                    'price' => $option->unit_price,
                                    'duration' => $option->duration
                                ];
                            })
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'メニュー情報の取得に失敗しました'
            ], 500);
        }
    }

    /**
     * 空き時間取得
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getAvailability(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'menu_id' => 'required|integer|exists:menus,id',
                'date' => 'required|date|after_or_equal:today',
                'resource_id' => 'nullable|integer|exists:resources,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'パラメータが正しくありません',
                    'errors' => $validator->errors()
                ], 422);
            }

            $storeId = $request->header('X-Store-Id');
            $menuId = $request->input('menu_id');
            $date = $request->input('date');
            $resourceId = $request->input('resource_id');

            // メニュー情報取得
            $menu = Menu::where('id', $menuId)
                ->where('store_id', $storeId)
                ->first();

            if (!$menu) {
                return response()->json([
                    'success' => false,
                    'message' => 'メニューが見つかりません'
                ], 404);
            }

            // 空き時間取得
            $availableSlots = $this->availabilityService->getAvailableSlots(
                $storeId,
                $date,
                $menu->base_duration,
                $resourceId
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'available_slots' => $availableSlots,
                    'menu' => [
                        'id' => $menu->id,
                        'name' => $menu->name,
                        'display_name' => $menu->display_name,
                        'duration' => $menu->base_duration
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '空き時間の取得に失敗しました'
            ], 500);
        }
    }

    /**
     * 予約作成
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function createBooking(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'menu_id' => 'required|integer|exists:menus,id',
                'resource_id' => 'nullable|integer|exists:resources,id',
                'booking_date' => 'required|date|after_or_equal:today',
                'start_time' => 'required|date_format:H:i',
                'customer_info' => 'required|array',
                'customer_info.name' => 'required|string|max:255',
                'customer_info.phone' => 'required|string|max:20',
                'customer_info.notes' => 'nullable|string',
                'hold_token' => 'required|string',
                'preferred_times' => 'nullable|array'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'パラメータが正しくありません',
                    'errors' => $validator->errors()
                ], 422);
            }

            $lineUserId = $request->header('X-Line-User-Id');
            $storeId = $request->header('X-Store-Id');
            $holdToken = $request->input('hold_token');

            // 仮押さえトークンの検証
            if (!$this->holdTokenService->validateToken($holdToken, $storeId)) {
                return response()->json([
                    'success' => false,
                    'message' => '仮押さえが期限切れまたは無効です'
                ], 400);
            }

            DB::beginTransaction();

            try {
                // 顧客情報の取得・更新
                $customer = Customer::where('line_user_id', $lineUserId)
                    ->where('store_id', $storeId)
                    ->first();

                if (!$customer) {
                    $customer = Customer::create([
                        'store_id' => $storeId,
                        'line_user_id' => $lineUserId,
                        'name' => $request->input('customer_info.name'),
                        'phone' => $request->input('customer_info.phone'),
                        'notes' => $request->input('customer_info.notes'),
                        'loyalty_rank' => 'new',
                        'is_active' => true
                    ]);
                } else {
                    // 既存顧客の情報を更新
                    $customer->update([
                        'name' => $request->input('customer_info.name'),
                        'phone' => $request->input('customer_info.phone'),
                        'notes' => $request->input('customer_info.notes')
                    ]);
                }

                // 予約作成
                $booking = $this->bookingService->createBooking([
                    'store_id' => $storeId,
                    'customer_id' => $customer->id,
                    'menu_id' => $request->input('menu_id'),
                    'resource_id' => $request->input('resource_id'),
                    'booking_date' => $request->input('booking_date'),
                    'start_time' => $request->input('start_time'),
                    'notes' => $request->input('customer_info.notes'),
                    'booking_type' => 'liff',
                    'status' => 'confirmed'
                ]);

                // 仮押さえトークンを削除
                $this->holdTokenService->releaseToken($holdToken);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'data' => [
                        'booking' => [
                            'id' => $booking->id,
                            'booking_number' => $booking->booking_number,
                            'status' => $booking->status,
                            'booking_date' => $booking->booking_date,
                            'start_time' => $booking->start_time,
                            'end_time' => $booking->end_time,
                            'total_price' => $booking->total_price
                        ]
                    ],
                    'message' => '予約が完了しました'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '予約の作成に失敗しました'
            ], 500);
        }
    }

    /**
     * 予約履歴取得
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getBookingHistory(Request $request): JsonResponse
    {
        try {
            $lineUserId = $request->header('X-Line-User-Id');
            $storeId = $request->header('X-Store-Id');

            if (!$lineUserId || !$storeId) {
                return response()->json([
                    'success' => false,
                    'message' => '認証情報が不足しています'
                ], 400);
            }

            $customer = Customer::where('line_user_id', $lineUserId)
                ->where('store_id', $storeId)
                ->first();

            if (!$customer) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'bookings' => []
                    ]
                ]);
            }

            $bookings = Booking::where('customer_id', $customer->id)
                ->where('store_id', $storeId)
                ->with(['menu', 'resource'])
                ->orderBy('booking_date', 'desc')
                ->orderBy('start_time', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'bookings' => $bookings->map(function ($booking) {
                        return [
                            'id' => $booking->id,
                            'booking_number' => $booking->booking_number,
                            'status' => $booking->status,
                            'booking_date' => $booking->booking_date,
                            'start_time' => $booking->start_time,
                            'end_time' => $booking->end_time,
                            'total_price' => $booking->total_price,
                            'menu' => [
                                'id' => $booking->menu->id,
                                'name' => $booking->menu->name,
                                'display_name' => $booking->menu->display_name
                            ],
                            'resource' => $booking->resource ? [
                                'id' => $booking->resource->id,
                                'name' => $booking->resource->name,
                                'display_name' => $booking->resource->display_name
                            ] : null,
                            'created_at' => $booking->created_at
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '予約履歴の取得に失敗しました'
            ], 500);
        }
    }

    /**
     * 仮押さえトークン作成
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function createHoldToken(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'timeSlot' => 'required|string',
                'resourceId' => 'required|integer|exists:resources,id',
                'menuId' => 'required|integer|exists:menus,id',
                'date' => 'required|date|after_or_equal:today'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'パラメータが正しくありません',
                    'errors' => $validator->errors()
                ], 422);
            }

            $storeId = $request->header('X-Store-Id');
            $lineUserId = $request->header('X-Line-User-Id');

            // 顧客情報取得
            $customer = Customer::where('line_user_id', $lineUserId)
                ->where('store_id', $storeId)
                ->first();

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => '顧客情報が見つかりません'
                ], 404);
            }

            // 仮押さえトークン作成
            $holdToken = $this->holdTokenService->createHoldToken($storeId, [
                'resource_id' => $request->input('resourceId'),
                'booking_date' => $request->input('date'),
                'start_time' => $request->input('timeSlot'),
                'menu_id' => $request->input('menuId'),
                'customer_id' => $customer->id
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'hold_token' => $holdToken,
                    'expires_at' => now()->addMinutes(10)->toISOString()
                ],
                'message' => '仮押さえを作成しました'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '仮押さえの作成に失敗しました'
            ], 500);
        }
    }

    /**
     * 仮押さえトークン延長
     * 
     * @param Request $request
     * @param string $token
     * @return JsonResponse
     */
    public function extendHoldToken(Request $request, string $token): JsonResponse
    {
        try {
            $storeId = $request->header('X-Store-Id');

            // 仮押さえトークン延長
            $extended = $this->holdTokenService->extendHoldToken($token, 10);

            if (!$extended) {
                return response()->json([
                    'success' => false,
                    'message' => '仮押さえが期限切れまたは無効です'
                ], 410);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'expires_at' => now()->addMinutes(10)->toISOString()
                ],
                'message' => '仮押さえを延長しました'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '仮押さえの延長に失敗しました'
            ], 500);
        }
    }

    /**
     * 仮押さえトークン解除
     * 
     * @param Request $request
     * @param string $token
     * @return JsonResponse
     */
    public function releaseHoldToken(Request $request, string $token): JsonResponse
    {
        try {
            // 仮押さえトークン解除
            $this->holdTokenService->releaseHoldToken($token);

            return response()->json([
                'success' => true,
                'message' => '仮押さえを解除しました'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => '仮押さえの解除に失敗しました'
            ], 500);
        }
    }
} 