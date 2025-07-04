import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import Button from '../ui/Button';
import { Menu, UpdateMenuRequest } from '../../types';
import { menuApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';

interface MenuEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  menuId: number | null;
}

/**
 * メニュー編集モーダル
 * 
 * 既存メニューの編集フォーム
 * 初期データ取得、差分更新、バリデーション対応
 */
const MenuEditModal: React.FC<MenuEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  menuId,
}) => {
  const { addNotification } = useUIStore();
  
  // 状態管理
  const [loading, setLoading] = useState(false);
  const [originalMenu, setOriginalMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState<UpdateMenuRequest>({});
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

  // 性別制限オプション（将来の拡張用）
  // const genderOptions = [
  //   { value: 'none', label: '制限なし' },
  //   { value: 'male_only', label: '男性のみ' },
  //   { value: 'female_only', label: '女性のみ' },
  // ];

  // メニューデータ取得
  useEffect(() => {
    if (isOpen && menuId) {
      loadMenuData();
    }
  }, [isOpen, menuId]);

  /**
   * メニューデータ読み込み
   */
  const loadMenuData = async () => {
    if (!menuId) return;

    try {
      setLoading(true);
      const menu = await menuApi.get(menuId);
      
      setOriginalMenu(menu);
      
      // フォームデータを初期化
      setFormData({
        name: menu.name,
        display_name: menu.display_name,
        category: menu.category,
        description: menu.description,
        base_price: menu.base_price,
        base_duration: menu.base_duration,
        prep_duration: menu.prep_duration,
        cleanup_duration: menu.cleanup_duration,
        is_active: menu.is_active,
        requires_approval: menu.requires_approval,
        sort_order: menu.sort_order,
      });
      
      setErrors({});
    } catch (error: any) {
      console.error('メニューデータ取得エラー:', error);
      addNotification({
        type: 'error',
        title: 'データ取得エラー',
        message: 'メニューデータの取得に失敗しました',
        duration: 5000,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // フォーム値更新
  const updateFormData = (field: keyof UpdateMenuRequest, value: any) => {
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

    if (formData.name !== undefined && !formData.name.trim()) {
      newErrors.name = 'メニュー名は必須です';
    }

    if (formData.display_name !== undefined && !formData.display_name.trim()) {
      newErrors.display_name = '表示名は必須です';
    }

    if (formData.base_price !== undefined && formData.base_price < 0) {
      newErrors.base_price = '基本料金は0円以上で入力してください';
    }

    if (formData.base_duration !== undefined) {
      const baseDuration = typeof formData.base_duration === 'string' ? parseFloat(formData.base_duration) : formData.base_duration;
      if (isNaN(baseDuration) || baseDuration <= 0) {
        newErrors.base_duration = '基本時間は1分以上で入力してください';
      }
      if (baseDuration > 1440) {
        newErrors.base_duration = '基本時間は24時間以内で入力してください';
      }
    }

    if (formData.prep_duration !== undefined && formData.prep_duration < 0) {
      newErrors.prep_duration = '準備時間は0分以上で入力してください';
    }

    if (formData.cleanup_duration !== undefined && formData.cleanup_duration < 0) {
      newErrors.cleanup_duration = '片付け時間は0分以上で入力してください';
    }

    // 総時間チェック（24時間以内）
    if (formData.base_duration !== undefined) {
      const baseDuration = typeof formData.base_duration === 'string' ? parseFloat(formData.base_duration) : formData.base_duration;
      const prepDuration = formData.prep_duration !== undefined 
        ? (typeof formData.prep_duration === 'string' ? parseFloat(formData.prep_duration) : formData.prep_duration)
        : (originalMenu?.prep_duration || 0);
      const cleanupDuration = formData.cleanup_duration !== undefined 
        ? (typeof formData.cleanup_duration === 'string' ? parseFloat(formData.cleanup_duration) : formData.cleanup_duration)
        : (originalMenu?.cleanup_duration || 0);
      
      if (!isNaN(baseDuration) && !isNaN(prepDuration) && !isNaN(cleanupDuration)) {
        const totalDuration = baseDuration + prepDuration + cleanupDuration;
        if (totalDuration > 1440) {
          newErrors.base_duration = '総所要時間（基本時間+準備時間+片付け時間）は24時間以内にしてください';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 変更検出
  const hasChanges = (): boolean => {
    if (!originalMenu) return false;
    
    return Object.keys(formData).some(key => {
      const formValue = formData[key as keyof UpdateMenuRequest];
      const originalValue = originalMenu[key as keyof Menu];
      return formValue !== undefined && formValue !== originalValue;
    });
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!hasChanges()) {
      addNotification({
        type: 'info',
        title: '変更なし',
        message: '変更された項目がありません',
        duration: 3000,
      });
      return;
    }

    if (!menuId) return;

    setIsSubmitting(true);

    try {
      // 変更された項目のみを送信
      const updateData: UpdateMenuRequest = {};
      Object.keys(formData).forEach(key => {
        const formValue = formData[key as keyof UpdateMenuRequest];
        const originalValue = originalMenu?.[key as keyof Menu];
        if (formValue !== undefined && formValue !== originalValue) {
          (updateData as any)[key] = formValue;
        }
      });

      await menuApi.update(menuId, updateData);
      
      addNotification({
        type: 'success',
        title: 'メニュー更新',
        message: 'メニューが更新されました',
        duration: 3000,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('メニュー更新エラー:', error);
      
      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      } else {
        addNotification({
          type: 'error',
          title: 'メニュー更新エラー',
          message: error.response?.data?.error?.message || 'メニューの更新に失敗しました',
          duration: 5000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルクローズ処理
  const handleClose = () => {
    setFormData({});
    setOriginalMenu(null);
    setErrors({});
    setIsSubmitting(false);
    setLoading(false);
    onClose();
  };

  // 変更確認
  const handleCloseWithConfirm = () => {
    if (hasChanges()) {
      if (confirm('変更が保存されていません。閉じてもよろしいですか？')) {
        handleClose();
      }
    } else {
      handleClose();
    }
  };

  if (!originalMenu && loading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="メニュー編集"
        size="lg"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">メニューデータを読み込み中...</span>
        </div>
      </Modal>
    );
  }

  if (!originalMenu) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseWithConfirm}
      title={`メニュー編集: ${originalMenu.display_name}`}
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
              value={formData.name || originalMenu.name}
              onChange={(value) => updateFormData('name', value)}
              placeholder="例: cut"
              error={errors.name}
              required
            />

            <FormField
              label="表示名"
              name="display_name"
              type="text"
              value={formData.display_name || originalMenu.display_name}
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
            value={formData.category !== undefined ? formData.category : (originalMenu.category || '')}
            onChange={(value) => updateFormData('category', value)}
            options={categoryOptions}
            error={errors.category}
          />

          <FormField
            label="説明"
            name="description"
            type="textarea"
            value={formData.description !== undefined ? formData.description : (originalMenu.description || '')}
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
              value={formData.base_price !== undefined ? formData.base_price : originalMenu.base_price}
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
              value={formData.base_duration !== undefined ? formData.base_duration : originalMenu.base_duration}
              onChange={(value) => updateFormData('base_duration', value)}
              placeholder="分"
              error={errors.base_duration}
              min={0}
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
              value={formData.prep_duration !== undefined ? formData.prep_duration : originalMenu.prep_duration}
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
              value={formData.cleanup_duration !== undefined ? formData.cleanup_duration : originalMenu.cleanup_duration}
              onChange={(value) => updateFormData('cleanup_duration', value)}
              placeholder="分"
              error={errors.cleanup_duration}
              min={0}
              max={120}
              step={5}
            />
          </div>
        </div>

        {/* 設定 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
            設定
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_active_edit"
                checked={formData.is_active !== undefined ? formData.is_active : originalMenu.is_active}
                onChange={(e) => updateFormData('is_active', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_active_edit" className="text-sm font-medium text-gray-700">
                アクティブ状態
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="requires_approval_edit"
                checked={formData.requires_approval !== undefined ? formData.requires_approval : originalMenu.requires_approval}
                onChange={(e) => updateFormData('requires_approval', e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="requires_approval_edit" className="text-sm font-medium text-gray-700">
                承認必要
              </label>
            </div>
          </div>
        </div>

        {/* 変更サマリー */}
        {hasChanges() && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h5 className="text-sm font-medium text-blue-900 mb-2">変更内容</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              {Object.keys(formData).map(key => {
                const formValue = formData[key as keyof UpdateMenuRequest];
                const originalValue = originalMenu[key as keyof Menu];
                if (formValue !== undefined && formValue !== originalValue) {
                  return (
                    <li key={key}>
                      • {key}: {String(originalValue)} → {String(formValue)}
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            size="md"
            onClick={handleCloseWithConfirm}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || !hasChanges()}
          >
            {isSubmitting ? '更新中...' : '変更を保存'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MenuEditModal; 