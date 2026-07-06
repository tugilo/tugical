<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateHoldTokenRequest;
use App\Services\HoldTokenService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * HoldTokenController
 * 
 * Hold Token（仮押さえ）管理API
 * 
 * 主要機能:
 * - 10分間仮押さえトークン作成・検証
 * - 暗号学的に安全なトークン管理
 * - Redis TTL自動期限管理
 * - 同時予約競合の完全回避
 * - 期限切れトークン自動クリーンアップ
 * - マルチテナント対応（store_id完全分離）
 * 
 * API仕様準拠:
 * - tugical_api_specification_v1.0.md 完全対応
 * - 統一エラーレスポンス形式
 * - 適切なHTTPステータスコード
 * - Hold Token期限切れ時HTTP 410
 * 
 * @package App\Http\Controllers\Api
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class HoldTokenController extends Controller
{
    /**
     * HoldTokenService インスタンス
     */
    protected HoldTokenService $holdTokenService;

    /**
     * コンストラクタ
     * 
     * @param HoldTokenService $holdTokenService
     */
    public function __construct(HoldTokenService $holdTokenService)
    {
        $this->holdTokenService = $holdTokenService;
    }

    /**
     * Hold Token作成（仮押さえ）
     * 
     * 指定時間枠の10分間仮押さえを実行
     * Redis TTLによる自動期限管理・競合チェック
     * 
     * API仕様: POST /api/v1/hold-slots
     * 
     * @param CreateHoldTokenRequest $request
     * - menu_id (required): メニューID
     * - resource_id (required): リソースID
     * - booking_date (required): 予約日（Y-m-d）
     * - start_time (required): 開始時間（H:i）
     * - customer_id (optional): 顧客ID
     * 
     * @return JsonResponse
     * {
     *   "success": true,
     *   "data": {
     *     "hold_token": "abc123...",
     *     "expires_at": "2025-06-28T14:10:00+09:00",
     *     "booking_slot": {
     *       "date": "2025-06-28",
     *       "start_time": "14:00",
     *       "end_time": "15:00",
     *       "resource_id": 1
     *     }
     *   },
     *   "message": "時間枠を10分間仮押さえしました"
     * }
     */
    public function store(CreateHoldTokenRequest $request): JsonResponse
    {
        try {
            // 認証ユーザーの店舗ID取得（マルチテナント）
            $storeId = auth()->user()->store_id;
            
            Log::info('Hold Token作成要求開始', [
                'store_id' => $storeId,
                'user_id' => auth()->id(),
                'request_params' => $request->validated()
            ]);

            // バリデーション済みデータ取得
            $validated = $request->validated();
            
            // 終了時間計算（メニュー情報から）
            $menu = \App\Models\Menu::where('store_id', $storeId)
                ->find($validated['menu_id']);
            
            if (!$menu) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'MENU_NOT_FOUND',
                        'message' => '指定されたメニューが見つかりません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 404);
            }

            // 総所要時間計算
            $totalDuration = $menu->prep_duration + $menu->base_duration + $menu->cleanup_duration;
            $endTime = \Carbon\Carbon::createFromFormat('H:i', $validated['start_time'])
                ->addMinutes($totalDuration)
                ->format('H:i');

            // Hold Token作成用データ準備
            $slotData = [
                'resource_id' => $validated['resource_id'],
                'booking_date' => $validated['booking_date'],
                'start_time' => $validated['start_time'],
                'end_time' => $endTime,
                'menu_id' => $validated['menu_id'],
                'customer_id' => $validated['customer_id'] ?? null,
            ];

            // Hold Token作成実行
            $holdToken = $this->holdTokenService->createHoldToken($storeId, $slotData);

            // レスポンス用期限時間計算
            $expiresAt = now()->addMinutes(10)->toISOString();

            Log::info('Hold Token作成完了', [
                'store_id' => $storeId,
                'token' => substr($holdToken, 0, 8) . '...',
                'slot' => $validated['booking_date'] . ' ' . $validated['start_time'] . '-' . $endTime,
                'expires_at' => $expiresAt
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'hold_token' => $holdToken,
                    'expires_at' => $expiresAt,
                    'booking_slot' => [
                        'date' => $validated['booking_date'],
                        'start_time' => $validated['start_time'],
                        'end_time' => $endTime,
                        'resource_id' => $validated['resource_id'],
                        'menu_id' => $validated['menu_id'],
                        'duration_minutes' => $totalDuration
                    ]
                ],
                'message' => '時間枠を10分間仮押さえしました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('Hold Token作成エラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'request_params' => $request->validated(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // 競合エラーの場合は409を返す
            if (strpos($e->getMessage(), '既に仮押さえ') !== false) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'HOLD_TOKEN_CONFLICT',
                        'message' => $e->getMessage(),
                        'details' => '他のユーザーが同じ時間枠を仮押さえしています'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 409);
            }

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'HOLD_TOKEN_CREATION_ERROR',
                    'message' => 'Hold Tokenの作成に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * Hold Token詳細取得
     * 
     * 指定されたトークンの詳細情報・残り時間を取得
     * 
     * API仕様: GET /api/v1/hold-slots/{hold_token}
     * 
     * @param string $holdToken Hold Token
     * @return JsonResponse
     * {
     *   "success": true,
     *   "data": {
     *     "hold_token": "abc123...",
     *     "expires_at": "2025-06-28T14:10:00+09:00",
     *     "remaining_seconds": 487,
     *     "booking_slot": {
     *       "date": "2025-06-28",
     *       "start_time": "14:00",
     *       "end_time": "15:00",
     *       "resource_id": 1
     *     }
     *   }
     * }
     */
    public function show(string $holdToken): JsonResponse
    {
        try {
            Log::info('Hold Token詳細取得開始', [
                'token' => substr($holdToken, 0, 8) . '...',
                'user_id' => auth()->id()
            ]);

            // Hold Token情報取得
            $holdData = $this->holdTokenService->getHoldTokenData($holdToken);

            if (!$holdData) {
                Log::warning('Hold Token not found or expired', [
                    'token' => substr($holdToken, 0, 8) . '...',
                    'user_id' => auth()->id()
                ]);

                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'HOLD_TOKEN_NOT_FOUND',
                        'message' => 'Hold Tokenが見つからないか期限切れです'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 410); // HTTP 410 Gone
            }

            // マルチテナントチェック（認証ユーザーの店舗と一致するか）
            $userStoreId = auth()->user()->store_id;
            if ($holdData['store_id'] !== $userStoreId) {
                Log::warning('クロステナント Hold Token アクセス試行', [
                    'token' => substr($holdToken, 0, 8) . '...',
                    'user_store_id' => $userStoreId,
                    'token_store_id' => $holdData['store_id'],
                    'user_id' => auth()->id()
                ]);

                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'UNAUTHORIZED_ACCESS',
                        'message' => 'このHold Tokenにアクセスする権限がありません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 403);
            }

            Log::info('Hold Token詳細取得完了', [
                'token' => substr($holdToken, 0, 8) . '...',
                'store_id' => $holdData['store_id'],
                'remaining_seconds' => $holdData['remaining_seconds']
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'hold_token' => $holdToken,
                    'expires_at' => $holdData['expires_at'],
                    'remaining_seconds' => $holdData['remaining_seconds'],
                    'booking_slot' => [
                        'date' => $holdData['booking_date'],
                        'start_time' => $holdData['start_time'],
                        'end_time' => $holdData['end_time'],
                        'resource_id' => $holdData['resource_id'],
                        'menu_id' => $holdData['menu_id'],
                        'customer_id' => $holdData['customer_id']
                    ],
                    'created_at' => $holdData['created_at']
                ],
                'message' => 'Hold Token情報を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Hold Token詳細取得エラー', [
                'token' => substr($holdToken, 0, 8) . '...',
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'HOLD_TOKEN_FETCH_ERROR',
                    'message' => 'Hold Token情報の取得に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * Hold Token解放
     * 
     * 予約完了・キャンセル時の早期解放
     * 
     * API仕様: DELETE /api/v1/hold-slots/{hold_token}
     * 
     * @param string $holdToken 解放対象Hold Token
     * @return JsonResponse
     * {
     *   "success": true,
     *   "message": "Hold Tokenを解放しました"
     * }
     */
    public function destroy(string $holdToken): JsonResponse
    {
        try {
            Log::info('Hold Token解放要求開始', [
                'token' => substr($holdToken, 0, 8) . '...',
                'user_id' => auth()->id()
            ]);

            // 解放前にトークン情報取得（ログ用）
            $holdData = $this->holdTokenService->getHoldTokenData($holdToken);
            
            if ($holdData) {
                // マルチテナントチェック
                $userStoreId = auth()->user()->store_id;
                if ($holdData['store_id'] !== $userStoreId) {
                    Log::warning('クロステナント Hold Token 解放試行', [
                        'token' => substr($holdToken, 0, 8) . '...',
                        'user_store_id' => $userStoreId,
                        'token_store_id' => $holdData['store_id'],
                        'user_id' => auth()->id()
                    ]);

                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'UNAUTHORIZED_ACCESS',
                            'message' => 'このHold Tokenを解放する権限がありません'
                        ],
                        'meta' => [
                            'timestamp' => now()->toISOString()
                        ]
                    ], 403);
                }
            }

            // Hold Token解放実行
            $released = $this->holdTokenService->releaseHoldToken($holdToken);

            if ($released) {
                Log::info('Hold Token解放完了', [
                    'token' => substr($holdToken, 0, 8) . '...',
                    'store_id' => $holdData['store_id'] ?? 'unknown',
                    'user_id' => auth()->id()
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'released_token' => substr($holdToken, 0, 8) . '...',
                        'released_at' => now()->toISOString(),
                        'booking_slot' => $holdData ? [
                            'date' => $holdData['booking_date'],
                            'start_time' => $holdData['start_time'],
                            'end_time' => $holdData['end_time'],
                            'resource_id' => $holdData['resource_id']
                        ] : null
                    ],
                    'message' => 'Hold Tokenを解放しました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => '1.0'
                    ]
                ]);
            } else {
                // 既に期限切れ・削除済みの場合も成功として扱う
                Log::info('Hold Token解放対象なし（既に期限切れ）', [
                    'token' => substr($holdToken, 0, 8) . '...',
                    'user_id' => auth()->id()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Hold Tokenは既に解放されているか期限切れです',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => '1.0'
                    ]
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Hold Token解放エラー', [
                'token' => substr($holdToken, 0, 8) . '...',
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'HOLD_TOKEN_RELEASE_ERROR',
                    'message' => 'Hold Tokenの解放に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * Hold Token延長
     * 
     * 既存トークンの有効期限を延長
     * 予約フォーム入力時間延長等で使用
     * 
     * API仕様: PATCH /api/v1/hold-slots/{hold_token}/extend
     * 
     * @param string $holdToken 延長対象Hold Token
     * @param Request $request
     * - minutes (optional): 延長時間（分）デフォルト10分
     * 
     * @return JsonResponse
     * {
     *   "success": true,
     *   "data": {
     *     "hold_token": "abc123...",
     *     "new_expires_at": "2025-06-28T14:20:00+09:00",
     *     "extended_minutes": 10
     *   },
     *   "message": "Hold Tokenを延長しました"
     * }
     */
    public function extend(string $holdToken, Request $request): JsonResponse
    {
        try {
            Log::info('Hold Token延長要求開始', [
                'token' => substr($holdToken, 0, 8) . '...',
                'user_id' => auth()->id(),
                'request_params' => $request->all()
            ]);

            // バリデーション
            $validated = $request->validate([
                'minutes' => 'nullable|integer|min:1|max:30',
            ], [
                'minutes.min' => '延長時間は1分以上で指定してください',
                'minutes.max' => '延長時間は30分以内で指定してください',
            ]);

            $extendMinutes = $validated['minutes'] ?? 10;

            // 延長前にトークン情報取得（マルチテナントチェック用）
            $holdData = $this->holdTokenService->getHoldTokenData($holdToken);
            
            if (!$holdData) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'HOLD_TOKEN_NOT_FOUND',
                        'message' => 'Hold Tokenが見つからないか期限切れです'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 410);
            }

            // マルチテナントチェック
            $userStoreId = auth()->user()->store_id;
            if ($holdData['store_id'] !== $userStoreId) {
                Log::warning('クロステナント Hold Token 延長試行', [
                    'token' => substr($holdToken, 0, 8) . '...',
                    'user_store_id' => $userStoreId,
                    'token_store_id' => $holdData['store_id'],
                    'user_id' => auth()->id()
                ]);

                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'UNAUTHORIZED_ACCESS',
                        'message' => 'このHold Tokenを延長する権限がありません'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 403);
            }

            // Hold Token延長実行
            $extended = $this->holdTokenService->extendHoldToken($holdToken, $extendMinutes);

            if ($extended) {
                $newExpiresAt = now()->addMinutes($extendMinutes)->toISOString();

                Log::info('Hold Token延長完了', [
                    'token' => substr($holdToken, 0, 8) . '...',
                    'store_id' => $holdData['store_id'],
                    'extended_minutes' => $extendMinutes,
                    'new_expires_at' => $newExpiresAt
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'hold_token' => substr($holdToken, 0, 8) . '...',
                        'new_expires_at' => $newExpiresAt,
                        'extended_minutes' => $extendMinutes,
                        'booking_slot' => [
                            'date' => $holdData['booking_date'],
                            'start_time' => $holdData['start_time'],
                            'end_time' => $holdData['end_time'],
                            'resource_id' => $holdData['resource_id']
                        ]
                    ],
                    'message' => "Hold Tokenを{$extendMinutes}分延長しました",
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => '1.0'
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'HOLD_TOKEN_EXTEND_FAILED',
                        'message' => 'Hold Tokenの延長に失敗しました'
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 500);
            }

        } catch (ValidationException $e) {
            Log::warning('Hold Token延長バリデーションエラー', [
                'token' => substr($holdToken, 0, 8) . '...',
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
            Log::error('Hold Token延長エラー', [
                'token' => substr($holdToken, 0, 8) . '...',
                'user_id' => auth()->id(),
                'extend_minutes' => $extendMinutes ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'HOLD_TOKEN_EXTEND_ERROR',
                    'message' => 'Hold Tokenの延長に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * 店舗Hold Token一覧取得
     * 
     * 管理者向け：現在アクティブなHold Token一覧
     * 
     * API仕様: GET /api/v1/hold-slots
     * 
     * @return JsonResponse
     * {
     *   "success": true,
     *   "data": {
     *     "hold_tokens": [
     *       {
     *         "token_preview": "abc123...",
     *         "booking_slot": {
     *           "date": "2025-06-28",
     *           "start_time": "14:00",
     *           "end_time": "15:00",
     *           "resource_id": 1
     *         },
     *         "remaining_seconds": 487,
     *         "created_at": "2025-06-28T14:00:00+09:00"
     *       }
     *     ]
     *   }
     * }
     */
    public function index(): JsonResponse
    {
        try {
            // 認証ユーザーの店舗ID取得
            $storeId = auth()->user()->store_id;
            
            Log::info('店舗Hold Token一覧取得開始', [
                'store_id' => $storeId,
                'user_id' => auth()->id()
            ]);

            // 店舗のアクティブHold Token一覧取得
            $holdTokens = $this->holdTokenService->getStoreHoldTokens($storeId);

            Log::info('店舗Hold Token一覧取得完了', [
                'store_id' => $storeId,
                'hold_tokens_count' => count($holdTokens)
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'hold_tokens' => $holdTokens,
                    'summary' => [
                        'total_count' => count($holdTokens),
                        'store_id' => $storeId,
                        'retrieved_at' => now()->toISOString()
                    ]
                ],
                'message' => count($holdTokens) > 0 
                    ? 'アクティブなHold Tokenが見つかりました' 
                    : '現在アクティブなHold Tokenはありません',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('店舗Hold Token一覧取得エラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'user_id' => auth()->id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'HOLD_TOKEN_LIST_ERROR',
                    'message' => 'Hold Token一覧の取得に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : '内部エラーが発生しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }
}
