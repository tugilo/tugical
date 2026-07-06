<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationTemplate;
use App\Http\Resources\NotificationTemplateResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * NotificationTemplateController
 * 
 * tugical通知テンプレート管理API
 * 
 * 主要機能:
 * - 通知テンプレートCRUD操作
 * - 業種別デフォルトテンプレート取得
 * - テンプレート変数プレビュー
 * - テンプレート使用統計取得
 * - テンプレートの有効化・無効化
 * 
 * 対応エンドポイント:
 * - GET /api/v1/notification-templates - テンプレート一覧
 * - GET /api/v1/notification-templates/{id} - テンプレート詳細
 * - POST /api/v1/notification-templates - テンプレート作成
 * - PUT /api/v1/notification-templates/{id} - テンプレート更新
 * - DELETE /api/v1/notification-templates/{id} - テンプレート削除
 * - POST /api/v1/notification-templates/{id}/preview - プレビュー生成
 * - GET /api/v1/notification-templates/defaults - デフォルトテンプレート取得
 * 
 * @package App\Http\Controllers\Api
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-06-30
 */
class NotificationTemplateController extends Controller
{
    /**
     * 通知テンプレート一覧取得
     * 
     * GET /api/v1/notification-templates
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        /**
         * 通知テンプレート一覧取得
         * 
         * クエリパラメータ:
         * - type: テンプレートタイプ (booking_confirmed, booking_reminder, etc.)
         * - industry_type: 業種タイプ (beauty, clinic, rental, school, activity)
         * - is_active: 有効/無効 (true, false)
         * - search: 検索キーワード（タイトル・メッセージ内容）
         */
        
        try {
            $storeId = Auth::user()->store_id;
            
            // バリデーション
            $validated = $request->validate([
                'type' => 'nullable|string|in:booking_confirmed,booking_reminder,booking_cancelled,booking_updated,payment_completed',
                'industry_type' => 'nullable|string|in:beauty,clinic,rental,school,activity',
                'is_active' => 'nullable|boolean',
                'search' => 'nullable|string|max:100',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:100',
            ]);

            // クエリ構築
            $query = NotificationTemplate::where('store_id', $storeId)
                ->orderBy('type')
                ->orderBy('created_at', 'desc');

            // フィルタリング適用
            if (!empty($validated['type'])) {
                $query->where('type', $validated['type']);
            }

            if (!empty($validated['industry_type'])) {
                $query->where('industry_type', $validated['industry_type']);
            }

            if (isset($validated['is_active'])) {
                $query->where('is_active', $validated['is_active']);
            }

            if (!empty($validated['search'])) {
                $query->where(function($q) use ($validated) {
                    $q->where('title', 'like', "%{$validated['search']}%")
                      ->orWhere('message', 'like', "%{$validated['search']}%");
                });
            }

            // ページネーション
            $perPage = $validated['per_page'] ?? 20;
            $templates = $query->paginate($perPage);

            // 統計情報
            $stats = [
                'total_count' => $templates->total(),
                'active_count' => NotificationTemplate::where('store_id', $storeId)->where('is_active', true)->count(),
                'inactive_count' => NotificationTemplate::where('store_id', $storeId)->where('is_active', false)->count(),
            ];

            Log::info('通知テンプレート一覧取得成功', [
                'store_id' => $storeId,
                'filters' => $validated,
                'result_count' => $templates->count(),
                'total_count' => $templates->total(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'templates' => NotificationTemplateResource::collection($templates->items()),
                    'pagination' => [
                        'current_page' => $templates->currentPage(),
                        'last_page' => $templates->lastPage(),
                        'per_page' => $templates->perPage(),
                        'total' => $templates->total(),
                        'from' => $templates->firstItem(),
                        'to' => $templates->lastItem(),
                    ],
                    'stats' => $stats,
                ],
                'message' => '通知テンプレート一覧を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (ValidationException $e) {
            Log::warning('通知テンプレート一覧取得バリデーションエラー', [
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
            Log::error('通知テンプレート一覧取得エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_LIST_ERROR',
                    'message' => 'テンプレート一覧の取得に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * 通知テンプレート詳細取得
     * 
     * GET /api/v1/notification-templates/{id}
     * 
     * @param int $id テンプレートID
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            $template = NotificationTemplate::where('store_id', $storeId)
                ->findOrFail($id);

            Log::info('通知テンプレート詳細取得成功', [
                'store_id' => $storeId,
                'template_id' => $id,
                'type' => $template->type,
                'is_active' => $template->is_active,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'template' => new NotificationTemplateResource($template),
                ],
                'message' => 'テンプレート詳細を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('通知テンプレートが見つからない', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_NOT_FOUND',
                    'message' => '指定されたテンプレートが見つかりません',
                ],
            ], 404);

        } catch (\Throwable $e) {
            Log::error('通知テンプレート詳細取得エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_DETAIL_ERROR',
                    'message' => 'テンプレート詳細の取得に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * 通知テンプレート作成
     * 
     * POST /api/v1/notification-templates
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            // バリデーション
            $validated = $request->validate([
                'type' => 'required|string|in:booking_confirmed,booking_reminder,booking_cancelled,booking_updated,payment_completed',
                'industry_type' => 'required|string|in:beauty,clinic,rental,school,activity',
                'title' => 'required|string|max:200',
                'message' => 'required|string|max:2000',
                'message_type' => 'nullable|string|in:text,rich|default:text',
                'rich_content' => 'nullable|array',
                'is_active' => 'nullable|boolean|default:true',
                'description' => 'nullable|string|max:500',
            ]);

            // 同一タイプのテンプレート重複チェック
            $existingTemplate = NotificationTemplate::where('store_id', $storeId)
                ->where('type', $validated['type'])
                ->where('industry_type', $validated['industry_type'])
                ->first();

            if ($existingTemplate) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'TEMPLATE_ALREADY_EXISTS',
                        'message' => 'この業種・タイプのテンプレートは既に存在します',
                        'details' => '既存のテンプレートを更新するか、削除してから作成してください',
                    ],
                ], 422);
            }

            // テンプレート作成
            $template = NotificationTemplate::create([
                'store_id' => $storeId,
                'type' => $validated['type'],
                'industry_type' => $validated['industry_type'],
                'title' => $validated['title'],
                'message' => $validated['message'],
                'message_type' => $validated['message_type'] ?? NotificationTemplate::MESSAGE_TYPE_TEXT,
                'rich_content' => $validated['rich_content'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'description' => $validated['description'] ?? null,
                'created_by' => Auth::id(),
            ]);

            Log::info('通知テンプレート作成成功', [
                'store_id' => $storeId,
                'template_id' => $template->id,
                'type' => $template->type,
                'industry_type' => $template->industry_type,
                'created_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'template' => new NotificationTemplateResource($template),
                ],
                'message' => '通知テンプレートを作成しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ], 201);

        } catch (ValidationException $e) {
            Log::warning('通知テンプレート作成バリデーションエラー', [
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
            Log::error('通知テンプレート作成エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_CREATE_ERROR',
                    'message' => 'テンプレートの作成に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * 通知テンプレート更新
     * 
     * PUT /api/v1/notification-templates/{id}
     * 
     * @param Request $request
     * @param int $id テンプレートID
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            $template = NotificationTemplate::where('store_id', $storeId)
                ->findOrFail($id);

            // バリデーション
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:200',
                'message' => 'sometimes|required|string|max:2000',
                'message_type' => 'sometimes|string|in:text,rich',
                'rich_content' => 'nullable|array',
                'is_active' => 'sometimes|boolean',
                'description' => 'nullable|string|max:500',
            ]);

            // テンプレート更新
            $template->update(array_merge($validated, [
                'updated_by' => Auth::id(),
            ]));

            Log::info('通知テンプレート更新成功', [
                'store_id' => $storeId,
                'template_id' => $id,
                'type' => $template->type,
                'updated_fields' => array_keys($validated),
                'updated_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'template' => new NotificationTemplateResource($template->fresh()),
                ],
                'message' => 'テンプレートを更新しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('更新対象テンプレートが見つからない', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_NOT_FOUND',
                    'message' => '指定されたテンプレートが見つかりません',
                ],
            ], 404);

        } catch (ValidationException $e) {
            Log::warning('通知テンプレート更新バリデーションエラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
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
            Log::error('通知テンプレート更新エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_UPDATE_ERROR',
                    'message' => 'テンプレートの更新に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * 通知テンプレート削除
     * 
     * DELETE /api/v1/notification-templates/{id}
     * 
     * @param int $id テンプレートID
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            $template = NotificationTemplate::where('store_id', $storeId)
                ->findOrFail($id);

            // 使用中のテンプレートは削除不可チェック
            if ($template->usage_count > 0) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'TEMPLATE_IN_USE',
                        'message' => 'このテンプレートは使用中のため削除できません',
                        'details' => "使用回数: {$template->usage_count}回",
                    ],
                ], 422);
            }

            $templateInfo = [
                'id' => $template->id,
                'type' => $template->type,
                'title' => $template->title,
            ];

            $template->delete();

            Log::info('通知テンプレート削除成功', [
                'store_id' => $storeId,
                'template_info' => $templateInfo,
                'deleted_by' => Auth::id(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'deleted_template' => $templateInfo,
                ],
                'message' => 'テンプレートを削除しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('削除対象テンプレートが見つからない', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_NOT_FOUND',
                    'message' => '指定されたテンプレートが見つかりません',
                ],
            ], 404);

        } catch (\Throwable $e) {
            Log::error('通知テンプレート削除エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_DELETE_ERROR',
                    'message' => 'テンプレートの削除に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * テンプレートプレビュー生成
     * 
     * POST /api/v1/notification-templates/{id}/preview
     * 
     * @param Request $request
     * @param int $id テンプレートID
     * @return JsonResponse
     */
    public function preview(Request $request, int $id): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            $template = NotificationTemplate::where('store_id', $storeId)
                ->findOrFail($id);

            // バリデーション
            $validated = $request->validate([
                'variables' => 'required|array',
                'variables.customer_name' => 'nullable|string',
                'variables.booking_number' => 'nullable|string',
                'variables.booking_date' => 'nullable|string',
                'variables.booking_time' => 'nullable|string',
                'variables.menu_name' => 'nullable|string',
                'variables.total_price' => 'nullable|string',
                'variables.store_name' => 'nullable|string',
            ]);

            // テンプレート変数置換実行
            $preview = $template->replaceVariables($validated['variables']);

            // LINEメッセージプレビュー生成
            $lineMessages = [];
            if ($template->message_type === NotificationTemplate::MESSAGE_TYPE_RICH) {
                $rich = $template->generateRichMessage($validated['variables']);
                if ($rich) {
                    $lineMessages = $rich['messages'] ?? [];
                }
            }

            // フォールバック: テキストメッセージ
            if (empty($lineMessages)) {
                $lineMessages[] = [
                    'type' => 'text',
                    'text' => $preview['message'],
                ];
            }

            Log::info('テンプレートプレビュー生成成功', [
                'store_id' => $storeId,
                'template_id' => $id,
                'variables' => $validated['variables'],
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'preview' => [
                        'title' => $preview['title'],
                        'message' => $preview['message'],
                        'line_messages' => $lineMessages,
                        'original_title' => $template->title,
                        'original_message' => $template->message,
                        'variables_used' => $validated['variables'],
                    ],
                ],
                'message' => 'プレビューを生成しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                    'version' => '1.0',
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            Log::warning('プレビュー対象テンプレートが見つからない', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_NOT_FOUND',
                    'message' => '指定されたテンプレートが見つかりません',
                ],
            ], 404);

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
            Log::error('テンプレートプレビュー生成エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'template_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TEMPLATE_PREVIEW_ERROR',
                    'message' => 'プレビューの生成に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * デフォルトテンプレート取得
     * 
     * GET /api/v1/notification-templates/defaults
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function defaults(Request $request): JsonResponse
    {
        try {
            $storeId = Auth::user()->store_id;

            // バリデーション
            $validated = $request->validate([
                'industry_type' => 'nullable|string|in:beauty,clinic,rental,school,activity',
                'type' => 'nullable|string|in:booking_confirmed,booking_reminder,booking_cancelled,booking_updated,payment_completed',
            ]);

            // デフォルトテンプレート取得
            $defaultTemplates = NotificationTemplate::getDefaultTemplates();

            // フィルタリング
            if (!empty($validated['industry_type'])) {
                $defaultTemplates = [$validated['industry_type'] => $defaultTemplates[$validated['industry_type']] ?? []];
            }

            if (!empty($validated['type'])) {
                foreach ($defaultTemplates as $industry => $templates) {
                    $defaultTemplates[$industry] = [$validated['type'] => $templates[$validated['type']] ?? null];
                    if (is_null($defaultTemplates[$industry][$validated['type']])) {
                        unset($defaultTemplates[$industry]);
                    }
                }
            }

            Log::info('デフォルトテンプレート取得成功', [
                'store_id' => $storeId,
                'filters' => $validated,
                'template_count' => array_sum(array_map('count', $defaultTemplates)),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'default_templates' => $defaultTemplates,
                    'available_variables' => [
                        'customer_name' => '顧客名',
                        'booking_number' => '予約番号',
                        'booking_date' => '予約日',
                        'booking_time' => '予約時間',
                        'menu_name' => 'メニュー名',
                        'total_price' => '合計金額',
                        'store_name' => '店舗名',
                    ],
                ],
                'message' => 'デフォルトテンプレートを取得しました',
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
            Log::error('デフォルトテンプレート取得エラー', [
                'store_id' => Auth::user()->store_id ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'DEFAULT_TEMPLATE_ERROR',
                    'message' => 'デフォルトテンプレートの取得に失敗しました',
                ],
            ], 500);
        }
    }
}
