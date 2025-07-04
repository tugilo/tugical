import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Menu } from '../../types';
import { menuApi } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';

interface MenuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (menuId: number) => void;
  menuId: number | null;
}

/**
 * メニュー詳細表示モーダル
 * 
 * メニューの詳細情報、オプション一覧、統計情報を表示
 * 読み取り専用で、編集ボタンから編集モーダルへ遷移可能
 */
const MenuDetailModal: React.FC<MenuDetailModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  menuId,
}) => {
  const { addNotification } = useUIStore();
  
  // 状態管理
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);

  // メニューデータ取得
  useEffect(() => {
    if (isOpen && menuId) {
      loadMenuData();
    }
  }, [isOpen, menuId]);

  /**
   * メニューデータ読み込み
   */
  const loadMenuData = async () => {
    if (!menuId) return;

    try {
      setLoading(true);
      const menuData = await menuApi.get(menuId);
      setMenu(menuData);
    } catch (error: any) {
      console.error('メニューデータ取得エラー:', error);
      addNotification({
        type: 'error',
        title: 'データ取得エラー',
        message: 'メニューデータの取得に失敗しました',
        duration: 5000,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // モーダルクローズ処理
  const handleClose = () => {
    setMenu(null);
    setLoading(false);
    onClose();
  };

  // 編集ボタンクリック
  const handleEdit = () => {
    if (menu && onEdit) {
      onEdit(menu.id);
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={menu ? `メニュー詳細: ${menu.display_name}` : 'メニュー詳細'}
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-600">メニューデータを読み込み中...</span>
        </div>
      ) : !menu ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-gray-500">
            <p>メニューデータが見つかりません</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
        {/* ステータス・基本情報 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  menu.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {menu.is_active ? 'アクティブ' : '非アクティブ'}
              </span>
              {menu.requires_approval && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  承認必要
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-600">{menu.formatted_price}</p>
              <p className="text-sm text-gray-600">{menu.formatted_total_duration}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">メニュー名</h4>
              <p className="text-gray-900">{menu.name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">表示名</h4>
              <p className="text-gray-900">{menu.display_name}</p>
            </div>
            {menu.category && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">カテゴリ</h4>
                <p className="text-gray-900">{menu.category}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">並び順</h4>
              <p className="text-gray-900">{menu.sort_order}</p>
            </div>
          </div>
        </div>

        {/* 説明 */}
        {menu.description && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">
              説明
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap">{menu.description}</p>
          </div>
        )}

        {/* 料金・時間詳細 */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">
            料金・時間詳細
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">料金</h5>
              <p className="text-2xl font-bold text-primary-600">{menu.formatted_price}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">基本時間</h5>
              <p className="text-xl font-semibold text-gray-900">{menu.base_duration}分</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">準備時間</h5>
              <p className="text-xl font-semibold text-gray-900">{menu.prep_duration}分</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">片付け時間</h5>
              <p className="text-xl font-semibold text-gray-900">{menu.cleanup_duration}分</p>
            </div>
          </div>
          <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h5 className="font-medium text-primary-900 mb-2">総所要時間</h5>
            <p className="text-xl font-bold text-primary-600">{menu.formatted_total_duration}</p>
            <p className="text-sm text-primary-600 mt-1">
              基本時間 + 準備時間 + 片付け時間
            </p>
          </div>
        </div>

        {/* オプション一覧 */}
        {menu.options && menu.options.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">
              オプション ({menu.options.length}件)
            </h4>
            <div className="space-y-3">
              {menu.options.map((option) => (
                <div
                  key={option.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-medium text-gray-900">{option.display_name}</h5>
                        {option.is_required && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            必須
                          </span>
                        )}
                        {!option.is_active && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            非アクティブ
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>価格: {option.formatted_price}</span>
                        {option.duration_minutes > 0 && (
                          <span>時間: {option.formatted_duration}</span>
                        )}
                        <span>タイプ: {option.price_type_info.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-600">{option.formatted_price}</p>
                      {option.has_stock_management && (
                        <p className="text-sm text-gray-600">
                          在庫: {option.available_stock}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 統計情報 */}
        {(menu.bookings_count !== undefined || menu.options_count !== undefined) && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">
              統計情報
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menu.bookings_count !== undefined && (
                <div className="bg-white border rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">予約実績</h5>
                  <p className="text-2xl font-bold text-blue-600">{menu.bookings_count}件</p>
                </div>
              )}
              {menu.options_count !== undefined && (
                <div className="bg-white border rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">オプション数</h5>
                  <p className="text-2xl font-bold text-green-600">{menu.options_count}件</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* メタ情報 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">メタ情報</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">作成日時:</span>
              <p className="font-medium text-gray-900">
                {new Date(menu.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
            <div>
              <span className="text-gray-600">更新日時:</span>
              <p className="font-medium text-gray-900">
                {new Date(menu.updated_at).toLocaleString('ja-JP')}
              </p>
            </div>
            <div>
              <span className="text-gray-600">メニューID:</span>
              <p className="font-medium text-gray-900 font-mono">{menu.id}</p>
            </div>
            <div>
              <span className="text-gray-600">店舗ID:</span>
              <p className="font-medium text-gray-900 font-mono">{menu.store_id}</p>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            size="md"
            onClick={handleClose}
          >
            閉じる
          </Button>
          {onEdit && (
            <Button
              variant="primary"
              size="md"
              onClick={handleEdit}
            >
              編集
            </Button>
          )}
        </div>
        </div>
      )}
    </Modal>
  );
};

export default MenuDetailModal; 