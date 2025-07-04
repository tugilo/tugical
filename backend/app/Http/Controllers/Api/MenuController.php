<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateMenuRequest;
use App\Http\Requests\UpdateMenuRequest;
use App\Http\Resources\MenuResource;
use App\Models\Menu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * メニュー管理コントローラー
 * 
 * サービスメニューとオプションの統合管理
 * 業種別テンプレート、価格設定、制約管理を含む
 */
class MenuController extends Controller
{
    /**
     * メニュー一覧取得
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;
            
            // クエリビルダー開始
            $query = Menu::where('store_id', $storeId)
                ->with(['options' => function($q) {
                    $q->active()->ordered();
                }]);

            // 検索フィルター
            if ($request->filled('search')) {
                $query->search($request->search);
            }

            // カテゴリフィルター
            if ($request->filled('category')) {
                $query->byCategory($request->category);
            }

            // アクティブ状態フィルター
            if ($request->filled('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            // 価格帯フィルター
            if ($request->filled('min_price')) {
                $query->where('base_price', '>=', $request->min_price);
            }
            if ($request->filled('max_price')) {
                $query->where('base_price', '<=', $request->max_price);
            }

            // 時間帯フィルター
            if ($request->filled('min_duration')) {
                $query->where('base_duration', '>=', $request->min_duration);
            }
            if ($request->filled('max_duration')) {
                $query->where('base_duration', '<=', $request->max_duration);
            }

            // ソート
            $sortBy = $request->get('sort_by', 'sort_order');
            $sortOrder = $request->get('sort_order', 'asc');
            
            if ($sortBy === 'sort_order') {
                $query->ordered();
            } else {
                $query->orderBy($sortBy, $sortOrder);
            }

            // ページネーション
            $perPage = min($request->get('per_page', 20), 100);
            $menus = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'menus' => MenuResource::collection($menus->items()),
                    'pagination' => [
                        'current_page' => $menus->currentPage(),
                        'last_page' => $menus->lastPage(),
                        'per_page' => $menus->perPage(),
                        'total' => $menus->total(),
                    ],
                ],
                'message' => 'メニュー一覧を取得しました',
            ]);

        } catch (\Exception $e) {
            Log::error('メニュー一覧取得エラー', [
                'error' => $e->getMessage(),
                'store_id' => auth()->user()->store_id ?? null,
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MENU_INDEX_ERROR',
                    'message' => 'メニュー一覧の取得に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * メニュー詳細取得
     * 
     * @param Menu $menu
     * @return JsonResponse
     */
    public function show(Menu $menu): JsonResponse
    {
        try {
            // マルチテナント確認
            if ($menu->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'MENU_NOT_FOUND',
                        'message' => 'メニューが見つかりません',
                    ],
                ], 404);
            }

            $menu->load(['options' => function($q) {
                $q->ordered();
            }, 'store']);

            return response()->json([
                'success' => true,
                'data' => [
                    'menu' => new MenuResource($menu),
                ],
                'message' => 'メニュー詳細を取得しました',
            ]);

        } catch (\Exception $e) {
            Log::error('メニュー詳細取得エラー', [
                'error' => $e->getMessage(),
                'menu_id' => $menu->id ?? null,
                'store_id' => auth()->user()->store_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MENU_SHOW_ERROR',
                    'message' => 'メニュー詳細の取得に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * メニュー作成
     * 
     * @param CreateMenuRequest $request
     * @return JsonResponse
     */
    public function store(CreateMenuRequest $request): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;

            $menu = DB::transaction(function () use ($request, $storeId) {
                // sort_order のデフォルト値を計算（最大値 + 1）
                $maxSortOrder = Menu::where('store_id', $storeId)->max('sort_order') ?? 0;
                
                // メニュー作成
                $menu = Menu::create([
                    'store_id' => $storeId,
                    'name' => $request->name,
                    'display_name' => $request->display_name ?? $request->name,
                    'category' => $request->category,
                    'description' => $request->description,
                    'base_price' => $request->base_price,
                    'base_duration' => $request->base_duration,
                    'prep_duration' => $request->prep_duration ?? 0,
                    'cleanup_duration' => $request->cleanup_duration ?? 0,
                    'advance_booking_hours' => $request->advance_booking_hours ?? 1,
                    'booking_rules' => $request->booking_constraints,
                    'required_resources' => $request->resource_requirements,
                    'settings' => $request->industry_settings,
                    'gender_restriction' => $request->gender_restriction ?? 'none',
                    'image_url' => $request->image_url,
                    'is_active' => $request->is_active ?? true,
                    'require_approval' => $request->requires_approval ?? false,
                    'sort_order' => $request->sort_order ?? ($maxSortOrder + 1),
                ]);

                // オプション作成
                if ($request->filled('options')) {
                    foreach ($request->options as $index => $optionData) {
                        $menu->options()->create([
                            'name' => $optionData['name'],
                            'display_name' => $optionData['display_name'] ?? $optionData['name'],
                            'description' => $optionData['description'] ?? null,
                            'option_type' => $optionData['option_type'] ?? 'addon',
                            'pricing_type' => $optionData['price_type'] ?? 'fixed',
                            'price' => $optionData['price_value'] ?? 0,
                            'duration' => $optionData['duration_minutes'] ?? 0,
                            'stock_quantity' => $optionData['stock_quantity'] ?? null,
                            'is_required' => $optionData['is_required'] ?? false,
                            'is_active' => $optionData['is_active'] ?? true,
                            'sort_order' => $optionData['sort_order'] ?? ($index + 1),
                        ]);
                    }
                }

                return $menu;
            });

            $menu->load(['options' => function($q) {
                $q->ordered();
            }]);

            return response()->json([
                'success' => true,
                'data' => [
                    'menu' => new MenuResource($menu),
                ],
                'message' => 'メニューを作成しました',
            ], 201);

        } catch (\Exception $e) {
            Log::error('メニュー作成エラー', [
                'error' => $e->getMessage(),
                'request' => $request->all(),
                'store_id' => auth()->user()->store_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MENU_CREATE_ERROR',
                    'message' => 'メニューの作成に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * メニュー更新
     * 
     * @param UpdateMenuRequest $request
     * @param Menu $menu
     * @return JsonResponse
     */
    public function update(UpdateMenuRequest $request, Menu $menu): JsonResponse
    {
        try {
            // マルチテナント確認
            if ($menu->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'MENU_NOT_FOUND',
                        'message' => 'メニューが見つかりません',
                    ],
                ], 404);
            }

            DB::transaction(function () use ($request, $menu) {
                // メニュー更新
                $menu->update([
                    'name' => $request->name ?? $menu->name,
                    'display_name' => $request->display_name ?? $menu->display_name,
                    'category' => $request->category ?? $menu->category,
                    'description' => $request->description ?? $menu->description,
                    'base_price' => $request->base_price ?? $menu->base_price,
                    'base_duration' => $request->base_duration ?? $menu->base_duration,
                    'prep_duration' => $request->prep_duration ?? $menu->prep_duration,
                    'cleanup_duration' => $request->cleanup_duration ?? $menu->cleanup_duration,
                    'advance_booking_hours' => $request->advance_booking_hours ?? $menu->advance_booking_hours,
                    'booking_rules' => $request->booking_constraints ?? $menu->booking_rules,
                    'required_resources' => $request->resource_requirements ?? $menu->required_resources,
                    'settings' => $request->industry_settings ?? $menu->settings,
                    'gender_restriction' => $request->gender_restriction ?? $menu->gender_restriction,
                    'image_url' => $request->image_url ?? $menu->image_url,
                    'is_active' => $request->is_active ?? $menu->is_active,
                    'require_approval' => $request->requires_approval ?? $menu->require_approval,
                    'sort_order' => $request->sort_order ?? $menu->sort_order,
                ]);

                // オプション更新（完全置換）
                if ($request->has('options')) {
                    // 既存オプションを削除
                    $menu->options()->delete();
                    
                    // 新しいオプションを作成
                    foreach ($request->options as $index => $optionData) {
                        $menu->options()->create([
                            'name' => $optionData['name'],
                            'display_name' => $optionData['display_name'] ?? $optionData['name'],
                            'description' => $optionData['description'] ?? null,
                            'option_type' => $optionData['option_type'] ?? 'addon',
                            'pricing_type' => $optionData['price_type'] ?? 'fixed',
                            'price' => $optionData['price_value'] ?? 0,
                            'duration' => $optionData['duration_minutes'] ?? 0,
                            'stock_quantity' => $optionData['stock_quantity'] ?? null,
                            'is_required' => $optionData['is_required'] ?? false,
                            'is_active' => $optionData['is_active'] ?? true,
                            'sort_order' => $optionData['sort_order'] ?? ($index + 1),
                        ]);
                    }
                }
            });

            $menu->load(['options' => function($q) {
                $q->ordered();
            }]);

            return response()->json([
                'success' => true,
                'data' => [
                    'menu' => new MenuResource($menu),
                ],
                'message' => 'メニューを更新しました',
            ]);

        } catch (\Exception $e) {
            Log::error('メニュー更新エラー', [
                'error' => $e->getMessage(),
                'menu_id' => $menu->id ?? null,
                'request' => $request->all(),
                'store_id' => auth()->user()->store_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MENU_UPDATE_ERROR',
                    'message' => 'メニューの更新に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * メニュー削除
     * 
     * @param Menu $menu
     * @return JsonResponse
     */
    public function destroy(Menu $menu): JsonResponse
    {
        try {
            // マルチテナント確認
            if ($menu->store_id !== auth()->user()->store_id) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'MENU_NOT_FOUND',
                        'message' => 'メニューが見つかりません',
                    ],
                ], 404);
            }

            // 予約履歴チェック
            $bookingCount = $menu->bookings()->count();
            if ($bookingCount > 0) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'MENU_HAS_BOOKINGS',
                        'message' => 'このメニューには予約履歴があるため削除できません',
                        'details' => [
                            'booking_count' => $bookingCount,
                        ],
                    ],
                ], 422);
            }

            DB::transaction(function () use ($menu) {
                // オプションも一緒に削除（ソフトデリート）
                $menu->options()->delete();
                
                // メニュー削除（ソフトデリート）
                $menu->delete();
            });

            return response()->json([
                'success' => true,
                'message' => 'メニューを削除しました',
            ]);

        } catch (\Exception $e) {
            Log::error('メニュー削除エラー', [
                'error' => $e->getMessage(),
                'menu_id' => $menu->id ?? null,
                'store_id' => auth()->user()->store_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MENU_DELETE_ERROR',
                    'message' => 'メニューの削除に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * メニューカテゴリ一覧取得
     * 
     * @return JsonResponse
     */
    public function categories(): JsonResponse
    {
        try {
            $storeId = auth()->user()->store_id;
            
            // 実際に使用されているカテゴリ
            $usedCategories = Menu::where('store_id', $storeId)
                ->whereNotNull('category')
                ->distinct()
                ->pluck('category')
                ->toArray();

            // 業種別デフォルトカテゴリ
            $user = auth()->user();
            $store = $user->store;
            $industryType = $store->industry_type ?? 'beauty';
            $industryDefaults = Menu::getIndustryDefaults();
            $defaultCategories = $industryDefaults[$industryType]['categories'] ?? [];

            // マージして重複を除去
            $allCategories = array_unique(array_merge($defaultCategories, $usedCategories));
            sort($allCategories);

            return response()->json([
                'success' => true,
                'data' => [
                    'categories' => $allCategories,
                    'industry_type' => $industryType,
                    'used_categories' => $usedCategories,
                    'default_categories' => $defaultCategories,
                ],
                'message' => 'メニューカテゴリ一覧を取得しました',
            ]);

        } catch (\Exception $e) {
            Log::error('メニューカテゴリ取得エラー', [
                'error' => $e->getMessage(),
                'store_id' => auth()->user()->store_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MENU_CATEGORIES_ERROR',
                    'message' => 'メニューカテゴリの取得に失敗しました',
                ],
            ], 500);
        }
    }

    /**
     * メニュー表示順序更新
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function updateOrder(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'menu_orders' => 'required|array',
                'menu_orders.*.id' => 'required|integer|exists:menus,id',
                'menu_orders.*.sort_order' => 'required|integer|min:0',
            ]);

            $storeId = auth()->user()->store_id;

            DB::transaction(function () use ($request, $storeId) {
                foreach ($request->menu_orders as $order) {
                    Menu::where('id', $order['id'])
                        ->where('store_id', $storeId)
                        ->update(['sort_order' => $order['sort_order']]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'メニューの表示順序を更新しました',
            ]);

        } catch (\Exception $e) {
            Log::error('メニュー表示順序更新エラー', [
                'error' => $e->getMessage(),
                'request' => $request->all(),
                'store_id' => auth()->user()->store_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MENU_ORDER_UPDATE_ERROR',
                    'message' => 'メニューの表示順序更新に失敗しました',
                ],
            ], 500);
        }
    }
}
