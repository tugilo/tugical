import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PlusIcon,
  CurrencyYenIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { MultiMenuSelector } from './MultiMenuSelector';
import { customerApi, resourceApi, bookingApi } from '../../../services/api';
import { useUIStore } from '../../../stores/uiStore';
import type {
  Booking,
  Customer,
  Menu,
  Resource,
  CreateCombinationBookingRequest,
  CombinationMenuRequest,
  CalculateCombinationResponse,
} from '../../../types';

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

/** 前回予約の要約（メニュー再選択用） */
interface LastVisitSummary {
  bookingId: number;
  bookingDate: string;
  menuLabel: string;
  menus: CombinationMenuRequest[];
}

/**
 * 開始時間スロット（15分刻み）を生成
 */
const buildTimeSlots = (startHour = 8, endHour = 21): string[] => {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endHour && m > 0) break;
      slots.push(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      );
    }
  }
  return slots;
};

/**
 * HH:mm を最も近い 15 分刻みに丸める
 */
const snapToQuarterHour = (time?: string): string => {
  if (!time) return '';
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  let h = Number(match[1]);
  let m = Number(match[2]);
  m = Math.round(m / 15) * 15;
  if (m === 60) {
    h += 1;
    m = 0;
  }
  if (h > 23) h = 23;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * 予約からメニューラベルと選択用リクエストを抽出
 */
const extractMenusFromBooking = (
  booking: Booking,
  availableMenus: Menu[]
): { label: string; menus: CombinationMenuRequest[] } => {
  const availableIds = new Set(availableMenus.map(m => m.id));

  if (booking.details && booking.details.length > 0) {
    const labels: string[] = [];
    const requests: CombinationMenuRequest[] = [];
    booking.details.forEach((detail, index) => {
      const d = detail as typeof detail & { service_name?: string; menu_id?: number };
      const menuId = d.menu_id ?? detail.menu?.id;
      const name =
        d.service_name || detail.menu?.display_name || detail.menu?.name;
      if (name) labels.push(name);

      let resolvedId = menuId && availableIds.has(menuId) ? menuId : undefined;
      if (!resolvedId && name) {
        const byName = availableMenus.find(
          m => m.name === name || m.display_name === name
        );
        resolvedId = byName?.id;
      }
      if (resolvedId) {
        requests.push({
          menu_id: resolvedId,
          sequence_order: requests.length + 1,
          service_type: index === 0 ? 'main' : 'additional',
          option_ids: [],
        });
      }
    });
    return { label: labels.join(' + ') || 'メニュー情報なし', menus: requests };
  }

  if (booking.menu?.id && availableIds.has(booking.menu.id)) {
    return {
      label: booking.menu.display_name || booking.menu.name,
      menus: [
        {
          menu_id: booking.menu.id,
          sequence_order: 1,
          service_type: 'main',
          option_ids: [],
        },
      ],
    };
  }

  return {
    label: booking.menu?.display_name || booking.menu?.name || 'メニュー情報なし',
    menus: [],
  };
};

/**
 * 新規予約作成モーダル（複数メニュー対応）
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
  const timeSlots = useMemo(() => buildTimeSlots(8, 21), []);

  // フォーム状態
  const [formData, setFormData] = useState<CreateCombinationBookingRequest>({
    customer_id: initialCustomerId || 0,
    booking_date: initialDate || '',
    start_time: snapToQuarterHour(initialStartTime) || '',
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
  const [lastVisit, setLastVisit] = useState<LastVisitSummary | null>(null);
  const [loadingLastVisit, setLoadingLastVisit] = useState(false);

  // UI状態
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // データ取得（初回のみ）
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && !isDataLoaded) {
      loadInitialData();
      setIsDataLoaded(true);
    }
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, isDataLoaded]);

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

      const customerList = Array.isArray(customersResponse.data)
        ? customersResponse.data
        : Array.isArray((customersResponse as { customers?: Customer[] }).customers)
          ? (customersResponse as { customers: Customer[] }).customers
          : [];
      setCustomers(customerList);
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
      start_time: snapToQuarterHour(initialStartTime) || '',
      resource_id: initialResourceId ? parseInt(initialResourceId) : undefined,
      menus: [],
      customer_notes: '',
    });
    setSelectedCustomer(null);
    setSelectedMenus([]);
    setCalculationResult(null);
    setCustomerSearch('');
    setErrors({});
    setLastVisit(null);
  };

  /**
   * 顧客の前回予約メニューを取得
   */
  const loadLastVisit = async (customerId: number) => {
    setLoadingLastVisit(true);
    setLastVisit(null);
    try {
      const response = await bookingApi.getList({
        customer_id: customerId,
        per_page: 30,
      });
      const bookings = (response.bookings || []).filter(
        b => b.status !== 'cancelled' && b.status !== 'no_show'
      );
      if (bookings.length === 0) return;

      const sorted = [...bookings].sort((a, b) => {
        const aKey = `${a.booking_date} ${a.start_time}`;
        const bKey = `${b.booking_date} ${b.start_time}`;
        return bKey.localeCompare(aKey);
      });
      const latest = sorted[0];
      const extracted = extractMenusFromBooking(latest, menus);
      setLastVisit({
        bookingId: latest.id,
        bookingDate: (latest.booking_date || '').substring(0, 10),
        menuLabel: extracted.label,
        menus: extracted.menus,
      });
    } catch (error) {
      console.warn('前回予約の取得に失敗:', error);
    } finally {
      setLoadingLastVisit(false);
    }
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
    void loadLastVisit(customer.id);
  };

  /**
   * 前回と同じメニューを選択に反映
   */
  const applyLastVisitMenus = () => {
    if (!lastVisit || lastVisit.menus.length === 0) return;
    handleMenuSelectionChange(lastVisit.menus);
    addNotification({
      type: 'success',
      title: 'メニューを反映しました',
      message: lastVisit.menuLabel,
    });
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
        message: `予約を作成しました（予約番号: ${booking.booking_number}）`,
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
            <PlusIcon className='w-6 h-6 text-emerald-600' />
            <h2 className='text-xl font-semibold text-gray-900'>新規予約</h2>
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
              {selectedCustomer && (
                <div className='mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5'>
                  {loadingLastVisit ? (
                    <p className='text-sm text-gray-500'>前回の予約を確認中...</p>
                  ) : lastVisit ? (
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='min-w-0'>
                        <p className='text-xs font-medium text-gray-500'>
                          前回の予約（{lastVisit.bookingDate}）
                        </p>
                        <p className='text-sm text-gray-900 truncate'>
                          {lastVisit.menuLabel}
                        </p>
                      </div>
                      {lastVisit.menus.length > 0 && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={applyLastVisitMenus}
                          className='shrink-0'
                        >
                          同じメニューを選ぶ
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className='text-sm text-gray-500'>
                      このお客様の過去の予約はまだありません
                    </p>
                  )}
                </div>
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
                <select
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
                >
                  <option value=''>時間を選択（15分刻み）</option>
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
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

            {/* メニュー選択 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                メニュー
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
            {isSubmitting ? '作成中...' : '予約を作成'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CombinationBookingModal;
