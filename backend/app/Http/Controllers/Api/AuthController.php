<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * AuthController
 * 
 * tugical認証API
 * 
 * API仕様準拠:
 * - tugical_api_specification_v1.0.md Section 1 (認証API)
 * - Laravel Sanctum Bearer Token認証
 * - マルチテナント対応（store_id分離）
 * - 統一エラーレスポンス形式
 * 
 * エンドポイント:
 * - POST /api/v1/auth/login - 管理者ログイン
 * - POST /api/v1/auth/logout - ログアウト
 * - GET /api/v1/auth/user - ユーザー情報取得
 * 
 * @package App\Http\Controllers\Api
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class AuthController extends Controller
{
    /**
     * 管理者ログイン
     * 
     * API仕様書 Section 1.1 準拠
     * 
     * 主要機能:
     * - メールアドレス・パスワード・店舗ID認証
     * - Laravel Sanctum Token発行
     * - ユーザー権限・店舗情報取得
     * - ログイン履歴記録
     * 
     * @param LoginRequest $request バリデーション済みリクエスト
     * @return JsonResponse ログイン結果
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $credentials = $request->validated();
            
            // ユーザー認証（メール・パスワード・店舗ID）
            $user = User::where('email', $credentials['email'])
                ->where('store_id', $credentials['store_id'])
                ->first();

            if (!$user || !Hash::check($credentials['password'], $user->password)) {
                Log::warning('ログイン失敗', [
                    'email' => $credentials['email'],
                    'store_id' => $credentials['store_id'],
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);

                throw ValidationException::withMessages([
                    'email' => ['メールアドレス、パスワード、または店舗IDが正しくありません。'],
                ]);
            }

            // アカウント有効性チェック
            if (!$user->is_active) {
                Log::warning('無効アカウントログイン試行', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'store_id' => $user->store_id,
                ]);

                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'ACCOUNT_DISABLED',
                        'message' => 'アカウントが無効化されています。管理者にお問い合わせください。',
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ]
                ], 403);
            }

            // 既存トークンを削除（単一ログイン強制）
            $user->tokens()->delete();

            // 新しいSanctum Token生成
            $token = $user->createToken('tugical-admin', ['*'])->plainTextToken;

            // ログイン成功ログ
            Log::info('ログイン成功', [
                'user_id' => $user->id,
                'email' => $user->email,
                'store_id' => $user->store_id,
                'role' => $user->role,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // 最終ログイン時間更新
            $user->update([
                'last_login_at' => now(),
                'last_login_ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'token' => $token,
                    'user' => new UserResource($user),
                    'store' => [
                        'id' => $user->store->id,
                        'name' => $user->store->name,
                        'plan_type' => $user->store->plan_type,
                        'is_active' => $user->store->is_active,
                    ],
                    'permissions' => $this->getUserPermissions($user),
                ],
                'message' => 'ログインに成功しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ]
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'ログイン情報に誤りがあります',
                    'details' => $e->errors(),
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ]
            ], 422);

        } catch (\Exception $e) {
            Log::error('ログイン処理エラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['password']),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'LOGIN_ERROR',
                    'message' => 'ログイン処理中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ]
            ], 500);
        }
    }

    /**
     * ログアウト
     * 
     * API仕様書 Section 1.2 準拠
     * 
     * 主要機能:
     * - 現在のSancutm Token削除
     * - ログアウト履歴記録
     * - セッション情報クリア
     * 
     * @param Request $request
     * @return JsonResponse ログアウト結果
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'UNAUTHENTICATED',
                        'message' => '認証が必要です',
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ]
                ], 401);
            }

            // ログアウト履歴記録
            Log::info('ログアウト実行', [
                'user_id' => $user->id,
                'email' => $user->email,
                'store_id' => $user->store_id,
                'ip_address' => $request->ip(),
                'session_duration' => now()->diffInMinutes($user->last_login_at ?? now()),
            ]);

            // 現在のトークンを削除
            $request->user()->currentAccessToken()->delete();

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'ログアウトしました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ログアウト処理エラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'LOGOUT_ERROR',
                    'message' => 'ログアウト処理中にエラーが発生しました',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ]
            ], 500);
        }
    }

    /**
     * ユーザー情報取得
     * 
     * API仕様書 Section 1.3 準拠
     * 
     * 主要機能:
     * - 認証済みユーザー情報取得
     * - 店舗情報・権限情報含む
     * - アクセス統計記録
     * 
     * @param Request $request
     * @return JsonResponse ユーザー情報
     */
    public function user(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'UNAUTHENTICATED',
                        'message' => '認証が必要です',
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ]
                ], 401);
            }

            // アクセス統計記録（毎回は重いので、一定間隔で）
            if (!$user->last_activity_at || $user->last_activity_at->diffInMinutes(now()) >= 5) {
                $user->update(['last_activity_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => new UserResource($user),
                    'store' => [
                        'id' => $user->store->id,
                        'name' => $user->store->name,
                        'plan_type' => $user->store->plan_type,
                        'is_active' => $user->store->is_active,
                        'features' => $this->getStoreFeaturesAvailable($user->store->plan_type ?? 'standard'),
                    ],
                    'permissions' => $this->getUserPermissions($user),
                    'session_info' => [
                        'login_at' => $user->last_login_at?->toISOString(),
                        'login_ip' => $user->last_login_ip,
                        'current_ip' => $request->ip(),
                        'session_duration_minutes' => $user->last_login_at ? 
                            now()->diffInMinutes($user->last_login_at) : 0,
                    ],
                ],
                'message' => 'ユーザー情報を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('ユーザー情報取得エラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'USER_INFO_ERROR',
                    'message' => 'ユーザー情報の取得中にエラーが発生しました',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ]
            ], 500);
        }
    }

    /**
     * ユーザー権限を取得
     * 
     * 役割別権限マッピング（tugical_requirements_specification_v1.0.md準拠）
     * 
     * @param User $user
     * @return array 権限リスト
     */
    private function getUserPermissions(User $user): array
    {
        $permissions = [
            'owner' => [
                'booking.manage', 'booking.create', 'booking.update', 'booking.delete',
                'customer.manage', 'customer.create', 'customer.update', 'customer.delete',
                'staff.manage', 'staff.create', 'staff.update', 'staff.delete',
                'menu.manage', 'menu.create', 'menu.update', 'menu.delete',
                'notification.manage', 'notification.send',
                'settings.manage', 'analytics.view', 'export.data',
                'store.settings', 'user.manage'
            ],
            'manager' => [
                'booking.manage', 'booking.create', 'booking.update',
                'customer.manage', 'customer.create', 'customer.update',
                'staff.view', 'menu.view',
                'notification.send', 'analytics.view'
            ],
            'staff' => [
                'booking.view', 'booking.update',
                'customer.view', 'customer.update',
                'notification.view'
            ],
            'reception' => [
                'booking.manage', 'booking.create', 'booking.update',
                'customer.view', 'customer.create', 'customer.update'
            ]
        ];

        return $permissions[$user->role] ?? [];
    }

    /**
     * 店舗プラン別利用可能機能を取得
     * 
     * プラン体系（tugical_requirements_specification_v1.0.md準拠）
     * 
     * @param string $planType プランタイプ
     * @return array 利用可能機能
     */
    private function getStoreFeaturesAvailable(string $planType): array
    {
        $features = [
            'free' => [
                'monthly_booking_limit' => 50,
                'staff_count_limit' => 2,
                'notification_templates' => 'basic',
                'analytics' => false,
                'api_access' => false,
                'custom_domain' => false,
            ],
            'standard' => [
                'monthly_booking_limit' => null, // 無制限
                'staff_count_limit' => 10,
                'notification_templates' => 'full',
                'analytics' => true,
                'api_access' => false,
                'custom_domain' => false,
            ],
            'pro' => [
                'monthly_booking_limit' => null,
                'staff_count_limit' => null,
                'notification_templates' => 'full',
                'analytics' => true,
                'api_access' => true,
                'custom_domain' => true,
                'multi_store' => true,
                'max_stores' => 3,
            ],
            'enterprise' => [
                'monthly_booking_limit' => null,
                'staff_count_limit' => null,
                'notification_templates' => 'full',
                'analytics' => true,
                'api_access' => true,
                'custom_domain' => true,
                'multi_store' => true,
                'max_stores' => null,
                'dedicated_support' => true,
            ]
        ];

        return $features[$planType] ?? $features['free'];
    }
}
