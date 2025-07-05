/**
 * tugical Admin Dashboard ログインページ
 *
 * 機能:
 * - メール・パスワード・店舗ID認証
 * - フォームバリデーション
 * - エラーハンドリング
 * - ローディング状態
 * - レスポンシブデザイン
 *
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/uiStore';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { cn, isValidEmail } from '../../utils';
import type { LoginRequest } from '../../types';

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

// ローカルストレージのキー
const STORAGE_KEY = 'tugical_login_credentials';

/**
 * ログインページコンポーネント
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, isAuthenticated } = useAuthStore();

  // フォーム状態
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    store_id: '1', // デフォルト店舗ID
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 保存された認証情報を読み込み
  useEffect(() => {
    try {
      const savedCredentials = localStorage.getItem(STORAGE_KEY);
      if (savedCredentials) {
        const { email, password, store_id, remember } =
          JSON.parse(savedCredentials);
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

  // 認証済みの場合はリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  /**
   * フォームバリデーション
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // メールアドレス検証
    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください';
    }

    // パスワード検証
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上で入力してください';
    }

    // 店舗ID検証
    if (!formData.store_id) {
      newErrors.store_id = '店舗IDを選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const loginData: LoginRequest = {
        email: formData.email,
        password: formData.password,
        store_id: parseInt(formData.store_id),
      };

      console.log('送信するログインデータ:', loginData);
      await login(loginData);

      // 認証情報の保存/削除
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

      // リダイレクト
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('ログインエラー:', error);

      // エラーメッセージの表示
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        'ログインに失敗しました';

      setErrors({ general: errorMessage });
      toast.error('ログインエラー', errorMessage);
    }
  };

  /**
   * 入力値変更ハンドラー
   */
  const handleInputChange =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value,
      }));

      // エラーをクリア
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  return (
    <div className='min-h-screen bg-gradient-tugical flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <motion.div
        className='max-w-md w-full space-y-8'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダー */}
        <div className='text-center'>
          <motion.div
            className='mx-auto h-12 w-auto'
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <h1 className='text-4xl font-bold text-primary-600'>tugical</h1>
            <p className='text-sm text-gray-600 mt-1'>
              次の時間が、もっと自由になる。
            </p>
          </motion.div>
          <h2 className='mt-6 text-3xl font-bold text-gray-900'>
            管理画面ログイン
          </h2>
          <p className='mt-2 text-sm text-gray-600'>
            アカウント情報を入力してログインしてください
          </p>
        </div>

        {/* ログインフォーム */}
        <Card className='mt-8'>
          <Card.Body>
            <form className='space-y-6' onSubmit={handleSubmit}>
              {/* 全般エラー */}
              {errors.general && (
                <motion.div
                  className='bg-red-50 border border-red-200 rounded-md p-4'
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className='flex'>
                    <div className='text-sm text-red-600'>{errors.general}</div>
                  </div>
                </motion.div>
              )}

              {/* 店舗ID選択 */}
              <div>
                <label
                  htmlFor='store_id'
                  className='block text-sm font-medium text-gray-700'
                >
                  店舗
                </label>
                <div className='mt-1'>
                  <select
                    id='store_id'
                    name='store_id'
                    value={formData.store_id}
                    onChange={handleInputChange('store_id')}
                    className={cn(
                      'form-select',
                      errors.store_id &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                  >
                    <option value=''>店舗を選択してください</option>
                    <option value='1'>tugical テスト店舗</option>
                  </select>
                </div>
                {errors.store_id && (
                  <p className='mt-2 text-sm text-red-600'>{errors.store_id}</p>
                )}
              </div>

              {/* メールアドレス */}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-gray-700'
                >
                  メールアドレス
                </label>
                <div className='mt-1'>
                  <input
                    id='email'
                    name='email'
                    type='email'
                    autoComplete='email'
                    required
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className={cn(
                      'form-input',
                      errors.email &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder='admin@tugical.test'
                  />
                </div>
                {errors.email && (
                  <p className='mt-2 text-sm text-red-600'>{errors.email}</p>
                )}
              </div>

              {/* パスワード */}
              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700'
                >
                  パスワード
                </label>
                <div className='mt-1 relative'>
                  <input
                    id='password'
                    name='password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='current-password'
                    required
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    className={cn(
                      'form-input pr-10',
                      errors.password &&
                        'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                    placeholder='パスワードを入力'
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className='h-5 w-5 text-gray-400' />
                    ) : (
                      <EyeIcon className='h-5 w-5 text-gray-400' />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className='mt-2 text-sm text-red-600'>{errors.password}</p>
                )}
              </div>

              {/* ログイン情報を保存 */}
              <div className='flex items-center'>
                <input
                  id='remember-me'
                  name='remember-me'
                  type='checkbox'
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className='h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded'
                />
                <label
                  htmlFor='remember-me'
                  className='ml-2 block text-sm text-gray-700'
                >
                  ログイン情報を保存する
                </label>
              </div>

              {/* ログインボタン */}
              <div>
                <Button
                  type='submit'
                  variant='primary'
                  size='lg'
                  fullWidth
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'ログイン中...' : 'ログイン'}
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>

        {/* テスト用ログイン情報 */}
        <motion.div
          className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className='text-sm font-medium text-blue-800 mb-2'>
            テスト用ログイン情報
          </h3>
          <div className='text-xs text-blue-700 space-y-1'>
            <div className='flex items-center justify-between'>
              <span>
                <strong>オーナー:</strong> owner@tugical.test / password
              </span>
              <button
                type='button'
                onClick={() => {
                  setFormData({
                    email: 'owner@tugical.test',
                    password: 'password',
                    store_id: '1',
                  });
                  setErrors({});
                }}
                className='ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
              >
                入力
              </button>
            </div>
            <div className='text-xs text-blue-600 mt-2'>
              ※ 現在利用可能な認証情報は上記のみです
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
