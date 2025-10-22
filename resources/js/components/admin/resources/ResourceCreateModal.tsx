import React, { useState } from 'react';
import {
  UserIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  ClockIcon,
  CurrencyYenIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import { resourceApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import type { Resource, ResourceType } from '../../types';

interface ResourceCreateModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** 作成後のコールバック */
  onCreate?: (resource: Resource) => void;
  /** 初期選択タイプ */
  initialType?: ResourceType;
}

interface ResourceFormData {
  type: 'staff' | 'room' | 'equipment' | 'vehicle';
  name: string;
  display_name: string;
  description: string;
  photo_url: string;
  attributes: Record<string, any>;
  working_hours: Record<string, any>;
  efficiency_rate: number;
  hourly_rate_diff: number;
  capacity: number;
  sort_order: number;
  is_active: boolean;
}

/**
 * リソース新規作成モーダル
 *
 * tugicalの統一リソース概念に対応
 * - staff: スタッフ（美容師・先生・講師・ガイド）
 * - room: 部屋（個室・診療室・教室・集合場所）
 * - equipment: 設備（美容器具・医療機器・教材・体験器具）
 * - vehicle: 車両（送迎車・往診車・スクールバス・ツアー車両）
 *
 * 業種別表示名・属性・制約に完全対応
 */
const ResourceCreateModal: React.FC<ResourceCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  initialType = 'staff',
}) => {
  const { addNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ResourceFormData>({
    type: initialType,
    name: '',
    display_name: '',
    description: '',
    photo_url: '',
    attributes: {},
    working_hours: {},
    efficiency_rate: 1.0,
    hourly_rate_diff: 0,
    capacity: 1,
    sort_order: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // リソースタイプ定義
  const resourceTypes = [
    {
      value: 'staff' as ResourceType,
      label: 'スタッフ',
      icon: UserIcon,
      description: 'サービスを提供する人材',
      defaultCapacity: 1,
    },
    {
      value: 'room' as ResourceType,
      label: '部屋',
      icon: BuildingOfficeIcon,
      description: 'サービス提供場所・施設',
      defaultCapacity: 4,
    },
    {
      value: 'equipment' as ResourceType,
      label: '設備',
      icon: WrenchScrewdriverIcon,
      description: 'サービス提供に必要な機器・道具',
      defaultCapacity: 1,
    },
    {
      value: 'vehicle' as ResourceType,
      label: '車両',
      icon: TruckIcon,
      description: '移動・輸送用の車両',
      defaultCapacity: 8,
    },
  ];

  // 効率率オプション
  const efficiencyOptions = [
    { value: 0.8, label: '80% (新人・研修中)' },
    { value: 0.9, label: '90% (標準より少し遅い)' },
    { value: 1.0, label: '100% (標準)' },
    { value: 1.1, label: '110% (標準より早い)' },
    { value: 1.2, label: '120% (ベテラン・高効率)' },
  ];

  const handleInputChange = (field: keyof ResourceFormData, value: any) => {
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

  const handleTypeChange = (newType: ResourceType) => {
    const typeConfig = resourceTypes.find(t => t.value === newType);
    setFormData(prev => ({
      ...prev,
      type: newType,
      capacity: typeConfig?.defaultCapacity || 1,
      // タイプ変更時に属性をリセット
      attributes: {},
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'リソース名を入力してください';
    }

    if (!formData.display_name?.trim()) {
      newErrors.display_name = '表示名を入力してください';
    }

    if (
      formData.efficiency_rate &&
      (formData.efficiency_rate < 0.5 || formData.efficiency_rate > 2.0)
    ) {
      newErrors.efficiency_rate = '効率率は0.5〜2.0の範囲で入力してください';
    }

    if (
      formData.capacity &&
      (formData.capacity < 1 || formData.capacity > 100)
    ) {
      newErrors.capacity = '収容人数は1〜100の範囲で入力してください';
    }

    if (
      formData.hourly_rate_diff &&
      (formData.hourly_rate_diff < -10000 || formData.hourly_rate_diff > 10000)
    ) {
      newErrors.hourly_rate_diff =
        '時間料金差は-10,000〜10,000円の範囲で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsLoading(true);
      const resource = await resourceApi.create(formData);
      addNotification({
        type: 'success',
        title: 'リソースを作成しました',
        message: `${resource.display_name}を作成しました`,
        duration: 3000,
      });
      onCreate?.(resource);
      onClose();
      resetForm();
    } catch (error: any) {
      const apiErrors = error.response?.data?.error?.details;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        addNotification({
          type: 'error',
          title: '作成に失敗しました',
          message:
            error.response?.data?.error?.message || 'エラーが発生しました',
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'staff',
      name: '',
      display_name: '',
      description: '',
      photo_url: '',
      attributes: {},
      working_hours: {},
      efficiency_rate: 1.0,
      hourly_rate_diff: 0,
      capacity: 1,
      sort_order: 0,
      is_active: true,
    });
    setErrors({});
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      resetForm();
    }
  };

  const selectedType = resourceTypes.find(t => t.value === formData.type);
  const TypeIcon = selectedType?.icon || UserIcon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='新規リソース作成'
      size='xl'
    >
      <div className='space-y-8 max-h-[70vh] overflow-y-auto'>
        {/* リソースタイプ選択 */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            リソースタイプ
          </h3>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {resourceTypes.map(type => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              return (
                <button
                  key={type.value}
                  type='button'
                  onClick={() => handleTypeChange(type.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Icon className='w-8 h-8 mx-auto mb-2' />
                  <div className='font-medium text-sm'>{type.label}</div>
                  <div className='text-xs text-gray-500 mt-1'>
                    {type.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 基本情報 */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>基本情報</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='flex items-center text-sm font-medium text-gray-700 mb-1'>
                <TypeIcon className='w-4 h-4 mr-1' />
                リソース名
                <span className='text-red-500 ml-1'>*</span>
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={`例: ${
                  formData.type === 'staff'
                    ? 'staff_001'
                    : formData.type === 'room'
                    ? 'room_001'
                    : formData.type === 'equipment'
                    ? 'equipment_001'
                    : 'vehicle_001'
                }`}
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
                value={formData.display_name || ''}
                onChange={e =>
                  handleInputChange('display_name', e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.display_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={`例: ${
                  formData.type === 'staff'
                    ? 'スタッフA'
                    : formData.type === 'room'
                    ? '部屋A'
                    : formData.type === 'equipment'
                    ? '設備A'
                    : '車両A'
                }`}
              />
              {errors.display_name && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.display_name}
                </p>
              )}
            </div>
          </div>

          <div className='mt-4'>
            <label className='text-sm font-medium text-gray-700 mb-1 block'>
              説明
            </label>
            <textarea
              value={formData.description || ''}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={3}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
              placeholder={`${selectedType?.label}の詳細説明を入力してください`}
            />
          </div>
        </div>

        {/* 詳細設定 */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>詳細設定</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label className='flex items-center text-sm font-medium text-gray-700 mb-1'>
                <ClockIcon className='w-4 h-4 mr-1' />
                効率率
              </label>
              <select
                value={formData.efficiency_rate || 1.0}
                onChange={e =>
                  handleInputChange(
                    'efficiency_rate',
                    parseFloat(e.target.value)
                  )
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
              >
                {efficiencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.efficiency_rate && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.efficiency_rate}
                </p>
              )}
            </div>

            <div>
              <label className='flex items-center text-sm font-medium text-gray-700 mb-1'>
                <CurrencyYenIcon className='w-4 h-4 mr-1' />
                時間料金差
              </label>
              <div className='relative'>
                <input
                  type='number'
                  value={formData.hourly_rate_diff || 0}
                  onChange={e =>
                    handleInputChange(
                      'hourly_rate_diff',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className={`w-full px-3 py-2 pr-8 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.hourly_rate_diff
                      ? 'border-red-500'
                      : 'border-gray-300'
                  }`}
                  placeholder='0'
                  min='-10000'
                  max='10000'
                  step='100'
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

            <div>
              <label className='text-sm font-medium text-gray-700 mb-1 block'>
                {formData.type === 'staff'
                  ? '同時対応人数'
                  : formData.type === 'room'
                  ? '収容人数'
                  : formData.type === 'equipment'
                  ? '同時利用数'
                  : '乗車定員'}
              </label>
              <input
                type='number'
                value={formData.capacity || 1}
                onChange={e =>
                  handleInputChange('capacity', parseInt(e.target.value) || 1)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.capacity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder='1'
                min='1'
                max='100'
              />
              {errors.capacity && (
                <p className='mt-1 text-sm text-red-600'>{errors.capacity}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>画像設定</h3>
          <div>
            <label className='flex items-center text-sm font-medium text-gray-700 mb-1'>
              <PhotoIcon className='w-4 h-4 mr-1' />
              画像URL（任意）
            </label>
            <input
              type='url'
              value={formData.photo_url || ''}
              onChange={e => handleInputChange('photo_url', e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
              placeholder='https://example.com/image.jpg'
            />
          </div>
        </div>

        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            ステータス設定
          </h3>
          <div className='space-y-3'>
            <div className='flex items-center'>
              <input
                type='checkbox'
                id='is_active'
                checked={formData.is_active !== false}
                onChange={e => handleInputChange('is_active', e.target.checked)}
                className='w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500'
              />
              <label htmlFor='is_active' className='ml-2 text-sm text-gray-700'>
                アクティブ状態（予約受付可能）
              </label>
            </div>
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
          {selectedType?.label}を作成
        </Button>
      </div>
    </Modal>
  );
};

export default ResourceCreateModal;
