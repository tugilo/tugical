import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  SparklesIcon,
  CurrencyYenIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { MultiMenuSelector } from './MultiMenuSelector';
import { customerApi, resourceApi, bookingApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import type {
  Booking,
  Customer,
  Menu,
  Resource,
  CreateCombinationBookingRequest,
  CombinationMenuRequest,
  CalculateCombinationResponse,
} from '../../types';

interface CombinationBookingModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** 予約作成成功時のコールバック */
  onSuccess?: (booking: Booking) => void;
  /** 利用可能なメニュー一覧 */
  menus: Menu[];
  /** 初期選択顧客ID */
  initialCustomerId?: number;
  /** 初期日付 */
  initialDate?: string;
  /** 初期開始時間 */
  initialStartTime?: string;
  /** 初期リソースID */
  initialResourceId?: string;
}

/**
 * 複数メニュー組み合わせ予約作成モーダル
 * Phase 23の機能を使用した新しいフロー
 */
const CombinationBookingModal: React.FC<CombinationBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  menus,
  initialCustomerId,
  initialDate,
  initialStartTime,
  initialResourceId,
}) => {
  const { addNotification } = useUIStore();

  // フォーム状態
  const [formData, setFormData] = useState<CreateCombinationBookingRequest>({
    customer_id: initialCustomerId || 0,
    booking_date: initialDate || '',
    start_time: initialStartTime || '',
    resource_id: initialResourceId ? parseInt(initialResourceId) : undefined,
    menus: [],
    customer_notes: '',
  });

  // データ状態
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedMenus, setSelectedMenus] = useState<CombinationMenuRequest[]>(
    []
  );
  const [calculationResult, setCalculationResult] =
    useState<CalculateCombinationResponse | null>(null);

  // UI状態
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // データ取得
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      resetForm();
    }
  }, [isOpen]);

  // 顧客検索フィルタリング
  useEffect(() => {
    if (customerSearch.trim()) {
      const filtered = customers.filter(
        customer =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          (customer.phone && customer.phone.includes(customerSearch))
      );
      setFilteredCustomers(filtered);
      setShowCustomerList(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerList(false);
    }
  }, [customerSearch, customers]);

  // 初期顧客設定
  useEffect(() => {
    if (initialCustomerId && customers.length > 0) {
      const customer = customers.find(c => c.id === initialCustomerId);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
      }
    }
  }, [initialCustomerId, customers]);

  /**
   * 初期データ取得
   */
  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);

      const [customersResponse, resourcesResponse] = await Promise.all([
        customerApi.getList({ per_page: 100, is_active: true }),
        resourceApi.getList({ per_page: 100, is_active: true }),
      ]);

      setCustomers(customersResponse.data || []);
      setResources(resourcesResponse.resources || []);
    } catch (error: any) {
      console.error('初期データ取得エラー:', error);
      addNotification({
        type: 'error',
        title: 'データ取得エラー',
        message: 'データの取得に失敗しました',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  /**
   * フォームリセット
   */
  const resetForm = () => {
    setFormData({
      customer_id: initialCustomerId || 0,
      booking_date: initialDate || '',
      start_time: initialStartTime || '',
      resource_id: initialResourceId ? parseInt(initialResourceId) : undefined,
      menus: [],
      customer_notes: '',
    });
    setSelectedCustomer(null);
    setSelectedMenus([]);
    setCalculationResult(null);
    setCustomerSearch('');
    setErrors({});
  };

  /**
   * 顧客選択
   */
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerList(false);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    clearError('customer_id');
  };

  /**
   * メニュー選択変更
   */
  const handleMenuSelectionChange = (menus: CombinationMenuRequest[]) => {
    setSelectedMenus(menus);
    setFormData(prev => ({ ...prev, menus }));
    clearError('menus');
  };

  /**
   * 料金計算結果更新
   */
  const handleCalculationResult = (
    result: CalculateCombinationResponse | null
  ) => {
    setCalculationResult(result);
  };

  /**
   * リソース選択
   */
  const selectResource = (resourceId: number | undefined) => {
    setFormData(prev => ({ ...prev, resource_id: resourceId }));
    clearError('resource_id');
  };

  /**
   * エラークリア
   */
  const clearError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  /**
   * フォームバリデーション
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = '顧客を選択してください';
    }

    if (!formData.booking_date) {
      newErrors.booking_date = '予約日を選択してください';
    }

    if (!formData.start_time) {
      newErrors.start_time = '開始時間を選択してください';
    }

    if (!formData.menus || formData.menus.length === 0) {
      newErrors.menus = '1つ以上のメニューを選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 予約作成
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const booking = await bookingApi.createCombinationBooking(formData);

      addNotification({
        type: 'success',
        title: '予約作成完了',
        message: `複数メニュー組み合わせ予約を作成しました（予約番号: ${booking.booking_number}）`,
      });

      onSuccess?.(booking);
      onClose();
    } catch (error: any) {
      console.error('予約作成エラー:', error);

      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      } else {
        addNotification({
          type: 'error',
          title: '予約作成エラー',
          message: error.message || '予約の作成に失敗しました',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * モーダルクローズ
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size='xl'>
      <div className='p-6'>
        {/* ヘッダー */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center space-x-3'>
            <SparklesIcon className='w-6 h-6 text-emerald-600' />
            <h2 className='text-xl font-semibold text-gray-900'>
              複数メニュー組み合わせ予約
            </h2>
          </div>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <XMarkIcon className='w-5 h-5' />
          </Button>
        </div>

        {/* ローディング */}
        {isLoadingData && (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto'></div>
            <p className='text-gray-600 mt-2'>データを読み込み中...</p>
          </div>
        )}

        {/* フォーム */}
        {!isLoadingData && (
          <div className='space-y-6'>
            {/* 顧客選択 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <UserIcon className='w-4 h-4 inline mr-1' />
                顧客選択
              </label>
              <div className='relative'>
                <MagnifyingGlassIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='text'
                  placeholder='顧客名または電話番号で検索'
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    errors.customer_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {showCustomerList && (
                  <div className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className='px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0'
                      >
                        <div className='font-medium text-gray-900'>
                          {customer.name}
                        </div>
                        <div className='text-sm text-gray-600'>
                          {customer.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.customer_id && (
                <p className='text-sm text-red-600 mt-1'>
                  {errors.customer_id}
                </p>
              )}
            </div>

            {/* 日付・時間選択 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <CalendarIcon className='w-4 h-4 inline mr-1' />
                  予約日
                </label>
                <DatePicker
                  value={
                    formData.booking_date
                      ? new Date(formData.booking_date)
                      : null
                  }
                  onChange={date => {
                    setFormData(prev => ({
                      ...prev,
                      booking_date: date
                        ? date.toISOString().split('T')[0]
                        : '',
                    }));
                    clearError('booking_date');
                  }}
                  className={errors.booking_date ? 'border-red-500' : ''}
                />
                {errors.booking_date && (
                  <p className='text-sm text-red-600 mt-1'>
                    {errors.booking_date}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  <ClockIcon className='w-4 h-4 inline mr-1' />
                  開始時間
                </label>
                <input
                  type='time'
                  value={formData.start_time}
                  onChange={e => {
                    setFormData(prev => ({
                      ...prev,
                      start_time: e.target.value,
                    }));
                    clearError('start_time');
                  }}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                    errors.start_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.start_time && (
                  <p className='text-sm text-red-600 mt-1'>
                    {errors.start_time}
                  </p>
                )}
              </div>
            </div>

            {/* リソース選択 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                担当者（オプション）
              </label>
              <select
                value={formData.resource_id || ''}
                onChange={e =>
                  selectResource(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
              >
                <option value=''>担当者を選択</option>
                {resources.map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.display_name || resource.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 複数メニュー選択 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <SparklesIcon className='w-4 h-4 inline mr-1' />
                メニュー組み合わせ
              </label>
              <MultiMenuSelector
                menus={menus}
                selectedMenus={selectedMenus}
                onSelectionChange={handleMenuSelectionChange}
                onCalculationResult={handleCalculationResult}
                calculationContext={{
                  resource_id: formData.resource_id,
                  booking_date: formData.booking_date,
                  start_time: formData.start_time,
                }}
                phoneBookingMode={true}
                oneHandMode={true}
              />
              {errors.menus && (
                <p className='text-sm text-red-600 mt-1'>{errors.menus}</p>
              )}
            </div>

            {/* 料金計算結果 */}
            {calculationResult && (
              <div className='bg-emerald-50 border border-emerald-200 rounded-lg p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm font-medium text-emerald-900'>
                    <CurrencyYenIcon className='w-4 h-4 inline mr-1' />
                    料金計算結果
                  </span>
                  <div className='text-lg font-semibold text-emerald-900'>
                    ¥{calculationResult.total_price?.toLocaleString()}
                  </div>
                </div>
                <div className='text-sm text-emerald-700 space-y-1'>
                  <div>合計時間: {calculationResult.total_duration}分</div>
                  {calculationResult.set_discount_amount > 0 && (
                    <div>
                      セット割引: -¥
                      {calculationResult.set_discount_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 顧客メモ */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                顧客メモ
              </label>
              <textarea
                value={formData.customer_notes}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    customer_notes: e.target.value,
                  }))
                }
                placeholder='顧客からの要望など'
                rows={3}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
              />
            </div>
          </div>
        )}

        {/* フッター */}
        <div className='flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200'>
          <Button
            variant='outline'
            onClick={handleClose}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            variant='primary'
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !formData.customer_id ||
              !formData.booking_date ||
              !formData.start_time ||
              selectedMenus.length === 0
            }
            className='bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
          >
            {isSubmitting ? '作成中...' : '複数メニュー予約を作成'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CombinationBookingModal;
