import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MinusIcon,
  ClockIcon,
  CurrencyYenIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import {
  Menu,
  CombinationMenuRequest,
  CalculateCombinationResponse,
} from '../../types';
import { Card, Button } from '../index';
import api from '../../services/api';

interface MultiMenuSelectorProps {
  /** 利用可能なメニュー一覧 */
  menus: Menu[];
  /** 選択済みメニュー */
  selectedMenus: CombinationMenuRequest[];
  /** 選択変更ハンドラー */
  onSelectionChange: (menus: CombinationMenuRequest[]) => void;
  /** 料金計算結果コールバック */
  onCalculationResult?: (result: CalculateCombinationResponse | null) => void;
  /** 計算用の基本情報 */
  calculationContext?: {
    resource_id?: number;
    booking_date: string;
    start_time: string;
  };
  /** 電話予約モード（大きなタッチターゲット） */
  phoneBookingMode?: boolean;
  /** 片手操作モード */
  oneHandMode?: boolean;
}

export const MultiMenuSelector: React.FC<MultiMenuSelectorProps> = ({
  menus,
  selectedMenus,
  onSelectionChange,
  onCalculationResult,
  calculationContext,
  phoneBookingMode = false,
  oneHandMode = false,
}) => {
  const [calculationResult, setCalculationResult] =
    useState<CalculateCombinationResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

  // Phase 23: 料金計算（デバウンス処理付き）
  useEffect(() => {
    if (selectedMenus.length === 0) {
      setCalculationResult(null);
      onCalculationResult?.(null);
      return;
    }

    if (!calculationContext) {
      return;
    }

    const calculateCombination = async () => {
      // 計算中は重複API呼び出しを防ぐ
      if (isCalculating) {
        return;
      }

      setIsCalculating(true);
      try {
        const result = await api.calculateCombination({
          ...calculationContext,
          menus: selectedMenus,
        });
        setCalculationResult(result);
        onCalculationResult?.(result);
      } catch (error) {
        console.error('料金計算エラー:', error);

        // 429エラーの場合は特別な処理
        if ((error as any).response?.status === 429) {
          console.warn('レート制限に達しました。しばらくお待ちください。');
          // 計算結果をクリアしない（前の結果を保持）
        } else {
          setCalculationResult(null);
          onCalculationResult?.(null);
        }
      } finally {
        setIsCalculating(false);
      }
    };

    // デバウンス処理を1秒に延長（429エラー対策）
    const timer = setTimeout(calculateCombination, 1000);
    return () => clearTimeout(timer);
  }, [selectedMenus, calculationContext, onCalculationResult, isCalculating]);

  // メニュー追加
  const handleMenuAdd = (menu: Menu) => {
    const newMenuRequest: CombinationMenuRequest = {
      menu_id: menu.id,
      sequence_order: selectedMenus.length + 1,
      service_type: 'main',
      option_ids: [],
    };

    onSelectionChange([...selectedMenus, newMenuRequest]);
  };

  // メニュー削除
  const handleMenuRemove = (menuId: number) => {
    const updatedMenus = selectedMenus
      .filter(m => m.menu_id !== menuId)
      .map((m, index) => ({
        ...m,
        sequence_order: index + 1,
      }));

    onSelectionChange(updatedMenus);
  };

  // 順序変更
  const handleSequenceChange = (menuId: number, direction: 'up' | 'down') => {
    const currentIndex = selectedMenus.findIndex(m => m.menu_id === menuId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= selectedMenus.length) return;

    const updatedMenus = [...selectedMenus];
    [updatedMenus[currentIndex], updatedMenus[newIndex]] = [
      updatedMenus[newIndex],
      updatedMenus[currentIndex],
    ];

    // sequence_order を更新
    updatedMenus.forEach((menu, index) => {
      menu.sequence_order = index + 1;
    });

    onSelectionChange(updatedMenus);
  };

  // メニュー詳細の展開/折りたたみ
  const toggleMenuExpansion = (menuId: number) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  // 選択済みメニューの表示用データ
  const getSelectedMenuDisplay = (menuRequest: CombinationMenuRequest) => {
    const menu = menus.find(m => m.id === menuRequest.menu_id);
    if (!menu) return null;

    return {
      ...menu,
      sequence_order: menuRequest.sequence_order,
      service_type: menuRequest.service_type,
    };
  };

  // 利用可能なメニュー（選択済みを除く）
  const availableMenus = menus.filter(
    menu => !selectedMenus.some(selected => selected.menu_id === menu.id)
  );

  const cardClassName = phoneBookingMode
    ? 'min-h-20 p-4 cursor-pointer hover:bg-gray-50 transition-colors'
    : 'min-h-16 p-3 cursor-pointer hover:bg-gray-50 transition-colors';

  const buttonClassName = phoneBookingMode
    ? 'min-h-12 px-4 text-base'
    : 'min-h-10 px-3 text-sm';

  return (
    <div className='multi-menu-selector space-y-4'>
      {/* 選択済みメニュー表示 */}
      {selectedMenus.length > 0 && (
        <div className='selected-menus'>
          <h3 className='text-lg font-semibold text-gray-900 mb-3'>
            選択中のメニュー
          </h3>
          <div className='space-y-2'>
            {selectedMenus.map((menuRequest, index) => {
              const menuDisplay = getSelectedMenuDisplay(menuRequest);
              if (!menuDisplay) return null;

              return (
                <Card key={menuRequest.menu_id} className='selected-menu-card'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      {/* 順序番号 */}
                      <div className='flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-semibold'>
                        {menuRequest.sequence_order}
                      </div>

                      {/* メニュー情報 */}
                      <div className='flex-1'>
                        <h4 className='font-medium text-gray-900'>
                          {menuDisplay.display_name || menuDisplay.name}
                        </h4>
                        <div className='flex items-center space-x-4 text-sm text-gray-600'>
                          <div className='flex items-center'>
                            <CurrencyYenIcon className='w-4 h-4 mr-1' />
                            {menuDisplay.formatted_price}
                          </div>
                          <div className='flex items-center'>
                            <ClockIcon className='w-4 h-4 mr-1' />
                            {menuDisplay.formatted_duration}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 操作ボタン */}
                    <div className='flex items-center space-x-2'>
                      {/* 順序変更ボタン */}
                      <div className='flex flex-col'>
                        <Button
                          variant='ghost'
                          size='xs'
                          onClick={() =>
                            handleSequenceChange(menuRequest.menu_id, 'up')
                          }
                          disabled={index === 0}
                          className='p-1 h-6'
                        >
                          <ChevronUpIcon className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='xs'
                          onClick={() =>
                            handleSequenceChange(menuRequest.menu_id, 'down')
                          }
                          disabled={index === selectedMenus.length - 1}
                          className='p-1 h-6'
                        >
                          <ChevronDownIcon className='w-4 h-4' />
                        </Button>
                      </div>

                      {/* 削除ボタン */}
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleMenuRemove(menuRequest.menu_id)}
                        className={`text-red-600 hover:text-red-700 hover:bg-red-50 ${buttonClassName}`}
                      >
                        <MinusIcon className='w-5 h-5' />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 利用可能なメニュー一覧 */}
      <div className='available-menus'>
        <h3 className='text-lg font-semibold text-gray-900 mb-3'>
          メニューを追加
        </h3>
        <div className='space-y-2'>
          {availableMenus.map(menu => (
            <Card key={menu.id} className={cardClassName}>
              <div
                className='flex items-center justify-between'
                onClick={() => handleMenuAdd(menu)}
              >
                <div className='flex-1'>
                  <h4 className='font-medium text-gray-900 mb-1'>
                    {menu.display_name || menu.name}
                  </h4>
                  <div className='flex items-center space-x-4 text-sm text-gray-600'>
                    <div className='flex items-center'>
                      <CurrencyYenIcon className='w-4 h-4 mr-1' />
                      {menu.formatted_price}
                    </div>
                    <div className='flex items-center'>
                      <ClockIcon className='w-4 h-4 mr-1' />
                      {menu.formatted_duration}
                    </div>
                  </div>
                  {menu.description && (
                    <p className='text-sm text-gray-500 mt-1'>
                      {menu.description}
                    </p>
                  )}
                </div>

                {/* 追加ボタン */}
                <div onClick={e => e.stopPropagation()} className='ml-4'>
                  <Button
                    variant='outline'
                    size='sm'
                    className={buttonClassName}
                    onClick={() => handleMenuAdd(menu)}
                  >
                    <PlusIcon className='w-5 h-5' />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 空状態 */}
      {availableMenus.length === 0 && selectedMenus.length === 0 && (
        <Card className='text-center py-8'>
          <p className='text-gray-500'>利用可能なメニューがありません</p>
        </Card>
      )}
    </div>
  );
};
