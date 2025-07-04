import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Customer, CreateCustomerRequest } from '../../types';
import Button from '../ui/Button';
import { apiClient } from '../../services/api';
import { usePostalCodeSearch } from '../../hooks/usePostalCodeSearch';

interface CustomerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export const CustomerCreateModal: React.FC<CustomerCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: '',
    phone: '',
    email: '',
    postal_code: '',
    prefecture: '',
    city: '',
    address_line1: '',
    address_line2: '',
    address: '',
    line_user_id: '',
    line_display_name: '',
    line_picture_url: '',
    loyalty_rank: 'new',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 郵便番号自動補完フック
  const {
    isLoading: postalCodeLoading,
    handlePostalCodeChange,
    formatPostalCode,
  } = usePostalCodeSearch();

  /**
   * 郵便番号変更時の処理（自動ハイフン挿入 + 住所自動補完）
   */
  const onPostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostalCode(e.target.value);
    setFormData(prev => ({ ...prev, postal_code: formatted }));

    // 住所自動補完
    handlePostalCodeChange(formatted, address => {
      setFormData(prev => ({
        ...prev,
        prefecture: address.prefecture,
        city: address.city,
        address_line1: address.address_line1,
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const customer = await apiClient.createCustomer(formData);
      onSuccess(customer);
      onClose();

      // フォームをリセット
      setFormData({
        name: '',
        phone: '',
        email: '',
        postal_code: '',
        prefecture: '',
        city: '',
        address_line1: '',
        address_line2: '',
        address: '',
        line_user_id: '',
        line_display_name: '',
        line_picture_url: '',
        loyalty_rank: 'new',
        notes: '',
      });
    } catch (error: any) {
      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      } else {
        setErrors({
          general: error.message || '顧客の作成に失敗しました',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        <div className='flex justify-between items-center mb-6'>
          <h2 className='text-xl font-semibold text-gray-900'>顧客新規登録</h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* 一般エラー */}
          {errors.general && (
            <div className='bg-red-50 border border-red-200 rounded-md p-3'>
              <p className='text-sm text-red-600'>{errors.general}</p>
            </div>
          )}

          {/* 基本情報 */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-gray-900'>基本情報</h3>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  お名前 <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='山田太郎'
                />
                {errors.name && (
                  <p className='mt-1 text-sm text-red-600'>{errors.name}</p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  電話番号 <span className='text-red-500'>*</span>
                </label>
                <input
                  type='tel'
                  value={formData.phone}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, phone: e.target.value }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='090-1234-5678'
                />
                {errors.phone && (
                  <p className='mt-1 text-sm text-red-600'>{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                メールアドレス
              </label>
              <input
                type='email'
                value={formData.email || ''}
                onChange={e =>
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='example@email.com'
              />
              {errors.email && (
                <p className='mt-1 text-sm text-red-600'>{errors.email}</p>
              )}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                ロイヤリティランク
              </label>
              <select
                value={formData.loyalty_rank}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    loyalty_rank: e.target.value as any,
                  }))
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500'
              >
                <option value='new'>新規</option>
                <option value='regular'>一般</option>
                <option value='vip'>VIP</option>
                <option value='premium'>プレミアム</option>
              </select>
            </div>
          </div>

          {/* 住所情報 */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-gray-900'>住所情報</h3>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  郵便番号
                  {postalCodeLoading && (
                    <span className='ml-2 text-xs text-blue-600'>
                      検索中...
                    </span>
                  )}
                </label>
                <input
                  type='text'
                  value={formData.postal_code || ''}
                  onChange={onPostalCodeChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.postal_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='123-4567'
                  maxLength={8}
                />
                {errors.postal_code && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.postal_code}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  都道府県
                </label>
                <input
                  type='text'
                  value={formData.prefecture || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      prefecture: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.prefecture ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='東京都'
                />
                {errors.prefecture && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.prefecture}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  市区町村
                </label>
                <input
                  type='text'
                  value={formData.city || ''}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, city: e.target.value }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.city ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='渋谷区'
                />
                {errors.city && (
                  <p className='mt-1 text-sm text-red-600'>{errors.city}</p>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  番地・建物名
                </label>
                <input
                  type='text'
                  value={formData.address_line1 || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      address_line1: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.address_line1 ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='神宮前1-2-3 テストビル'
                />
                {errors.address_line1 && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.address_line1}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  部屋番号・その他
                </label>
                <input
                  type='text'
                  value={formData.address_line2 || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      address_line2: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.address_line2 ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='5F'
                />
                {errors.address_line2 && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.address_line2}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                完全住所（任意）
              </label>
              <textarea
                value={formData.address || ''}
                onChange={e =>
                  setFormData(prev => ({ ...prev, address: e.target.value }))
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                rows={2}
                placeholder='上記の構造化住所が適切でない場合、こちらに完全な住所を入力してください'
              />
              {errors.address && (
                <p className='mt-1 text-sm text-red-600'>{errors.address}</p>
              )}
            </div>
          </div>

          {/* LINE情報 */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium text-gray-900'>
              LINE情報（任意）
            </h3>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  LINE表示名
                </label>
                <input
                  type='text'
                  value={formData.line_display_name || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      line_display_name: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.line_display_name
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder='LINEでの表示名'
                />
                {errors.line_display_name && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.line_display_name}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  LINE User ID
                </label>
                <input
                  type='text'
                  value={formData.line_user_id || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      line_user_id: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.line_user_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder='U1234567890abcdef...'
                />
                {errors.line_user_id && (
                  <p className='mt-1 text-sm text-red-600'>
                    {errors.line_user_id}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                LINEプロフィール画像URL
              </label>
              <input
                type='url'
                value={formData.line_picture_url || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    line_picture_url: e.target.value,
                  }))
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.line_picture_url ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder='https://...'
              />
              {errors.line_picture_url && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.line_picture_url}
                </p>
              )}
            </div>
          </div>

          {/* 備考 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              備考
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={e =>
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.notes ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={3}
              placeholder='特記事項があれば入力してください'
            />
            {errors.notes && (
              <p className='mt-1 text-sm text-red-600'>{errors.notes}</p>
            )}
          </div>

          {/* ボタン */}
          <div className='flex justify-end space-x-3 pt-6 border-t'>
            <Button
              type='button'
              variant='secondary'
              onClick={onClose}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button type='submit' variant='primary' disabled={loading}>
              {loading ? '作成中...' : '顧客を作成'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
