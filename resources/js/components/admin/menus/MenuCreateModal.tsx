import React, { useState } from 'react';
import Modal from '../modal/Modal';
import FormField from '../ui/FormField';
import FieldTip from '../ui/FieldTip';
import AppButton from '../ui/AppButton';
import MenuImageField from './MenuImageField';
import { FIELD_TIPS } from '../ui/fieldTips';
import { CreateMenuRequest } from '../../../types';
import { menuApi } from '../../../services/api';
import { useUIStore } from '../../../stores/uiStore';

interface MenuCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * メニュー作成モーダル（シンプルUI + メイン画像1枚）
 */
const MenuCreateModal: React.FC<MenuCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addNotification } = useUIStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<CreateMenuRequest>({
    name: '',
    display_name: '',
    category: '',
    description: '',
    base_price: 0,
    base_duration: 60,
    prep_duration: 0,
    cleanup_duration: 0,
    advance_booking_hours: 1,
    gender_restriction: 'none',
    image_url: undefined,
    images: [],
    is_active: true,
    requires_approval: false,
    sort_order: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof CreateMenuRequest, value: unknown) => {
    let processedValue = value;
    if (
      [
        'base_price',
        'base_duration',
        'prep_duration',
        'cleanup_duration',
        'advance_booking_hours',
        'sort_order',
      ].includes(field)
    ) {
      processedValue = typeof value === 'string' ? Number(value) : value;
      if (typeof processedValue === 'number' && isNaN(processedValue)) {
        processedValue = 0;
      }
    }

    setFormData(prev => {
      const next = { ...prev, [field]: processedValue };
      // 表示名を変えたら内部名も合わせる（入力欄を1つに）
      if (field === 'display_name' && typeof processedValue === 'string') {
        next.name = processedValue.trim();
      }
      return next;
    });

    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const label = (formData.display_name || formData.name || '').trim();

    if (!label) {
      newErrors.display_name = 'メニュー名は必須です';
    }

    const basePrice = Number(formData.base_price);
    if (isNaN(basePrice) || basePrice < 0) {
      newErrors.base_price = '料金は0円以上で入力してください';
    }

    const baseDuration = Number(formData.base_duration);
    if (isNaN(baseDuration) || baseDuration < 1) {
      newErrors.base_duration = '所要時間は1分以上で入力してください';
    } else if (baseDuration > 1440) {
      newErrors.base_duration = '所要時間は24時間以内で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const label = (formData.display_name || formData.name || '').trim();
      const images = formData.images || [];
      const primary =
        images.find(img => img.is_primary)?.url || images[0]?.url || undefined;
      await menuApi.create({
        ...formData,
        name: label,
        display_name: label,
        category: formData.category?.trim() || undefined,
        images,
        image_url: primary,
      });

      addNotification({
        type: 'success',
        title: 'メニュー作成',
        message: 'メニューが作成されました',
        duration: 3000,
      });

      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error('メニュー作成エラー:', error);
      const err = error as {
        response?: { data?: { error?: { details?: Record<string, string>; message?: string } } };
      };
      if (err.response?.data?.error?.details) {
        setErrors(err.response.data.error.details);
      } else {
        addNotification({
          type: 'error',
          title: 'メニュー作成エラー',
          message:
            err.response?.data?.error?.message ||
            'メニューの作成に失敗しました',
          duration: 5000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      display_name: '',
      category: '',
      description: '',
      base_price: 0,
      base_duration: 60,
      prep_duration: 0,
      cleanup_duration: 0,
      advance_booking_hours: 1,
      gender_restriction: 'none',
      image_url: undefined,
      images: [],
      is_active: true,
      requires_approval: false,
      sort_order: 0,
    });
    setShowAdvanced(false);
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='新規メニュー'
      size='md'
      className='max-h-[90vh] overflow-y-auto'
    >
      <form onSubmit={handleSubmit} className='space-y-5'>
        <MenuImageField
          value={formData.images || []}
          onChange={images => updateFormData('images', images)}
          error={errors.images || errors.image_url}
          disabled={isSubmitting}
        />

        <FormField
          label='メニュー名'
          name='display_name'
          type='text'
          value={formData.display_name || ''}
          onChange={value => updateFormData('display_name', value)}
          placeholder='例: カット'
          error={errors.display_name || errors.name}
          tip={FIELD_TIPS.menuName}
          required
        />

        <FormField
          label='カテゴリ'
          name='category'
          type='text'
          value={formData.category || ''}
          onChange={value => updateFormData('category', value)}
          placeholder='任意（例: カット）'
          error={errors.category}
          tip={FIELD_TIPS.menuCategory}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            label='料金'
            name='base_price'
            type='number'
            value={formData.base_price}
            onChange={value => updateFormData('base_price', value)}
            placeholder='円'
            error={errors.base_price}
            tip={FIELD_TIPS.menuPrice}
            min={0}
            step={100}
            required
          />
          <FormField
            label='所要時間'
            name='base_duration'
            type='number'
            value={formData.base_duration}
            onChange={value => updateFormData('base_duration', value)}
            placeholder='分'
            error={errors.base_duration}
            tip={FIELD_TIPS.menuDuration}
            min={1}
            max={1440}
            step={5}
            required
          />
        </div>

        <FormField
          label='説明'
          name='description'
          type='textarea'
          value={formData.description || ''}
          onChange={value => updateFormData('description', value)}
          placeholder='任意'
          error={errors.description}
          tip={FIELD_TIPS.menuDescription}
          rows={2}
        />

        <div className='flex items-center space-x-3'>
          <input
            type='checkbox'
            id='is_active'
            checked={formData.is_active}
            onChange={e => updateFormData('is_active', e.target.checked)}
            className='w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500'
          />
          <label
            htmlFor='is_active'
            className='text-sm font-medium text-gray-700 inline-flex items-center'
          >
            公開する
            <FieldTip tip={FIELD_TIPS.menuActive} label='公開するの説明' />
          </label>
        </div>

        <div>
          <button
            type='button'
            onClick={() => setShowAdvanced(prev => !prev)}
            className='text-sm text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline min-h-[44px]'
          >
            {showAdvanced ? '詳細設定を閉じる' : '詳細設定（準備時間など）'}
          </button>

          {showAdvanced && (
            <div className='mt-3 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  label='準備時間'
                  name='prep_duration'
                  type='number'
                  value={formData.prep_duration || 0}
                  onChange={value => updateFormData('prep_duration', value)}
                  placeholder='分'
                  tip={FIELD_TIPS.prepDuration}
                  min={0}
                  max={180}
                />
                <FormField
                  label='片付け時間'
                  name='cleanup_duration'
                  type='number'
                  value={formData.cleanup_duration || 0}
                  onChange={value => updateFormData('cleanup_duration', value)}
                  placeholder='分'
                  tip={FIELD_TIPS.cleanupDuration}
                  min={0}
                  max={180}
                />
              </div>
              <FormField
                label='受付締切（何時間前まで）'
                name='advance_booking_hours'
                type='number'
                value={formData.advance_booking_hours || 0}
                onChange={value =>
                  updateFormData('advance_booking_hours', value)
                }
                placeholder='時間'
                tip={FIELD_TIPS.advanceBookingHours}
                min={0}
                max={168}
              />
              <div className='flex items-center space-x-3'>
                <input
                  type='checkbox'
                  id='requires_approval'
                  checked={formData.requires_approval || false}
                  onChange={e =>
                    updateFormData('requires_approval', e.target.checked)
                  }
                  className='w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500'
                />
                <label
                  htmlFor='requires_approval'
                  className='text-sm font-medium text-gray-700 inline-flex items-center'
                >
                  承認が必要
                  <FieldTip
                    tip={FIELD_TIPS.requiresApproval}
                    label='承認が必要の説明'
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className='flex justify-end space-x-3 pt-4 border-t border-gray-200'>
          <AppButton
            variant='outline'
            size='md'
            onClick={handleClose}
            disabled={isSubmitting}
          >
            キャンセル
          </AppButton>
          <AppButton
            variant='primary'
            size='md'
            type='submit'
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? '作成中...' : '作成する'}
          </AppButton>
        </div>
      </form>
    </Modal>
  );
};

export default MenuCreateModal;
