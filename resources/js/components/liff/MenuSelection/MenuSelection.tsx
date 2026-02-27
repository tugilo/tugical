import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Menu {
  id: number;
  name: string;
  display_name: string;
  description: string;
  base_price: number;
  base_duration: number;
  photo_url?: string;
  tax_included: boolean;
  category: string;
}

interface MenuSelectionProps {
  storeId: number;
  onMenuSelect: (menu: Menu) => void;
  selectedMenu?: Menu;
}

const MenuSelection: React.FC<MenuSelectionProps> = ({
  storeId,
  onMenuSelect,
  selectedMenu,
}) => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    // メニュー一覧を取得
    fetchMenus();
  }, [storeId]);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      // API呼び出し（実装時は実際のエンドポイントに変更）
      const response = await fetch(`/api/v1/liff/menus?store_id=${storeId}`);
      const data = await response.json();
      setMenus(data.data.menus || []);
    } catch (error) {
      console.error("メニュー取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    "all",
    ...Array.from(new Set(menus.map((menu) => menu.category))),
  ];

  const filteredMenus =
    selectedCategory === "all"
      ? menus
      : menus.filter((menu) => menu.category === selectedCategory);

  const formatPrice = (price: number, taxIncluded: boolean) => {
    const formatted = new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(price);

    return taxIncluded ? `${formatted}（税込）` : `${formatted}（税抜）`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}時間${mins}分`;
    } else if (hours > 0) {
      return `${hours}時間`;
    } else {
      return `${mins}分`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* カテゴリフィルター */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {category === "all" ? "すべて" : category}
          </button>
        ))}
      </div>

      {/* メニュー一覧 */}
      <div className="space-y-4">
        {filteredMenus.map((menu, index) => (
          <motion.div
            key={menu.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
              selectedMenu?.id === menu.id
                ? "border-emerald-500 shadow-md"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <button
              onClick={() => onMenuSelect(menu)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start space-x-4">
                {/* メニュー画像 */}
                <div className="flex-shrink-0">
                  {menu.photo_url ? (
                    <img
                      src={menu.photo_url}
                      alt={menu.display_name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">✂️</span>
                    </div>
                  )}
                </div>

                {/* メニュー情報 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {menu.display_name || menu.name}
                  </h3>

                  {menu.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {menu.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <span className="mr-1">💰</span>
                        {formatPrice(menu.base_price, menu.tax_included)}
                      </span>
                      <span className="flex items-center">
                        <span className="mr-1">⏱️</span>
                        {formatDuration(menu.base_duration)}
                      </span>
                    </div>

                    {selectedMenu?.id === menu.id && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {filteredMenus.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <p className="text-gray-500">利用可能なメニューがありません</p>
        </div>
      )}
    </div>
  );
};

export default MenuSelection;
