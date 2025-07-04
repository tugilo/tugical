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
import ResourceCard from '../../components/resource/ResourceCard';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  BuildingOfficeIcon,
  CogIcon,
  TruckIcon,
  ArrowPathIcon,
  FunnelIcon
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
  room: '部屋・個室',
  equipment: '設備・器具', 
  vehicle: '車両・送迎車',
};

// 業種別リソース表示名
const INDUSTRY_RESOURCE_LABELS = {
  beauty: {
    staff: '美容師',
    room: '個室',
    equipment: '美容器具',
    vehicle: '送迎車',
  },
  clinic: {
    staff: '先生',
    room: '診療室',
    equipment: '医療機器',
    vehicle: '往診車',
  },
  rental: {
    staff: '管理者',
    room: '会議室',
    equipment: '設備',
    vehicle: 'レンタカー',
  },
  school: {
    staff: '講師',
    room: '教室',
    equipment: '教材',
    vehicle: 'スクールバス',
  },
  activity: {
    staff: 'ガイド',
    room: '集合場所',
    equipment: '体験器具',
    vehicle: 'ツアー車両',
  },
};

const ResourcesPage: React.FC = () => {
  const { setPageTitle } = useUIStore();
  const { addToast } = useToast();
  
  // 状態管理
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryType] = useState<string>('beauty'); // TODO: 店舗設定から取得
  // モーダル状態（将来実装用）
  // const [showCreateModal, setShowCreateModal] = useState(false);
  // const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  // const [showDetailModal, setShowDetailModal] = useState(false);
  // const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setPageTitle('リソース管理');
  }, [setPageTitle]);

  /**
   * リソース一覧を取得
   */
  const fetchResources = useCallback(async () => {
    try {
      const filters: FilterOptions = {
        search: searchTerm || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort: 'type,sort_order,name'
      };

      const result = await resourceApi.getList(filters);
      setResources(result.resources || []);
    } catch (error: any) {
      console.error('Failed to fetch resources:', error);
      setResources([]); // エラー時は空配列を設定
      addToast({
        type: 'error',
        title: 'リソース一覧の取得に失敗しました',
        message: error.response?.data?.error?.message || 'しばらく時間をおいて再度お試しください'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, typeFilter, statusFilter, addToast]);

  // 初回読み込み
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

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
    fetchResources();
  };

  /**
   * リソース作成
   */
  const handleCreateResource = () => {
    // setShowCreateModal(true);
    console.log('TODO: リソース作成モーダルを開く');
  };

  /**
   * リソース詳細表示
   */
  const handleResourceClick = (resource: Resource) => {
    // setSelectedResource(resource);
    // setShowDetailModal(true);
    console.log('TODO: リソース詳細モーダルを開く', resource);
  };

  /**
   * リソース編集
   */
  const handleEditResource = (resource: Resource) => {
    // setSelectedResource(resource);
    // setShowEditModal(true);
    console.log('TODO: リソース編集モーダルを開く', resource);
  };

  /**
   * リソース削除
   */
  const handleDeleteResource = async (resource: Resource) => {
    if (!confirm(`${resource.name} を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await resourceApi.delete(resource.id);
      addToast({
        type: 'success',
        title: 'リソースを削除しました',
        message: `${resource.name} の削除が完了しました`
      });
      fetchResources();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'リソースの削除に失敗しました',
        message: error.response?.data?.error?.message || 'しばらく時間をおいて再度お試しください'
      });
    }
  };

  /**
   * 業種別リソース表示名を取得
   */
  const getResourceTypeLabel = (type: string): string => {
    return (INDUSTRY_RESOURCE_LABELS as any)[industryType]?.[type] || (RESOURCE_TYPE_LABELS as any)[type] || type;
  };

  /**
   * タイプ別リソース数を取得
   */
  const getResourceCountByType = (type: string): number => {
    return Array.isArray(resources) ? resources.filter(resource => resource.type === type).length : 0;
  };

  /**
   * 稼働中リソース数を取得
   */
  const getActiveResourceCount = (): number => {
    return Array.isArray(resources) ? resources.filter(resource => resource.is_active).length : 0;
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const resourceTypes = ['staff', 'room', 'equipment', 'vehicle'];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">リソース管理</h1>
          <p className="text-sm text-gray-600 mt-1">
            全 {resources.length} 件のリソース（稼働中: {getActiveResourceCount()} 件）
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={handleRefresh}
            loading={isRefreshing}
          >
            更新
          </Button>
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="w-4 h-4" />}
            onClick={handleCreateResource}
          >
            新規リソース
          </Button>
        </div>
      </div>

      {/* リソース種別サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {resourceTypes.map((type) => {
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
                  typeFilter === type ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleTypeFilterChange(typeFilter === type ? 'all' : type)}
              >
                <Card.Body className="text-center">
                  <IconComponent className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{count}</h3>
                  <p className="text-sm text-gray-600">{label}</p>
                </Card.Body>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* フィルター */}
      <Card>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="リソース名で検索"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* タイプフィルター */}
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">すべてのタイプ</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {getResourceTypeLabel(type)}
                </option>
              ))}
            </select>

            {/* ステータスフィルター */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">すべてのステータス</option>
              <option value="active">稼働中</option>
              <option value="inactive">停止中</option>
            </select>

            {/* フィルタークリア */}
            <Button
              variant="ghost"
              leftIcon={<FunnelIcon className="w-4 h-4" />}
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
              disabled={!searchTerm && typeFilter === 'all' && statusFilter === 'all'}
            >
              フィルターをクリア
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* リソース一覧 */}
      {resources.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="text-center py-12">
              <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">リソースが見つかりませんでした</p>
              {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
                <p className="text-sm text-gray-500 mt-2">
                  フィルター条件を変更してみてください
                </p>
              )}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              industryType={industryType}
              onView={() => handleResourceClick(resource)}
              onEdit={() => handleEditResource(resource)}
              onDelete={() => handleDeleteResource(resource)}
            />
          ))}
        </div>
      )}

      {/* モーダル */}
      {/* TODO: ResourceCreateModal, ResourceDetailModal, ResourceEditModal 実装 */}
    </div>
  );
};



export default ResourcesPage; 