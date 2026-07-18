import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PlusIcon,
  CurrencyYenIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import Modal from '../modal/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import SoftDigitField from '../ui/SoftDigitField';
import { FIELD_TIPS } from '../ui/fieldTips';
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

/** 選択可能な時（08〜21） */
const HOUR_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 8);

/** 15分刻みの分（21時は 00 のみ別途制限） */
const MINUTE_OPTIONS = [0, 15, 30, 45] as const;

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
  // 営業終了 21:00 を超える場合は 21:00 に丸める
  if (h > 21 || (h === 21 && m > 0)) {
    h = 21;
    m = 0;
  }
  if (h < 8) {
    h = 8;
    m = 0;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * HH:mm を時・分に分解
 */
const parseTimeParts = (
  time?: string
): { hour: number | null; minute: number | null } => {
  const snapped = snapToQuarterHour(time);
  if (!snapped) return { hour: null, minute: null };
  const [h, m] = snapped.split(':').map(Number);
  return { hour: h, minute: m };
};

/**
 * 時・分から HH:mm を組み立て
 */
const formatHm = (hour: number, minute: number): string =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * 選択した時に応じた分の候補（21時は 00 のみ）
 */
const minutesForHour = (hour: number): number[] =>
  hour === 21 ? [0] : [...MINUTE_OPTIONS];

/** 電話番号を数字のみに正規化 */
const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/**
 * チップ（時間・担当）の共通スタイル
 */
const chipClass = (active: boolean): string =>
  `min-h-[44px] min-w-[4.5rem] px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
    active
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
  }`;

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
      const d = detail as typeof detail & {
        service_name?: string;
        menu_id?: number;
      };
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
    label:
      booking.menu?.display_name || booking.menu?.name || 'メニュー情報なし',
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
  const initialTimeParts = parseTimeParts(initialStartTime);

  // フォーム状態
  const [formData, setFormData] = useState<CreateCombinationBookingRequest>({
    customer_id: initialCustomerId || 0,
    booking_date: initialDate || '',
    start_time: snapToQuarterHour(initialStartTime) || '',
    resource_id: initialResourceId ? parseInt(initialResourceId) : undefined,
    menus: [],
    customer_notes: '',
  });

  /** 開始時間: 時（未選択は null） */
  const [selectedHour, setSelectedHour] = useState<number | null>(
    initialTimeParts.hour
  );
  /** 開始時間: 分（時未選択時は非表示） */
  const [selectedMinute, setSelectedMinute] = useState<number | null>(
    initialTimeParts.minute
  );

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

  // 顧客 UI（電話優先）
  const [phoneSearch, setPhoneSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [phoneMatches, setPhoneMatches] = useState<Customer[]>([]);
  const [nameMatches, setNameMatches] = useState<Customer[]>([]);
  const [showNameList, setShowNameList] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  /** 「変更」直後に同一番号で自動再確定しないためのフラグ */
  const skipPhoneAutoSelectRef = useRef(false);

  // UI状態
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const phoneDigits = digitsOnly(phoneSearch);

  useEffect(() => {
    if (isOpen && !isDataLoaded) {
      loadInitialData();
      setIsDataLoaded(true);
    }
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, isDataLoaded]);

  // 電話番号検索・1件なら自動確定
  useEffect(() => {
    if (selectedCustomer) {
      setPhoneMatches([]);
      return;
    }

    if (phoneDigits.length < 3) {
      setPhoneMatches([]);
      return;
    }

    const matches = customers.filter(customer => {
      if (!customer.phone) return false;
      return digitsOnly(customer.phone).includes(phoneDigits);
    });
    setPhoneMatches(matches);

    // 4桁以上で一意一致なら自動確定（「変更」直後はスキップ）
    if (
      phoneDigits.length >= 4 &&
      matches.length === 1 &&
      !skipPhoneAutoSelectRef.current
    ) {
      selectCustomer(matches[0], { keepPhone: true });
    }
  }, [phoneSearch, customers, selectedCustomer]);

  // 名前検索
  useEffect(() => {
    if (selectedCustomer) {
      setNameMatches([]);
      setShowNameList(false);
      return;
    }

    const query = nameSearch.trim();
    if (!query) {
      setNameMatches([]);
      setShowNameList(false);
      return;
    }

    const matches = customers.filter(customer =>
      customer.name.toLowerCase().includes(query.toLowerCase())
    );
    setNameMatches(matches);
    setShowNameList(matches.length > 0);
  }, [nameSearch, customers, selectedCustomer]);

  // 初期顧客設定
  useEffect(() => {
    if (initialCustomerId && customers.length > 0) {
      const customer = customers.find(c => c.id === initialCustomerId);
      if (customer) {
        selectCustomer(customer);
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
        : Array.isArray(
              (customersResponse as { customers?: Customer[] }).customers
            )
          ? (customersResponse as { customers: Customer[] }).customers
          : [];
      setCustomers(customerList);
      setResources(resourcesResponse.resources || []);
    } catch (error: unknown) {
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
    const parts = parseTimeParts(initialStartTime);
    setFormData({
      customer_id: initialCustomerId || 0,
      booking_date: initialDate || '',
      start_time: snapToQuarterHour(initialStartTime) || '',
      resource_id: initialResourceId ? parseInt(initialResourceId) : undefined,
      menus: [],
      customer_notes: '',
    });
    setSelectedHour(parts.hour);
    setSelectedMinute(parts.minute);
    setSelectedCustomer(null);
    setSelectedMenus([]);
    setCalculationResult(null);
    setPhoneSearch('');
    setNameSearch('');
    setPhoneMatches([]);
    setNameMatches([]);
    setShowNameList(false);
    setNewCustomerName('');
    setErrors({});
    setLastVisit(null);
    skipPhoneAutoSelectRef.current = false;
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
  const selectCustomer = (
    customer: Customer,
    options?: { keepPhone?: boolean }
  ) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setPhoneMatches([]);
    setNameMatches([]);
    setShowNameList(false);
    setNameSearch('');
    if (!options?.keepPhone) {
      setPhoneSearch(customer.phone || '');
    } else if (!phoneSearch.trim() && customer.phone) {
      setPhoneSearch(customer.phone);
    }
    clearError('customer_id');
    void loadLastVisit(customer.id);
  };

  /**
   * 顧客選択を解除して電話入力に戻す
   */
  const clearCustomerSelection = () => {
    skipPhoneAutoSelectRef.current = true;
    setSelectedCustomer(null);
    setFormData(prev => ({ ...prev, customer_id: 0 }));
    setLastVisit(null);
    setNewCustomerName('');
  };

  /**
   * 電話番号入力変更
   */
  const handlePhoneSearchChange = (value: string) => {
    skipPhoneAutoSelectRef.current = false;
    setPhoneSearch(value);
    if (selectedCustomer) {
      setSelectedCustomer(null);
      setFormData(prev => ({ ...prev, customer_id: 0 }));
      setLastVisit(null);
    }
  };

  /**
   * 該当なしのときその場で顧客を作成して選択
   */
  const createCustomerInline = async () => {
    const name = newCustomerName.trim();
    if (!name) {
      setErrors(prev => ({ ...prev, customer_id: 'お名前を入力してください' }));
      return;
    }
    if (phoneDigits.length < 7) {
      setErrors(prev => ({
        ...prev,
        customer_id: '電話番号を7桁以上入力してください',
      }));
      return;
    }

    try {
      setIsCreatingCustomer(true);
      const customer = await customerApi.create({
        name,
        phone: phoneSearch.trim(),
        loyalty_rank: 'new',
      });
      setCustomers(prev => [customer, ...prev]);
      selectCustomer(customer, { keepPhone: true });
      addNotification({
        type: 'success',
        title: '顧客を登録しました',
        message: name,
      });
    } catch (error: unknown) {
      console.error('顧客作成エラー:', error);
      const message =
        error instanceof Error ? error.message : '顧客の登録に失敗しました';
      addNotification({
        type: 'error',
        title: '顧客登録エラー',
        message,
      });
    } finally {
      setIsCreatingCustomer(false);
    }
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
   * 時・分から start_time を同期
   */
  const syncStartTime = (hour: number | null, minute: number | null) => {
    if (hour != null && minute != null) {
      setFormData(prev => ({
        ...prev,
        start_time: formatHm(hour, minute),
      }));
      clearError('start_time');
    } else {
      setFormData(prev => ({ ...prev, start_time: '' }));
    }
  };

  /**
   * 時を選択（再選択も同じ行で可能）。分が有効なら引き継ぐ
   */
  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    const allowedMinutes = minutesForHour(hour);
    const nextMinute =
      selectedMinute != null && allowedMinutes.includes(selectedMinute)
        ? selectedMinute
        : null;
    if (nextMinute !== selectedMinute) {
      setSelectedMinute(nextMinute);
    }
    syncStartTime(hour, nextMinute);
  };

  /**
   * 分を選択（時選択後に表示）
   */
  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    syncStartTime(selectedHour, minute);
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
    } catch (error: unknown) {
      console.error('予約作成エラー:', error);
      const err = error as {
        response?: { data?: { error?: { details?: Record<string, string> } } };
        message?: string;
      };

      if (err.response?.data?.error?.details) {
        setErrors(err.response.data.error.details);
      } else {
        addNotification({
          type: 'error',
          title: '予約作成エラー',
          message: err.message || '予約の作成に失敗しました',
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

  const showInlineCreate =
    !selectedCustomer &&
    phoneDigits.length >= 7 &&
    phoneMatches.length === 0;

  const showPhoneCandidates =
    !selectedCustomer &&
    phoneDigits.length >= 3 &&
    phoneMatches.length > 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size='xl'
      title='新規予約'
      footer={
        <>
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
        </>
      }
    >
      <div className='space-y-6'>
        {/* ローディング */}
        {isLoadingData && (
          <div className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto'></div>
            <p className='text-gray-600 mt-2'>データを読み込み中...</p>
          </div>
        )}

        {!isLoadingData && (
          <>
            {/* 顧客（電話優先） */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <PhoneIcon className='w-4 h-4 inline mr-1' />
                電話番号
              </label>

              {selectedCustomer ? (
                <div className='rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='text-xs font-medium text-emerald-700 mb-0.5'>
                        お客様
                      </p>
                      <p className='font-semibold text-gray-900 truncate'>
                        {selectedCustomer.name}
                      </p>
                      <p className='text-sm text-gray-600'>
                        {selectedCustomer.phone || '電話番号なし'}
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={clearCustomerSelection}
                      className='shrink-0'
                    >
                      変更
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <SoftDigitField
                    name='phone_search'
                    variant='phone'
                    label='電話番号'
                    tip={FIELD_TIPS.customerPhone}
                    value={phoneSearch}
                    onChange={handlePhoneSearchChange}
                    error={errors.customer_id}
                    placeholder='タップして入力'
                    startAdornment={
                      <PhoneIcon className='w-4 h-4 mr-1 text-gray-500' />
                    }
                  />

                  {showPhoneCandidates && (
                    <div className='mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto'>
                      {phoneMatches.map(customer => (
                        <button
                          type='button'
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className='w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 min-h-[44px]'
                        >
                          <div className='font-medium text-gray-900'>
                            {customer.name}
                          </div>
                          <div className='text-sm text-gray-600'>
                            {customer.phone}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showInlineCreate && (
                    <div className='mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3'>
                      <p className='text-sm text-amber-900'>
                        該当するお客様がいません。この電話番号で新規登録できます。
                      </p>
                      <div>
                        <label className='block text-xs font-medium text-gray-700 mb-1'>
                          お名前
                        </label>
                        <input
                          type='text'
                          placeholder='山田 太郎'
                          value={newCustomerName}
                          onChange={e => {
                            setNewCustomerName(e.target.value);
                            clearError('customer_id');
                          }}
                          className='w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                        />
                      </div>
                      <Button
                        type='button'
                        variant='primary'
                        onClick={createCustomerInline}
                        disabled={isCreatingCustomer || !newCustomerName.trim()}
                        className='w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 min-h-[44px]'
                      >
                        <PlusIcon className='w-4 h-4 mr-1 inline' />
                        {isCreatingCustomer
                          ? '登録中...'
                          : '登録してこのお客様を選択'}
                      </Button>
                    </div>
                  )}

                  <div className='mt-4'>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      <UserIcon className='w-4 h-4 inline mr-1' />
                      名前で探す
                    </label>
                    <div className='relative'>
                      <MagnifyingGlassIcon className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                      <input
                        type='text'
                        placeholder='顧客名で検索'
                        value={nameSearch}
                        onChange={e => setNameSearch(e.target.value)}
                        className='w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      />
                      {showNameList && nameMatches.length > 0 && (
                        <div
                          className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'
                          onMouseDown={e => e.preventDefault()}
                        >
                          {nameMatches.map(customer => (
                            <button
                              type='button'
                              key={customer.id}
                              onMouseDown={e => {
                                e.preventDefault();
                                selectCustomer(customer);
                              }}
                              onClick={() => selectCustomer(customer)}
                              className='w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0'
                            >
                              <div className='font-medium text-gray-900'>
                                {customer.name}
                              </div>
                              <div className='text-sm text-gray-600'>
                                {customer.phone}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {errors.customer_id && (
                <p className='text-sm text-red-600 mt-1'>{errors.customer_id}</p>
              )}

              {selectedCustomer && (
                <div className='mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5'>
                  {loadingLastVisit ? (
                    <p className='text-sm text-gray-500'>
                      前回の予約を確認中...
                    </p>
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

            {/* 予約日 */}
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

            {/* 開始時間（時 → 分） */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <ClockIcon className='w-4 h-4 inline mr-1' />
                開始時間
                {formData.start_time ? (
                  <span className='ml-2 text-emerald-700 font-semibold text-base'>
                    {formData.start_time}
                  </span>
                ) : selectedHour != null ? (
                  <span className='ml-2 text-gray-500 font-medium'>
                    {String(selectedHour).padStart(2, '0')}:--
                  </span>
                ) : null}
              </label>

              <p className='text-xs text-gray-500 mb-2'>時を選ぶ</p>
              <div className='flex flex-wrap gap-2 p-1 -m-1'>
                {HOUR_OPTIONS.map(hour => (
                  <button
                    type='button'
                    key={hour}
                    onClick={() => handleHourSelect(hour)}
                    className={chipClass(selectedHour === hour)}
                    aria-pressed={selectedHour === hour}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                ))}
              </div>

              {selectedHour != null && (
                <div className='mt-4'>
                  <p className='text-xs text-gray-500 mb-2'>分を選ぶ</p>
                  <div className='flex flex-wrap gap-2 p-1 -m-1'>
                    {minutesForHour(selectedHour).map(minute => (
                      <button
                        type='button'
                        key={minute}
                        onClick={() => handleMinuteSelect(minute)}
                        className={`${chipClass(selectedMinute === minute)} min-w-[5rem]`}
                        aria-pressed={selectedMinute === minute}
                      >
                        :{String(minute).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errors.start_time && (
                <p className='text-sm text-red-600 mt-1'>{errors.start_time}</p>
              )}
            </div>

            {/* 担当（チップ） */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                担当（任意）
              </label>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => selectResource(undefined)}
                  className={chipClass(formData.resource_id == null)}
                >
                  指定なし
                </button>
                {resources.map(resource => (
                  <button
                    type='button'
                    key={resource.id}
                    onClick={() => selectResource(resource.id)}
                    className={chipClass(formData.resource_id === resource.id)}
                  >
                    {resource.display_name || resource.name}
                  </button>
                ))}
              </div>
            </div>

            {/* メニュー選択（一覧上・選択下+sticky） */}
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
                rows={2}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CombinationBookingModal;
