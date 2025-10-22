/**
 * ResourceCard コンポーネント
 *
 * 統一リソース概念による革新的なリソース表示カード
 * - リソースタイプ別アイコン表示
 * - 業種別表示名対応
 * - 稼働状況・効率率・料金差表示
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-04
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Resource } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {
  UserIcon,
  BuildingOfficeIcon,
  CogIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

// リソースタイプのアイコンマッピング
const RESOURCE_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  staff: UserIcon,
  room: BuildingOfficeIcon,
  equipment: CogIcon,
  vehicle: TruckIcon,
};

// リソースタイプの表示名
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  staff: 'スタッフ',
  room: '部屋',
  equipment: '設備',
  vehicle: '車両',
};

interface ResourceCardProps {
  resource: Resource;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * リソースカードコンポーネント
 * 統一リソース概念に対応したリソース情報表示
 */
const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onView,
  onEdit,
  onDelete,
}) => {
  const IconComponent = RESOURCE_TYPE_ICONS[resource.type] || CogIcon;
  const typeLabel = RESOURCE_TYPE_LABELS[resource.type] || resource.type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className='h-full hover:shadow-md transition-shadow cursor-pointer'
        onClick={onView}
      >
        <Card.Body>
          {/* ヘッダー */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center'>
              <IconComponent className='w-6 h-6 text-primary-600 mr-2' />
              <span className='text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded'>
                {typeLabel}
              </span>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${
                resource.is_active ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>

          {/* リソース情報 */}
          <div className='mb-3'>
            <h3 className='font-semibold text-gray-900 mb-1'>
              {resource.name}
            </h3>
            {resource.display_name &&
              resource.display_name !== resource.name && (
                <p className='text-sm text-gray-600'>
                  表示名: {resource.display_name}
                </p>
              )}
          </div>

          {/* 詳細情報 */}
          <div className='space-y-1 text-sm text-gray-600 mb-4'>
            {resource.type === 'staff' && resource.capacity && (
              <p>稼働可能: {resource.capacity}人まで</p>
            )}
            {resource.type === 'room' && resource.capacity && (
              <p>収容人数: {resource.capacity}人</p>
            )}
            {resource.efficiency_rate && resource.efficiency_rate !== 1.0 && (
              <p>効率率: {(resource.efficiency_rate * 100).toFixed(0)}%</p>
            )}
            {resource.hourly_rate_diff && resource.hourly_rate_diff !== 0 && (
              <p>
                指名料金: {resource.hourly_rate_diff > 0 ? '+' : ''}¥
                {resource.hourly_rate_diff}
              </p>
            )}
          </div>

          {/* アクション */}
          <div className='flex gap-2 pt-3 border-t border-gray-100'>
            <Button variant='outline' size='sm' onClick={() => onEdit()}>
              編集
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onDelete()}
              className='text-red-600 hover:text-red-700 hover:bg-red-50'
            >
              削除
            </Button>
          </div>
        </Card.Body>
      </Card>
    </motion.div>
  );
};

export default ResourceCard;
