import React, { useState } from "react";
import { motion } from "framer-motion";

interface BookingStep {
  id: number;
  title: string;
  component: React.ComponentType<any>;
  isCompleted: boolean;
}

interface BookingFlowProps {
  storeId: number;
  lineUserId?: string;
  onComplete: (booking: any) => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({
  storeId,
  lineUserId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState<any>({});

  const steps: BookingStep[] = [
    {
      id: 1,
      title: "メニュー選択",
      component: MenuSelection,
      isCompleted: false,
    },
    {
      id: 2,
      title: "スタッフ選択",
      component: StaffSelection,
      isCompleted: false,
    },
    { id: 3, title: "日時選択", component: TimeSlotPicker, isCompleted: false },
    { id: 4, title: "情報入力", component: CustomerInfo, isCompleted: false },
    {
      id: 5,
      title: "確認",
      component: BookingConfirmation,
      isCompleted: false,
    },
  ];

  const handleStepComplete = (stepData: any) => {
    setBookingData((prev) => ({ ...prev, ...stepData }));

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(bookingData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1]?.component;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              className="p-2 text-gray-600 hover:text-gray-800"
              disabled={currentStep === 1}
            >
              ← 戻る
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {steps[currentStep - 1]?.title}
            </h1>
            <div className="w-8" />
          </div>

          {/* プログレスバー */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>ステップ {currentStep}</span>
              <span>{Math.round((currentStep / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-emerald-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-md mx-auto px-4 py-6">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {CurrentStepComponent && (
            <CurrentStepComponent
              storeId={storeId}
              lineUserId={lineUserId}
              bookingData={bookingData}
              onComplete={handleStepComplete}
              onPrevious={handlePrevious}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

// ステップコンポーネントのプレースホルダー
const MenuSelection: React.FC<any> = ({ onComplete }) => (
  <div className="text-center py-8">
    <h2 className="text-xl font-semibold mb-4">メニュー選択</h2>
    <p className="text-gray-600 mb-6">お好みのメニューを選択してください</p>
    <button
      onClick={() => onComplete({ menu: { id: 1, name: "カット" } })}
      className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium"
    >
      次へ進む
    </button>
  </div>
);

const StaffSelection: React.FC<any> = ({ onComplete }) => (
  <div className="text-center py-8">
    <h2 className="text-xl font-semibold mb-4">スタッフ選択</h2>
    <p className="text-gray-600 mb-6">担当スタッフを選択してください</p>
    <button
      onClick={() => onComplete({ staff: { id: 1, name: "田中美容師" } })}
      className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium"
    >
      次へ進む
    </button>
  </div>
);

const TimeSlotPicker: React.FC<any> = ({ onComplete }) => (
  <div className="text-center py-8">
    <h2 className="text-xl font-semibold mb-4">日時選択</h2>
    <p className="text-gray-600 mb-6">ご希望の日時を選択してください</p>
    <button
      onClick={() =>
        onComplete({
          date: "2025-01-07",
          time: "14:00",
        })
      }
      className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium"
    >
      次へ進む
    </button>
  </div>
);

const CustomerInfo: React.FC<any> = ({ onComplete }) => (
  <div className="text-center py-8">
    <h2 className="text-xl font-semibold mb-4">情報入力</h2>
    <p className="text-gray-600 mb-6">お客様情報を入力してください</p>
    <button
      onClick={() =>
        onComplete({
          customer: {
            name: "山田太郎",
            phone: "090-1234-5678",
          },
        })
      }
      className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium"
    >
      次へ進む
    </button>
  </div>
);

const BookingConfirmation: React.FC<any> = ({ bookingData, onComplete }) => (
  <div className="text-center py-8">
    <h2 className="text-xl font-semibold mb-4">予約確認</h2>
    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
      <p className="text-sm text-gray-600">予約内容</p>
      <p className="font-medium">{bookingData.menu?.name}</p>
      <p className="text-sm text-gray-600">{bookingData.staff?.name}</p>
      <p className="text-sm text-gray-600">
        {bookingData.date} {bookingData.time}
      </p>
    </div>
    <button
      onClick={() => onComplete({ confirmed: true })}
      className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium"
    >
      予約確定
    </button>
  </div>
);

export default BookingFlow;
