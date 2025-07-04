<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateBookingRequest;
use App\Http\Requests\UpdateBookingRequest;
use App\Http\Resources\BookingResource;
use App\Services\BookingService;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * BookingController
 * 
 * tugical予約管理API Controller
 * 
 * 管理者向け予約CRUD操作を提供
 * - 予約作成・一覧・詳細・更新・削除
 * - ステータス変更（確定・キャンセル・完了）
 * - マルチテナント対応（store_id自動分離）
 * - BookingService統合でビジネスロジック分離
 * 
 * @package App\Http\Controllers\Api
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class BookingController extends Controller
{
    /**
     * BookingService
     * 予約ビジネスロジック処理
     */
    protected BookingService $bookingService;

    /**
     * コンストラクタ
     * 
     * @param BookingService $bookingService
     */
    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;

        // Sanctum認証必須
        $this->middleware('auth:sanctum');

        // マルチテナント分離はモデルのTenantScopeで自動処理
        // （TenantScopeMiddleware は未実装のため一時的にコメントアウト）
        // $this->middleware('tenant.scope');
    }

    /**
     * 予約一覧取得
     * 
     * GET /api/v1/bookings
     * 
     * フィルタリング・ページング・ソート対応
     * クエリパラメータ:
     * - date: 予約日フィルタ（Y-m-d）
     * - status: ステータスフィルタ（confirmed, pending, cancelled, completed）
     * - resource_id: リソースIDフィルタ
     * - customer_id: 顧客IDフィルタ
     * - page: ページ番号
     * - per_page: 1ページあたりの件数（デフォルト20、最大100）
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;

            Log::info('予約一覧取得開始', [
                'store_id' => $storeId,
                'filters' => $request->query()
            ]);

            // フィルター条件構築
            $filters = [];

            if ($request->has('date')) {
                $filters['date'] = $request->get('date');
            }

            if ($request->has('status')) {
                $filters['status'] = $request->get('status');
            }

            if ($request->has('resource_id')) {
                $filters['resource_id'] = $request->get('resource_id');
            }

            if ($request->has('customer_id')) {
                $filters['customer_id'] = $request->get('customer_id');
            }

            // ページング設定
            $perPage = min(max(1, intval($request->get('per_page', 20))), 100);
            $filters['per_page'] = $perPage;

            if ($request->has('page')) {
                $filters['page'] = max(1, intval($request->get('page')));
            }

            // BookingServiceから予約一覧取得
            $bookings = $this->bookingService->getBookings($storeId, $filters);

            return response()->json([
                'success' => true,
                'data' => [
                    'bookings' => BookingResource::collection($bookings->items()),
                    'pagination' => [
                        'current_page' => $bookings->currentPage(),
                        'per_page' => $bookings->perPage(),
                        'total' => $bookings->total(),
                        'last_page' => $bookings->lastPage(),
                        'from' => $bookings->firstItem(),
                        'to' => $bookings->lastItem()
                    ]
                ],
                'message' => '予約一覧を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('予約一覧取得エラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'store_id' => auth()->user()->store_id ?? null
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_LIST_ERROR',
                    'message' => '予約一覧の取得に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 予約作成
     * 
     * POST /api/v1/bookings
     * 
     * 管理者による予約作成
     * - BookingService::createBooking統合
     * - Hold Token対応
     * - 自動通知送信
     * 
     * @param CreateBookingRequest $request バリデーション済みリクエスト
     * @return JsonResponse 予約作成結果
     */
    public function store(CreateBookingRequest $request): JsonResponse
    {
        try {
            // デバッグ: リクエストデータをログに記録
            Log::info('予約作成リクエスト受信', [
                'all_data' => $request->all(),
                'validated_data' => $request->validated(),
                'user_id' => auth()->id(),
                'store_id' => auth()->user()->store_id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $booking = $this->bookingService->createBooking(
                storeId: auth()->user()->store_id,
                bookingData: $request->validated()
            );

            // 成功ログ
            Log::info('予約作成成功', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'customer_id' => $booking->customer_id,
                'menu_id' => $booking->menu_id,
                'store_id' => $booking->store_id,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'booking' => new BookingResource($booking)
                ],
                'message' => '予約が作成されました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ], 201);
        } catch (\App\Exceptions\BookingConflictException $e) {
            Log::warning('予約競合エラー', [
                'error' => $e->getMessage(),
                'store_id' => auth()->user()->store_id,
                'request_data' => $request->validated()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_CONFLICT',
                    'message' => $e->getMessage(),
                    'details' => [
                        'conflicting_time' => $request->get('start_time'),
                        'suggested_action' => '他の時間をお選びください'
                    ]
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 409);
        } catch (\App\Exceptions\HoldTokenExpiredException $e) {
            Log::warning('Hold Token期限切れ', [
                'error' => $e->getMessage(),
                'store_id' => auth()->user()->store_id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'HOLD_TOKEN_EXPIRED',
                    'message' => '仮押さえ期限が切れています。再度お選びください',
                    'details' => [
                        'suggested_action' => '時間選択からやり直してください'
                    ]
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 410);
        } catch (\App\Exceptions\OutsideBusinessHoursException $e) {
            Log::warning('営業時間外予約', [
                'error' => $e->getMessage(),
                'store_id' => auth()->user()->store_id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'OUTSIDE_BUSINESS_HOURS',
                    'message' => $e->getMessage()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 422);
        } catch (\Exception $e) {
            Log::error('予約作成エラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'store_id' => auth()->user()->store_id,
                'request_data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_CREATION_ERROR',
                    'message' => '予約の作成に失敗しました。しばらく時間をおいて再度お試しください'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 予約詳細取得
     * 
     * GET /api/v1/bookings/{booking}
     * 
     * @param Booking $booking
     * @return JsonResponse
     */
    public function show(Booking $booking): JsonResponse
    {
        try {
            // マルチテナント確認（ミドルウェアで処理されるが念のため）
            if ($booking->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'BOOKING_NOT_FOUND',
                        'message' => '予約が見つかりません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 404);
            }

            Log::info('予約詳細取得', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'store_id' => $booking->store_id
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'booking' => new BookingResource($booking->load([
                        'customer',
                        'menu',
                        'resource',
                        'bookingOptions'
                    ]))
                ],
                'message' => '予約詳細を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('予約詳細取得エラー', [
                'booking_id' => $booking->id ?? null,
                'error' => $e->getMessage(),
                'store_id' => auth()->user()->store_id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_DETAIL_ERROR',
                    'message' => '予約詳細の取得に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 予約更新
     * 
     * PUT /api/v1/bookings/{booking}
     * 
     * @param UpdateBookingRequest $request
     * @param Booking $booking
     * @return JsonResponse
     */
    public function update(UpdateBookingRequest $request, Booking $booking): JsonResponse
    {
        try {
            // マルチテナント確認
            if ($booking->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'BOOKING_NOT_FOUND',
                        'message' => '予約が見つかりません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 404);
            }

            $updateData = $request->validated();

            Log::info('予約更新開始', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'update_data' => $updateData,
                'store_id' => $booking->store_id
            ]);

            // BookingServiceで予約更新
            $updatedBooking = $this->bookingService->updateBooking($booking, $updateData);

            return response()->json([
                'success' => true,
                'data' => [
                    'booking' => new BookingResource($updatedBooking)
                ],
                'message' => '予約が更新されました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);
        } catch (\App\Exceptions\BookingConflictException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_CONFLICT',
                    'message' => $e->getMessage()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 409);
        } catch (\Exception $e) {
            Log::error('予約更新エラー', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'store_id' => $booking->store_id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_UPDATE_ERROR',
                    'message' => '予約の更新に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 予約削除（ソフトデリート）
     * 
     * DELETE /api/v1/bookings/{booking}
     * 
     * @param Request $request
     * @param Booking $booking
     * @return JsonResponse
     */
    public function destroy(Request $request, Booking $booking): JsonResponse
    {
        try {
            // マルチテナント確認
            if ($booking->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'BOOKING_NOT_FOUND',
                        'message' => '予約が見つかりません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 404);
            }

            $cancellationReason = $request->get('cancellation_reason');
            $sendNotification = $request->boolean('send_notification', true);

            Log::info('予約キャンセル開始', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'reason' => $cancellationReason,
                'send_notification' => $sendNotification,
                'store_id' => $booking->store_id
            ]);

            // BookingServiceでキャンセル処理
            $cancelled = $this->bookingService->cancelBooking($booking, $cancellationReason);

            if ($cancelled) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'booking_id' => $booking->id,
                        'booking_number' => $booking->booking_number,
                        'status' => 'cancelled'
                    ],
                    'message' => '予約をキャンセルしました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => '1.0'
                    ]
                ]);
            } else {
                throw new \Exception('予約キャンセル処理に失敗しました');
            }
        } catch (\Exception $e) {
            Log::error('予約キャンセルエラー', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'store_id' => $booking->store_id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_CANCELLATION_ERROR',
                    'message' => '予約のキャンセルに失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 予約ステータス変更
     * 
     * PATCH /api/v1/bookings/{booking}/status
     * 
     * ステータス変更（確定・完了・無断キャンセル等）
     * 
     * @param Request $request
     * @param Booking $booking
     * @return JsonResponse
     */
    public function updateStatus(Request $request, Booking $booking): JsonResponse
    {
        try {
            // バリデーション
            $request->validate([
                'status' => 'required|string|in:pending,confirmed,cancelled,completed,no_show',
                'completion_notes' => 'nullable|string|max:1000',
                'staff_notes' => 'nullable|string|max:1000'
            ]);

            // マルチテナント確認
            if ($booking->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'BOOKING_NOT_FOUND',
                        'message' => '予約が見つかりません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 404);
            }

            $newStatus = $request->get('status');
            $notes = $request->get('completion_notes') ?? $request->get('staff_notes');

            Log::info('予約ステータス変更開始', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'current_status' => $booking->status,
                'new_status' => $newStatus,
                'notes' => $notes,
                'store_id' => $booking->store_id
            ]);

            // BookingServiceでステータス更新
            $updated = $this->bookingService->updateBookingStatus($booking, $newStatus, $notes);

            if ($updated) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'booking' => new BookingResource($booking->fresh()->load([
                            'customer',
                            'menu',
                            'resource'
                        ]))
                    ],
                    'message' => '予約ステータスを更新しました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => '1.0'
                    ]
                ]);
            } else {
                throw new \Exception('ステータス更新処理に失敗しました');
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => '入力内容に誤りがあります',
                    'details' => $e->errors()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 422);
        } catch (\Exception $e) {
            Log::error('予約ステータス変更エラー', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'store_id' => $booking->store_id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'STATUS_UPDATE_ERROR',
                    'message' => 'ステータスの更新に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 予約移動（タイムライン専用）
     * 
     * PATCH /api/v1/bookings/{booking}/move
     * 
     * FullCalendar Timelineからのドラッグ&ドロップによる予約移動
     * 日時・時間・担当者を一括更新
     * 
     * @param Request $request
     * @param Booking $booking
     * @return JsonResponse
     */
    public function move(Request $request, Booking $booking): JsonResponse
    {
        try {
            // バリデーション
            $request->validate([
                'booking_date' => 'required|date|after_or_equal:today',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
                'resource_id' => 'nullable|exists:resources,id'
            ]);

            // マルチテナント確認
            if ($booking->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'BOOKING_NOT_FOUND',
                        'message' => '予約が見つかりません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 404);
            }

            $moveData = $request->only(['booking_date', 'start_time', 'end_time', 'resource_id']);

            Log::info('予約移動開始', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'current_data' => [
                    'date' => $booking->booking_date,
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'resource_id' => $booking->resource_id,
                ],
                'new_data' => $moveData,
                'store_id' => $booking->store_id
            ]);

            // BookingServiceで予約移動
            $movedBooking = $this->bookingService->updateBooking($booking, $moveData);

            return response()->json([
                'success' => true,
                'data' => [
                    'booking' => new BookingResource($movedBooking)
                ],
                'message' => '予約を移動しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => '移動先の設定に誤りがあります',
                    'details' => $e->errors()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 422);
        } catch (\App\Exceptions\BookingConflictException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_CONFLICT',
                    'message' => $e->getMessage()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 409);
        } catch (\Exception $e) {
            Log::error('予約移動エラー', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'store_id' => $booking->store_id
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BOOKING_MOVE_ERROR',
                    'message' => '予約の移動に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }
}
