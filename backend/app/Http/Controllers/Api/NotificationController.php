<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use App\Models\Notification;
use App\Models\Customer;
use App\Models\Booking;
use App\Http\Requests\SendNotificationRequest;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * NotificationController
 * 
 * tugical通知管理API
 * 
 * 主要機能:
 * - 通知履歴取得・フィルタリング
 * - 手動通知送信
 * - 一括通知配信
 * - 通知統計情報取得
 * - 通知再送機能
 * 
 * 対応エンドポイント:
 * - GET /api/v1/notifications - 通知履歴一覧
 * - GET /api/v1/notifications/{id} - 通知詳細取得
 * - POST /api/v1/notifications/send - 手動通知送信
 * - POST /api/v1/notifications/bulk - 一括通知送信
 * - POST /api/v1/notifications/{id}/retry - 通知再送
 * - GET /api/v1/notifications/stats - 統計情報取得
 * 
 * @package App\Http\Controllers\Api
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class NotificationController extends Controller
{
    /**
     * NotificationService インスタンス
     */
    protected NotificationService $notificationService;

    /**
     * コンストラクタ
     * 
     * @param NotificationService $notificationService
     */
    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * 通知履歴一覧取得
     * 
     * GET /api/v1/notifications
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        /**
         * 通知履歴一覧取得 with フィルタリング
         * 
         * クエリパラメータ:
         * - customer_id: 顧客ID
         * - type: 通知タイプ (booking_confirmed, booking_reminder, etc.)
         * - status: 配信ステータス (sent, failed, pending)
         * - channel: 配信チャネル (line, email)
         * - date_from/date_to: 日付範囲
         * - page: ページ番号
         * - per_page: 1ページあたりの件数
         */
        
        try {
            $storeId = Auth::user()->store_id;
            
            // バリデーション
            $validated = $request->validate([
                'customer_id' => 'nullable|integer|exists:customers,id',
                'type' => 'nullable|string|in:booking_confirmed,booking_reminder,booking_cancelled,booking_updated,payment_completed',
                'status' => 'nullable|string|in:sent,failed,pending,delivered',
                'channel' => 'nullable|string|in:line,email,sms',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            // クエリ構築
            $query = Notification::where('store_id', $storeId)
                ->with(['booking', 'customer'])
                ->orderBy('created_at', 'desc');

            // フィルタリング適用
            if (!empty($validated['customer_id'])) {
                $query->whereHas('customer', function($q) use ($validated) {
                    $q->where('id', $validated['customer_id']);
                });
            }

            if (!empty($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            if (!empty($validated['channel'])) {
                $query->where('channel', $validated['channel']);
            }

            if (!empty($validated['date_from'])) {
                $query->whereDate('created_at', '>=', $validated['date_from']);
            }

            if (!empty($validated['date_to'])) {
                $query->whereDate('created_at', '<=', $validated['date_to']);
            }

            // ページネーション
            $perPage = $validated['per_page'] ?? 20;
            $notifications = $query->paginate($perPage);

            // 統計情報
            $stats = [
                'total_count' => $notifications->total(),
                'sent_count' => Notification::where('store_id', $storeId)->where('status', 'sent')->count(),
                'failed_count' => Notification::where('store_id', $storeId)->where('status', 'failed')->count(),
                'pending_count' => Notification::where('store_id', $storeId)->where('status', 'pending')->count(),
            ];

            Log::info('通知履歴一覧取得成功', [
                'store_id' => $storeId,
                'filters' => $validated,
                'result_count' => $notifications->count(),
                'total_count' => $notifications->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'notifications' => NotificationResource::collection($notifications->items()),
                    'pagination' => [
                        'current_page' => $notifications->currentPage(),
                        'last_page' => $notifications->lastPage(),
                        'per_page' => $notifications->perPage(),
                        'total' => $notifications->total(),
                        'from' => $notifications->firstItem(),
                        'to' => $notifications->lastItem(),
                    ],
                    'stats' => $stats,
                ],
                'message' => '通知履歴を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (ValidationException $e) {
            Log::warning('通知履歴取得バリデーションエラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'errors' => $e->errors(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => '入力内容に誤りがあります',
                    'details' => $e->errors(),
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 422);

        } catch (\Throwable $e) {
            Log::error('通知履歴取得エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOTIFICATION_LIST_ERROR',
                    'message' => '通知履歴の取得に失敗しました',
                    'details' => '一時的なエラーの可能性があります。しばらく時間をおいて再度お試しください。',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 500);
        }
    }

    /**
     * 通知詳細取得
     * 
     * GET /api/v1/notifications/{id}
     * 
     * @param int $id 通知ID
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            $notification = Notification::where('store_id', $storeId)
                ->with(['booking', 'customer'])
                ->findOrFail($id);

            Log::info('通知詳細取得成功', [
                'store_id' => $storeId,
                'notification_id' => $id,
                'type' => $notification->type,
                'status' => $notification->status,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'notification' => new NotificationResource($notification),
                ],
                'message' => '通知詳細を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('通知が見つからない', [
                'store_id' => Auth::user()->store_id ?? null,
                'notification_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOTIFICATION_NOT_FOUND',
                    'message' => '指定された通知が見つかりません',
                    'details' => '通知IDを確認してください',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 404);

        } catch (\Throwable $e) {
            Log::error('通知詳細取得エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'notification_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOTIFICATION_DETAIL_ERROR',
                    'message' => '通知詳細の取得に失敗しました',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 500);
        }
    }

    /**
     * 手動通知送信
     * 
     * POST /api/v1/notifications/send
     * 
     * @param SendNotificationRequest $request
     * @return JsonResponse
     */
    public function send(SendNotificationRequest $request): JsonResponse
    {
        /**
         * 手動通知送信処理
         * 
         * リクエストパラメータ:
         * - customer_id: 対象顧客ID
         * - type: 通知タイプ
         * - message: メッセージ内容
         * - scheduled_at: 送信予定日時（任意）
         */
        
        try {
            $storeId = Auth::user()->store_id;
            $validated = $request->validated();

            // 顧客存在・店舗所属確認
            $customer = Customer::where('store_id', $storeId)
                ->findOrFail($validated['customer_id']);

            if (empty($customer->line_user_id)) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'LINE_USER_NOT_LINKED',
                        'message' => 'この顧客はLINE連携されていません',
                        'details' => 'LINE連携後に通知送信が可能になります',
                    ],
                ], 422);
            }

            // 即座送信 vs スケジュール送信
            if (empty($validated['scheduled_at'])) {
                // 即座送信
                $messages = [
                    [
                        'type' => 'text',
                        'text' => $validated['message'],
                    ]
                ];

                $success = $this->notificationService->sendLineMessage(
                    $customer->line_user_id,
                    $messages,
                    $storeId
                );

                $status = $success ? 'sent' : 'failed';
                $message = $success ? '通知を送信しました' : '通知の送信に失敗しました';

                // 通知レコード作成
                $notification = $this->notificationService->recordNotification(
                    $storeId,
                    $validated['type'],
                    'line',
                    $customer->line_user_id,
                    $status,
                    [
                        'manual_send' => true,
                        'sender_id' => Auth::id(),
                        'message' => $validated['message'],
                    ]
                );

                Log::info('手動通知送信完了', [
                    'store_id' => $storeId,
                    'customer_id' => $customer->id,
                    'type' => $validated['type'],
                    'success' => $success,
                    'notification_id' => $notification->id,
                ]);

                return response()->json([
                    'success' => $success,
                    'data' => [
                        'notification' => new NotificationResource($notification),
                        'delivery_status' => $status,
                    ],
                    'message' => $message,
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => '1.0',
                    ],
                ], $success ? 200 : 422);

            } else {
                // スケジュール送信
                $success = $this->notificationService->scheduleNotification(
                    $storeId,
                    $validated['scheduled_at'],
                    $validated['type'],
                    [
                        'line_user_id' => $customer->line_user_id,
                        'message' => $validated['message'],
                        'customer_id' => $customer->id,
                        'sender_id' => Auth::id(),
                    ]
                );

                Log::info('スケジュール通知設定完了', [
                    'store_id' => $storeId,
                    'customer_id' => $customer->id,
                    'scheduled_at' => $validated['scheduled_at'],
                    'success' => $success,
                ]);

                return response()->json([
                    'success' => $success,
                    'data' => [
                        'scheduled_at' => $validated['scheduled_at'],
                        'customer_name' => $customer->name,
                    ],
                    'message' => $success ? 'スケジュール通知を設定しました' : 'スケジュール通知の設定に失敗しました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => '1.0',
                    ],
                ], $success ? 200 : 422);
            }

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('通知送信対象顧客が見つからない', [
                'store_id' => Auth::user()->store_id ?? null,
                'customer_id' => $request->customer_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CUSTOMER_NOT_FOUND',
                    'message' => '指定された顧客が見つかりません',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 404);

        } catch (\Throwable $e) {
            Log::error('手動通知送信エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOTIFICATION_SEND_ERROR',
                    'message' => '通知の送信に失敗しました',
                    'details' => '一時的なエラーの可能性があります。しばらく時間をおいて再度お試しください。',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 500);
        }
    }

    /**
     * 一括通知送信
     * 
     * POST /api/v1/notifications/bulk
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function bulk(Request $request): JsonResponse
    {
        /**
         * 一括通知送信処理
         * 
         * キャンペーン・緊急連絡等の複数顧客への同時配信
         */
        
        try {
            $storeId = Auth::user()->store_id;

            // バリデーション
            $validated = $request->validate([
                'customer_ids' => 'required|array|min:1|max:500',
                'customer_ids.*' => 'integer|exists:customers,id',
                'type' => 'required|string|in:campaign,announcement,urgent',
                'message' => 'required|string|max:1000',
                'title' => 'nullable|string|max:100',
            ]);

            // 店舗所属顧客のみフィルタリング
            $customers = Customer::where('store_id', $storeId)
                ->whereIn('id', $validated['customer_ids'])
                ->get();

            if ($customers->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'NO_VALID_CUSTOMERS',
                        'message' => '送信対象の顧客が見つかりません',
                    ],
                ], 422);
            }

            // LINE連携済み顧客のみに限定
            $lineCustomers = $customers->filter(function($customer) {
                return !empty($customer->line_user_id);
            });

            if ($lineCustomers->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'NO_LINE_LINKED_CUSTOMERS',
                        'message' => 'LINE連携済みの顧客が見つかりません',
                    ],
                ], 422);
            }

            // メッセージフォーマット
            $messages = [
                [
                    'type' => 'text',
                    'text' => $validated['message'],
                ]
            ];

            // 一括送信実行
            $result = $this->notificationService->sendBulkNotification(
                $storeId,
                $lineCustomers->pluck('id')->toArray(),
                $messages
            );

            Log::info('一括通知送信完了', [
                'store_id' => $storeId,
                'type' => $validated['type'],
                'total_customers' => count($validated['customer_ids']),
                'line_customers' => $lineCustomers->count(),
                'success_count' => $result['success_count'],
                'failed_count' => $result['failed_count'],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'bulk_result' => [
                        'total_customers' => count($validated['customer_ids']),
                        'line_linked_customers' => $lineCustomers->count(),
                        'success_count' => $result['success_count'],
                        'failed_count' => $result['failed_count'],
                        'failed_customer_ids' => $result['failed_customers'],
                    ],
                    'message_content' => $validated['message'],
                ],
                'message' => "一括通知を送信しました（成功: {$result['success_count']}件、失敗: {$result['failed_count']}件）",
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (ValidationException $e) {
            Log::warning('一括通知送信バリデーションエラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'errors' => $e->errors(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => '入力内容に誤りがあります',
                    'details' => $e->errors(),
                ],
            ], 422);

        } catch (\Throwable $e) {
            Log::error('一括通知送信エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'BULK_NOTIFICATION_ERROR',
                    'message' => '一括通知の送信に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * 通知再送
     * 
     * POST /api/v1/notifications/{id}/retry
     * 
     * @param int $id 通知ID
     * @return JsonResponse
     */
    public function retry(int $id): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            $notification = Notification::where('store_id', $storeId)
                ->where('status', 'failed')
                ->findOrFail($id);

            $success = $this->notificationService->retryFailedNotification($notification);

            Log::info('通知再送完了', [
                'store_id' => $storeId,
                'notification_id' => $id,
                'success' => $success,
                'retry_count' => $notification->retry_count,
            ]);

            return response()->json([
                'success' => $success,
                'data' => [
                    'notification' => new NotificationResource($notification->fresh()),
                    'retry_status' => $success ? 'success' : 'failed',
                ],
                'message' => $success ? '通知を再送しました' : '通知の再送に失敗しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ], $success ? 200 : 422);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('再送対象通知が見つからない', [
                'store_id' => Auth::user()->store_id ?? null,
                'notification_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOTIFICATION_NOT_FOUND',
                    'message' => '指定された通知が見つからないか、再送できない状態です',
                ],
            ], 404);

        } catch (\Throwable $e) {
            Log::error('通知再送エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'notification_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOTIFICATION_RETRY_ERROR',
                    'message' => '通知の再送に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * 統計情報取得
     * 
     * GET /api/v1/notifications/stats
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            // バリデーション
            $validated = $request->validate([
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'group_by' => 'nullable|string|in:day,week,month',
            ]);

            $startDate = $validated['start_date'] ?? now()->subDays(30)->format('Y-m-d');
            $endDate = $validated['end_date'] ?? now()->format('Y-m-d');

            // NotificationService 統計情報取得
            $stats = $this->notificationService->getNotificationStats($storeId, $startDate, $endDate);

            Log::info('通知統計情報取得成功', [
                'store_id' => $storeId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'stats' => $stats,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ],
                ],
                'message' => '通知統計情報を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => '入力内容に誤りがあります',
                    'details' => $e->errors(),
                ],
            ], 422);

        } catch (\Throwable $e) {
            Log::error('通知統計情報取得エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOTIFICATION_STATS_ERROR',
                    'message' => '統計情報の取得に失敗しました',
                ],
            ], 500);
        }
    }
}
