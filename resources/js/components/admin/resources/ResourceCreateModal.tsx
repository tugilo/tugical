import React, { useState } from 'react';
import {
  UserIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  ClockIcon,
  CurrencyYenIcon,
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import FieldLabel from '../ui/FieldLabel';
import FieldTip from '../ui/FieldTip';
import SoftNumberField from '../ui/SoftNumberField';
import MultiImageUploadField, {
  EntityImageItem,
} from '../ui/MultiImageUploadField';
import { capacityTip, FIELD_TIPS } from '../ui/fieldTips';
import { resourceApi } from '../../../services/api';
import { useUIStore } from '../../../stores/uiStore';
import type { Resource, ResourceType } from '../../../types';

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
  images: EntityImageItem[];
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
    images: [],
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

  // 作業時間の倍率（メニュー所要時間に掛ける）
  const efficiencyOptions = [
    { value: 0.8, label: '短め（×0.8）' },
    { value: 0.9, label: 'やや短め（×0.9）' },
    { value: 1.0, label: 'そのまま（標準）' },
    { value: 1.1, label: 'やや長め（×1.1）' },
    { value: 1.2, label: '長め（×1.2）' },
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
      newErrors.efficiency_rate =
        '作業時間の調整は0.5〜2.0の範囲で選んでください';
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
        '指名料金は-10,000〜10,000円の範囲で入力してください';
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
      const images = formData.images || [];
      const primary =
        images.find(img => img.is_primary)?.url || images[0]?.url || null;
      const resource = await resourceApi.create({
        ...formData,
        images,
        photo_url: primary,
      });
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
      images: [],
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
          <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            種類
            <FieldTip tip={FIELD_TIPS.resourceType} label='種類の説明' />
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

        <MultiImageUploadField
          value={formData.images || []}
          onChange={images => handleInputChange('images', images)}
          onUpload={file => resourceApi.uploadImage(file)}
          label='画像'
          hint='任意・最大10枚 / ドラッグ＆ドロップ可 / ★がメイン'
          error={errors.images || errors.photo_url}
          disabled={isLoading}
          max={10}
        />

        {/* 基本情報 */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>基本情報</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <FieldLabel
                label='表示名'
                tip={FIELD_TIPS.resourceDisplayName}
                required
                startAdornment={<TypeIcon className='w-4 h-4 mr-1' />}
              />
              <input
                type='text'
                value={formData.display_name || ''}
                onChange={e => {
                  const v = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    display_name: v,
                    // 管理コードが空、または表示名と同値なら同期
                    name:
                      !prev.name || prev.name === prev.display_name
                        ? v.trim()
                        : prev.name,
                  }));
                  if (errors.display_name || errors.name) {
                    setErrors(prev => {
                      const next = { ...prev };
                      delete next.display_name;
                      delete next.name;
                      return next;
                    });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.display_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={`例: ${
                  formData.type === 'staff'
                    ? '山田'
                    : formData.type === 'room'
                    ? '個室A'
                    : formData.type === 'equipment'
                    ? '機器A'
                    : '送迎車'
                }`}
              />
              {errors.display_name && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.display_name}
                </p>
              )}
            </div>

            <div>
              <FieldLabel
                label='管理コード'
                tip={FIELD_TIPS.resourceName}
                required
              />
              <input
                type='text'
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder='表示名と同じでもOK'
              />
              {errors.name && (
                <p className='mt-1 text-sm text-red-600'>{errors.name}</p>
              )}
            </div>
          </div>

          <div className='mt-4'>
            <FieldLabel label='説明' tip={FIELD_TIPS.resourceDescription} />
            <textarea
              value={formData.description || ''}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={2}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
              placeholder='任意'
            />
          </div>
        </div>

        {/* 詳細設定 */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>詳細設定</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <SoftNumberField
              name='hourly_rate_diff'
              label='指名料金'
              tip={FIELD_TIPS.hourlyRateDiff}
              value={formData.hourly_rate_diff || 0}
              onChange={v => handleInputChange('hourly_rate_diff', v)}
              error={errors.hourly_rate_diff}
              unit='円/時'
              min={-10000}
              max={10000}
              step={100}
              startAdornment={<CurrencyYenIcon className='w-4 h-4 mr-1' />}
              disabled={isLoading}
            />

            <SoftNumberField
              name='capacity'
              label={
                formData.type === 'staff'
                  ? '同時対応人数'
                  : formData.type === 'room'
                    ? '収容人数'
                    : formData.type === 'equipment'
                      ? '同時利用数'
                      : '乗車定員'
              }
              tip={capacityTip(formData.type)}
              value={formData.capacity || 1}
              onChange={v => handleInputChange('capacity', v)}
              error={errors.capacity}
              unit='人'
              min={1}
              max={100}
              disabled={isLoading}
            />

            <div>
              <FieldLabel
                label='作業時間の調整'
                tip={FIELD_TIPS.efficiencyRate}
                startAdornment={<ClockIcon className='w-4 h-4 mr-1' />}
              />
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
          </div>
        </div>

        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            公開設定
            <FieldTip tip={FIELD_TIPS.resourceActive} label='公開設定の説明' />
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
                予約受付する（公開）
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
