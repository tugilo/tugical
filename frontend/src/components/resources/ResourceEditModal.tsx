/**
 * ResourceEditModal コンポーネント
 *
 * シンプルなリソース編集機能を提供
 * - ResourceCreateModalをベースとした編集対応
 * - 既存データの初期化
 * - 更新API呼び出し
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-04
 */

import React, { useState, useEffect } from 'react';
import { Resource } from '../../types';
import { resourceApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  UserIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

interface ResourceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedResource: Resource) => void;
  resource: Resource | null;
}

interface EditFormData {
  name: string;
  display_name: string;
  description: string;
  capacity: number;
  efficiency_rate: number;
  hourly_rate_diff: number;
  is_active: boolean;
}

/**
 * リソース編集モーダルコンポーネント
 */
const ResourceEditModal: React.FC<ResourceEditModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  resource,
}) => {
  const { addNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    display_name: '',
    description: '',
    capacity: 1,
    efficiency_rate: 1.0,
    hourly_rate_diff: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // リソースタイプのアイコンマッピング
  const typeIcons = {
    staff: UserIcon,
    room: BuildingOfficeIcon,
    equipment: WrenchScrewdriverIcon,
    vehicle: TruckIcon,
  };

  // リソースタイプの表示名
  const typeLabels = {
    staff: 'スタッフ',
    room: '部屋',
    equipment: '設備',
    vehicle: '車両',
  };

  /**
   * リソースデータでフォームを初期化
   */
  useEffect(() => {
    if (resource && isOpen) {
      setFormData({
        name: resource.name || '',
        display_name: resource.display_name || '',
        description: resource.description || '',
        capacity: resource.capacity || 1,
        efficiency_rate: resource.efficiency_rate || 1.0,
        hourly_rate_diff: resource.hourly_rate_diff || 0,
        is_active: resource.is_active !== false,
      });
      setErrors({});
    }
  }, [resource, isOpen]);

  /**
   * フォームデータ更新
   */
  const handleInputChange = (field: keyof EditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * バリデーション
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'リソース名を入力してください';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = '表示名を入力してください';
    }

    if (formData.efficiency_rate < 0.5 || formData.efficiency_rate > 2.0) {
      newErrors.efficiency_rate = '効率率は0.5〜2.0の範囲で入力してください';
    }

    if (formData.capacity < 1 || formData.capacity > 100) {
      newErrors.capacity = '収容人数は1〜100の範囲で入力してください';
    }

    if (
      formData.hourly_rate_diff < -10000 ||
      formData.hourly_rate_diff > 10000
    ) {
      newErrors.hourly_rate_diff =
        '時間料金差は-10,000〜10,000円の範囲で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async () => {
    if (!resource || !validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const updatedResource = await resourceApi.update(resource.id, {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        capacity: Number(formData.capacity),
        efficiency_rate: Number(formData.efficiency_rate),
        hourly_rate_diff: Number(formData.hourly_rate_diff),
        is_active: formData.is_active,
      });

      addNotification({
        type: 'success',
        title: 'リソースを更新しました',
        message: `${formData.display_name} の更新が完了しました`,
        duration: 3000,
      });

      onUpdate(updatedResource);
      onClose();
    } catch (error: any) {
      const apiErrors = error.response?.data?.error?.details;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        addNotification({
          type: 'error',
          title: '更新に失敗しました',
          message:
            error.response?.data?.error?.message || 'エラーが発生しました',
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * モーダルを閉じる
   */
  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setErrors({});
    }
  };

  if (!resource) {
    return null;
  }

  const TypeIcon = typeIcons[resource.type] || UserIcon;
  const typeLabel = typeLabels[resource.type] || resource.type;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${typeLabel}編集`}
      size='lg'
    >
      <div className='space-y-6'>
        {/* リソースタイプ表示 */}
        <div className='flex items-center p-4 bg-gray-50 rounded-lg'>
          <TypeIcon className='w-8 h-8 text-primary-600 mr-3' />
          <div>
            <h3 className='font-semibold text-gray-900'>{typeLabel}</h3>
            <p className='text-sm text-gray-600'>タイプ: {resource.type}</p>
          </div>
        </div>

        {/* 基本情報 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='flex items-center text-sm font-medium text-gray-700 mb-1'>
              リソース名
              <span className='text-red-500 ml-1'>*</span>
            </label>
            <input
              type='text'
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='例: staff_001'
            />
            {errors.name && (
              <p className='mt-1 text-sm text-red-600'>{errors.name}</p>
            )}
          </div>

          <div>
            <label className='text-sm font-medium text-gray-700 mb-1 block'>
              表示名
              <span className='text-red-500 ml-1'>*</span>
            </label>
            <input
              type='text'
              value={formData.display_name}
              onChange={e => handleInputChange('display_name', e.target.value)}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 ${
                errors.display_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='例: スタッフA'
            />
            {errors.display_name && (
              <p className='mt-1 text-sm text-red-600'>{errors.display_name}</p>
            )}
          </div>
        </div>

        {/* 説明 */}
        <div>
          <label className='text-sm font-medium text-gray-700 mb-1 block'>
            説明
          </label>
          <textarea
            value={formData.description}
            onChange={e => handleInputChange('description', e.target.value)}
            disabled={isLoading}
            rows={3}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50'
            placeholder={`${typeLabel}の詳細説明を入力してください`}
          />
        </div>

        {/* 詳細設定 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='text-sm font-medium text-gray-700 mb-1 block'>
              {resource.type === 'staff'
                ? '同時対応人数'
                : resource.type === 'room'
                ? '収容人数'
                : resource.type === 'equipment'
                ? '同時利用数'
                : '乗車定員'}
            </label>
            <input
              type='number'
              min='1'
              max='100'
              value={formData.capacity}
              onChange={e =>
                handleInputChange('capacity', parseInt(e.target.value) || 1)
              }
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 ${
                errors.capacity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.capacity && (
              <p className='mt-1 text-sm text-red-600'>{errors.capacity}</p>
            )}
          </div>

          <div>
            <label className='text-sm font-medium text-gray-700 mb-1 block'>
              効率率
            </label>
            <select
              value={formData.efficiency_rate}
              onChange={e =>
                handleInputChange('efficiency_rate', parseFloat(e.target.value))
              }
              disabled={isLoading}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50'
            >
              <option value={0.8}>80% (新人・研修中)</option>
              <option value={0.9}>90% (標準より少し遅い)</option>
              <option value={1.0}>100% (標準)</option>
              <option value={1.1}>110% (標準より早い)</option>
              <option value={1.2}>120% (ベテラン・高効率)</option>
            </select>
            {errors.efficiency_rate && (
              <p className='mt-1 text-sm text-red-600'>
                {errors.efficiency_rate}
              </p>
            )}
          </div>

          <div>
            <label className='text-sm font-medium text-gray-700 mb-1 block'>
              時間料金差
            </label>
            <div className='relative'>
              <input
                type='number'
                min='-10000'
                max='10000'
                step='100'
                value={formData.hourly_rate_diff}
                onChange={e =>
                  handleInputChange(
                    'hourly_rate_diff',
                    parseInt(e.target.value) || 0
                  )
                }
                disabled={isLoading}
                className={`w-full px-3 py-2 pr-8 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 ${
                  errors.hourly_rate_diff ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder='0'
              />
              <span className='absolute right-2 top-2 text-gray-500 text-sm'>
                円
              </span>
            </div>
            {errors.hourly_rate_diff && (
              <p className='mt-1 text-sm text-red-600'>
                {errors.hourly_rate_diff}
              </p>
            )}
          </div>
        </div>

        {/* ステータス設定 */}
        <div>
          <label className='text-sm font-medium text-gray-700 mb-3 block'>
            ステータス
          </label>
          <div className='flex items-center space-x-4'>
            <label className='flex items-center'>
              <input
                type='radio'
                name='is_active'
                checked={formData.is_active}
                onChange={() => handleInputChange('is_active', true)}
                disabled={isLoading}
                className='mr-2'
              />
              <span className='text-green-600'>稼働中</span>
            </label>
            <label className='flex items-center'>
              <input
                type='radio'
                name='is_active'
                checked={!formData.is_active}
                onChange={() => handleInputChange('is_active', false)}
                disabled={isLoading}
                className='mr-2'
              />
              <span className='text-gray-600'>停止中</span>
            </label>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className='flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6'>
        <Button
          variant='outline'
          size='md'
          onClick={handleClose}
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button
          variant='primary'
          size='md'
          onClick={handleSubmit}
          loading={isLoading}
          leftIcon={<TypeIcon className='w-4 h-4' />}
        >
          {typeLabel}を更新
        </Button>
      </div>
    </Modal>
  );
};

export default ResourceEditModal;
