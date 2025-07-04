import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  CurrencyYenIcon,
  PlusIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import {
  bookingApi,
  customerApi,
  menuApi,
  resourceApi,
} from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import type {
  Booking,
  Customer,
  Menu,
  MenuOption,
  Resource,
  CreateBookingRequest,
} from '../../types';

interface BookingCreateModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** 予約作成後のコールバック */
  onCreate?: (booking: Booking) => void;
  /** 初期選択顧客ID */
  initialCustomerId?: number;
  /** 初期選択メニューID */
  initialMenuId?: number;
}

/**
 * 予約作成モーダル - 美容師さん専用UI
 *
 * 🎯 ペルソナ: 電話を耳に挟んで片手で操作する美容師さん
 * ✅ 大きなタッチターゲット（最小44px）
 * ✅ 検索ベースの顧客選択
 * ✅ ワンタップでメニュー選択
 * ✅ 直感的な時間選択
 * ✅ リアルタイム料金計算
 */
const BookingCreateModal: React.FC<BookingCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  initialCustomerId,
  initialMenuId,
}) => {
  const { addNotification } = useUIStore();

  // フォーム状態
  const [formData, setFormData] = useState<CreateBookingRequest>({
    customer_id: initialCustomerId || 0,
    menu_id: initialMenuId || 0,
    resource_id: undefined,
    booking_date: '',
    start_time: '',
    customer_notes: '',
    option_ids: [],
  });

  // データ状態
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  // UI状態
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 計算値
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [calculatedDuration, setCalculatedDuration] = useState(0);
  const [calculatedEndTime, setCalculatedEndTime] = useState('');

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

  // 選択されたメニュー詳細取得
  useEffect(() => {
    if (formData.menu_id) {
      const menu = menus.find(m => m.id === formData.menu_id);
      setSelectedMenu(menu || null);
      if (menu) {
        loadMenuOptions(menu.id);
      }
    } else {
      setSelectedMenu(null);
      setMenuOptions([]);
    }
  }, [formData.menu_id, menus]);

  // 料金・時間計算
  useEffect(() => {
    calculatePriceAndDuration();
  }, [selectedOptions, selectedMenu]);

  // 終了時間計算
  useEffect(() => {
    if (formData.start_time && calculatedDuration > 0) {
      setCalculatedEndTime(
        calculateEndTime(formData.start_time, calculatedDuration)
      );
    }
  }, [formData.start_time, calculatedDuration]);

  /**
   * 初期データ取得
   */
  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);

      const [customersResponse, menusResponse, resourcesResponse] =
        await Promise.all([
          customerApi.getList({ per_page: 100, is_active: true }),
          menuApi.getList({ per_page: 100, is_active: true }),
          resourceApi.getList({ per_page: 100, is_active: true }),
        ]);

      setCustomers(customersResponse.data || []);
      setMenus(menusResponse.menus || []);
      setResources(resourcesResponse.resources || []);
    } catch (error: any) {
      console.error('初期データ取得エラー:', error);
      addNotification({
        type: 'error',
        title: 'データ取得エラー',
        message: 'データの取得に失敗しました',
        duration: 5000,
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  /**
   * メニューオプション取得
   */
  const loadMenuOptions = async (menuId: number) => {
    try {
      // TODO: メニューオプションAPI実装後に修正
      setMenuOptions([
        {
          id: 1,
          menu_id: menuId,
          name: 'ヘッドスパ',
          display_name: 'ヘッドスパ',
          price: 1000,
          duration: 15,
          price_type: 'fixed' as const,
          price_value: 1000,
          duration_minutes: 15,
          is_required: false,
          is_active: true,
          sort_order: 1,
          price_type_info: {
            name: '固定料金',
            description: '',
            value_unit: '円',
            example: '',
          },
          formatted_price: '¥1,000',
          formatted_duration: '15分',
          has_stock_management: false,
          in_stock: true,
          stock_used: 0,
          created_at: '',
          updated_at: '',
        },
        {
          id: 2,
          menu_id: menuId,
          name: 'トリートメント',
          display_name: 'トリートメント',
          price: 2000,
          duration: 10,
          price_type: 'fixed' as const,
          price_value: 2000,
          duration_minutes: 10,
          is_required: false,
          is_active: true,
          sort_order: 2,
          price_type_info: {
            name: '固定料金',
            description: '',
            value_unit: '円',
            example: '',
          },
          formatted_price: '¥2,000',
          formatted_duration: '10分',
          has_stock_management: false,
          in_stock: true,
          stock_used: 0,
          created_at: '',
          updated_at: '',
        },
        {
          id: 3,
          menu_id: menuId,
          name: 'ブロー仕上げ',
          display_name: 'ブロー仕上げ',
          price: 500,
          duration: 10,
          price_type: 'fixed' as const,
          price_value: 500,
          duration_minutes: 10,
          is_required: false,
          is_active: true,
          sort_order: 3,
          price_type_info: {
            name: '固定料金',
            description: '',
            value_unit: '円',
            example: '',
          },
          formatted_price: '¥500',
          formatted_duration: '10分',
          has_stock_management: false,
          in_stock: true,
          stock_used: 0,
          created_at: '',
          updated_at: '',
        },
      ]);
    } catch (error) {
      console.error('メニューオプション取得エラー:', error);
    }
  };

  /**
   * 料金・所要時間計算
   */
  const calculatePriceAndDuration = () => {
    if (!selectedMenu) {
      setCalculatedPrice(0);
      setCalculatedDuration(0);
      return;
    }

    let totalPrice = selectedMenu.base_price;
    let totalDuration =
      selectedMenu.base_duration +
      (selectedMenu.prep_duration || 0) +
      (selectedMenu.cleanup_duration || 0);

    // 選択されたオプションの料金・時間を加算
    selectedOptions.forEach(optionId => {
      const option = menuOptions.find(opt => opt.id === optionId);
      if (option) {
        totalPrice += option.price;
        totalDuration += option.duration;
      }
    });

    setCalculatedPrice(totalPrice);
    setCalculatedDuration(totalDuration);
  };

  /**
   * 顧客選択
   */
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setCustomerSearch(customer.name);
    setShowCustomerList(false);
    clearError('customer_id');
  };

  /**
   * メニュー選択
   */
  const selectMenu = (menu: Menu) => {
    setFormData(prev => ({ ...prev, menu_id: menu.id }));
    clearError('menu_id');
  };

  /**
   * オプション選択切り替え
   */
  const toggleOption = (optionId: number) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId);
      } else {
        return [...prev, optionId];
      }
    });
  };

  /**
   * リソース選択
   */
  const selectResource = (resourceId: number | undefined) => {
    setFormData(prev => ({ ...prev, resource_id: resourceId }));
  };

  /**
   * 時間選択
   */
  const selectTime = (time: string) => {
    setFormData(prev => ({ ...prev, start_time: time }));
    clearError('start_time');
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

    if (!formData.customer_id || formData.customer_id === 0) {
      newErrors.customer_id = '顧客を選択してください';
    }

    if (!formData.menu_id || formData.menu_id === 0) {
      newErrors.menu_id = 'メニューを選択してください';
    }

    if (!formData.booking_date) {
      newErrors.booking_date = '予約日を選択してください';
    }

    if (!formData.start_time) {
      newErrors.start_time = '開始時間を選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 終了時間計算
   */
  const calculateEndTime = (
    startTime: string,
    durationMinutes: number
  ): string => {
    if (!startTime) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;

    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    return `${endHours.toString().padStart(2, '0')}:${endMins
      .toString()
      .padStart(2, '0')}`;
  };

  /**
   * フォーム送信
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        ...formData,
        resource_id:
          formData.resource_id === 0 ? undefined : formData.resource_id,
        option_ids: selectedOptions,
      };

      const booking = await bookingApi.create(submissionData);

      // APIレスポンスの構造に対応した安全な予約番号取得
      const bookingNumber = booking?.booking_number || '作成済み';

      addNotification({
        type: 'success',
        title: '予約作成完了',
        message: `予約番号 ${bookingNumber} で予約が作成されました`,
        duration: 5000,
      });

      onCreate?.(booking);
      handleClose();
    } catch (error: any) {
      console.error('予約作成エラー:', error);

      if (error.response?.data?.error?.details) {
        setErrors(error.response.data.error.details);
      } else {
        addNotification({
          type: 'error',
          title: '予約作成エラー',
          message:
            error.response?.data?.error?.message || '予約の作成に失敗しました',
          duration: 5000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * フォームリセット
   */
  const resetForm = () => {
    setFormData({
      customer_id: 0,
      menu_id: 0,
      resource_id: undefined,
      booking_date: '',
      start_time: '',
      customer_notes: '',
      option_ids: [],
    });
    setSelectedOptions([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerList(false);
    setErrors({});
    setIsSubmitting(false);
    setSelectedMenu(null);
    setMenuOptions([]);
    setCalculatedPrice(0);
    setCalculatedDuration(0);
    setCalculatedEndTime('');
  };

  /**
   * モーダルクローズ処理
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 今日の日付（最小値として使用）
  const today = new Date().toISOString().split('T')[0];

  // 時間選択肢（9:00-20:00、30分刻み - タッチしやすく）
  const timeSlots = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      timeSlots.push(timeStr);
    }
  }

  if (isLoadingData) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title='新規予約作成'
        size='xl'
      >
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500'></div>
          <span className='ml-3 text-gray-600'>
            データを読み込んでいます...
          </span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='📞 新規予約作成'
      size='xl'
      className='max-h-[95vh] overflow-y-auto'
    >
      <div className='space-y-6'>
        {/* 顧客検索・選択 */}
        <div className='bg-blue-50 rounded-lg p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <UserIcon className='w-5 h-5 text-blue-600' />
            <h3 className='text-lg font-semibold text-blue-900'>
              1. お客様を選択
            </h3>
          </div>

          {/* 検索ボックス */}
          <div className='relative mb-3'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <MagnifyingGlassIcon className='h-5 w-5 text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='お客様のお名前または電話番号で検索'
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
            {customerSearch && (
              <button
                onClick={() => {
                  setCustomerSearch('');
                  setSelectedCustomer(null);
                  setFormData(prev => ({ ...prev, customer_id: 0 }));
                }}
                className='absolute inset-y-0 right-0 pr-3 flex items-center'
              >
                <XMarkIcon className='h-5 w-5 text-gray-400 hover:text-gray-600' />
              </button>
            )}
          </div>

          {/* 選択された顧客の表示 */}
          {selectedCustomer && (
            <div className='bg-white rounded-lg p-4 border-2 border-blue-200'>
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='font-semibold text-blue-900'>
                    {selectedCustomer.name}
                  </h4>
                  <div className='flex items-center gap-4 text-sm text-blue-700'>
                    <span className='flex items-center gap-1'>
                      <PhoneIcon className='w-4 h-4' />
                      {selectedCustomer.phone || '未登録'}
                    </span>
                    <span className='px-2 py-1 bg-blue-100 rounded-full text-xs'>
                      {selectedCustomer.loyalty_rank?.toUpperCase() ||
                        'REGULAR'}
                    </span>
                  </div>
                </div>
                <CheckCircleIcon className='w-6 h-6 text-blue-600' />
              </div>
            </div>
          )}

          {/* 顧客検索結果 */}
          {showCustomerList && filteredCustomers.length > 0 && (
            <div className='bg-white border rounded-lg max-h-48 overflow-y-auto'>
              {filteredCustomers.slice(0, 5).map(customer => (
                <button
                  key={customer.id}
                  onClick={() => selectCustomer(customer)}
                  className='w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0'
                >
                  <div className='font-medium'>{customer.name}</div>
                  <div className='text-sm text-gray-600'>
                    {customer.phone || '電話番号未登録'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {errors.customer_id && (
            <p className='text-sm text-red-600 mt-2'>{errors.customer_id}</p>
          )}
        </div>

        {/* メニュー選択 */}
        <div className='bg-green-50 rounded-lg p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <TagIcon className='w-5 h-5 text-green-600' />
            <h3 className='text-lg font-semibold text-green-900'>
              2. メニューを選択
            </h3>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {menus.map(menu => (
              <button
                key={menu.id}
                onClick={() => selectMenu(menu)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.menu_id === menu.id
                    ? 'border-green-500 bg-green-100'
                    : 'border-gray-200 bg-white hover:border-green-300'
                }`}
              >
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-semibold text-gray-900'>
                    {menu.display_name || menu.name}
                  </h4>
                  {formData.menu_id === menu.id && (
                    <CheckCircleIcon className='w-5 h-5 text-green-600' />
                  )}
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-600'>{menu.base_duration}分</span>
                  <span className='font-bold text-green-600'>
                    ¥{menu.base_price.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {errors.menu_id && (
            <p className='text-sm text-red-600 mt-2'>{errors.menu_id}</p>
          )}
        </div>

        {/* オプション選択 */}
        {selectedMenu && menuOptions.length > 0 && (
          <div className='bg-purple-50 rounded-lg p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <PlusIcon className='w-5 h-5 text-purple-600' />
              <h3 className='text-lg font-semibold text-purple-900'>
                3. オプション（任意）
              </h3>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {menuOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedOptions.includes(option.id)
                      ? 'border-purple-500 bg-purple-100'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='font-medium text-gray-900'>
                        {option.name}
                      </h4>
                      <span className='text-sm text-gray-600'>
                        +{option.duration}分
                      </span>
                    </div>
                    <div className='text-right'>
                      <div className='font-bold text-purple-600'>
                        +¥{option.price.toLocaleString()}
                      </div>
                      {selectedOptions.includes(option.id) && (
                        <CheckCircleIcon className='w-4 h-4 text-purple-600 ml-auto' />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 担当者選択 */}
        <div className='bg-orange-50 rounded-lg p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <UserIcon className='w-5 h-5 text-orange-600' />
            <h3 className='text-lg font-semibold text-orange-900'>
              4. 担当者（任意）
            </h3>
          </div>

          <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
            <button
              onClick={() => selectResource(undefined)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                !formData.resource_id
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-gray-200 bg-white hover:border-orange-300'
              }`}
            >
              <div className='font-medium'>指定なし</div>
              <div className='text-sm text-gray-600'>お任せ</div>
            </button>
            {resources.map(resource => (
              <button
                key={resource.id}
                onClick={() => selectResource(resource.id)}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  formData.resource_id === resource.id
                    ? 'border-orange-500 bg-orange-100'
                    : 'border-gray-200 bg-white hover:border-orange-300'
                }`}
              >
                <div className='font-medium'>{resource.display_name}</div>
                {resource.hourly_rate_diff > 0 && (
                  <div className='text-sm text-orange-600'>
                    +¥{resource.hourly_rate_diff}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 日時選択 */}
        <div className='bg-pink-50 rounded-lg p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <CalendarIcon className='w-5 h-5 text-pink-600' />
            <h3 className='text-lg font-semibold text-pink-900'>
              5. 日時を選択
            </h3>
          </div>

          {/* 日付選択 */}
          <div className='mb-4'>
            <DatePicker
              label='予約日'
              value={
                formData.booking_date ? new Date(formData.booking_date) : null
              }
              onChange={date => {
                const dateString = date ? date.toISOString().split('T')[0] : '';
                setFormData(prev => ({ ...prev, booking_date: dateString }));
                clearError('booking_date');
              }}
              minDate={new Date()}
              error={!!errors.booking_date}
              errorMessage={errors.booking_date}
              required
              fullWidth
              size='lg'
              showQuickSelect={true}
              placeholder='予約日を選択してください'
            />
          </div>

          {/* 時間選択 */}
          <div>
            <label className='block text-sm font-medium text-pink-700 mb-2'>
              開始時間
            </label>
            <div className='grid grid-cols-4 md:grid-cols-6 gap-2'>
              {timeSlots.map(time => (
                <button
                  key={time}
                  onClick={() => selectTime(time)}
                  className={`p-3 rounded-lg border-2 text-center font-medium transition-all ${
                    formData.start_time === time
                      ? 'border-pink-500 bg-pink-100 text-pink-900'
                      : 'border-gray-200 bg-white hover:border-pink-300 text-gray-700'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            {errors.start_time && (
              <p className='text-sm text-red-600 mt-2'>{errors.start_time}</p>
            )}
          </div>
        </div>

        {/* 料金サマリー */}
        {selectedMenu && (
          <div className='bg-gray-100 rounded-lg p-4 border-2 border-gray-300'>
            <h4 className='font-bold text-gray-900 mb-3 flex items-center gap-2'>
              <CurrencyYenIcon className='w-5 h-5' />
              予約内容確認
            </h4>
            <div className='space-y-2'>
              <div className='flex justify-between text-lg'>
                <span>{selectedMenu.name}</span>
                <span>¥{selectedMenu.base_price.toLocaleString()}</span>
              </div>
              {selectedOptions.map(optionId => {
                const option = menuOptions.find(opt => opt.id === optionId);
                return option ? (
                  <div
                    key={optionId}
                    className='flex justify-between text-gray-600'
                  >
                    <span>+ {option.name}</span>
                    <span>¥{option.price.toLocaleString()}</span>
                  </div>
                ) : null;
              })}
              <div className='border-t-2 border-gray-300 pt-2 flex justify-between text-xl font-bold text-primary-600'>
                <span>合計</span>
                <span>¥{calculatedPrice.toLocaleString()}</span>
              </div>
              <div className='flex justify-between text-gray-600'>
                <span>所要時間</span>
                <span>{calculatedDuration}分</span>
              </div>
              {calculatedEndTime && (
                <div className='flex justify-between text-gray-600'>
                  <span>終了予定</span>
                  <span>{calculatedEndTime}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 備考 */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            お客様からのご要望
          </label>
          <textarea
            value={formData.customer_notes || ''}
            onChange={e =>
              setFormData(prev => ({ ...prev, customer_notes: e.target.value }))
            }
            placeholder='アレルギーや特別な要望があれば入力してください'
            rows={3}
            className='w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
          />
        </div>

        {/* アクションボタン */}
        <div className='flex gap-4 pt-4'>
          <Button
            variant='outline'
            size='lg'
            onClick={handleClose}
            disabled={isSubmitting}
            className='flex-1'
          >
            キャンセル
          </Button>
          <Button
            variant='primary'
            size='lg'
            loading={isSubmitting}
            onClick={handleSubmit}
            className='flex-1'
            leftIcon={<CalendarIcon className='w-5 h-5' />}
          >
            {isSubmitting ? '作成中...' : '予約を作成'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BookingCreateModal;
