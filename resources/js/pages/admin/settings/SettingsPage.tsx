/**
 * tugical 管理画面 設定ページ（LINE 連携含む）
 * 初めての方でも上から順に進められるウィザード形式
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  CopyableField,
  PageHeader,
  SetupStepCard,
} from '../../../components/admin';
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

interface ConnectionCheckResult {
  ok: boolean;
  message: string;
  skipped?: boolean;
  bot_display_name?: string | null;
  bot_basic_id?: string | null;
}

interface ConnectionTestResults {
  channel_credentials: ConnectionCheckResult;
  access_token: ConnectionCheckResult;
}

const SettingsPage: React.FC = () => {
  const { setPageTitle, addNotification } = useUIStore();
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
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResults, setConnectionResults] = useState<ConnectionTestResults | null>(null);
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

  const integrationBadge = useMemo(() => {
    const hasId = Boolean(form.line_channel_id);
    const hasSecret = form.line_channel_secret_set || Boolean(form.line_channel_secret);
    const hasToken = form.line_access_token_set || Boolean(form.line_access_token);

    if (form.line_integration_active && hasId && hasSecret && hasToken) {
      return { label: 'LINE 連携：有効', color: 'success' as const };
    }
    if (hasId || hasSecret || hasToken) {
      return { label: 'LINE 連携：設定途中', color: 'warning' as const };
    }
    return { label: 'LINE 連携：未設定', color: 'default' as const };
  }, [form]);

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
      addNotification({ type: 'success', title: '保存完了', message: 'LINE 連携設定を保存しました' });
    } catch (e: any) {
      setError(e.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const buildConnectionPayload = () => {
    const payload: {
      line_channel_id?: string;
      line_channel_secret?: string;
      line_access_token?: string;
    } = {};
    if (form.line_channel_id) payload.line_channel_id = form.line_channel_id;
    if (form.line_channel_secret) payload.line_channel_secret = form.line_channel_secret;
    if (form.line_access_token) payload.line_access_token = form.line_access_token;
    return payload;
  };

  const canTestConnection =
    Boolean(form.line_channel_id) &&
    (Boolean(form.line_channel_secret) || form.line_channel_secret_set) &&
    (Boolean(form.line_access_token) || form.line_access_token_set);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setError(null);
    setMessage(null);
    setConnectionResults(null);
    try {
      const data = await apiClient.testLineConnection(buildConnectionPayload());
      setConnectionResults(data.checks);
      setMessage('認証情報の疎通確認に成功しました');
    } catch (e: any) {
      if (e.checks) setConnectionResults(e.checks);
      setError(e.message || '認証情報の疎通確認に失敗しました');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestPush = async () => {
    setError(null);
    setMessage(null);
    try {
      await apiClient.testLinePush(testLineUserId);
      setMessage('テスト Push を送信しました');
      addNotification({ type: 'success', title: 'Push 送信', message: 'テストメッセージを送信しました' });
    } catch (e: any) {
      setError(e.message || 'テスト Push に失敗しました');
    }
  };

  const renderCheckIcon = (check: ConnectionCheckResult) => {
    if (check.skipped) return <HelpOutlineIcon color="disabled" />;
    return check.ok ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress aria-label="設定を読み込み中" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
      <PageHeader
        icon={<SettingsIcon />}
        title="設定"
        description="LINE 連携の初期設定は、下の 1 → 4 の順番で進めてください。各項目の説明に沿えば、専門知識がなくても設定できます。"
        badge={integrationBadge}
      />

      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Alert severity="info" variant="outlined">
        <Typography variant="body2" component="div">
          <strong>はじめての方へ</strong>
          <Box component="ol" sx={{ m: 0, mt: 1, pl: 2.5 }}>
            <li>LINE Developers コンソールで Messaging API チャネルを用意する</li>
            <li>ステップ 1 の値を入力して「保存」</li>
            <li>ステップ 2 の URL を LINE Developers に貼り付ける</li>
            <li>ステップ 3 で「認証情報を確認」が成功すれば完了</li>
          </Box>
        </Typography>
      </Alert>

      <SetupStepCard
        step={1}
        title="LINE Developers の値を入力"
        description="チャネル基本設定と Messaging API 設定から、次の 4 項目をコピーして貼り付けます。"
      >
        <Stack spacing={2}>
          <TextField
            label="Channel ID（チャネル ID）"
            value={form.line_channel_id}
            onChange={e => setForm(prev => ({ ...prev, line_channel_id: e.target.value }))}
            helperText="LINE Developers → 対象チャネル → 基本設定"
            fullWidth
          />
          <TextField
            label="Channel Secret（チャネルシークレット）"
            type="password"
            placeholder={form.line_channel_secret_set ? '（設定済み・変更時のみ入力）' : ''}
            value={form.line_channel_secret}
            onChange={e => setForm(prev => ({ ...prev, line_channel_secret: e.target.value }))}
            helperText="基本設定の「Channel secret」。再発行した場合は新しい値を入力"
            fullWidth
          />
          <TextField
            label="Channel Access Token（長期トークン）"
            type="password"
            placeholder={form.line_access_token_set ? '（設定済み・変更時のみ入力）' : ''}
            value={form.line_access_token}
            onChange={e => setForm(prev => ({ ...prev, line_access_token: e.target.value }))}
            helperText="Messaging API 設定で発行した Channel access token（長期）"
            fullWidth
          />
          <TextField
            label="LIFF ID"
            value={form.line_liff_id}
            onChange={e => setForm(prev => ({ ...prev, line_liff_id: e.target.value }))}
            helperText="LIFF アプリを作成した場合の LIFF ID（予約画面用）"
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
            label="LINE 連携を有効にする（通知・LIFF 予約を使う場合はオン）"
          />
        </Stack>
      </SetupStepCard>

      <SetupStepCard
        step={2}
        title="LINE Developers に URL を貼り付ける"
        description="下の URL をコピーし、LINE Developers の該当欄に貼り付けてください。"
      >
        <Stack spacing={2}>
          <CopyableField
            label="Webhook URL"
            value={form.webhook_url}
            helperText="Messaging API 設定 → Webhook URL に貼り付け →「Webhook の利用」をオン"
          />
          <CopyableField
            label="LIFF エンドポイント URL"
            value={form.liff_url}
            helperText="LIFF アプリのエンドポイント URL に貼り付け（LIFF ID 保存後に表示されます）"
          />
        </Stack>
      </SetupStepCard>

      <SetupStepCard
        step={3}
        title="保存して疎通を確認"
        description="入力内容を保存し、LINE 側で Secret と Token が正しいか確認します。"
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '設定を保存'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={testingConnection || !canTestConnection}
            >
              {testingConnection ? '確認中...' : '認証情報を確認'}
            </Button>
          </Stack>
          {!canTestConnection && (
            <Typography variant="body2" color="text.secondary">
              確認するには Channel ID・Secret・Access Token を入力してください（Secret / Token は以前保存済みでも可）。
            </Typography>
          )}
          {connectionResults && (
            <List dense disablePadding sx={{ bgcolor: 'action.hover', borderRadius: 2, px: 1 }}>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {renderCheckIcon(connectionResults.channel_credentials)}
                </ListItemIcon>
                <ListItemText
                  primary="Channel ID / Secret"
                  secondary={connectionResults.channel_credentials.message}
                />
              </ListItem>
              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {renderCheckIcon(connectionResults.access_token)}
                </ListItemIcon>
                <ListItemText
                  primary="Channel Access Token"
                  secondary={
                    connectionResults.access_token.bot_display_name
                      ? `${connectionResults.access_token.message}（Bot: ${connectionResults.access_token.bot_display_name}）`
                      : connectionResults.access_token.message
                  }
                />
              </ListItem>
            </List>
          )}
        </Stack>
      </SetupStepCard>

      <SetupStepCard
        step={4}
        title="Push 送信テスト（任意）"
        description="友だち追加済みの LINE アカウントに、実際にテストメッセージを送って最終確認できます。"
      >
        <Stack spacing={2}>
          <TextField
            label="テスト送信先 LINE User ID"
            value={testLineUserId}
            onChange={e => setTestLineUserId(e.target.value)}
            helperText="LINE Developers の「Your user ID」または、友だち追加したユーザーの ID"
            fullWidth
          />
          <Button variant="outlined" onClick={handleTestPush} disabled={!testLineUserId}>
            テスト Push を送信
          </Button>
        </Stack>
      </SetupStepCard>
    </Box>
  );
};

export default SettingsPage;
