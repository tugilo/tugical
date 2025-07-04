import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
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
 * 予約作成モーダル
 *
 * 管理者が新規予約を作成するためのモーダル
 * 顧客選択、メニュー選択、リソース選択、日時選択、備考入力に対応
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
    options: [],
  });

  // 選択肢データ
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);

  // 状態管理
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // データ取得
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // 選択されたメニュー詳細取得
  useEffect(() => {
    if (formData.menu_id) {
      const menu = menus.find(m => m.id === formData.menu_id);
      setSelectedMenu(menu || null);
    } else {
      setSelectedMenu(null);
    }
  }, [formData.menu_id, menus]);

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

      setCustomers(customersResponse.data);
      setMenus(menusResponse.menus);
      setResources(resourcesResponse.resources);
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
   * フォームデータ更新
   */
  const updateFormData = (field: keyof CreateBookingRequest, value: any) => {
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
    } else {
      const bookingDate = new Date(formData.booking_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (bookingDate < today) {
        newErrors.booking_date = '予約日は今日以降を選択してください';
      }
    }

    if (!formData.start_time) {
      newErrors.start_time = '開始時間を選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 終了時間を計算
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 未選択の場合は undefined に変換
      const submissionData = {
        ...formData,
        resource_id:
          formData.resource_id === 0 ? undefined : formData.resource_id,
      };

      const booking = await bookingApi.create(submissionData);

      addNotification({
        type: 'success',
        title: '予約作成',
        message: '予約が作成されました',
        duration: 3000,
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
   * モーダルクローズ処理
   */
  const handleClose = () => {
    setFormData({
      customer_id: 0,
      menu_id: 0,
      resource_id: undefined,
      booking_date: '',
      start_time: '',
      customer_notes: '',
      options: [],
    });
    setErrors({});
    setIsSubmitting(false);
    setSelectedMenu(null);
    onClose();
  };

  // 選択肢を作成
  const customerOptions = customers.map(customer => ({
    value: customer.id,
    label: `${customer.name} (${customer.phone || '電話番号未登録'})`,
  }));

  const menuOptions = menus.map(menu => ({
    value: menu.id,
    label: `${menu.display_name} (¥${menu.base_price.toLocaleString()}, ${
      menu.base_duration
    }分)`,
  }));

  const resourceOptions = [
    { value: 0, label: '指定なし' },
    ...resources.map(resource => ({
      value: resource.id,
      label: `${resource.display_name} (${resource.type})`,
    })),
  ];

  // 時間選択肢（9:00-20:00、15分刻み）
  const timeOptions = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      timeOptions.push({
        value: timeStr,
        label: timeStr,
      });
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='新規予約作成'
      size='lg'
      className='max-h-[90vh] overflow-y-auto'
    >
      {isLoadingData ? (
        <div className='flex items-center justify-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500'></div>
          <span className='ml-2 text-gray-600'>
            データを読み込んでいます...
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* 顧客選択 */}
          <div className='space-y-4'>
            <h4 className='text-sm font-medium text-gray-900 border-b border-gray-200 pb-2'>
              顧客情報
            </h4>

            <div className='space-y-1'>
              <label
                htmlFor='customer_id'
                className='block text-sm font-medium text-gray-700'
              >
                顧客<span className='text-red-500 ml-1'>*</span>
              </label>
              <select
                id='customer_id'
                value={formData.customer_id}
                onChange={e =>
                  updateFormData('customer_id', Number(e.target.value))
                }
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.customer_id ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value={0}>選択してください</option>
                {customerOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className='text-sm text-red-600'>{errors.customer_id}</p>
              )}
            </div>
          </div>

          {/* メニュー選択 */}
          <div className='space-y-4'>
            <h4 className='text-sm font-medium text-gray-900 border-b border-gray-200 pb-2'>
              メニュー情報
            </h4>

            <div className='space-y-1'>
              <label
                htmlFor='menu_id'
                className='block text-sm font-medium text-gray-700'
              >
                メニュー<span className='text-red-500 ml-1'>*</span>
              </label>
              <select
                id='menu_id'
                value={formData.menu_id}
                onChange={e =>
                  updateFormData('menu_id', Number(e.target.value))
                }
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.menu_id ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value={0}>選択してください</option>
                {menuOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.menu_id && (
                <p className='text-sm text-red-600'>{errors.menu_id}</p>
              )}
            </div>

            {/* 選択されたメニューの詳細表示 */}
            {selectedMenu && (
              <div className='bg-gray-50 rounded-lg p-4'>
                <h5 className='font-medium text-gray-900 mb-2'>メニュー詳細</h5>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-600'>料金:</span>
                    <span className='ml-2 font-medium'>
                      ¥{selectedMenu.base_price.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className='text-gray-600'>所要時間:</span>
                    <span className='ml-2 font-medium'>
                      {selectedMenu.base_duration}分
                    </span>
                  </div>
                  {selectedMenu.description && (
                    <div className='col-span-2'>
                      <span className='text-gray-600'>説明:</span>
                      <p className='mt-1 text-gray-800'>
                        {selectedMenu.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* リソース選択 */}
          <div className='space-y-4'>
            <h4 className='text-sm font-medium text-gray-900 border-b border-gray-200 pb-2'>
              リソース選択
            </h4>

            <div className='space-y-1'>
              <label
                htmlFor='resource_id'
                className='block text-sm font-medium text-gray-700'
              >
                担当者・設備
              </label>
              <select
                id='resource_id'
                value={formData.resource_id || 0}
                onChange={e =>
                  updateFormData(
                    'resource_id',
                    Number(e.target.value) === 0
                      ? undefined
                      : Number(e.target.value)
                  )
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              >
                {resourceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 日時選択 */}
          <div className='space-y-4'>
            <h4 className='text-sm font-medium text-gray-900 border-b border-gray-200 pb-2'>
              予約日時
            </h4>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <label
                  htmlFor='booking_date'
                  className='block text-sm font-medium text-gray-700'
                >
                  予約日<span className='text-red-500 ml-1'>*</span>
                </label>
                <input
                  type='date'
                  id='booking_date'
                  value={formData.booking_date}
                  onChange={e => updateFormData('booking_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.booking_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.booking_date && (
                  <p className='text-sm text-red-600'>{errors.booking_date}</p>
                )}
              </div>

              <div className='space-y-1'>
                <label
                  htmlFor='start_time'
                  className='block text-sm font-medium text-gray-700'
                >
                  開始時間<span className='text-red-500 ml-1'>*</span>
                </label>
                <select
                  id='start_time'
                  value={formData.start_time}
                  onChange={e => updateFormData('start_time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.start_time ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value=''>選択してください</option>
                  {timeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.start_time && (
                  <p className='text-sm text-red-600'>{errors.start_time}</p>
                )}
              </div>
            </div>

            {/* 終了時間表示 */}
            {formData.start_time && selectedMenu && (
              <div className='bg-blue-50 rounded-lg p-3'>
                <div className='flex items-center text-sm text-blue-800'>
                  <ClockIcon className='w-4 h-4 mr-1' />
                  <span>
                    終了予定時間:{' '}
                    {calculateEndTime(
                      formData.start_time,
                      selectedMenu.base_duration
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 備考 */}
          <div className='space-y-4'>
            <h4 className='text-sm font-medium text-gray-900 border-b border-gray-200 pb-2'>
              備考
            </h4>

            <div className='space-y-1'>
              <label
                htmlFor='customer_notes'
                className='block text-sm font-medium text-gray-700'
              >
                顧客からの要望・備考
              </label>
              <textarea
                id='customer_notes'
                value={formData.customer_notes || ''}
                onChange={e => updateFormData('customer_notes', e.target.value)}
                placeholder='特記事項があれば入力してください'
                rows={3}
                className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className='flex justify-end space-x-3 pt-6 border-t border-gray-200'>
            <Button
              type='button'
              variant='outline'
              size='md'
              onClick={handleClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              type='submit'
              variant='primary'
              size='md'
              loading={isSubmitting}
              leftIcon={<CalendarIcon className='w-4 h-4' />}
            >
              {isSubmitting ? '作成中...' : '予約を作成'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default BookingCreateModal;
