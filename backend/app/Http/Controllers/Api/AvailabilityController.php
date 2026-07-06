<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AvailabilityService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * AvailabilityController
 * 
 * 空き時間・可用性管理API
 * 
 * 主要機能:
 * - リアルタイム空き時間枠検索（管理者・LIFF用）
 * - 月間可用性カレンダー生成
 * - リソース可用性チェック
 * - キャッシュ活用による高速応答
 * - マルチテナント対応（store_id自動分離）
 * 
 * API仕様準拠:
 * - tugical_api_specification_v1.0.md 完全対応
 * - 統一エラーレスポンス形式
 * - ページング・フィルタリング対応
 * - 適切なHTTPステータスコード
 * 
 * @package App\Http\Controllers\Api
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class AvailabilityController extends Controller
{
    /**
     * AvailabilityService インスタンス
     */
    protected AvailabilityService $availabilityService;

    /**
     * コンストラクタ
     * 
     * @param AvailabilityService $availabilityService
     */
    public function __construct(AvailabilityService $availabilityService)
    {
        $this->availabilityService = $availabilityService;
    }

    /**
     * 空き時間枠検索
     * 
     * 指定条件での利用可能時間枠を検索
     * リアルタイム可用性判定・営業時間・既存予約を考慮
     * 
     * API仕様: GET /api/v1/availability
     * 
     * @param Request $request
     * - menu_id (required): メニューID
     * - date (required): 検索日（Y-m-d）
     * - resource_id (optional): 指定リソースID
     * - duration (optional): 所要時間（分）※メニューからの自動算出優先
     * 
     * @return JsonResponse
     * {
     *   "success": true,
     *   "data": {
     *     "available_slots": [
     *       {
     *         "start_time": "09:00",
     *         "end_time": "10:00",
     *         "duration": 60,
     *         "resource_id": 1,
     *         "resource_name": "田中美容師"
     *       }
     *     ],
     *     "business_hours": {
     *       "start": "09:00",
     *       "end": "18:00",
     *       "break_time": {"start": "12:00", "end": "13:00"}
     *     }
     *   }
     * }
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // 認証ユーザーの店舗ID取得（マルチテナント）
            $storeId = auth()->user()->store_id;
            
            Log::info('空き時間枠検索開始', [
                'store_id' => $storeId,
                'user_id' => auth()->id(),
                'request_params' => $request->all()
            ]);

            // バリデーション
            $validated = $request->validate([
                'menu_id' => 'required|integer|exists:menus,id',
                'date' => 'required|date_format:Y-m-d|after_or_equal:today',
                'resource_id' => 'nullable|integer|exists:resources,id',
                'duration' => 'nullable|integer|min:15|max:480', // 15分〜8時間
            ], [
                'menu_id.required' => 'メニューIDは必須です',
                'menu_id.exists' => '指定されたメニューが見つかりません',
                'date.required' => '検索日は必須です',
                'date.date_format' => '日付はY-m-d形式で入力してください',
                'date.after_or_equal' => '検索日は今日以降の日付を指定してください',
                'resource_id.exists' => '指定されたリソースが見つかりません',
                'duration.min' => '所要時間は15分以上で指定してください',
                'duration.max' => '所要時間は8時間以内で指定してください',
            ]);

            // メニュー・リソースの店舗所属チェック（マルチテナント検証）
            $this->validateTenantOwnership($storeId, $validated);

            // 空き時間枠検索実行
            $availableSlots = $this->availabilityService->getAvailableSlots(
                storeId: $storeId,
                date: $validated['date'],
                menuId: $validated['menu_id'],
                resourceId: $validated['resource_id'] ?? null
            );

            // 営業時間情報取得
            $businessHours = $this->getBusinessHoursForResponse($storeId, $validated['date']);

            Log::info('空き時間枠検索完了', [
                'store_id' => $storeId,
                'date' => $validated['date'],
                'menu_id' => $validated['menu_id'],
                'slots_count' => count($availableSlots)
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'available_slots' => $availableSlots,
                    'business_hours' => $businessHours,
                    'search_params' => [
                        'date' => $validated['date'],
                        'menu_id' => $validated['menu_id'],
                        'resource_id' => $validated['resource_id'] ?? null,
                    ]
                ],
                'message' => count($availableSlots) > 0 
                    ? '空き時間枠が見つかりました' 
                    : '指定日には空きがありません',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);

        } catch (ValidationException $e) {
            Log::warning('空き時間枠検索バリデーションエラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'request_params' => $request->all(),
                'validation_errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'リクエストパラメータに誤りがあります',
                    'details' => $e->errors()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 422);

        } catch (\Exception $e) {
            Log::error('空き時間枠検索エラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'request_params' => $request->all(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'AVAILABILITY_SEARCH_ERROR',
                    'message' => '空き時間の検索に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 月間可用性カレンダー取得
     * 
     * 指定期間での日別可用性情報を取得
     * LIFF予約画面の月表示等で使用
     * 
     * API仕様: GET /api/v1/availability/calendar
     * 
     * @param Request $request
     * - menu_id (required): メニューID
     * - days (optional): 検索日数（デフォルト30日、最大90日）
     * - resource_id (optional): 指定リソースID
     * 
     * @return JsonResponse
     * {
     *   "success": true,
     *   "data": {
     *     "calendar": {
     *       "2025-06-30": {
     *         "available": true,
     *         "slots_count": 8,
     *         "first_available": "09:00",
     *         "last_available": "17:00"
     *       }
     *     }
     *   }
     * }
     */
    public function calendar(Request $request): JsonResponse
    {
        try {
            // 認証ユーザーの店舗ID取得
            $storeId = auth()->user()->store_id;
            
            Log::info('可用性カレンダー取得開始', [
                'store_id' => $storeId,
                'user_id' => auth()->id(),
                'request_params' => $request->all()
            ]);

            // バリデーション
            $validated = $request->validate([
                'menu_id' => 'required|integer|exists:menus,id',
                'days' => 'nullable|integer|min:1|max:90',
                'resource_id' => 'nullable|integer|exists:resources,id',
            ], [
                'menu_id.required' => 'メニューIDは必須です',
                'menu_id.exists' => '指定されたメニューが見つかりません',
                'days.min' => '検索日数は1日以上で指定してください',
                'days.max' => '検索日数は90日以内で指定してください',
                'resource_id.exists' => '指定されたリソースが見つかりません',
            ]);

            // デフォルト値設定
            $days = $validated['days'] ?? 30;

            // メニュー・リソースの店舗所属チェック
            $this->validateTenantOwnership($storeId, $validated);

            // 可用性カレンダー生成
            $calendar = $this->availabilityService->getAvailabilityCalendar(
                storeId: $storeId,
                menuId: $validated['menu_id'],
                days: $days
            );

            Log::info('可用性カレンダー取得完了', [
                'store_id' => $storeId,
                'menu_id' => $validated['menu_id'],
                'days' => $days,
                'available_days' => count(array_filter($calendar, fn($day) => $day['available']))
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'calendar' => $calendar,
                    'summary' => [
                        'total_days' => count($calendar),
                        'available_days' => count(array_filter($calendar, fn($day) => $day['available'])),
                        'search_range' => [
                            'start_date' => array_keys($calendar)[0] ?? null,
                            'end_date' => array_keys($calendar)[count($calendar) - 1] ?? null,
                        ]
                    ]
                ],
                'message' => '可用性カレンダーを取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);

        } catch (ValidationException $e) {
            Log::warning('可用性カレンダーバリデーションエラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'request_params' => $request->all(),
                'validation_errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'リクエストパラメータに誤りがあります',
                    'details' => $e->errors()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 422);

        } catch (\Exception $e) {
            Log::error('可用性カレンダー取得エラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'request_params' => $request->all(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CALENDAR_GENERATION_ERROR',
                    'message' => '可用性カレンダーの生成に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * リソース可用性チェック
     * 
     * 特定リソースの指定時間での可用性をチェック
     * 
     * API仕様: GET /api/v1/availability/resource-check
     * 
     * @param Request $request
     * - resource_id (required): リソースID
     * - date (required): 日付（Y-m-d）
     * - start_time (required): 開始時間（H:i）
     * - end_time (required): 終了時間（H:i）
     * 
     * @return JsonResponse
     * {
     *   "success": true,
     *   "data": {
     *     "available": true,
     *     "resource": {
     *       "id": 1,
     *       "name": "田中美容師",
     *       "type": "staff"
     *     },
     *     "checked_slot": {
     *       "date": "2025-06-28",
     *       "start_time": "14:00",
     *       "end_time": "15:00"
     *     }
     *   }
     * }
     */
    public function resourceCheck(Request $request): JsonResponse
    {
        try {
            // 認証ユーザーの店舗ID取得
            $storeId = auth()->user()->store_id;
            
            Log::info('リソース可用性チェック開始', [
                'store_id' => $storeId,
                'user_id' => auth()->id(),
                'request_params' => $request->all()
            ]);

            // バリデーション
            $validated = $request->validate([
                'resource_id' => 'required|integer|exists:resources,id',
                'date' => 'required|date_format:Y-m-d|after_or_equal:today',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
            ], [
                'resource_id.required' => 'リソースIDは必須です',
                'resource_id.exists' => '指定されたリソースが見つかりません',
                'date.required' => '日付は必須です',
                'date.date_format' => '日付はY-m-d形式で入力してください',
                'date.after_or_equal' => '日付は今日以降を指定してください',
                'start_time.required' => '開始時間は必須です',
                'start_time.date_format' => '開始時間はH:i形式で入力してください',
                'end_time.required' => '終了時間は必須です',
                'end_time.date_format' => '終了時間はH:i形式で入力してください',
                'end_time.after' => '終了時間は開始時間より後に設定してください',
            ]);

            // リソースの店舗所属チェック
            $this->validateTenantOwnership($storeId, $validated);

            // リソース可用性チェック実行
            $isAvailable = $this->availabilityService->isResourceAvailable(
                resourceId: $validated['resource_id'],
                date: $validated['date'],
                startTime: $validated['start_time'],
                endTime: $validated['end_time']
            );

            // リソース情報取得
            $resource = \App\Models\Resource::select('id', 'name', 'type', 'display_name')
                ->where('store_id', $storeId)
                ->find($validated['resource_id']);

            Log::info('リソース可用性チェック完了', [
                'store_id' => $storeId,
                'resource_id' => $validated['resource_id'],
                'date' => $validated['date'],
                'time_slot' => $validated['start_time'] . '-' . $validated['end_time'],
                'available' => $isAvailable
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'available' => $isAvailable,
                    'resource' => [
                        'id' => $resource->id,
                        'name' => $resource->name,
                        'display_name' => $resource->display_name,
                        'type' => $resource->type,
                    ],
                    'checked_slot' => [
                        'date' => $validated['date'],
                        'start_time' => $validated['start_time'],
                        'end_time' => $validated['end_time'],
                        'duration_minutes' => $this->calculateDurationMinutes(
                            $validated['start_time'], 
                            $validated['end_time']
                        )
                    ]
                ],
                'message' => $isAvailable 
                    ? 'リソースは利用可能です' 
                    : 'リソースは利用できません',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);

        } catch (ValidationException $e) {
            Log::warning('リソース可用性チェックバリデーションエラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'request_params' => $request->all(),
                'validation_errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'リクエストパラメータに誤りがあります',
                    'details' => $e->errors()
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 422);

        } catch (\Exception $e) {
            Log::error('リソース可用性チェックエラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'request_params' => $request->all(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RESOURCE_CHECK_ERROR',
                    'message' => 'リソース可用性の確認に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * マルチテナント所属チェック
     * 
     * メニュー・リソースが認証ユーザーの店舗に所属しているかチェック
     * 
     * @param int $storeId 店舗ID
     * @param array $validated バリデーション済みパラメータ
     * @throws \Exception クロステナントアクセス時
     */
    protected function validateTenantOwnership(int $storeId, array $validated): void
    {
        // メニューの店舗所属チェック
        if (isset($validated['menu_id'])) {
            $menuExists = \App\Models\Menu::where('store_id', $storeId)
                ->where('id', $validated['menu_id'])
                ->exists();
            
            if (!$menuExists) {
                Log::warning('クロステナント Menu アクセス試行', [
                    'store_id' => $storeId,
                    'menu_id' => $validated['menu_id'],
                    'user_id' => auth()->id()
                ]);
                throw new \Exception('指定されたメニューにアクセスする権限がありません');
            }
        }

        // リソースの店舗所属チェック
        if (isset($validated['resource_id'])) {
            $resourceExists = \App\Models\Resource::where('store_id', $storeId)
                ->where('id', $validated['resource_id'])
                ->exists();
            
            if (!$resourceExists) {
                Log::warning('クロステナント Resource アクセス試行', [
                    'store_id' => $storeId,
                    'resource_id' => $validated['resource_id'],
                    'user_id' => auth()->id()
                ]);
                throw new \Exception('指定されたリソースにアクセスする権限がありません');
            }
        }
    }

    /**
     * レスポンス用営業時間情報取得
     * 
     * @param int $storeId 店舗ID
     * @param string $date 対象日
     * @return array 営業時間情報
     */
    protected function getBusinessHoursForResponse(int $storeId, string $date): array
    {
        try {
            $store = \App\Models\Store::find($storeId);
            
            if (!$store || !$store->business_hours) {
                return [
                    'available' => false,
                    'reason' => '営業時間情報が設定されていません'
                ];
            }

            // 特別営業時間チェック
            $specialCalendar = \App\Models\BusinessCalendar::where('store_id', $storeId)
                ->whereDate('date', $date)
                ->first();

            if ($specialCalendar) {
                if ($specialCalendar->is_closed) {
                    return [
                        'available' => false,
                        'reason' => '定休日です',
                        'special_note' => $specialCalendar->note
                    ];
                }
                
                if ($specialCalendar->special_hours) {
                    return [
                        'available' => true,
                        'start' => $specialCalendar->special_hours['start'],
                        'end' => $specialCalendar->special_hours['end'],
                        'break_time' => $specialCalendar->special_hours['break_time'] ?? null,
                        'is_special_hours' => true,
                        'special_note' => $specialCalendar->note
                    ];
                }
            }

            // 通常営業時間
            $dayOfWeek = \Carbon\Carbon::parse($date)->format('w');
            $dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            $dayName = $dayNames[$dayOfWeek];

            $businessHours = $store->business_hours;
            
            if (!isset($businessHours[$dayName]) || !$businessHours[$dayName]['is_open']) {
                return [
                    'available' => false,
                    'reason' => '定休日です'
                ];
            }

            $dayHours = $businessHours[$dayName];
            return [
                'available' => true,
                'start' => $dayHours['start'],
                'end' => $dayHours['end'],
                'break_time' => $dayHours['break_time'] ?? null,
                'is_special_hours' => false
            ];

        } catch (\Exception $e) {
            Log::error('営業時間情報取得エラー', [
                'store_id' => $storeId,
                'date' => $date,
                'error' => $e->getMessage()
            ]);

            return [
                'available' => false,
                'reason' => '営業時間の取得に失敗しました'
            ];
        }
    }

    /**
     * 時間差計算（分）
     * 
     * @param string $startTime H:i
     * @param string $endTime H:i
     * @return int 差分（分）
     */
    protected function calculateDurationMinutes(string $startTime, string $endTime): int
    {
        $start = \Carbon\Carbon::createFromFormat('H:i', $startTime);
        $end = \Carbon\Carbon::createFromFormat('H:i', $endTime);
        
        return $end->diffInMinutes($start);
    }
}
