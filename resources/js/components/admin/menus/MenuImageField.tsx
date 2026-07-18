import React, { useRef, useState } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { menuApi } from '../../../services/api';

interface MenuImageFieldProps {
  /** 保存済み画像URL（/storage/... または絶対URL） */
  value?: string | null;
  /** 変更時コールバック（削除時は null） */
  onChange: (url: string | null) => void;
  /** エラーメッセージ */
  error?: string;
  /** 無効化 */
  disabled?: boolean;
}

/**
 * メニューメイン画像（1枚）の選択・プレビュー・アップロード
 * LIFF は1枚表示のため、ギャラリーは扱わない
 */
const MenuImageField: React.FC<MenuImageFieldProps> = ({
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('画像ファイルを選択してください');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('画像は5MB以下にしてください');
      return;
    }

    try {
      setUploading(true);
      setLocalError(null);
      const url = await menuApi.uploadImage(file);
      onChange(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '画像のアップロードに失敗しました';
      setLocalError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (disabled || uploading) return;
    onChange(null);
    setLocalError(null);
  };

  const displayError = error || localError;

  return (
    <div>
      <label className='block text-sm font-medium text-gray-700 mb-2'>
        メニュー画像
        <span className='ml-2 text-xs font-normal text-gray-500'>
          （任意・1枚 / LIFF予約画面に表示）
        </span>
      </label>

      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp'
        className='hidden'
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {value ? (
        <div className='relative inline-block'>
          <img
            src={value}
            alt='メニュー画像プレビュー'
            className='h-28 w-28 rounded-lg object-cover border border-gray-200 bg-gray-50'
          />
          <button
            type='button'
            onClick={handleRemove}
            disabled={disabled || uploading}
            className='absolute -top-2 -right-2 min-h-[32px] min-w-[32px] rounded-full bg-white border border-gray-300 shadow flex items-center justify-center text-gray-600 hover:text-red-600'
            aria-label='画像を削除'
          >
            <XMarkIcon className='w-4 h-4' />
          </button>
          <button
            type='button'
            onClick={handlePick}
            disabled={disabled || uploading}
            className='mt-2 block text-sm text-emerald-700 hover:underline min-h-[44px]'
          >
            {uploading ? 'アップロード中...' : '差し替える'}
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={handlePick}
          disabled={disabled || uploading}
          className='flex flex-col items-center justify-center w-full max-w-xs min-h-[120px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/40 px-4 py-6 text-gray-600 disabled:opacity-50'
        >
          <PhotoIcon className='w-8 h-8 mb-2 text-gray-400' />
          <span className='text-sm font-medium'>
            {uploading ? 'アップロード中...' : '画像を選ぶ'}
          </span>
          <span className='text-xs text-gray-500 mt-1'>
            jpeg / png / webp・5MBまで
          </span>
        </button>
      )}

      {displayError && (
        <p className='text-sm text-red-600 mt-1'>{displayError}</p>
      )}
    </div>
  );
};

export default MenuImageField;
