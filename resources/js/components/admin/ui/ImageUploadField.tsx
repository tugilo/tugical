import React, { useCallback, useRef, useState } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface ImageUploadFieldProps {
  /** 保存済み画像URL */
  value?: string | null;
  /** 変更時（削除は null） */
  onChange: (url: string | null) => void;
  /** アップロード処理（URL を返す） */
  onUpload: (file: File) => Promise<string>;
  /** ラベル */
  label?: string;
  /** 補足 */
  hint?: string;
  /** エラー */
  error?: string;
  /** 無効化 */
  disabled?: boolean;
}

/**
 * 画像1枚の選択・DnD・プレビュー・アップロード
 */
const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  onUpload,
  label = '画像',
  hint = '任意・1枚',
  error,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
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
        const url = await onUpload(file);
        onChange(url);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : '画像のアップロードに失敗しました';
        setLocalError(message);
      } finally {
        setUploading(false);
      }
    },
    [onChange, onUpload]
  );

  const handlePick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleRemove = () => {
    if (disabled || uploading) return;
    onChange(null);
    setLocalError(null);
  };

  const displayError = error || localError;
  const dropClass = dragging
    ? 'border-emerald-500 bg-emerald-50'
    : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/40';

  return (
    <div>
      <label className='block text-sm font-medium text-gray-700 mb-2'>
        {label}
        {hint && (
          <span className='ml-2 text-xs font-normal text-gray-500'>
            （{hint}）
          </span>
        )}
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
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-1 ${
              dragging ? 'border-emerald-500 bg-emerald-50' : 'border-transparent'
            }`}
          >
            <img
              src={value}
              alt='画像プレビュー'
              className='h-28 w-28 rounded-lg object-cover border border-gray-200 bg-gray-50'
            />
          </div>
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
            {uploading ? 'アップロード中...' : '差し替える（クリックまたはドロップ）'}
          </button>
        </div>
      ) : (
        <button
          type='button'
          onClick={handlePick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={disabled || uploading}
          className={`flex flex-col items-center justify-center w-full max-w-xs min-h-[120px] rounded-lg border-2 border-dashed px-4 py-6 text-gray-600 disabled:opacity-50 ${dropClass}`}
        >
          <PhotoIcon className='w-8 h-8 mb-2 text-gray-400' />
          <span className='text-sm font-medium'>
            {uploading
              ? 'アップロード中...'
              : dragging
                ? 'ここにドロップ'
                : 'ドラッグ＆ドロップ、またはクリック'}
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

export default ImageUploadField;
