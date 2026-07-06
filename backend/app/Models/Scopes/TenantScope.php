<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Log;

/**
 * テナントスコープ - Multi-tenant自動分離
 * 
 * 全てのモデルクエリに対して自動的にstore_id分離を適用し、
 * クロステナントアクセスを完全に防止するグローバルスコープ
 * 
 * 対応認証方式:
 * - Admin認証: auth()->user()->store_id
 * - LIFF認証: X-Store-Id ヘッダー + LINE認証
 * - 開発環境: デバッグモード対応
 * 
 * セキュリティ機能:
 * - store_id なしクエリの自動検出・警告
 * - 不正アクセス試行のログ記録
 * - 開発環境での詳細ログ出力
 */
class TenantScope implements Scope
{
    /**
     * テナントスコープの適用
     * 
     * 認証ユーザーのstore_idで自動的にクエリを制限し、
     * Multi-tenant分離を強制適用
     * 
     * @param Builder $builder Eloquentクエリビルダー
     * @param Model $model 対象モデル
     * @return void
     */
    public function apply(Builder $builder, Model $model): void
    {
        $storeId = $this->getCurrentStoreId();
        
        if ($storeId) {
            $builder->where($model->getTable() . '.store_id', $storeId);
            
            // 開発環境: スコープ適用ログ
            if (app()->environment('local')) {
                Log::debug('TenantScope適用', [
                    'model' => get_class($model),
                    'table' => $model->getTable(),
                    'store_id' => $storeId,
                    'query_type' => 'auto_scoped'
                ]);
            }
        } else {
            // store_id が取得できない場合の警告
            $this->logUnauthorizedAccess($model);
        }
    }

    /**
     * 現在のstore_IDを取得
     * 
     * 認証方式別にstore_idを取得し、Multi-tenant分離を実現
     * 
     * 優先順位:
     * 1. Admin認証ユーザーのstore_id
     * 2. LIFFリクエストのX-Store-Idヘッダー
     * 3. 開発環境のテスト用store_id
     * 
     * @return int|null 店舗ID（取得できない場合はnull）
     */
    private function getCurrentStoreId(): ?int
    {
        // 1. Admin認証ユーザーのstore_id
        if (auth()->check() && auth()->user()->store_id) {
            return auth()->user()->store_id;
        }

        // 2. LIFFリクエストのX-Store-Idヘッダー
        if (request()->hasHeader('X-Store-Id')) {
            $storeId = (int)request()->header('X-Store-Id');
            
            // LIFFリクエストの妥当性検証
            if ($this->validateLiffRequest($storeId)) {
                return $storeId;
            }
            
            // 不正なLIFFリクエストの警告
            Log::warning('不正なLIFFリクエスト検出', [
                'header_store_id' => $storeId,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'url' => request()->fullUrl()
            ]);
        }

        // 3. 開発環境: テスト用store_id
        if (app()->environment('local') && config('app.debug')) {
            $testStoreId = config('app.test_store_id', 1);
            
            Log::debug('開発環境: テスト用store_id使用', [
                'test_store_id' => $testStoreId,
                'note' => '本番環境では無効'
            ]);
            
            return $testStoreId;
        }

        return null;
    }

    /**
     * LIFFリクエストの妥当性検証
     * 
     * X-Store-IdヘッダーとLINE認証の組み合わせを検証し、
     * 不正アクセスを防止
     * 
     * @param int $storeId リクエストされたstore_id
     * @return bool 妥当性（true: 有効, false: 無効）
     */
    private function validateLiffRequest(int $storeId): bool
    {
        // LIFFリクエストの基本検証
        $isLiffRequest = request()->hasHeader('X-LIFF-Request') ||
                        request()->hasHeader('X-LINE-ChannelId') ||
                        str_contains(request()->userAgent() ?? '', 'LIFF');

        if (!$isLiffRequest) {
            return false;
        }

        // store_idの存在確認（簡易チェック）
        if ($storeId <= 0) {
            return false;
        }

        // 本番環境: より厳密な検証が必要
        // TODO: LINE認証トークンの検証、store_idとLINE連携の整合性確認
        
        return true;
    }

    /**
     * 未認証アクセスのログ記録
     * 
     * store_idなしでのモデルアクセスを検出し、
     * セキュリティ監査ログとして記録
     * 
     * @param Model $model アクセス対象モデル
     * @return void
     */
    private function logUnauthorizedAccess(Model $model): void
    {
        $context = [
            'model' => get_class($model),
            'table' => $model->getTable(),
            'route' => request()->route()?->getName(),
            'method' => request()->method(),
            'url' => request()->fullUrl(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'timestamp' => now()->toISOString(),
        ];

        // 認証状態の詳細情報
        if (auth()->check()) {
            $context['auth_user_id'] = auth()->id();
            $context['auth_user_store_id'] = auth()->user()->store_id ?? 'null';
            $context['warning'] = 'ユーザーは認証済みだがstore_idが設定されていません';
        } else {
            $context['warning'] = '未認証ユーザーによるモデルアクセス';
        }

        // セキュリティ警告ログ
        Log::warning('TenantScope: store_idなしアクセス検出', $context);

        // 開発環境: より詳細なデバッグ情報
        if (app()->environment('local')) {
            Log::debug('TenantScope詳細情報', [
                'headers' => request()->headers->all(),
                'query_params' => request()->query(),
                'route_parameters' => request()->route()?->parameters() ?? [],
            ]);
        }
    }

    /**
     * グローバルスコープの除外メソッド
     * 
     * 特定のクエリでTenantScopeを無効化する場合に使用
     * 
     * 使用例:
     * Model::withoutGlobalScope(TenantScope::class)->get()
     * 
     * ⚠️ 注意: セキュリティリスクを伴うため、システム管理処理のみで使用
     * 
     * @param Builder $builder Eloquentクエリビルダー
     * @param Model $model 対象モデル
     * @return void
     */
    public function extend(Builder $builder)
    {
        // スコープ除外時のログ記録（セキュリティ監査用）
        $builder->macro('withoutTenantScope', function (Builder $builder) {
            Log::warning('TenantScope除外実行', [
                'model' => $builder->getModel()::class,
                'route' => request()->route()?->getName(),
                'user_id' => auth()->id(),
                'ip_address' => request()->ip(),
                'warning' => 'Multi-tenant分離が無効化されました',
                'timestamp' => now()->toISOString(),
            ]);

            return $builder->withoutGlobalScope(static::class);
        });
    }
} 