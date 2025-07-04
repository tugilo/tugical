/**
 * tugical Admin Dashboard 顧客管理ページ
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { customerApi } from '../../services/api';
import type { Customer, PaginatedResponse, FilterOptions } from '../../types';
import { cn, formatNumber } from '../../utils';
import Card from '../../components/ui/Card';
import LoadingScreen from '../../components/ui/LoadingScreen';
import CustomerCard from '../../components/customer/CustomerCard';
import { useUIStore } from '../../stores/uiStore';

const CustomersPage: React.FC = () => {
  const { setPageTitle } = useUIStore();

  // -----------------------------
  // ローカル状態
  // -----------------------------
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Customer> | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // 初期化 & タイトル設定
  // -----------------------------
  useEffect(() => {
    setPageTitle('顧客管理');
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // 顧客取得処理
  // -----------------------------
  const fetchCustomers = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    const filters: FilterOptions = {
      search: search.trim(),
      status: statusFilter === 'all' ? undefined : statusFilter === 'active' ? 'active' : 'inactive',
      page,
      per_page: 20,
    };

    try {
      const data = await customerApi.getList(filters);
      setCustomers(data.data);
      setPagination(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '顧客一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  // -----------------------------
  // 検索フォーム送信
  // -----------------------------
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  // -----------------------------
  // ページネーション
  // -----------------------------
  const goToPage = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.meta.last_page) {
      fetchCustomers(page);
    }
  };

  // -----------------------------
  // レンダリング
  // -----------------------------
  if (isLoading) {
    return <LoadingScreen message="顧客一覧を読み込み中..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
      </div>

      {/* 検索・フィルタ */}
      <Card>
        <Card.Body>
          <form className="flex flex-wrap items-end gap-4" onSubmit={handleSearchSubmit}>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="search">
                キーワード検索
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="名前・電話・メールなど"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
                ステータス
              </label>
              <select
                id="status"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">すべて</option>
                <option value="active">有効</option>
                <option value="inactive">無効</option>
              </select>
            </div>

            <button
              type="submit"
              className="ml-auto bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-md px-4 py-2"
            >
              検索
            </button>
          </form>
        </Card.Body>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <Card.Body>
            <p className="text-red-800 text-sm">{error}</p>
          </Card.Body>
        </Card>
      )}

      {/* 顧客リスト */}
      <Card>
        <Card.Body padding="sm">
          {customers.length === 0 ? (
            <p className="text-gray-600 text-sm">顧客が見つかりませんでした。</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((c) => (
                <CustomerCard key={c.id} customer={c} />
              ))}
            </div>
          )}
        </Card.Body>

        {/* ページネーション */}
        {pagination && pagination.meta.total > pagination.meta.per_page && (
          <Card.Footer>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                {formatNumber(pagination.meta.total)} 件中{' '}
                {pagination.meta.from} - {pagination.meta.to} 件を表示
              </div>
              <div className="space-x-2">
                <button
                  className={cn(
                    'px-3 py-1 rounded-md border',
                    pagination.meta.current_page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50'
                  )}
                  onClick={() => goToPage(pagination.meta.current_page - 1)}
                  disabled={pagination.meta.current_page === 1}
                >
                  前へ
                </button>
                <button
                  className={cn(
                    'px-3 py-1 rounded-md border',
                    pagination.meta.current_page === pagination.meta.last_page
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50'
                  )}
                  onClick={() => goToPage(pagination.meta.current_page + 1)}
                  disabled={pagination.meta.current_page === pagination.meta.last_page}
                >
                  次へ
                </button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>
    </div>
  );
};

export default CustomersPage; 