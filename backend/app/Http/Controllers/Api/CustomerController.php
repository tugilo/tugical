<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Http\Resources\CustomerResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

/**
 * CustomerController
 * 
 * 顧客管理 API (一覧のみ)
 * Phase 4.2 フロント顧客一覧要求に対応する最小実装
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
            'data' => CustomerResource::collection($customers),
            'message' => '顧客一覧を取得しました',
            'meta' => [
                'timestamp' => now()->toISOString(),
            ],
        ]);
    }
} 