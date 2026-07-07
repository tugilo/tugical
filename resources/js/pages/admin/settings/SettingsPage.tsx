/**
 * tugical 管理画面 設定ページ（LINE 連携含む）
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useUIStore } from '../../../stores/uiStore';
import { apiClient } from '../../../services/api';

interface LineSettingsForm {
  line_channel_id: string;
  line_channel_secret: string;
  line_access_token: string;
  line_liff_id: string;
  line_integration_active: boolean;
  webhook_url: string;
  liff_url: string;
  line_channel_secret_set: boolean;
  line_access_token_set: boolean;
}

const SettingsPage: React.FC = () => {
  const { setPageTitle } = useUIStore();
  const [form, setForm] = useState<LineSettingsForm>({
    line_channel_id: '',
    line_channel_secret: '',
    line_access_token: '',
    line_liff_id: '',
    line_integration_active: false,
    webhook_url: '',
    liff_url: '',
    line_channel_secret_set: false,
    line_access_token_set: false,
  });
  const [testLineUserId, setTestLineUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageTitle('設定');
  }, [setPageTitle]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.getLineSettings();
        setForm(prev => ({
          ...prev,
          line_channel_id: data.line_channel_id || '',
          line_liff_id: data.line_liff_id || '',
          line_integration_active: data.line_integration_active,
          webhook_url: data.webhook_url,
          liff_url: data.liff_url || '',
          line_channel_secret_set: data.line_channel_secret_set,
          line_access_token_set: data.line_access_token_set,
        }));
      } catch (e: any) {
        setError(e.message || '設定の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        line_channel_id: form.line_channel_id || null,
        line_liff_id: form.line_liff_id || null,
        line_integration_active: form.line_integration_active,
      };
      if (form.line_channel_secret) {
        payload.line_channel_secret = form.line_channel_secret;
      }
      if (form.line_access_token) {
        payload.line_access_token = form.line_access_token;
      }
      const data = await apiClient.updateLineSettings(payload as any);
      setForm(prev => ({
        ...prev,
        line_channel_secret: '',
        line_access_token: '',
        line_channel_secret_set: data.line_channel_secret_set,
        line_access_token_set: data.line_access_token_set,
        webhook_url: data.webhook_url,
        liff_url: data.liff_url || '',
      }));
      setMessage('LINE 連携設定を保存しました');
    } catch (e: any) {
      setError(e.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    setError(null);
    setMessage(null);
    try {
      await apiClient.testLinePush(testLineUserId);
      setMessage('テスト Push を送信しました');
    } catch (e: any) {
      setError(e.message || 'テスト Push に失敗しました');
    }
  };

  if (loading) {
    return <Typography color="text.secondary">読み込み中...</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" component="h1">
        設定
      </Typography>

      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Box component="section" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          LINE 連携
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 640 }}>
          <TextField
            label="Channel ID"
            value={form.line_channel_id}
            onChange={e => setForm(prev => ({ ...prev, line_channel_id: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Channel Secret"
            type="password"
            placeholder={form.line_channel_secret_set ? '（設定済み・変更時のみ入力）' : ''}
            value={form.line_channel_secret}
            onChange={e => setForm(prev => ({ ...prev, line_channel_secret: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Channel Access Token"
            type="password"
            placeholder={form.line_access_token_set ? '（設定済み・変更時のみ入力）' : ''}
            value={form.line_access_token}
            onChange={e => setForm(prev => ({ ...prev, line_access_token: e.target.value }))}
            fullWidth
          />
          <TextField
            label="LIFF ID"
            value={form.line_liff_id}
            onChange={e => setForm(prev => ({ ...prev, line_liff_id: e.target.value }))}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.line_integration_active}
                onChange={e =>
                  setForm(prev => ({ ...prev, line_integration_active: e.target.checked }))
                }
              />
            }
            label="LINE 連携を有効にする"
          />
          <TextField label="Webhook URL（コピー用）" value={form.webhook_url} fullWidth InputProps={{ readOnly: true }} />
          <TextField label="LIFF URL（コピー用）" value={form.liff_url} fullWidth InputProps={{ readOnly: true }} />
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              保存
            </Button>
          </Stack>
          <TextField
            label="テスト Push 送信先 LINE User ID"
            value={testLineUserId}
            onChange={e => setTestLineUserId(e.target.value)}
            fullWidth
          />
          <Button variant="outlined" onClick={handleTestPush} disabled={!testLineUserId}>
            接続テスト（Push）
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default SettingsPage;
