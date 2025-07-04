import React, { useState } from 'react';
import { 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import { customerApi } from '../../services/api';
import { useToast } from '../../stores/uiStore';
import type { CreateCustomerRequest, Customer } from '../../types';

interface CustomerCreateModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** 作成後のコールバック */
  onCreate?: (customer: Customer) => void;
}

/**
 * 顧客新規登録モーダル
 * - 新規顧客の登録
 * - バリデーション
 * - エラーハンドリング
 */
const CustomerCreateModal: React.FC<CustomerCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: '',
    phone: '',
    email: '',
    address: '',
    birth_date: '',
    gender: undefined,
    notes: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof CreateCustomerRequest, value: any) => {
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '名前を入力してください';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '電話番号を入力してください';
    } else if (!/^[0-9-]+$/.test(formData.phone)) {
      newErrors.phone = '電話番号は数字とハイフンのみ入力してください';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません';
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
      const customer = await customerApi.create(formData);
      addToast({
        type: 'success',
        title: '顧客を登録しました',
        message: `${customer.name}様を登録しました`,
      });
      onCreate?.(customer);
      onClose();
      // フォームをリセット
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        birth_date: '',
        gender: undefined,
        notes: '',
        is_active: true,
      });
      setErrors({});
    } catch (error: any) {
      const apiErrors = error.response?.data?.error?.details;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        addToast({
          type: 'error',
          title: '登録に失敗しました',
          message: error.response?.data?.error?.message || 'エラーが発生しました',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      // フォームをリセット
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        birth_date: '',
        gender: undefined,
        notes: '',
        is_active: true,
      });
      setErrors({});
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="新規顧客登録"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={isLoading}
          >
            登録
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 基本情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 名前（必須） */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="w-4 h-4 mr-1" />
                名前
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="山田 太郎"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* 電話番号（必須） */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <PhoneIcon className="w-4 h-4 mr-1" />
                電話番号
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="090-1234-5678"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* メールアドレス */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <EnvelopeIcon className="w-4 h-4 mr-1" />
                メールアドレス
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="yamada@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 性別 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                性別
              </label>
              <select
                value={formData.gender || ''}
                onChange={(e) => handleInputChange('gender', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>
        </div>

        {/* 詳細情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">詳細情報</h3>
          <div className="space-y-4">
            {/* 住所 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <MapPinIcon className="w-4 h-4 mr-1" />
                住所
              </label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="東京都渋谷区..."
              />
            </div>

            {/* 生年月日 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <CalendarIcon className="w-4 h-4 mr-1" />
                生年月日
              </label>
              <input
                type="date"
                value={formData.birth_date || ''}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* 備考 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <DocumentTextIcon className="w-4 h-4 mr-1" />
                備考
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="アレルギー情報、特記事項など"
              />
            </div>

            {/* ステータス */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active !== false}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">有効な顧客として登録する</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomerCreateModal; 