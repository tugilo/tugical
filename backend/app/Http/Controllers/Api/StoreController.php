<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * 店舗設定APIコントローラー
 * 
 * 店舗固有の設定（時間スロット、営業時間等）の管理
 * マルチテナント対応でセキュアな設定更新を提供
 * 
 * Phase 21.3: 5分刻み時間スロット設定システム対応
 */
class StoreController extends Controller
{
    /**
     * 時間スロット設定を取得
     * 
     * @return JsonResponse 時間スロット設定
     */
    public function getTimeSlotSettings(): JsonResponse
    {
        try {
            $store = $this->getCurrentStore();

            if (!$store) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'STORE_NOT_FOUND',
                        'message' => '店舗情報が見つかりません'
                    ]
                ], 404);
            }

            $settings = $store->getTimeSlotSettings();

            return response()->json([
                'success' => true,
                'data' => [
                    'time_slot_settings' => $settings,
                    'store_info' => [
                        'id' => $store->id,
                        'name' => $store->name,
                        'industry_type' => $store->industry_type,
                    ]
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('時間スロット設定取得エラー', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
                'store_id' => Auth::user()->store_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'SYSTEM_ERROR',
                    'message' => '設定の取得に失敗しました'
                ]
            ], 500);
        }
    }

    /**
     * 時間スロット設定を更新
     * 
     * @param Request $request 更新データ
     * @return JsonResponse 更新結果
     */
    public function updateTimeSlotSettings(Request $request): JsonResponse
    {
        try {
            $store = $this->getCurrentStore();

            if (!$store) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'STORE_NOT_FOUND',
                        'message' => '店舗情報が見つかりません'
                    ]
                ], 404);
            }

            // バリデーション
            $validated = $request->validate([
                'slot_duration_minutes' => 'nullable|integer|min:5|max:480',
                'slot_label_interval_minutes' => 'nullable|integer|min:15|max:240',
                'min_slot_duration' => 'nullable|integer|min:5|max:60',
                'max_slot_duration' => 'nullable|integer|min:60|max:480',
                'available_durations' => 'nullable|array',
                'available_durations.*' => 'integer|min:5|max:480',
                'business_hours.start' => 'nullable|date_format:H:i',
                'business_hours.end' => 'nullable|date_format:H:i',
                'display_format' => 'nullable|string|in:H:i,g:i A',
                'timezone' => 'nullable|string',
            ], [
                'slot_duration_minutes.min' => '時間スロットは5分以上で設定してください',
                'slot_duration_minutes.max' => '時間スロットは8時間（480分）以下で設定してください',
                'available_durations.*.min' => '選択可能時間は5分以上で設定してください',
                'available_durations.*.max' => '選択可能時間は8時間（480分）以下で設定してください',
                'business_hours.start.date_format' => '営業開始時間は HH:MM 形式で入力してください',
                'business_hours.end.date_format' => '営業終了時間は HH:MM 形式で入力してください',
            ]);

            // 設定更新
            $updateSuccess = $store->updateTimeSlotSettings($validated);

            if (!$updateSuccess) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'UPDATE_FAILED',
                        'message' => '設定の更新に失敗しました'
                    ]
                ], 422);
            }

            // 更新後の設定を取得
            $updatedSettings = $store->fresh()->getTimeSlotSettings();

            // 監査ログ記録
            \Log::info('時間スロット設定更新', [
                'store_id' => $store->id,
                'user_id' => Auth::id(),
                'old_settings' => $store->getOriginal('time_slot_settings'),
                'new_settings' => $validated,
                'updated_at' => now()->toISOString(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'time_slot_settings' => $updatedSettings,
                    'message' => '時間スロット設定を更新しました'
                ],
                'meta' => [
                    'timestamp' => now()->toISOString(),
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => '入力内容に誤りがあります',
                    'details' => $e->errors()
                ]
            ], 422);
        } catch (\Exception $e) {
            \Log::error('時間スロット設定更新エラー', [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
                'store_id' => Auth::user()->store_id ?? null,
                'request_data' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'SYSTEM_ERROR',
                    'message' => '設定の更新に失敗しました'
                ]
            ], 500);
        }
    }

    /**
     * 現在認証されているユーザーの店舗を取得
     * 
     * @return Store|null 店舗モデル
     */
    private function getCurrentStore(): ?Store
    {
        $user = Auth::user();

        if (!$user || !$user->store_id) {
            return null;
        }

        return Store::find($user->store_id);
    }
}
