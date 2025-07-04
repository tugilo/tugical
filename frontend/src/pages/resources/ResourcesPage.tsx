/**
 * tugical Admin Dashboard リソース管理ページ
 *
 * 統一リソース概念による革新的なリソース管理
 * - staff（スタッフ）
 * - room（部屋・個室）
 * - equipment（設備・器具）
 * - vehicle（車両・送迎車）
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-04
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useUIStore, useToast } from '../../stores/uiStore';
import { resourceApi } from '../../services/api';
import { Resource, FilterOptions } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingScreen from '../../components/ui/LoadingScreen';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ResourceCard from '../../components/resource/ResourceCard';
import ResourceCreateModal from '../../components/resource/ResourceCreateModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  BuildingOfficeIcon,
  CogIcon,
  TruckIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

// リソースタイプのアイコンマッピング
const RESOURCE_TYPE_ICONS = {
  staff: UserIcon,
  room: BuildingOfficeIcon,
  equipment: CogIcon,
  vehicle: TruckIcon,
};

// リソースタイプの表示名
const RESOURCE_TYPE_LABELS = {
  staff: 'スタッフ',
  room: '部屋',
  equipment: '設備',
  vehicle: '車両',
};

const ResourcesPage: React.FC = () => {
  const { setPageTitle } = useUIStore();
  const { addToast } = useToast();

  // 状態管理
  const [allResources, setAllResources] = useState<Resource[]>([]); // 全リソース（統計用）
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]); // フィルタリング済みリソース（表示用）
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // モーダル状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setPageTitle('リソース管理');
  }, [setPageTitle]);

  /**
   * 全リソース一覧を取得
   */
  const fetchAllResources = useCallback(async () => {
    try {
      const result = await resourceApi.getList({
        sort: 'type,sort_order,name',
      });
      const resources = result.resources || [];
      setAllResources(resources);
      // 初回は全リソースをフィルタリング済みとしても設定
      applyFilters(resources);
    } catch (error: any) {
      console.error('Failed to fetch resources:', error);
      setAllResources([]);
      setFilteredResources([]);
      addToast({
        type: 'error',
        title: 'リソース一覧の取得に失敗しました',
        message:
          error.response?.data?.error?.message ||
          'しばらく時間をおいて再度お試しください',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  /**
   * フィルタリングを適用
   */
  const applyFilters = useCallback(
    (resources: Resource[] = allResources) => {
      let filtered = [...resources];

      // 検索フィルター
      if (searchTerm) {
        filtered = filtered.filter(
          resource =>
            resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.display_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      // タイプフィルター
      if (typeFilter !== 'all') {
        filtered = filtered.filter(resource => resource.type === typeFilter);
      }

      // ステータスフィルター
      if (statusFilter === 'active') {
        filtered = filtered.filter(resource => resource.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(resource => !resource.is_active);
      }

      setFilteredResources(filtered);
    },
    [allResources, searchTerm, typeFilter, statusFilter]
  );

  // フィルター変更時にフィルタリングを実行
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // 初回読み込み
  useEffect(() => {
    fetchAllResources();
  }, [fetchAllResources]);

  /**
   * 検索処理
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  /**
   * タイプフィルター変更
   */
  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type);
  };

  /**
   * ステータスフィルター変更
   */
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
  };

  /**
   * リフレッシュ
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllResources();
  };

  /**
   * リソース作成
   */
  const handleCreateResource = () => {
    setShowCreateModal(true);
  };

  /**
   * リソース作成成功時のコールバック
   */
  const handleResourceCreated = (newResource: Resource) => {
    addToast({
      type: 'success',
      title: 'リソースを作成しました',
      message: `${newResource.display_name} が正常に作成されました`,
    });
    setShowCreateModal(false);
    fetchAllResources(); // 全リソースを再取得
  };

  /**
   * リソース詳細表示
   */
  const handleResourceClick = (resource: Resource) => {
    console.log('TODO: リソース詳細モーダルを開く', resource);
  };

  /**
   * リソース編集
   */
  const handleEditResource = (resource: Resource) => {
    console.log('TODO: リソース編集モーダルを開く', resource);
  };

  /**
   * リソース削除確認ダイアログを表示
   */
  const handleDeleteResource = (resource: Resource) => {
    setResourceToDelete(resource);
    setShowDeleteConfirm(true);
  };

  /**
   * リソース削除実行
   */
  const executeDeleteResource = async () => {
    if (!resourceToDelete) return;

    setIsDeleting(true);
    try {
      await resourceApi.delete(resourceToDelete.id);
      addToast({
        type: 'success',
        title: 'リソースを削除しました',
        message: `${
          resourceToDelete.display_name || resourceToDelete.name
        } の削除が完了しました`,
      });
      fetchAllResources(); // 全リソースを再取得
      setShowDeleteConfirm(false);
      setResourceToDelete(null);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'リソースの削除に失敗しました',
        message:
          error.response?.data?.error?.message ||
          'しばらく時間をおいて再度お試しください',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 削除確認ダイアログを閉じる
   */
  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setShowDeleteConfirm(false);
      setResourceToDelete(null);
    }
  };

  /**
   * リソース表示名を取得（汎用的な表示名を使用）
   */
  const getResourceTypeLabel = (type: string): string => {
    return (RESOURCE_TYPE_LABELS as any)[type] || type;
  };

  /**
   * タイプ別リソース数を取得（全リソースから計算）
   */
  const getResourceCountByType = (type: string): number => {
    return Array.isArray(allResources)
      ? allResources.filter(resource => resource.type === type).length
      : 0;
  };

  /**
   * 稼働中リソース数を取得（全リソースから計算）
   */
  const getActiveResourceCount = (): number => {
    return Array.isArray(allResources)
      ? allResources.filter(resource => resource.is_active).length
      : 0;
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const resourceTypes = ['staff', 'room', 'equipment', 'vehicle'];

  return (
    <div className='space-y-6'>
      {/* ヘッダー */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>リソース管理</h1>
          <p className='text-sm text-gray-600 mt-1'>
            全 {allResources.length} 件のリソース（稼働中:{' '}
            {getActiveResourceCount()} 件）
          </p>
        </div>
        <div className='flex gap-3'>
          <Button
            variant='outline'
            leftIcon={<ArrowPathIcon className='w-4 h-4' />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            更新
          </Button>
          <Button
            variant='primary'
            leftIcon={<PlusIcon className='w-4 h-4' />}
            onClick={handleCreateResource}
          >
            新規リソース
          </Button>
        </div>
      </div>

      {/* リソース種別サマリー */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        {resourceTypes.map(type => {
          const IconComponent = (RESOURCE_TYPE_ICONS as any)[type];
          const count = getResourceCountByType(type);
          const label = getResourceTypeLabel(type);

          return (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer transition-colors ${
                  typeFilter === type
                    ? 'ring-2 ring-primary-500 bg-primary-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() =>
                  handleTypeFilterChange(typeFilter === type ? 'all' : type)
                }
              >
                <Card.Body className='text-center'>
                  <IconComponent className='w-8 h-8 mx-auto mb-2 text-primary-600' />
                  <h3 className='text-lg font-semibold text-gray-900'>
                    {count}
                  </h3>
                  <p className='text-sm text-gray-600'>{label}</p>
                </Card.Body>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* フィルター */}
      <Card>
        <Card.Body>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            {/* 検索 */}
            <div className='relative'>
              <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='リソース名で検索'
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className='w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>

            {/* タイプフィルター */}
            <select
              value={typeFilter}
              onChange={e => handleTypeFilterChange(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
            >
              <option value='all'>すべてのタイプ</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>
                  {getResourceTypeLabel(type)}
                </option>
              ))}
            </select>

            {/* ステータスフィルター */}
            <select
              value={statusFilter}
              onChange={e => handleStatusFilterChange(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
            >
              <option value='all'>すべてのステータス</option>
              <option value='active'>稼働中</option>
              <option value='inactive'>停止中</option>
            </select>

            {/* フィルタークリア */}
            <Button
              variant='ghost'
              leftIcon={<FunnelIcon className='w-4 h-4' />}
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
              disabled={
                !searchTerm && typeFilter === 'all' && statusFilter === 'all'
              }
            >
              フィルターをクリア
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* リソース一覧 */}
      {filteredResources.length === 0 ? (
        <Card>
          <Card.Body>
            <div className='text-center py-12'>
              <CogIcon className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>
                {allResources.length === 0
                  ? 'リソースが登録されていません'
                  : 'フィルター条件に一致するリソースが見つかりませんでした'}
              </p>
              {(searchTerm ||
                typeFilter !== 'all' ||
                statusFilter !== 'all') && (
                <p className='text-sm text-gray-500 mt-2'>
                  フィルター条件を変更してみてください
                </p>
              )}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {filteredResources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onView={() => handleResourceClick(resource)}
              onEdit={() => handleEditResource(resource)}
              onDelete={() => handleDeleteResource(resource)}
            />
          ))}
        </div>
      )}

      {/* モーダル */}
      <ResourceCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleResourceCreated}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={executeDeleteResource}
        title='リソースの削除'
        message={`${
          resourceToDelete?.display_name || resourceToDelete?.name
        } を削除してもよろしいですか？この操作は取り消せません。`}
        confirmText='削除する'
        cancelText='キャンセル'
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ResourcesPage;
