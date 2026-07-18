/**
 * tugical 管理画面ログインページ（MUI モダンスタイル）
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from '../../../stores/uiStore';
import { AppButton } from '../../../components/admin';
import { isValidEmail } from '../../../index';
import type { LoginRequest } from '../../../types';
import { adminColors, brandCardSx, modernCardSx } from '../../../theme/adminTokens';

interface FormData {
  email: string;
  password: string;
  store_id: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  store_id?: string;
  general?: string;
}

const STORAGE_KEY = 'tugical_login_credentials';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, isAuthenticated } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    store_id: '1',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    try {
      const savedCredentials = localStorage.getItem(STORAGE_KEY);
      if (savedCredentials) {
        const { email, password, store_id, remember } = JSON.parse(savedCredentials);
        if (remember) {
          setFormData({
            email: email || '',
            password: password || '',
            store_id: store_id || '1',
          });
          setRememberMe(true);
        }
      }
    } catch (error) {
      console.warn('保存された認証情報の読み込みに失敗しました:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください';
    }

    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください';
    }

    if (!formData.store_id) {
      newErrors.store_id = '店舗IDを選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const loginData: LoginRequest = {
        email: formData.email,
        password: formData.password,
        store_id: parseInt(formData.store_id, 10),
      };

      await login(loginData);

      if (rememberMe) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            email: formData.email,
            password: formData.password,
            store_id: formData.store_id,
            remember: true,
          })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      toast.success('ログインしました', 'tugical管理画面へようこそ');
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'ログインに失敗しました';
      setErrors({ general: errorMessage });
      toast.error('ログインエラー', errorMessage);
    }
  };

  const handleInputChange =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value as string }));
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    };

  const fillTestCredentials = () => {
    setFormData({
      email: 'owner@tugical.test',
      password: 'password123',
      store_id: '1',
    });
    setErrors({});
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: adminColors.canvas,
        py: 6,
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Stack spacing={3} alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              px: 3,
              py: 2.5,
              borderRadius: 2.5,
              textAlign: 'center',
              width: '100%',
              ...brandCardSx,
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: adminColors.primary }}
            >
              tugical
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              次の時間が、もっと自由になる。
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              管理画面ログイン
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              アカウント情報を入力してログインしてください
            </Typography>
          </Box>
        </Stack>

        <Paper elevation={0} sx={{ p: 3, ...modernCardSx }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {errors.general && (
                <Alert severity="error" onClose={() => setErrors(prev => ({ ...prev, general: undefined }))}>
                  {errors.general}
                </Alert>
              )}

              <FormControl fullWidth error={Boolean(errors.store_id)}>
                <InputLabel id="store-label">店舗</InputLabel>
                <Select
                  labelId="store-label"
                  id="store_id"
                  value={formData.store_id}
                  label="店舗"
                  onChange={handleInputChange('store_id')}
                >
                  <MenuItem value="">店舗を選択してください</MenuItem>
                  <MenuItem value="1">tugical テスト店舗</MenuItem>
                </Select>
                {errors.store_id && <FormHelperText>{errors.store_id}</FormHelperText>}
              </FormControl>

              <TextField
                id="email"
                label="メールアドレス"
                type="email"
                autoComplete="email"
                required
                fullWidth
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="admin@tugical.test"
                error={Boolean(errors.email)}
                helperText={errors.email}
              />

              <TextField
                id="password"
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                fullWidth
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="パスワードを入力"
                error={Boolean(errors.password)}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                        onClick={() => setShowPassword(v => !v)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    color="primary"
                  />
                }
                label="ログイン情報を保存する"
              />

              <AppButton type="submit" variant="primary" fullWidth size="lg" loading={isLoading} disabled={isLoading}>
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </AppButton>
            </Stack>
          </form>
        </Paper>

        {/* ローカル／開発のみ表示（本番ドメインでは出さない） */}
        {(import.meta.env.DEV ||
          ['localhost', '127.0.0.1'].includes(window.location.hostname)) && (
          <Alert
            severity="info"
            sx={{ mt: 2.5, borderRadius: 2.5 }}
            action={
              <Button size="small" variant="outlined" onClick={fillTestCredentials}>
                入力
              </Button>
            }
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              テスト用ログイン情報
            </Typography>
            <Typography variant="body2">
              オーナー: owner@tugical.test / password123
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              ※ ローカル環境のみ表示
            </Typography>
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default LoginPage;
