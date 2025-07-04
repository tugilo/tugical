import React, { useState } from 'react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import Button from '../ui/Button';
import { CreateMenuRequest } from '../../types';
import { menuApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';

interface MenuCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * メニュー作成モーダル
 * 
 * 新規メニューの作成フォーム
 * バリデーション、API送信、エラーハンドリング対応
 */
const MenuCreateModal: React.FC<MenuCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addNotification } = useUIStore();
  
  // フォーム状態
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
    is_active: true,
    requires_approval: false,
    sort_order: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // カテゴリオプション（美容室）
  const categoryOptions = [
    { value: 'カット', label: 'カット' },
    { value: 'カラー', label: 'カラー' },
    { value: 'パーマ', label: 'パーマ' },
    { value: 'ストレート', label: 'ストレート' },
    { value: 'ヘアケア', label: 'ヘアケア' },
    { value: 'スパ・ケア', label: 'スパ・ケア' },
    { value: 'セット', label: 'セット' },
    { value: 'その他', label: 'その他' },
  ];

  // 性別制限オプション
  const genderOptions = [
    { value: 'none', label: '制限なし' },
    { value: 'male_only', label: '男性のみ' },
    { value: 'female_only', label: '女性のみ' },
  ];

  // フォーム値更新
  const updateFormData = (field: keyof CreateMenuRequest, value: any) => {
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

  // フォームバリデーション
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'メニュー名は必須です';
    }

    if (!formData.display_name || !formData.display_name.trim()) {
      newErrors.display_name = '表示名は必須です';
    }

    if (!formData.category) {
      newErrors.category = 'カテゴリは必須です';
    }

    if (formData.base_price < 0) {
      newErrors.base_price = '基本料金は0円以上で入力してください';
    }

    if (formData.base_duration < 1) {
      newErrors.base_duration = '基本時間は1分以上で入力してください';
    }

    if (formData.base_duration > 1440) {
      newErrors.base_duration = '基本時間は24時間以内で入力してください';
    }

    if ((formData.prep_duration || 0) < 0) {
      newErrors.prep_duration = '準備時間は0分以上で入力してください';
    }

    if ((formData.cleanup_duration || 0) < 0) {
      newErrors.cleanup_duration = '片付け時間は0分以上で入力してください';
    }

    if ((formData.advance_booking_hours || 0) < 0) {
      newErrors.advance_booking_hours = '事前予約時間は0時間以上で入力してください';
    }

    // 総時間チェック（24時間以内）
    const totalDuration = formData.base_duration + (formData.prep_duration || 0) + (formData.cleanup_duration || 0);
    if (totalDuration > 1440) {
      newErrors.base_duration = '総所要時間（基本時間+準備時間+片付け時間）は24時間以内にしてください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await menuApi.create(formData);
      
      addNotification({
        type: 'success',
        title: 'メニュー作成',
        message: 'メニューが作成されました',
        duration: 3000,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('メニュー作成エラー:', error);
      
      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      } else {
        addNotification({
          type: 'error',
          title: 'メニュー作成エラー',
          message: error.response?.data?.error?.message || 'メニューの作成に失敗しました',
          duration: 5000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルクローズ処理
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
      is_active: true,
      requires_approval: false,
      sort_order: 0,
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="新規メニュー作成"
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
            基本情報
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="メニュー名"
              name="name"
              type="text"
              value={formData.name}
              onChange={(value) => updateFormData('name', value)}
              placeholder="例: cut"
              error={errors.name}
              required
            />

            <FormField
              label="表示名"
              name="display_name"
              type="text"
              value={formData.display_name || ''}
              onChange={(value) => updateFormData('display_name', value)}
              placeholder="例: カット"
              error={errors.display_name}
              required
            />
          </div>

          <FormField
            label="カテゴリ"
            name="category"
            type="select"
            value={formData.category || ''}
            onChange={(value) => updateFormData('category', value)}
            options={categoryOptions}
            error={errors.category}
            required
          />

          <FormField
            label="説明"
            name="description"
            type="textarea"
            value={formData.description || ''}
            onChange={(value) => updateFormData('description', value)}
            placeholder="メニューの詳細説明を入力してください"
            error={errors.description}
            rows={3}
          />
        </div>

        {/* 料金・時間設定 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
            料金・時間設定
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="基本料金"
              name="base_price"
              type="number"
              value={formData.base_price}
              onChange={(value) => updateFormData('base_price', value)}
              placeholder="円"
              error={errors.base_price}
              min={0}
              step={100}
              required
            />

            <FormField
              label="基本時間"
              name="base_duration"
              type="number"
              value={formData.base_duration}
              onChange={(value) => updateFormData('base_duration', value)}
              placeholder="分"
              error={errors.base_duration}
              min={1}
              max={1440}
              step={5}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="準備時間"
              name="prep_duration"
              type="number"
              value={formData.prep_duration || 0}
              onChange={(value) => updateFormData('prep_duration', value)}
              placeholder="分"
              error={errors.prep_duration}
              min={0}
              max={120}
              step={5}
            />

            <FormField
              label="片付け時間"
              name="cleanup_duration"
              type="number"
              value={formData.cleanup_duration || 0}
              onChange={(value) => updateFormData('cleanup_duration', value)}
              placeholder="分"
              error={errors.cleanup_duration}
              min={0}
              max={120}
              step={5}
            />
          </div>
        </div>

        {/* 予約設定 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
            予約設定
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="事前予約時間"
              name="advance_booking_hours"
              type="number"
              value={formData.advance_booking_hours || 0}
              onChange={(value) => updateFormData('advance_booking_hours', value)}
              placeholder="時間"
              error={errors.advance_booking_hours}
              min={0}
              max={720}
            />

            <FormField
              label="性別制限"
              name="gender_restriction"
              type="select"
              value={formData.gender_restriction || 'none'}
              onChange={(value) => updateFormData('gender_restriction', value)}
              options={genderOptions}
              error={errors.gender_restriction}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => updateFormData('is_active', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                アクティブ状態
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="requires_approval"
                checked={formData.requires_approval || false}
                onChange={(e) => updateFormData('requires_approval', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="requires_approval" className="text-sm font-medium text-gray-700">
                承認必要
              </label>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            size="md"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? '作成中...' : 'メニューを作成'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MenuCreateModal; 