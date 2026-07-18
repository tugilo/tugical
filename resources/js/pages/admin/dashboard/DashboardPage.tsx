/**
 * tugical Admin Dashboard ダッシュボードページ
 *
 * 必須3ブロック（Step 7）＋ API一元化（Step 8）
 * - 今日の予約タイムライン
 * - 要対応アクション
 * - 直近の変更・キャンセル
 *
 * 初回マウントで1回のみ予約API（date_from / date_to で7日間）を取得し、
 * 同一データを3ブロックへマッピングして表示する。
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  List,
  ListItem,
  ListItemText,
  Alert,
  Skeleton,
  Chip,
  Box,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { AppButton, PageHeader } from '../../../components/admin';
import { modernCardSx } from '../../../theme/adminTokens';
import { useUIStore } from '../../../stores/uiStore';
import { bookingApi } from '../../../services/api';

// ----- 表示用型（API レスポンスからマッピング） -----

/** 今日の予約1件 */
export interface TodayBookingItem {
  id: number;
  booking_number?: string;
  start_time: string;
  end_time: string;
  status: string;
  customer: { name: string };
  menu: { name: string };
  resource?: { name: string };
}

/** 要対応アクションの種別（将来拡張用） */
export type ActionItemType = 'pending_today';

/** 要対応アクションの重要度 */
export type ActionItemSeverity = 'info' | 'warning' | 'error';

/** 要対応アクション1件（拡張可能） */
export interface ActionItem {
  id: number;
  booking_id: number;
  /** 種別（現状は pending_today 固定） */
  type: ActionItemType;
  /** 重要度（表示・色分け用） */
  severity: ActionItemSeverity;
  /** 導線先（例: /bookings） */
  link: string;
  reason?: string;
  booking_number: string;
  customer_name: string;
  start_time: string;
}

/** 直近の変更・キャンセル1件 */
export interface RecentChangeItem {
  id: number;
  booking_id: number;
  type: 'cancelled' | 'changed';
  booking_number: string;
  customer_name: string;
  updated_at: string;
  /** 予約日（表示強化用） */
  booking_date?: string;
}

/** API 1回取得で得る予約1件の最小形（BookingResource 相当） */
interface BookingRow {
  id: number;
  booking_number?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  updated_at?: string;
  customer?: { name: string };
  menu?: { name: string };
  resource?: { name: string };
}

/** 今日の日付 Y-m-d */
function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** 今日を含む前後3日（計7日間）の date_from / date_to */
function getDateRange(): { date_from: string; date_to: string } {
  const d = new Date();
  const from = new Date(d);
  from.setDate(from.getDate() - 3);
  const to = new Date(d);
  to.setDate(to.getDate() + 3);
  const fmt = (x: Date) =>
    x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  return { date_from: fmt(from), date_to: fmt(to) };
}

/** 時刻表示（HH:mm） */
function formatTime(s: string): string {
  if (!s) return '';
  const [h, m] = s.split(':');
  return `${h}:${m || '00'}`;
}

/** HH:mm を分（0〜24*60-1）に変換 */
function timeToMinutes(s: string): number {
  if (!s) return 0;
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * 今日の予約のうち「次の予約」を決定する。
 * 基準: 開始時刻が現在時刻以降のもののうち、最も早い1件。すべて過去なら null。
 * @param now 基準とする現在時刻（未指定時は new Date()。表示を定期更新する場合は呼び出し元で state を渡す）
 */
function getNextBookingId(bookings: TodayBookingItem[], now: Date = new Date()): number | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const future = bookings
    .filter((b) => timeToMinutes(b.start_time) >= nowMinutes)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  return future.length > 0 ? future[0].id : null;
}

/**
 * 今日の予約を表示用に並べ替える。次の予約（nextId）があれば先頭に持ってくる。
 */
function orderTodayBookingsWithNextFirst(
  bookings: TodayBookingItem[],
  nextId: number | null
): TodayBookingItem[] {
  if (bookings.length === 0 || nextId === null) {
    return [...bookings].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }
  const sorted = [...bookings].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const nextIndex = sorted.findIndex((b) => b.id === nextId);
  if (nextIndex <= 0) return sorted;
  const [nextItem] = sorted.splice(nextIndex, 1);
  return [nextItem, ...sorted];
}

/** API 取得データ → 今日の予約 */
function mapToTodayBookings(bookings: BookingRow[], today: string): TodayBookingItem[] {
  return bookings
    .filter((b) => b.booking_date === today)
    .map((b) => ({
      id: b.id,
      booking_number: b.booking_number,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      customer: b.customer ? { name: b.customer.name } : { name: '' },
      menu: b.menu ? { name: b.menu.name } : { name: '' },
      resource: b.resource ? { name: (b.resource as { name?: string }).name } : undefined,
    }));
}

/** 予約管理への導線（既存ルーティングに合わせる） */
const BOOKINGS_LINK = '/bookings';

/** 要対応: 仕様 5.5 の「本日予約が未確定のまま」。型を拡張し link/type/severity を付与。 */
function mapToActionItems(bookings: BookingRow[], today: string): ActionItem[] {
  return bookings
    .filter((b) => b.booking_date === today && b.status === 'pending')
    .map((b) => ({
      id: b.id,
      booking_id: b.id,
      type: 'pending_today' as const,
      severity: 'warning' as const,
      link: BOOKINGS_LINK,
      reason: '本日予約が未確定のまま',
      booking_number: b.booking_number || '',
      customer_name: b.customer?.name || '',
      start_time: b.start_time,
    }));
}

/** 直近の変更・キャンセル: status が cancelled。changed は DB にないため cancelled のみ */
function mapToRecentChanges(bookings: BookingRow[]): RecentChangeItem[] {
  return bookings
    .filter((b) => b.status === 'cancelled')
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      booking_id: b.id,
      type: 'cancelled' as const,
      booking_number: b.booking_number || '',
      customer_name: b.customer?.name || '',
      updated_at: b.updated_at || '',
      booking_date: b.booking_date,
    }));
}

/** 更新日時を YYYY-MM-DD HH:mm で表示 */
function formatUpdatedAt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

/** 相対表示（例: 3時間前）。24時間以内のみ。now を渡すと表示の定期更新に使える。 */
function formatRelativeShort(iso: string, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  return '';
}

/** ひとことメッセージの severity */
export type OneLineSeverity = 'success' | 'info' | 'warning' | 'error';

/**
 * ひとことメッセージを生成する。
 * 優先順位: 要対応あり → 今日0件 → 次の予約あり → それ以外
 */
function getOneLineMessage(
  todayBookings: TodayBookingItem[],
  actionItems: ActionItem[],
  nextBookingId: number | null
): { severity: OneLineSeverity; message: string } {
  if (actionItems.length > 0) {
    return {
      severity: 'warning',
      message: `今日は ${actionItems.length} 件、確認が必要です。`,
    };
  }
  if (todayBookings.length === 0) {
    return {
      severity: 'info',
      message: '今日は予約がありません。落ち着いて準備できそうです。',
    };
  }
  if (nextBookingId !== null) {
    const nextBooking = todayBookings.find((b) => b.id === nextBookingId);
    const timeStr = nextBooking ? formatTime(nextBooking.start_time) : '';
    return {
      severity: 'info',
      message: timeStr ? `次の予約は ${timeStr} です。` : '今日もよろしくお願いします。',
    };
  }
  return {
    severity: 'success',
    message: '今日もよろしくお願いします。',
  };
}

/**
 * ダッシュボードページ（必須3ブロック・API一元化）
 */
/** 現在時刻を HH:mm で表示（表示の定期更新用） */
function formatNowHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DashboardPage: React.FC = () => {
  const { setPageTitle } = useUIStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayBookings, setTodayBookings] = useState<TodayBookingItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentChanges, setRecentChanges] = useState<RecentChangeItem[]>([]);
  /** 表示用の現在時刻。1分ごとに更新し「次の予約」「○分前」を正しく反映する */
  const [now, setNow] = useState(() => new Date());

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const today = todayStr();
    const { date_from, date_to } = getDateRange();
    try {
      const response = await bookingApi.getList({
        date_from,
        date_to,
        per_page: 100,
      } as Parameters<typeof bookingApi.getList>[0]);
      const bookings = (response.bookings || []) as BookingRow[];
      setTodayBookings(mapToTodayBookings(bookings, today));
      setActionItems(mapToActionItems(bookings, today));
      setRecentChanges(mapToRecentChanges(bookings));
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '取得に失敗しました';
      setError(message);
      setTodayBookings([]);
      setActionItems([]);
      setRecentChanges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPageTitle('ダッシュボード');
  }, [setPageTitle]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /** 1分ごとに現在時刻を更新し、「次の予約」と相対時刻表示を反映する */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const nextBookingId = useMemo(() => getNextBookingId(todayBookings, now), [todayBookings, now]);
  const orderedTodayBookings = useMemo(
    () => orderTodayBookingsWithNextFirst(todayBookings, nextBookingId),
    [todayBookings, nextBookingId]
  );

  const oneLine = useMemo(
    () => getOneLineMessage(todayBookings, actionItems, nextBookingId),
    [todayBookings, actionItems, nextBookingId]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 1 }}>
      <PageHeader
        icon={<DashboardIcon />}
        title="ダッシュボード"
        description="今日の予約状況と、今すぐ確認すべき項目を一覧で確認できます。"
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              現在 {formatNowHHmm(now)}
            </Typography>
            <AppButton
              size="sm"
              variant="primary"
              onClick={() => navigate('/bookings', { state: { openCreate: true } })}
            >
              新規予約
            </AppButton>
          </Box>
        }
      />

      {!loading && !error && (
        <Alert severity={oneLine.severity} sx={{ mb: 2 }} variant="outlined">
          {oneLine.message}
        </Alert>
      )}

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardHeader title={<Skeleton width="60%" />} subheader={<Skeleton width={40} />} />
                <CardContent>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {/* ブロック1: 今日の予約タイムライン */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...modernCardSx }}>
              <CardHeader
                title="今日の予約"
                subheader={`${todayBookings.length}件`}
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              />
              <CardContent sx={{ flex: 1, pt: 0 }}>
                {orderedTodayBookings.length === 0 ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      本日の予約はありません。電話が来たら「新規予約」から登録できます。
                    </Typography>
                    <AppButton
                      size="sm"
                      variant="primary"
                      onClick={() => navigate('/bookings', { state: { openCreate: true } })}
                    >
                      新規予約
                    </AppButton>
                  </Box>
                ) : (
                  <List dense disablePadding>
                    {orderedTodayBookings.map((b) => {
                      const isNext = b.id === nextBookingId;
                      return (
                        <ListItem
                          key={b.id}
                          divider
                          sx={{
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            ...(isNext && {
                              bgcolor: 'action.selected',
                              borderRadius: 1,
                              borderLeft: 3,
                              borderColor: 'primary.main',
                            }),
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {isNext && (
                              <Chip label="次" size="small" color="primary" sx={{ flexShrink: 0 }} />
                            )}
                            <ListItemText
                              primary={`${formatTime(b.start_time)} - ${b.customer.name}`}
                              secondary={`${b.menu.name}${b.resource ? ` · ${(b.resource as { display_name?: string; name: string }).display_name || b.resource.name}` : ''}`}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: isNext ? 600 : 500,
                              }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1, gap: 1 }}>
                {orderedTodayBookings.length > 0 && (
                  <AppButton size="sm" variant="ghost" onClick={() => navigate('/bookings')}>
                    すべて表示
                  </AppButton>
                )}
              </CardActions>
            </Card>
          </Grid>

          {/* ブロック2: 要対応アクション */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...modernCardSx }}>
              <CardHeader
                title="要対応アクション"
                subheader={actionItems.length > 0 ? `${actionItems.length}件` : undefined}
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              />
              <CardContent sx={{ flex: 1, pt: 0 }}>
                {actionItems.length === 0 ? (
                  <Alert severity="success" variant="outlined" sx={{ py: 0 }}>
                    要対応はありません
                  </Alert>
                ) : (
                  <List dense disablePadding>
                    {actionItems.map((a) => (
                      <ListItem key={a.id} divider sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                          <Typography component="span" variant="body2" fontWeight={500}>
                            {a.customer_name}
                          </Typography>
                          {a.type === 'pending_today' && (
                            <Chip label="未確定" size="small" color="warning" variant="outlined" sx={{ flexShrink: 0 }} />
                          )}
                        </Box>
                        <ListItemText
                          secondary={a.reason || `${a.booking_number} · ${formatTime(a.start_time)}`}
                          secondaryTypographyProps={{ variant: 'caption' }}
                          sx={{ mt: 0 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
              {actionItems.length > 0 && (
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                  <AppButton size="sm" onClick={() => navigate(actionItems[0]?.link ?? BOOKINGS_LINK)}>
                    予約管理へ
                  </AppButton>
                </CardActions>
              )}
            </Card>
          </Grid>

          {/* ブロック3: 直近の変更・キャンセル */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...modernCardSx }}>
              <CardHeader
                title="直近の変更・キャンセル"
                subheader={`${recentChanges.length}件`}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent sx={{ flex: 1, pt: 0 }}>
                {recentChanges.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    直近の変更はありません。
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {recentChanges.map((r) => {
                      const updatedStr = formatUpdatedAt(r.updated_at);
                      const relativeStr = formatRelativeShort(r.updated_at, now);
                      const secondaryParts = [
                        updatedStr,
                        relativeStr ? `（${relativeStr}）` : '',
                        r.booking_date ? ` · 予約日 ${r.booking_date}` : '',
                      ].filter(Boolean);
                      return (
                        <ListItem key={r.id} divider sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
                            <Typography component="span" variant="body2" fontWeight={500}>
                              {r.customer_name}
                            </Typography>
                            <Chip
                              label={r.type === 'cancelled' ? 'キャンセル' : '変更'}
                              size="small"
                              color={r.type === 'cancelled' ? 'error' : 'default'}
                              variant="outlined"
                              sx={{ flexShrink: 0 }}
                            />
                          </Box>
                          <ListItemText
                            secondary={secondaryParts.join('')}
                            secondaryTypographyProps={{ variant: 'caption' }}
                            sx={{ mt: 0 }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </CardContent>
              {recentChanges.length > 0 && (
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>
                  <AppButton size="sm" onClick={() => navigate('/bookings')}>
                    予約一覧へ
                  </AppButton>
                </CardActions>
              )}
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default DashboardPage;
