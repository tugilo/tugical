/**
 * tugical Admin Dashboard ダッシュボードページ
 * 
 * 機能:
 * - 今日の予約一覧
 * - 売上サマリー
 * - 最近のアクティビティ
 * - 統計情報
 * - 通知一覧
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  CurrencyYenIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '../../stores/uiStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { formatPrice, formatDate, formatTime, getBookingStatusLabel, getBookingStatusClass } from '../../utils';

// ダミーデータ（後でAPIから取得）
const mockStats = {
  today_bookings: {
    total: 12,
    confirmed: 8,
    pending: 3,
    completed: 1,
  },
  revenue: {
    today: 45000,
    this_week: 280000,
    this_month: 1200000,
    growth_rate: 15.5,
  },
  customers: {
    total: 156,
    new_this_month: 23,
    returning_rate: 78.5,
  },
  resources: {
    total: 4,
    active: 3,
    utilization_rate: 85.2,
  },
};

const mockTodayBookings = [
  {
    id: 1,
    booking_number: 'TG20250702001',
    booking_date: '2025-07-02',
    start_time: '10:00',
    end_time: '11:30',
    status: 'confirmed' as const,
    customer: { id: 1, name: '田中花子', phone: '090-1234-5678' },
    menu: { id: 1, name: 'カット＋カラー', duration: 90, price: 8000 },
    resource: { id: 1, name: '佐藤美容師', type: 'staff' as const },
    total_price: 8000,
  },
  {
    id: 2,
    booking_number: 'TG20250702002',
    booking_date: '2025-07-02',
    start_time: '14:00',
    end_time: '15:00',
    status: 'pending' as const,
    customer: { id: 2, name: '山田太郎', phone: '090-2345-6789' },
    menu: { id: 2, name: 'カット', duration: 60, price: 4500 },
    resource: { id: 2, name: '田中美容師', type: 'staff' as const },
    total_price: 4500,
  },
  {
    id: 3,
    booking_number: 'TG20250702003',
    booking_date: '2025-07-02',
    start_time: '16:30',
    end_time: '18:00',
    status: 'confirmed' as const,
    customer: { id: 3, name: '鈴木美香', phone: '090-3456-7890' },
    menu: { id: 3, name: 'パーマ', duration: 90, price: 12000 },
    resource: { id: 1, name: '佐藤美容師', type: 'staff' as const },
    total_price: 12000,
  },
];

const mockRecentActivity = [
  {
    id: '1',
    type: 'booking_created' as const,
    title: '新しい予約が作成されました',
    description: '田中花子様のカット＋カラーの予約',
    timestamp: '2025-07-02T09:30:00+09:00',
    user: '受付スタッフ',
  },
  {
    id: '2',
    type: 'customer_registered' as const,
    title: '新規顧客が登録されました',
    description: '山田太郎様がLINEから新規登録',
    timestamp: '2025-07-02T08:45:00+09:00',
    user: 'システム',
  },
  {
    id: '3',
    type: 'booking_updated' as const,
    title: '予約が変更されました',
    description: '鈴木美香様の予約時間が変更',
    timestamp: '2025-07-01T17:20:00+09:00',
    user: '佐藤美容師',
  },
];

/**
 * 統計カードコンポーネント
 */
const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<any>;
  color: 'primary' | 'green' | 'blue' | 'purple';
}> = ({ title, value, change, icon: Icon, color }) => {
  const colorClasses = {
    primary: 'bg-primary-500 text-white',
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
  };

  return (
    <Card hoverable>
      <Card.Body>
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p className="text-sm text-green-600 flex items-center">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                {change}
              </p>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

/**
 * 今日の予約カードコンポーネント
 */
const TodayBookingCard: React.FC<{ booking: typeof mockTodayBookings[0] }> = ({ booking }) => {
  return (
    <motion.div
      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`badge ${getBookingStatusClass(booking.status)}`}>
          {getBookingStatusLabel(booking.status)}
        </span>
        <span className="text-sm text-gray-500 font-mono">
          {booking.booking_number}
        </span>
      </div>

      <div className="mb-2">
        <h4 className="font-medium text-gray-900">{booking.customer.name}</h4>
        <p className="text-sm text-gray-600">{booking.customer.phone}</p>
      </div>

      <div className="mb-2">
        <p className="text-sm font-medium text-gray-900">{booking.menu.name}</p>
        <div className="flex items-center text-sm text-gray-600">
          <ClockIcon className="h-4 w-4 mr-1" />
          <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
          {booking.resource && (
            <>
              <span className="mx-2">•</span>
              <span>{booking.resource.name}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-primary-600 font-semibold">
          {formatPrice(booking.total_price)}
        </span>
        <div className="flex space-x-2">
          {booking.status === 'pending' && (
            <>
              <Button variant="outline" size="xs">承認</Button>
              <Button variant="ghost" size="xs">詳細</Button>
            </>
          )}
          {booking.status === 'confirmed' && (
            <Button variant="ghost" size="xs">詳細</Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * ダッシュボードページ
 */
const DashboardPage: React.FC = () => {
  const { setPageTitle } = useUIStore();

  useEffect(() => {
    setPageTitle('ダッシュボード');
  }, [setPageTitle]);

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-1">
            {formatDate(new Date(), 'yyyy年M月d日(E)')} の概要
          </p>
        </div>
        <Button variant="primary">新規予約</Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="今日の予約"
          value={`${mockStats.today_bookings.total}件`}
          change={`確定 ${mockStats.today_bookings.confirmed}件`}
          icon={CalendarDaysIcon}
          color="primary"
        />
        <StatCard
          title="今日の売上"
          value={formatPrice(mockStats.revenue.today, false)}
          change={`前日比 +${mockStats.revenue.growth_rate}%`}
          icon={CurrencyYenIcon}
          color="green"
        />
        <StatCard
          title="総顧客数"
          value={`${mockStats.customers.total}人`}
          change={`今月 +${mockStats.customers.new_this_month}人`}
          icon={UsersIcon}
          color="blue"
        />
        <StatCard
          title="リソース稼働率"
          value={`${mockStats.resources.utilization_rate}%`}
          change={`稼働中 ${mockStats.resources.active}/${mockStats.resources.total}`}
          icon={BuildingOfficeIcon}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日の予約 */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">今日の予約</h2>
                <Button variant="outline" size="sm">すべて表示</Button>
              </div>
            </Card.Header>
            <Card.Body padding="sm">
              <div className="space-y-3">
                {mockTodayBookings.map((booking) => (
                  <TodayBookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* 最近のアクティビティ */}
        <div>
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold text-gray-900">最近のアクティビティ</h2>
            </Card.Header>
            <Card.Body padding="sm">
              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div key={activity.id} className="flex">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString('ja-JP')} - {activity.user}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* 注意事項 */}
          <Card className="mt-6">
            <Card.Header>
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">注意事項</h3>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 本日 {mockStats.today_bookings.pending}件の予約が承認待ちです</p>
                <p>• 今週の売上目標まで残り {formatPrice(320000 - mockStats.revenue.this_week, false)}</p>
                <p>• リピート率が {mockStats.customers.returning_rate}% で目標を上回っています</p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 