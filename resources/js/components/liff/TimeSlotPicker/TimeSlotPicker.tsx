import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TimeSlot {
  start_time: string;
  end_time: string;
  duration: number;
  resource_id: number;
  resource_name: string;
  is_available: boolean;
}

interface TimeSlotPickerProps {
  storeId: number;
  menuId: number;
  resourceId?: number;
  selectedDate?: string;
  onSlotSelect: (slot: TimeSlot) => void;
  selectedSlot?: TimeSlot;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  storeId,
  menuId,
  resourceId,
  selectedDate,
  onSlotSelect,
  selectedSlot,
}) => {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateState, setSelectedDateState] = useState<string>(
    selectedDate || new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (menuId && selectedDateState) {
      fetchAvailableSlots();
    }
  }, [storeId, menuId, resourceId, selectedDateState]);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        store_id: storeId.toString(),
        menu_id: menuId.toString(),
        date: selectedDateState,
        ...(resourceId && { resource_id: resourceId.toString() }),
      });

      const response = await fetch(`/api/v1/liff/availability?${params}`);
      const data = await response.json();
      setAvailableSlots(data.data.available_slots || []);
    } catch (error) {
      console.error("空き時間取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === today.toISOString().split("T")[0]) {
      return "今日";
    } else if (dateString === tomorrow.toISOString().split("T")[0]) {
      return "明日";
    } else {
      return date.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
        weekday: "short",
      });
    }
  };

  const getDateOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split("T")[0];

      options.push({
        value: dateString,
        label: i === 0 ? "今日" : i === 1 ? "明日" : formatDate(dateString),
      });
    }

    return options;
  };

  const getSlotColor = (slot: TimeSlot) => {
    if (!slot.is_available) {
      return "bg-gray-100 text-gray-400 cursor-not-allowed";
    }

    if (selectedSlot?.start_time === slot.start_time) {
      return "bg-emerald-500 text-white";
    }

    return "bg-white text-gray-900 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50";
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
      {/* 日付選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          日付を選択
        </label>
        <select
          value={selectedDateState}
          onChange={(e) => setSelectedDateState(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {getDateOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 時間枠一覧 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          時間を選択
        </label>

        {availableSlots.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {availableSlots.map((slot, index) => (
              <motion.button
                key={`${slot.start_time}-${slot.resource_id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => slot.is_available && onSlotSelect(slot)}
                disabled={!slot.is_available}
                className={`p-4 rounded-lg border-2 text-center transition-all ${getSlotColor(
                  slot
                )}`}
              >
                <div className="text-lg font-semibold">
                  {formatTime(slot.start_time)}
                </div>
                <div className="text-sm opacity-75">
                  {formatTime(slot.end_time)}
                </div>
                {slot.resource_name && (
                  <div className="text-xs mt-1 opacity-75">
                    {slot.resource_name}
                  </div>
                )}
                {!slot.is_available && (
                  <div className="text-xs mt-1">予約不可</div>
                )}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <p className="text-gray-500 mb-2">
              選択した日付に空き時間がありません
            </p>
            <p className="text-sm text-gray-400">別の日付を選択してください</p>
          </div>
        )}
      </div>

      {/* 選択中の時間枠表示 */}
      {selectedSlot && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700">選択中の時間</p>
              <p className="font-semibold text-emerald-900">
                {formatTime(selectedSlot.start_time)} -{" "}
                {formatTime(selectedSlot.end_time)}
              </p>
              {selectedSlot.resource_name && (
                <p className="text-sm text-emerald-700">
                  担当: {selectedSlot.resource_name}
                </p>
              )}
            </div>
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TimeSlotPicker;
