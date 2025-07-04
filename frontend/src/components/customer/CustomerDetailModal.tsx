import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyYenIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import { cn, formatDate, formatNumber } from '../../utils';
import { customerApi } from '../../services/api';
import { useToast } from '../../stores/uiStore';
import type { Customer, UpdateCustomerRequest } from '../../types';

interface CustomerDetailModalProps {
  /** 表示する顧客 */
  customer: Customer | null;
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** 更新後のコールバック */
  onUpdate?: (customer: Customer) => void;
  /** 削除後のコールバック */
  onDelete?: (customerId: number) => void;
}

/**
 * 顧客詳細モーダル
 * - 顧客の詳細情報表示
 * - 編集モード切り替え
 * - 削除機能
 */
const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateCustomerRequest>({});

  // 顧客データが変更されたらフォームデータを更新
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        birth_date: customer.birth_date,
        gender: customer.gender,
        notes: customer.notes,
        is_active: customer.is_active,
        loyalty_rank: customer.loyalty_rank,
      });
    }
  }, [customer]);

  if (!customer) return null;

  const handleInputChange = (field: keyof UpdateCustomerRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // 空文字列をnullに変換
      const cleanedData: UpdateCustomerRequest = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          cleanedData[key as keyof UpdateCustomerRequest] = value;
        } else if (key === 'email' || key === 'address' || key === 'birth_date' || key === 'gender' || key === 'notes') {
          // これらのフィールドは空の場合nullを送信
          cleanedData[key as keyof UpdateCustomerRequest] = null as any;
        }
      });
      
      console.log('Sending update data:', cleanedData);
      
      const updatedCustomer = await customerApi.update(customer.id, cleanedData);
      addToast({
        type: 'success',
        title: '顧客情報を更新しました',
      });
      setIsEditing(false);
      onUpdate?.(updatedCustomer);
    } catch (error: any) {
      console.error('Update error:', error.response?.data);
      addToast({
        type: 'error',
        title: '更新に失敗しました',
        message: error.response?.data?.error?.message || 'エラーが発生しました',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await customerApi.delete(customer.id);
      addToast({
        type: 'success',
        title: '顧客を削除しました',
      });
      onDelete?.(customer.id);
      onClose();
      setIsDeleteConfirmOpen(false);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '削除に失敗しました',
        message: error.response?.data?.error?.message || 'エラーが発生しました',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rankColors = {
    new: 'bg-green-100 text-green-800',
    regular: 'bg-blue-100 text-blue-800',
    vip: 'bg-purple-100 text-purple-800',
    premium: 'bg-yellow-100 text-yellow-800',
  };

  const rankLabels = {
    new: '新規',
    regular: 'レギュラー',
    vip: 'VIP',
    premium: 'プレミアム',
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="顧客詳細"
        size="lg"
        footer={
        <div className="flex justify-between">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={isLoading}
            leftIcon={<TrashIcon className="w-4 h-4" />}
          >
            削除
          </Button>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                >
                  キャンセル
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  loading={isLoading}
                >
                  保存
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditing(true)}
                leftIcon={<PencilIcon className="w-4 h-4" />}
              >
                編集
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 基本情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 名前 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="w-4 h-4 mr-1" />
                名前
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{customer.name}</p>
              )}
            </div>

            {/* 電話番号 */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <PhoneIcon className="w-4 h-4 mr-1" />
                電話番号
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{customer.phone}</p>
              )}
            </div>

            {/* メールアドレス */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <EnvelopeIcon className="w-4 h-4 mr-1" />
                メールアドレス
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{customer.email || '―'}</p>
              )}
            </div>

            {/* ランク */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                ランク
              </label>
              {isEditing ? (
                <select
                  value={formData.loyalty_rank || customer.loyalty_rank}
                  onChange={(e) => handleInputChange('loyalty_rank', e.target.value as Customer['loyalty_rank'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="new">新規</option>
                  <option value="regular">レギュラー</option>
                  <option value="vip">VIP</option>
                  <option value="premium">プレミアム</option>
                </select>
              ) : (
                <span className={cn(
                  'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                  rankColors[customer.loyalty_rank]
                )}>
                  {rankLabels[customer.loyalty_rank]}
                </span>
              )}
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
              {isEditing ? (
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{customer.address || '―'}</p>
              )}
            </div>

            {/* 生年月日・性別 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  生年月日
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {customer.birth_date ? formatDate(customer.birth_date, 'yyyy年MM月dd日') : '―'}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  性別
                </label>
                {isEditing ? (
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">選択してください</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                ) : (
                  <p className="text-gray-900">
                    {customer.gender === 'male' ? '男性' : 
                     customer.gender === 'female' ? '女性' : 
                     customer.gender === 'other' ? 'その他' : '―'}
                  </p>
                )}
              </div>
            </div>

            {/* 備考 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                備考
              </label>
              {isEditing ? (
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{customer.notes || '―'}</p>
              )}
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">統計情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <ClockIcon className="w-4 h-4 mr-1" />
                累計予約数
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(customer.total_bookings)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <CurrencyYenIcon className="w-4 h-4 mr-1" />
                累計売上
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                ¥{formatNumber(customer.total_spent)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <CalendarIcon className="w-4 h-4 mr-1" />
                最終予約
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {customer.last_booking_date ? formatDate(customer.last_booking_date, 'yyyy/MM/dd') : '―'}
              </p>
            </div>
          </div>
        </div>

        {/* ステータス */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            登録日: {formatDate(customer.created_at, 'yyyy年MM月dd日')}
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">ステータス:</span>
            {isEditing ? (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active !== false}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">有効</span>
              </label>
            ) : (
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                customer.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              )}>
                {customer.is_active ? '有効' : '無効'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Modal>

    {/* 削除確認ダイアログ */}
    <ConfirmDialog
      isOpen={isDeleteConfirmOpen}
      onClose={() => setIsDeleteConfirmOpen(false)}
      onConfirm={handleDelete}
      title="顧客を削除しますか？"
      message={`${customer.name}様の情報を削除します。この操作は取り消せません。`}
      confirmText="削除する"
      cancelText="キャンセル"
      isDanger={true}
      isLoading={isLoading}
    />
    </>
  );
};

export default CustomerDetailModal; 