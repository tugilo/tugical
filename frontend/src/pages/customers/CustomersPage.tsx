/**
 * tugical Admin Dashboard 顧客管理ページ
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { customerApi } from '../../services/api';
import type { Customer, PaginatedResponse, FilterOptions } from '../../types';
import { cn } from '../../utils';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import LoadingScreen from '../../components/ui/LoadingScreen';
import CustomerCard from '../../components/customer/CustomerCard';
import { useUIStore } from '../../stores/uiStore';
import Button from '../../components/ui/Button';
import CustomerDetailModal from '../../components/customer/CustomerDetailModal';

const CustomersPage: React.FC = () => {
  const { setPageTitle } = useUIStore();

  // -----------------------------
  // ローカル状態
  // -----------------------------
  const [customers, setCustomers] = useState<PaginatedResponse<Customer> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      search: searchTerm.trim(),
      status: statusFilter === 'all' ? undefined : statusFilter === 'active' ? 'active' : 'inactive',
      page,
      per_page: 20,
    };

    try {
      const response = await customerApi.getList(filters);
      // API レスポンスの構造に合わせて修正
      if (response.data && Array.isArray(response.data)) {
        // data が配列の場合（ページネーションなし）
        setCustomers({
          data: response.data,
          meta: {
            total: response.data.length,
            per_page: 20,
            current_page: 1,
            last_page: 1,
            from: 1,
            to: response.data.length,
          },
          links: {
            first: '',
            last: '',
            prev: null,
            next: null,
          },
        });
      } else if (response.data && response.meta) {
        // data.data と data.meta がある場合（ページネーションあり）
        setCustomers({
          data: response.data,
          meta: response.meta,
          links: response.links || {
            first: '',
            last: '',
            prev: null,
            next: null,
          },
        });
      } else {
        // 予期しない形式
        throw new Error('Unexpected API response format');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '顧客一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter]);

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
    if (customers && page >= 1 && page <= customers.meta.last_page) {
      fetchCustomers(page);
    }
  };

  // -----------------------------
  // 顧客カードクリック時
  // -----------------------------
  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  // -----------------------------
  // 顧客更新時
  // -----------------------------
  const handleCustomerUpdate = (updatedCustomer: Customer) => {
    if (customers) {
      const updatedData = customers.data.map(c => 
        c.id === updatedCustomer.id ? updatedCustomer : c
      );
      setCustomers({
        ...customers,
        data: updatedData,
      });
    }
    setSelectedCustomer(updatedCustomer);
  };

  // -----------------------------
  // 顧客削除時
  // -----------------------------
  const handleCustomerDelete = (customerId: number) => {
    if (customers) {
      const updatedData = customers.data.filter(c => c.id !== customerId);
      setCustomers({
        ...customers,
        data: updatedData,
        meta: {
          ...customers.meta,
          total: customers.meta.total - 1,
        },
      });
    }
  };

  // -----------------------------
  // レンダリング
  // -----------------------------
  if (isLoading) {
    return <LoadingScreen message="顧客一覧を読み込み中..." fullScreen={false} />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            顧客情報の管理・検索・編集ができます
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusIcon className="w-5 h-5" />}
          onClick={() => {/* TODO: 新規顧客作成モーダル */}}
        >
          新規顧客登録
        </Button>
      </div>

      {/* 検索・フィルター */}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
          {customers && customers.data.length === 0 ? (
            <p className="text-gray-600 text-sm">顧客が見つかりませんでした。</p>
          ) : (
            <>
              {/* 件数表示 */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5" />
                  <span>全 {customers?.meta.total} 件</span>
                </div>
                <span>
                  {customers?.meta.from} - {customers?.meta.to} 件を表示
                </span>
              </div>

              {/* 顧客カード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers?.data.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer)}
                    className="cursor-pointer"
                  >
                    <CustomerCard
                      customer={customer}
                      mode="detailed"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </Card.Body>

        {/* ページネーション */}
        {customers && customers.meta.total > customers.meta.per_page && (
          <Card.Footer>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="space-x-2">
                <button
                  className={cn(
                    'px-3 py-1 rounded-md border',
                    customers.meta.current_page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50'
                  )}
                  onClick={() => goToPage(customers.meta.current_page - 1)}
                  disabled={customers.meta.current_page === 1}
                >
                  前へ
                </button>
                <button
                  className={cn(
                    'px-3 py-1 rounded-md border',
                    customers.meta.current_page === customers.meta.last_page
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50'
                  )}
                  onClick={() => goToPage(customers.meta.current_page + 1)}
                  disabled={customers.meta.current_page === customers.meta.last_page}
                >
                  次へ
                </button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* 顧客詳細モーダル */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
        }}
        onUpdate={handleCustomerUpdate}
        onDelete={handleCustomerDelete}
      />
    </div>
    </DashboardLayout>
  );
};

export default CustomersPage; 