<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Http\Resources\CustomerResource;
use App\Http\Requests\CreateCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * CustomerController
 * 
 * 顧客管理 API (CRUD)
 * Phase 4.2 フロント顧客管理機能の完全実装
 *
 * @package App\Http\Controllers\Api
 */
class CustomerController extends Controller
{
    /**
     * 顧客一覧取得
     * GET /api/v1/customers
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $storeId = Auth::user()->store_id;

        // フィルタリング
        $query = Customer::query()->where('store_id', $storeId);

        if ($keyword = $request->get('search')) {
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                  ->orWhere('phone', 'like', "%{$keyword}%")
                  ->orWhere('email', 'like', "%{$keyword}%");
            });
        }

        if ($status = $request->get('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $perPage = min(max(1, intval($request->get('per_page', 20))), 100);
        $customers = $query->orderByDesc('created_at')->paginate($perPage);

        Log::info('顧客一覧取得', [
            'store_id' => $storeId,
            'total' => $customers->total(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'data' => CustomerResource::collection($customers),
                'meta' => [
                    'current_page' => $customers->currentPage(),
                    'from' => $customers->firstItem(),
                    'last_page' => $customers->lastPage(),
                    'per_page' => $customers->perPage(),
                    'to' => $customers->lastItem(),
                    'total' => $customers->total(),
                ],
                'links' => [
                    'first' => $customers->url(1),
                    'last' => $customers->url($customers->lastPage()),
                    'prev' => $customers->previousPageUrl(),
                    'next' => $customers->nextPageUrl(),
                ],
            ],
            'message' => '顧客一覧を取得しました',
            'meta' => [
                'timestamp' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * 顧客詳細取得
     * GET /api/v1/customers/{customer}
     *
     * @param Customer $customer
     * @return JsonResponse
     */
    public function show(Customer $customer): JsonResponse
    {
        // 店舗IDの確認（マルチテナント対応）
        if ($customer->store_id !== Auth::user()->store_id) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'この顧客情報にアクセスする権限がありません',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 403);
        }

        Log::info('顧客詳細取得', [
            'customer_id' => $customer->id,
            'store_id' => $customer->store_id,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'customer' => new CustomerResource($customer),
            ],
            'message' => '顧客情報を取得しました',
            'meta' => [
                'timestamp' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * 顧客新規作成
     * POST /api/v1/customers
     *
     * @param CreateCustomerRequest $request
     * @return JsonResponse
     */
    public function store(CreateCustomerRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $customerData = array_merge($request->validated(), [
                'store_id' => Auth::user()->store_id,
            ]);

            $customer = Customer::create($customerData);

            DB::commit();

            Log::info('顧客作成', [
                'customer_id' => $customer->id,
                'store_id' => $customer->store_id,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'customer' => new CustomerResource($customer),
                ],
                'message' => '顧客を登録しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('顧客作成エラー', [
                'error' => $e->getMessage(),
                'store_id' => Auth::user()->store_id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CUSTOMER_CREATE_ERROR',
                    'message' => '顧客の登録に失敗しました',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 500);
        }
    }

    /**
     * 顧客情報更新
     * PUT /api/v1/customers/{customer}
     *
     * @param UpdateCustomerRequest $request
     * @param Customer $customer
     * @return JsonResponse
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        // 店舗IDの確認（マルチテナント対応）
        if ($customer->store_id !== Auth::user()->store_id) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'この顧客情報を更新する権限がありません',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 403);
        }

        try {
            DB::beginTransaction();

            $customer->update($request->validated());

            DB::commit();

            Log::info('顧客更新', [
                'customer_id' => $customer->id,
                'store_id' => $customer->store_id,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'customer' => new CustomerResource($customer),
                ],
                'message' => '顧客情報を更新しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('顧客更新エラー', [
                'error' => $e->getMessage(),
                'customer_id' => $customer->id,
                'store_id' => $customer->store_id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CUSTOMER_UPDATE_ERROR',
                    'message' => '顧客情報の更新に失敗しました',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 500);
        }
    }

    /**
     * 顧客削除（ソフトデリート）
     * DELETE /api/v1/customers/{customer}
     *
     * @param Customer $customer
     * @return JsonResponse
     */
    public function destroy(Customer $customer): JsonResponse
    {
        // 店舗IDの確認（マルチテナント対応）
        if ($customer->store_id !== Auth::user()->store_id) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'この顧客を削除する権限がありません',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 403);
        }

        try {
            // 予約がある場合は削除不可
            if ($customer->bookings()->exists()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'CUSTOMER_HAS_BOOKINGS',
                        'message' => '予約履歴がある顧客は削除できません',
                    ],
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                    ],
                ], 422);
            }

            $customer->delete(); // ソフトデリート

            Log::info('顧客削除', [
                'customer_id' => $customer->id,
                'store_id' => $customer->store_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => '顧客を削除しました',
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('顧客削除エラー', [
                'error' => $e->getMessage(),
                'customer_id' => $customer->id,
                'store_id' => $customer->store_id,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CUSTOMER_DELETE_ERROR',
                    'message' => '顧客の削除に失敗しました',
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ],
            ], 500);
        }
    }
} 