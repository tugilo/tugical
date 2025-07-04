<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resource;
use App\Http\Resources\ResourceResource;
use App\Http\Requests\CreateResourceRequest;
use App\Http\Requests\UpdateResourceRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ResourceController
 * 
 * リソース管理API (CRUD)
 * 統一リソース概念によるスタッフ・部屋・設備・車両の統合管理
 * 
 * 主要機能:
 * - リソースCRUD操作（作成・一覧・詳細・更新・削除）
 * - タイプ別フィルタリング（staff/room/equipment/vehicle）
 * - 稼働時間・効率率・制約管理
 * - 業種別表示名対応
 * - 利用可能性チェック
 * - 表示順序管理
 * 
 * @package App\Http\Controllers\Api
 */
class ResourceController extends Controller
{
    /**
     * リソース一覧取得
     * GET /api/v1/resources
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;
            
            Log::info('リソース一覧取得開始', [
                'store_id' => $storeId,
                'filters' => $request->query()
            ]);

            // クエリビルダー開始
            $query = Resource::where('store_id', $storeId);

            // タイプフィルター
            if ($request->filled('type')) {
                $query->byType($request->type);
            }

            // アクティブ状態フィルター
            if ($request->filled('is_active')) {
                if ($request->boolean('is_active')) {
                    $query->active();
                } else {
                    $query->where('is_active', false);
                }
            }

            // 検索フィルター（名前・表示名・説明）
            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('display_name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // ソート順序
            $sortBy = $request->get('sort_by', 'sort_order');
            $sortOrder = $request->get('sort_order', 'asc');
            
            if ($sortBy === 'sort_order') {
                $query->ordered();
            } else {
                $query->orderBy($sortBy, $sortOrder);
            }

            // ページング
            $perPage = min(max(1, $request->integer('per_page', 20)), 100);
            $resources = $query->paginate($perPage);

            Log::info('リソース一覧取得完了', [
                'store_id' => $storeId,
                'total' => $resources->total(),
                'per_page' => $perPage
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'resources' => ResourceResource::collection($resources->items()),
                    'pagination' => [
                        'current_page' => $resources->currentPage(),
                        'from' => $resources->firstItem(),
                        'last_page' => $resources->lastPage(),
                        'per_page' => $resources->perPage(),
                        'to' => $resources->lastItem(),
                        'total' => $resources->total(),
                    ],
                    'links' => [
                        'first' => $resources->url(1),
                        'last' => $resources->url($resources->lastPage()),
                        'prev' => $resources->previousPageUrl(),
                        'next' => $resources->nextPageUrl(),
                    ],
                ],
                'message' => 'リソース一覧を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('リソース一覧取得エラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RESOURCE_LIST_ERROR',
                    'message' => 'リソース一覧の取得に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * リソース詳細取得
     * GET /api/v1/resources/{resource}
     * 
     * @param Resource $resource
     * @return JsonResponse
     */
    public function show(Resource $resource): JsonResponse
    {
        try {
            // マルチテナントチェック
            if ($resource->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'FORBIDDEN',
                        'message' => 'このリソース情報にアクセスする権限がありません',
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ],
                ], 403);
            }

            Log::info('リソース詳細取得', [
                'resource_id' => $resource->id,
                'store_id' => $resource->store_id,
                'type' => $resource->type
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'resource' => new ResourceResource($resource),
                ],
                'message' => 'リソース情報を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('リソース詳細取得エラー', [
                'resource_id' => $resource->id ?? null,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RESOURCE_DETAIL_ERROR',
                    'message' => 'リソース詳細の取得に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * リソース新規作成
     * POST /api/v1/resources
     * 
     * @param CreateResourceRequest $request
     * @return JsonResponse
     */
    public function store(CreateResourceRequest $request): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;

            Log::info('リソース作成開始', [
                'store_id' => $storeId,
                'type' => $request->type,
                'name' => $request->name
            ]);

            DB::beginTransaction();

            try {
                // リソース作成
                $resource = Resource::create([
                    'store_id' => $storeId,
                    'type' => $request->type,
                    'name' => $request->name,
                    'display_name' => $request->display_name ?? $request->name,
                    'description' => $request->description,
                    'attributes' => $request->attributes ?? [],
                    'working_hours' => $request->working_hours ?? [],
                    'constraints' => $request->constraints ?? [],
                    'efficiency_rate' => $request->efficiency_rate ?? 1.0,
                    'hourly_rate_diff' => $request->hourly_rate_diff ?? 0,
                    'capacity' => $request->capacity ?? ($request->type === 'staff' ? 1 : 10),
                    'equipment_specs' => $request->equipment_specs ?? [],
                    'booking_rules' => $request->booking_rules ?? [],
                    'image_url' => $request->image_url,
                    'is_active' => $request->is_active ?? true,
                    'sort_order' => $request->sort_order,
                ]);

                DB::commit();

                Log::info('リソース作成完了', [
                    'resource_id' => $resource->id,
                    'store_id' => $storeId,
                    'type' => $resource->type,
                    'name' => $resource->name
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'resource' => new ResourceResource($resource),
                    ],
                    'message' => 'リソースが作成されました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ],
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('リソース作成エラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RESOURCE_CREATE_ERROR',
                    'message' => 'リソースの作成に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : null
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * リソース更新
     * PUT /api/v1/resources/{resource}
     * 
     * @param UpdateResourceRequest $request
     * @param Resource $resource
     * @return JsonResponse
     */
    public function update(UpdateResourceRequest $request, Resource $resource): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;

            Log::info('リソース更新開始', [
                'resource_id' => $resource->id,
                'store_id' => $storeId,
                'changes' => $request->validated()
            ]);

            DB::beginTransaction();

            try {
                // 更新データの準備
                $updateData = array_filter($request->validated(), function($value) {
                    return $value !== null;
                });

                // タイプ変更の場合、追加バリデーション
                if (isset($updateData['type']) && $updateData['type'] !== $resource->type) {
                    // 予約があるリソースのタイプ変更は禁止
                    $hasBookings = $resource->bookings()->exists();
                    if ($hasBookings) {
                        return response()->json([
                            'success' => false,
                            'error' => [
                                'code' => 'TYPE_CHANGE_FORBIDDEN',
                                'message' => '予約履歴があるリソースのタイプは変更できません'
                            ],
                            'meta' => [
                                'timestamp' => now()->toISOString()
                            ]
                        ], 422);
                    }
                }

                // 配列フィールドの特別な処理
                $arrayFields = ['attributes', 'working_hours', 'constraints', 'equipment_specs', 'booking_rules'];
                foreach ($arrayFields as $field) {
                    if (isset($updateData[$field])) {
                        // 既存データとマージするか完全置換するかの判定
                        if (is_array($updateData[$field]) && !empty($resource->{$field})) {
                            // 特定のキーのみ更新する場合はマージ
                            if ($request->boolean('merge_' . $field, false)) {
                                $updateData[$field] = array_merge($resource->{$field}, $updateData[$field]);
                            }
                        }
                    }
                }

                // リソース更新
                $resource->update($updateData);

                // 更新後の最新データを取得
                $resource->refresh();

                DB::commit();

                Log::info('リソース更新完了', [
                    'resource_id' => $resource->id,
                    'store_id' => $storeId,
                    'updated_fields' => array_keys($updateData)
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'resource' => new ResourceResource($resource),
                    ],
                    'message' => 'リソースが更新されました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ],
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('リソース更新エラー', [
                'resource_id' => $resource->id ?? null,
                'store_id' => auth()->user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RESOURCE_UPDATE_ERROR',
                    'message' => 'リソースの更新に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : null
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * リソース削除
     * DELETE /api/v1/resources/{resource}
     * 
     * @param Resource $resource
     * @return JsonResponse
     */
    public function destroy(Resource $resource): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;

            // マルチテナントチェック
            if ($resource->store_id !== $storeId) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'FORBIDDEN',
                        'message' => 'このリソースを削除する権限がありません',
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ],
                ], 403);
            }

            Log::info('リソース削除開始', [
                'resource_id' => $resource->id,
                'store_id' => $storeId,
                'type' => $resource->type,
                'name' => $resource->name
            ]);

            // アクティブな予約がある場合は削除を禁止
            $activeBookings = $resource->bookings()
                ->whereIn('status', ['confirmed', 'pending'])
                ->where(function ($query) {
                    $query->where('booking_date', '>', now()->toDateString())
                          ->orWhere(function ($q) {
                              $q->where('booking_date', now()->toDateString())
                                ->where('end_time', '>', now()->toTimeString());
                          });
                })
                ->count();

            if ($activeBookings > 0) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'ACTIVE_BOOKINGS_EXIST',
                        'message' => 'アクティブな予約があるため、このリソースは削除できません',
                        'details' => [
                            'active_bookings_count' => $activeBookings,
                            'suggestion' => 'リソースを無効化することを検討してください'
                        ]
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString()
                    ]
                ], 422);
            }

            DB::beginTransaction();

            try {
                // 過去の予約履歴がある場合はソフトデリート
                $hasBookingHistory = $resource->bookings()->exists();
                
                if ($hasBookingHistory) {
                    // ソフトデリート（論理削除）
                    $resource->delete();
                    $deletionType = 'soft';
                } else {
                    // 完全削除（物理削除）
                    $resource->forceDelete();
                    $deletionType = 'hard';
                }

                DB::commit();

                Log::info('リソース削除完了', [
                    'resource_id' => $resource->id,
                    'store_id' => $storeId,
                    'deletion_type' => $deletionType,
                    'had_booking_history' => $hasBookingHistory
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'deleted_resource_id' => $resource->id,
                        'deletion_type' => $deletionType,
                    ],
                    'message' => 'リソースが削除されました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ],
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            Log::error('リソース削除エラー', [
                'resource_id' => $resource->id ?? null,
                'store_id' => auth()->user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RESOURCE_DELETE_ERROR',
                    'message' => 'リソースの削除に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : null
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * リソース表示順序更新
     * PATCH /api/v1/resources/order
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function updateOrder(Request $request): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;

            // バリデーション
            $request->validate([
                'resources' => 'required|array|min:1',
                'resources.*.id' => 'required|integer|exists:resources,id',
                'resources.*.sort_order' => 'required|integer|min:0',
            ], [
                'resources.required' => 'リソース情報は必須です',
                'resources.array' => 'リソース情報は配列形式で入力してください',
                'resources.min' => '少なくとも1つのリソースが必要です',
                'resources.*.id.required' => 'リソースIDは必須です',
                'resources.*.id.exists' => '指定されたリソースが見つかりません',
                'resources.*.sort_order.required' => '表示順序は必須です',
                'resources.*.sort_order.integer' => '表示順序は整数で入力してください',
                'resources.*.sort_order.min' => '表示順序は0以上で入力してください',
            ]);

            $resourceUpdates = $request->resources;

            Log::info('リソース表示順序更新開始', [
                'store_id' => $storeId,
                'resources_count' => count($resourceUpdates)
            ]);

            DB::beginTransaction();

            try {
                $updatedCount = 0;
                $resourceIds = collect($resourceUpdates)->pluck('id')->toArray();

                // 店舗に属するリソースのみを対象とする
                $validResources = Resource::where('store_id', $storeId)
                    ->whereIn('id', $resourceIds)
                    ->get()
                    ->keyBy('id');

                // 権限のないリソースがある場合はエラー
                $invalidResourceIds = array_diff($resourceIds, $validResources->keys()->toArray());
                if (!empty($invalidResourceIds)) {
                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'FORBIDDEN_RESOURCES',
                            'message' => '一部のリソースにアクセス権限がありません',
                            'details' => [
                                'invalid_resource_ids' => $invalidResourceIds
                            ]
                        ],
                        'meta' => [
                            'timestamp' => now()->toISOString()
                        ]
                    ], 403);
                }

                // 各リソースの表示順序を更新
                foreach ($resourceUpdates as $resourceUpdate) {
                    $resource = $validResources->get($resourceUpdate['id']);
                    if ($resource) {
                        $resource->update(['sort_order' => $resourceUpdate['sort_order']]);
                        $updatedCount++;
                    }
                }

                DB::commit();

                Log::info('リソース表示順序更新完了', [
                    'store_id' => $storeId,
                    'updated_count' => $updatedCount
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'updated_count' => $updatedCount,
                        'resources' => ResourceResource::collection($validResources->values()),
                    ],
                    'message' => 'リソースの表示順序が更新されました',
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ],
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
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
            Log::error('リソース表示順序更新エラー', [
                'store_id' => auth()->user()->store_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_UPDATE_ERROR',
                    'message' => 'リソース表示順序の更新に失敗しました',
                    'details' => app()->environment('local') ? $e->getMessage() : null
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }

    /**
     * リソースタイプ一覧取得
     * GET /api/v1/resources/types
     * 
     * @return JsonResponse
     */
    public function getTypes(): JsonResponse
    {
        try {
            $types = Resource::getAvailableTypes();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'types' => $types,
                ],
                'message' => 'リソースタイプ一覧を取得しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('リソースタイプ取得エラー', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TYPES_ERROR',
                    'message' => 'リソースタイプの取得に失敗しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString()
                ]
            ], 500);
        }
    }
}
