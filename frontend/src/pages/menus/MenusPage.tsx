/**
 * tugical Admin Dashboard メニュー管理ページ
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-04
 */

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  CurrencyYenIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useUIStore } from '../../stores/uiStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/ui/LoadingScreen';
import MenuCreateModal from '../../components/menus/MenuCreateModal';
import { menuApi } from '../../services/api';
import type { Menu, FilterOptions, MenuCategoriesResponse } from '../../types';

const MenusPage: React.FC = () => {
  const { setPageTitle, addNotification } = useUIStore();

  // 状態管理
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<MenuCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    setPageTitle('メニュー管理');
    loadMenus();
    loadCategories();
  }, [setPageTitle]);

  /**
   * メニュー一覧読み込み
   */
  const loadMenus = async (page = 1) => {
    try {
      setLoading(true);
      
      const filters: FilterOptions = {
        page,
        per_page: pagination.per_page,
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        is_active: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
      };

      const response = await menuApi.getList(filters);
      setMenus(response.menus);
      // API レスポンスの pagination オブジェクトを安全に設定
      setPagination({
        current_page: response.pagination?.current_page || 1,
        last_page: response.pagination?.last_page || 1,
        per_page: response.pagination?.per_page || 20,
        total: response.pagination?.total || 0,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'メニュー読み込みエラー',
        message: error.message || 'メニュー一覧の取得に失敗しました',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * カテゴリ一覧読み込み
   */
  const loadCategories = async () => {
    try {
      const response = await menuApi.getCategories();
      setCategories(response);
    } catch (error: any) {
      console.error('カテゴリ読み込みエラー:', error);
    }
  };

  /**
   * 検索・フィルター実行
   */
  const handleSearch = () => {
    loadMenus(1);
  };

  /**
   * フィルターリセット
   */
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedStatus('');
    setTimeout(() => loadMenus(1), 100);
  };

  /**
   * メニュー削除
   */
  const handleDeleteMenu = async (menu: Menu) => {
    if (!confirm(`「${menu.name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await menuApi.delete(menu.id);
      addNotification({
        type: 'success',
        title: 'メニューを削除しました',
      });
      loadMenus(pagination.current_page);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: '削除に失敗しました',
        message: error.message || 'メニューの削除に失敗しました',
      });
    }
  };

  /**
   * ページ変更
   */
  const handlePageChange = (page: number) => {
    loadMenus(page);
  };

  if (loading && menus.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メニュー管理</h1>
          <p className="mt-1 text-gray-600">
            サービスメニューとオプションを管理します
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusIcon className="w-5 h-5" />}
          onClick={() => setShowCreateModal(true)}
        >
          新規メニュー
        </Button>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <Card.Body>
          <div className="space-y-4">
            {/* 検索バー */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="メニュー名で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <Button variant="primary" onClick={handleSearch}>
                検索
              </Button>
              <Button 
                variant="outline" 
                leftIcon={<FunnelIcon className="w-5 h-5" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                フィルター
              </Button>
            </div>

            {/* 詳細フィルター */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">すべてのカテゴリ</option>
                    {categories?.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">すべて</option>
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={handleResetFilters} fullWidth>
                    リセット
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* 表示切り替え・統計 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {pagination.total}件中 {((pagination.current_page - 1) * pagination.per_page) + 1}-
          {Math.min(pagination.current_page * pagination.per_page, pagination.total)}件を表示
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Squares2X2Icon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListBulletIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* メニュー一覧 */}
      {menus.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">メニューがありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              新しいメニューを作成して開始しましょう
            </p>
            <div className="mt-6">
                              <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="w-5 h-5" />}
                  onClick={() => setShowCreateModal(true)}
                >
                  新規メニュー作成
                </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menus.map((menu) => (
                <MenuCard
                  key={menu.id}
                  menu={menu}
                  onEdit={() => {
                    // TODO: 編集モーダルを開く
                    addNotification({
                      type: 'info',
                      title: 'メニュー編集',
                      message: '編集モーダルは次回実装予定です',
                    });
                  }}
                  onDelete={() => handleDeleteMenu(menu)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        メニュー
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        カテゴリ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        料金・時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        オプション
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {menus.map((menu) => (
                      <MenuTableRow
                        key={menu.id}
                        menu={menu}
                        onEdit={() => {
                          // TODO: 編集モーダルを開く
                          addNotification({
                            type: 'info',
                            title: 'メニュー編集',
                            message: '編集モーダルは次回実装予定です',
                          });
                        }}
                        onDelete={() => handleDeleteMenu(menu)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ページネーション */}
          {pagination.last_page > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                ページ {pagination.current_page} / {pagination.last_page}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page === 1}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                >
                  前へ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* メニュー作成モーダル */}
      <MenuCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadMenus(1);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
};

/**
 * メニューカード（グリッド表示用）
 */
interface MenuCardProps {
  menu: Menu;
  onEdit: () => void;
  onDelete: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ menu, onEdit, onDelete }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <Card.Body>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {menu.display_name}
              </h3>
              {!menu.is_active && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  非アクティブ
                </span>
              )}
              {menu.requires_approval && (
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-600 rounded">
                  要承認
                </span>
              )}
            </div>
            
            {menu.category && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                <TagIcon className="w-4 h-4" />
                {menu.category}
              </div>
            )}
            
            {menu.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {menu.description}
              </p>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CurrencyYenIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-primary-600">
                    {menu.formatted_price}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4 text-gray-400" />
                  <span>{menu.formatted_total_duration}</span>
                </div>
              </div>
              
              {menu.options_count && menu.options_count > 0 && (
                <div className="text-sm text-gray-600">
                  オプション {menu.options_count}個
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<EyeIcon className="w-4 h-4" />}
            onClick={() => {
              // TODO: 詳細表示
            }}
          >
            詳細
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<PencilIcon className="w-4 h-4" />}
            onClick={onEdit}
          >
            編集
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<TrashIcon className="w-4 h-4" />}
            onClick={onDelete}
          >
            削除
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * メニューテーブル行（リスト表示用）
 */
interface MenuTableRowProps {
  menu: Menu;
  onEdit: () => void;
  onDelete: () => void;
}

const MenuTableRow: React.FC<MenuTableRowProps> = ({ menu, onEdit, onDelete }) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {menu.display_name}
          </div>
          {menu.description && (
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {menu.description}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900">
          {menu.category || '-'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          <div className="font-medium text-primary-600">
            {menu.formatted_price}
          </div>
          <div className="text-gray-500">
            {menu.formatted_total_duration}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            menu.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {menu.is_active ? 'アクティブ' : '非アクティブ'}
          </span>
          {menu.requires_approval && (
            <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-600 rounded-full">
              要承認
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {menu.options_count || 0}個
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<EyeIcon className="w-4 h-4" />}
            onClick={() => {
              // TODO: 詳細表示
            }}
          >
            詳細
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<PencilIcon className="w-4 h-4" />}
            onClick={onEdit}
          >
            編集
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<TrashIcon className="w-4 h-4" />}
            onClick={onDelete}
          >
            削除
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default MenusPage; 