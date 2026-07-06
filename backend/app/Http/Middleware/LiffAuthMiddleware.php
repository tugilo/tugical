<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Store;
use App\Models\Customer;

/**
 * LIFF認証ミドルウェア
 * 
 * LINE認証とマルチテナント対応
 * X-Line-User-Id と X-Store-Id ヘッダーの検証
 */
class LiffAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // LINE認証ヘッダーの検証
        $lineUserId = $request->header('X-Line-User-Id');
        $storeId = $request->header('X-Store-Id');

        // 店舗情報取得エンドポイントは認証不要
        if ($request->route()->getName() === 'liff.stores.show') {
            return $next($request);
        }

        // 必須ヘッダーの検証
        if (!$lineUserId) {
            return response()->json([
                'success' => false,
                'message' => 'LINE認証が必要です',
                'error' => [
                    'code' => 'LINE_AUTH_REQUIRED',
                    'details' => 'X-Line-User-Id ヘッダーが不足しています'
                ]
            ], 401);
        }

        if (!$storeId) {
            return response()->json([
                'success' => false,
                'message' => '店舗IDが必要です',
                'error' => [
                    'code' => 'STORE_ID_REQUIRED',
                    'details' => 'X-Store-Id ヘッダーが不足しています'
                ]
            ], 400);
        }

        // 店舗の存在確認
        $store = Store::find($storeId);
        if (!$store) {
            return response()->json([
                'success' => false,
                'message' => '指定された店舗が見つかりません',
                'error' => [
                    'code' => 'STORE_NOT_FOUND',
                    'details' => '店舗ID: ' . $storeId
                ]
            ], 404);
        }

        // 店舗がアクティブかチェック
        if (!$store->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'この店舗は現在利用できません',
                'error' => [
                    'code' => 'STORE_INACTIVE',
                    'details' => '店舗が非アクティブ状態です'
                ]
            ], 403);
        }

        // 顧客の存在確認（新規顧客の場合は作成される）
        $customer = Customer::where('line_user_id', $lineUserId)
            ->where('store_id', $storeId)
            ->first();

        // 顧客が制限されているかチェック
        if ($customer && $customer->is_restricted) {
            return response()->json([
                'success' => false,
                'message' => '予約が制限されています',
                'error' => [
                    'code' => 'CUSTOMER_RESTRICTED',
                    'details' => 'このアカウントは予約が制限されています'
                ]
            ], 403);
        }

        // リクエストに店舗と顧客情報を追加
        $request->merge([
            'current_store' => $store,
            'current_customer' => $customer
        ]);

        return $next($request);
    }
} 