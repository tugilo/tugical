import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Edit2,
  Save,
  Trash2,
} from 'lucide-react';
import { Customer, UpdateCustomerRequest } from '../../types';
import Button from '../ui/Button';
import Modal from '../modal/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { apiClient } from '../../services/api';
import { usePostalCodeSearch } from '../../hooks/usePostalCodeSearch';

interface CustomerDetailModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onUpdate: (customer: Customer) => void;
  onDelete?: (customerId: number) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  customer,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<UpdateCustomerRequest>({
    name: '',
    phone: '',
    email: '',
    postal_code: '',
    prefecture: '',
    city: '',
    address_line1: '',
    address_line2: '',
    address: '',
    line_display_name: '',
    line_picture_url: '',
    loyalty_rank: 'new',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 郵便番号自動補完フック
  const {
    isLoading: postalCodeLoading,
    handlePostalCodeChange,
    formatPostalCode,
  } = usePostalCodeSearch();

  // 顧客データが変更された時にフォームデータを更新
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        postal_code: customer.postal_code || '',
        prefecture: customer.prefecture || '',
        city: customer.city || '',
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        address: customer.address || '',
        line_display_name: customer.line_display_name || '',
        line_picture_url: customer.line_picture_url || '',
        loyalty_rank: customer.loyalty_rank || 'new',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

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

  const handleSave = async () => {
    if (!customer) return;

    setLoading(true);
    setErrors({});

    try {
      const updatedCustomer = await apiClient.updateCustomer(
        customer.id,
        formData
      );
      onUpdate(updatedCustomer);
      setIsEditing(false);
    } catch (error: any) {
      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      } else {
        setErrors({
          general: error.message || '顧客の更新に失敗しました',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;

    setDeleteLoading(true);
    try {
      await apiClient.deleteCustomer(customer.id);
      onDelete?.(customer.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error: any) {
      setErrors({
        general:
          error.response?.data?.error?.message ||
          error.message ||
          '顧客の削除に失敗しました',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancel = () => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        postal_code: customer.postal_code || '',
        prefecture: customer.prefecture || '',
        city: customer.city || '',
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        address: customer.address || '',
        line_display_name: customer.line_display_name || '',
        line_picture_url: customer.line_picture_url || '',
        loyalty_rank: customer.loyalty_rank || 'new',
        notes: customer.notes || '',
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setErrors({});
    setShowDeleteConfirm(false);
    onClose();
  };

  const getLoyaltyRankLabel = (rank: string) => {
    const labels = {
      new: '新規',
      regular: '一般',
      vip: 'VIP',
      premium: 'プレミアム',
    };
    return labels[rank as keyof typeof labels] || rank;
  };

  const getLoyaltyRankColor = (rank: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      regular: 'bg-green-100 text-green-800',
      vip: 'bg-purple-100 text-purple-800',
      premium: 'bg-yellow-100 text-yellow-800',
    };
    return colors[rank as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!customer) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`顧客詳細: ${customer.name}`}
        size='xl'
        className='max-h-[90vh] overflow-y-auto'
      >
        <div className='space-y-6'>
          {/* 一般エラー */}
          {errors.general && (
            <div className='bg-red-50 border border-red-200 rounded-md p-3'>
              <p className='text-sm text-red-600'>{errors.general}</p>
            </div>
          )}

          {/* 編集モードトグル */}
          {!isEditing && (
            <div className='flex justify-between'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setIsEditing(true)}
                leftIcon={<Edit2 size={16} />}
              >
                編集
              </Button>

              {onDelete && (
                <Button
                  variant='danger'
                  size='sm'
                  onClick={() => setShowDeleteConfirm(true)}
                  leftIcon={<Trash2 size={16} />}
                >
                  削除
                </Button>
              )}
            </div>
          )}

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* 左側：基本情報 */}
            <div className='space-y-6'>
              {/* 基本情報 */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <h3 className='flex items-center text-lg font-medium text-gray-900 mb-4'>
                  <User className='mr-2' size={20} />
                  基本情報
                </h3>

                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      お名前
                    </label>
                    {isEditing ? (
                      <input
                        type='text'
                        value={formData.name || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    ) : (
                      <p className='text-gray-900'>{customer.name}</p>
                    )}
                    {errors.name && (
                      <p className='mt-1 text-sm text-red-600'>{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className='flex items-center text-sm font-medium text-gray-700 mb-1'>
                      <Phone className='mr-1' size={16} />
                      電話番号
                    </label>
                    {isEditing ? (
                      <input
                        type='tel'
                        value={formData.phone || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    ) : (
                      <p className='text-gray-900'>{customer.phone || '―'}</p>
                    )}
                    {errors.phone && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='flex items-center text-sm font-medium text-gray-700 mb-1'>
                      <Mail className='mr-1' size={16} />
                      メールアドレス
                    </label>
                    {isEditing ? (
                      <input
                        type='email'
                        value={formData.email || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    ) : (
                      <p className='text-gray-900'>{customer.email || '―'}</p>
                    )}
                    {errors.email && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      ロイヤリティランク
                    </label>
                    {isEditing ? (
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
                    ) : (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLoyaltyRankColor(
                          customer.loyalty_rank
                        )}`}
                      >
                        {getLoyaltyRankLabel(customer.loyalty_rank)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 住所情報 */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <h3 className='flex items-center text-lg font-medium text-gray-900 mb-4'>
                  <MapPin className='mr-2' size={20} />
                  住所情報
                </h3>

                {isEditing ? (
                  <div className='space-y-4'>
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
                            errors.postal_code
                              ? 'border-red-300'
                              : 'border-gray-300'
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
                            errors.prefecture
                              ? 'border-red-300'
                              : 'border-gray-300'
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
                            setFormData(prev => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            errors.city ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder='渋谷区'
                        />
                        {errors.city && (
                          <p className='mt-1 text-sm text-red-600'>
                            {errors.city}
                          </p>
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
                            errors.address_line1
                              ? 'border-red-300'
                              : 'border-gray-300'
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
                            errors.address_line2
                              ? 'border-red-300'
                              : 'border-gray-300'
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
                          setFormData(prev => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          errors.address ? 'border-red-300' : 'border-gray-300'
                        }`}
                        rows={2}
                        placeholder='上記の構造化住所が適切でない場合、こちらに完全な住所を入力してください'
                      />
                      {errors.address && (
                        <p className='mt-1 text-sm text-red-600'>
                          {errors.address}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {/* 構造化住所の表示 */}
                    {customer.postal_code ||
                    customer.prefecture ||
                    customer.city ||
                    customer.address_line1 ||
                    customer.address_line2 ? (
                      <div className='space-y-1'>
                        {customer.postal_code && (
                          <div className='flex items-center'>
                            <span className='bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono mr-2'>
                              {customer.postal_code}
                            </span>
                          </div>
                        )}
                        {(customer.prefecture || customer.city) && (
                          <p className='text-gray-900'>
                            {customer.prefecture}
                            {customer.city}
                          </p>
                        )}
                        {customer.address_line1 && (
                          <p className='text-gray-900'>
                            {customer.address_line1}
                          </p>
                        )}
                        {customer.address_line2 && (
                          <p className='text-gray-600 text-sm'>
                            {customer.address_line2}
                          </p>
                        )}
                      </div>
                    ) : customer.address ? (
                      <p className='text-gray-900'>{customer.address}</p>
                    ) : (
                      <p className='text-gray-500'>―</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 右側：LINE情報・備考 */}
            <div className='space-y-6'>
              {/* LINE情報 */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <h3 className='flex items-center text-lg font-medium text-gray-900 mb-4'>
                  <MessageCircle className='mr-2' size={20} />
                  LINE情報
                </h3>

                <div className='space-y-4'>
                  {customer.line_picture_url && (
                    <div className='flex justify-center'>
                      <img
                        src={customer.line_picture_url}
                        alt='LINE プロフィール'
                        className='w-16 h-16 rounded-full object-cover'
                      />
                    </div>
                  )}

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      LINE表示名
                    </label>
                    {isEditing ? (
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
                      />
                    ) : (
                      <p className='text-gray-900'>
                        {customer.line_display_name || '―'}
                      </p>
                    )}
                    {errors.line_display_name && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.line_display_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      LINE画像URL
                    </label>
                    {isEditing ? (
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
                          errors.line_picture_url
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                        placeholder='https://...'
                      />
                    ) : (
                      <p className='text-gray-900 break-all'>
                        {customer.line_picture_url || '―'}
                      </p>
                    )}
                    {errors.line_picture_url && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.line_picture_url}
                      </p>
                    )}
                  </div>

                  {customer.line_user_id && (
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        LINE User ID
                      </label>
                      <p className='text-gray-900 text-sm font-mono'>
                        {customer.line_user_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 備考 */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>備考</h3>

                {isEditing ? (
                  <div>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        errors.notes ? 'border-red-300' : 'border-gray-300'
                      }`}
                      rows={4}
                      placeholder='特記事項があれば入力してください'
                    />
                    {errors.notes && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className='text-gray-900 whitespace-pre-wrap'>
                    {customer.notes || '―'}
                  </p>
                )}
              </div>

              {/* 統計情報 */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  利用状況
                </h3>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='text-center'>
                    <p className='text-2xl font-bold text-primary-600'>
                      {customer.total_bookings || 0}
                    </p>
                    <p className='text-sm text-gray-600'>総予約数</p>
                  </div>
                  <div className='text-center'>
                    <p className='text-2xl font-bold text-primary-600'>
                      ¥{(customer.total_spent || 0).toLocaleString()}
                    </p>
                    <p className='text-sm text-gray-600'>総利用額</p>
                  </div>
                </div>

                {customer.last_booking_at && (
                  <div className='mt-4 pt-4 border-t border-gray-200'>
                    <p className='text-sm text-gray-600'>
                      最終利用:{' '}
                      {new Date(customer.last_booking_at).toLocaleDateString(
                        'ja-JP'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* システム情報 */}
              <div className='bg-gray-50 rounded-lg p-4'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  システム情報
                </h3>

                <div className='space-y-2 text-sm text-gray-600'>
                  <div>
                    <span className='font-medium'>顧客ID:</span>
                    <span className='ml-2 font-mono'>{customer.id}</span>
                  </div>
                  <div>
                    <span className='font-medium'>作成日:</span>
                    <span className='ml-2'>
                      {new Date(customer.created_at).toLocaleDateString(
                        'ja-JP'
                      )}
                    </span>
                  </div>
                  <div>
                    <span className='font-medium'>更新日:</span>
                    <span className='ml-2'>
                      {new Date(customer.updated_at).toLocaleDateString(
                        'ja-JP'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className='flex justify-end space-x-3 pt-6 border-t border-gray-200'>
            {isEditing ? (
              <>
                <Button
                  variant='outline'
                  size='md'
                  onClick={handleCancel}
                  disabled={loading}
                >
                  キャンセル
                </Button>
                <Button
                  variant='primary'
                  size='md'
                  onClick={handleSave}
                  loading={loading}
                  leftIcon={<Save size={16} />}
                >
                  {loading ? '保存中...' : '保存'}
                </Button>
              </>
            ) : (
              <Button variant='outline' size='md' onClick={handleClose}>
                閉じる
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title='顧客削除の確認'
        message={`「${customer?.name}」を削除しますか？この操作は取り消せません。`}
        confirmText='削除'
        cancelText='キャンセル'
        isDanger={true}
        isLoading={deleteLoading}
      />
    </>
  );
};
