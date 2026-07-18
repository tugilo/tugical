/**
 * 予約詳細モーダル（閲覧・変更・キャンセル）
 * 電話対応中でも詳細確認と最低限の変更ができるようにする
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import Modal from '../modal/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Button from '../ui/Button';
import { bookingApi, resourceApi } from '../../../services/api';
import type { Booking, Resource } from '../../../types';

interface BookingDetailModalProps {
  isOpen: boolean;
  bookingId: number | null;
  onClose: () => void;
  /** 更新・キャンセル後に一覧を再取得させる */
  onChanged: () => void;
}

const STATUS_OPTIONS: { value: Booking['status']; label: string }[] = [
  { value: 'pending', label: '申込み中' },
  { value: 'confirmed', label: '確定' },
  { value: 'completed', label: '完了' },
  { value: 'cancelled', label: 'キャンセル' },
  { value: 'no_show', label: '無断キャンセル' },
];

const statusLabel = (status: string): string =>
  STATUS_OPTIONS.find(s => s.value === status)?.label ?? status;

const formatTime = (value?: string): string => {
  if (!value) return '--:--';
  return value.substring(0, 5);
};

/** メニュー表示名（単一 / 複数 / 詳細 service_name 対応） */
const getMenuLabel = (booking: Booking): string => {
  if (booking.details && booking.details.length > 0) {
    return booking.details
      .map(d => {
        const anyDetail = d as Booking['details'] extends (infer U)[] | undefined
          ? U & { service_name?: string; total_duration?: number }
          : never;
        return (
          anyDetail?.service_name ||
          d.menu?.display_name ||
          d.menu?.name ||
          'メニュー'
        );
      })
      .join(' + ');
  }
  if (booking.menu) {
    return booking.menu.display_name || booking.menu.name;
  }
  return 'メニュー情報なし（詳細で確認）';
};

const getResourceLabel = (booking: Booking): string => {
  if (booking.resource) {
    return booking.resource.display_name || booking.resource.name;
  }
  return '担当なし';
};

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  isOpen,
  bookingId,
  onClose,
  onChanged,
}) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [form, setForm] = useState({
    booking_date: '',
    start_time: '',
    resource_id: '' as string | number,
    status: 'confirmed' as Booking['status'],
    staff_notes: '',
  });

  useEffect(() => {
    if (!isOpen || !bookingId) {
      setBooking(null);
      setIsEditing(false);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [detail, resourceRes] = await Promise.all([
          bookingApi.getById(bookingId),
          resourceApi.getList({ per_page: 100, is_active: true }),
        ]);
        if (cancelled) return;
        setBooking(detail);
        setResources(resourceRes.resources ?? []);
        setForm({
          booking_date: detail.booking_date?.substring(0, 10) || '',
          start_time: formatTime(detail.start_time),
          resource_id: detail.resource?.id ?? detail.resource_id ?? '',
          status: detail.status,
          staff_notes: detail.staff_notes || '',
        });
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '予約詳細の取得に失敗しました');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, bookingId]);

  const handleSave = async () => {
    if (!booking) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await bookingApi.update(booking.id, {
        booking_date: form.booking_date,
        start_time: form.start_time,
        resource_id:
          form.resource_id === '' || form.resource_id === null
            ? null
            : Number(form.resource_id),
        status: form.status,
        staff_notes: form.staff_notes,
      } as Parameters<typeof bookingApi.update>[1]);
      setBooking(updated);
      setIsEditing(false);
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '予約の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setSaving(true);
    setError(null);
    try {
      await bookingApi.delete(booking.id, cancelReason || undefined);
      setShowCancelConfirm(false);
      onChanged();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '予約のキャンセルに失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const isCancelled = booking?.status === 'cancelled';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="予約詳細"
        size="lg"
        footer={
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
            {!isEditing && !isCancelled && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} disabled={loading || saving}>
                  変更する
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={loading || saving}
                >
                  キャンセル
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    if (booking) {
                      setForm({
                        booking_date: booking.booking_date?.substring(0, 10) || '',
                        start_time: formatTime(booking.start_time),
                        resource_id: booking.resource?.id ?? booking.resource_id ?? '',
                        status: booking.status,
                        staff_notes: booking.staff_notes || '',
                      });
                    }
                  }}
                  disabled={saving}
                >
                  編集をやめる
                </Button>
                <Button variant="primary" onClick={handleSave} loading={saving} disabled={saving}>
                  保存
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              閉じる
            </Button>
          </Box>
        }
      >
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!loading && booking && (
          <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {booking.customer?.name || '顧客情報なし'}
              </Typography>
              <Chip size="small" label={statusLabel(booking.status)} color="primary" variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                {booking.booking_number}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {getMenuLabel(booking)}
              {' · '}
              ¥{(booking.total_price ?? booking.base_total_price ?? 0).toLocaleString()}
            </Typography>

            {isEditing ? (
              <Stack spacing={2}>
                <TextField
                  label="予約日"
                  type="date"
                  value={form.booking_date}
                  onChange={e => setForm(f => ({ ...f, booking_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="開始時間"
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel id="resource-label">担当（スタッフ・設備）</InputLabel>
                  <Select
                    labelId="resource-label"
                    label="担当（スタッフ・設備）"
                    value={form.resource_id === '' ? '' : String(form.resource_id)}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        resource_id: e.target.value === '' ? '' : Number(e.target.value),
                      }))
                    }
                  >
                    <MenuItem value="">担当なし</MenuItem>
                    {resources.map(r => (
                      <MenuItem key={r.id} value={String(r.id)}>
                        {r.display_name || r.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="status-label">ステータス</InputLabel>
                  <Select
                    labelId="status-label"
                    label="ステータス"
                    value={form.status}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        status: e.target.value as Booking['status'],
                      }))
                    }
                  >
                    {STATUS_OPTIONS.filter(s => s.value !== 'cancelled').map(s => (
                      <MenuItem key={s.value} value={s.value}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="スタッフメモ"
                  multiline
                  minRows={2}
                  value={form.staff_notes}
                  onChange={e => setForm(f => ({ ...f, staff_notes: e.target.value }))}
                  fullWidth
                />
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                <Typography variant="body2">
                  <strong>日時:</strong> {booking.booking_date?.substring(0, 10)}{' '}
                  {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                </Typography>
                <Typography variant="body2">
                  <strong>担当:</strong> {getResourceLabel(booking)}
                </Typography>
                {booking.customer?.phone && (
                  <Typography variant="body2">
                    <strong>電話:</strong> {booking.customer.phone}
                  </Typography>
                )}
                {booking.customer_notes && (
                  <Typography variant="body2">
                    <strong>顧客メモ:</strong> {booking.customer_notes}
                  </Typography>
                )}
                {booking.staff_notes && (
                  <Typography variant="body2">
                    <strong>スタッフメモ:</strong> {booking.staff_notes}
                  </Typography>
                )}
                {booking.details && booking.details.length > 0 && (
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                      メニュー内訳
                    </Typography>
                    {booking.details.map(d => {
                      const anyDetail = d as typeof d & {
                        service_name?: string;
                        total_duration?: number;
                        base_price?: number;
                      };
                      return (
                        <Typography key={d.id} variant="caption" display="block" color="text.secondary">
                          · {anyDetail.service_name || d.menu?.name}
                          {anyDetail.total_duration
                            ? `（${anyDetail.total_duration}分）`
                            : d.duration_minutes
                              ? `（${d.duration_minutes}分）`
                              : ''}
                        </Typography>
                      );
                    })}
                  </Box>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setCancelReason('');
        }}
        onConfirm={handleCancel}
        title="予約をキャンセルしますか？"
        message="キャンセルすると顧客への通知が送られる場合があります。この操作は一覧上で取り消せません。"
        confirmText="キャンセルする"
        cancelText="戻る"
        isDanger
        isLoading={saving}
      />
    </>
  );
};

export default BookingDetailModal;
