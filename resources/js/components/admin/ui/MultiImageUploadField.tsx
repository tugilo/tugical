import React, { useCallback, useRef, useState } from 'react';
import { PhotoIcon, StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

export interface EntityImageItem {
  id?: number;
  url: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface MultiImageUploadFieldProps {
  /** 画像一覧 */
  value: EntityImageItem[];
  /** 変更時 */
  onChange: (images: EntityImageItem[]) => void;
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
  /** 最大枚数 */
  max?: number;
}

/**
 * 画像複数枚の選択・DnD・プレビュー・メイン指定
 */
const MultiImageUploadField: React.FC<MultiImageUploadFieldProps> = ({
  value,
  onChange,
  onUpload,
  label = '画像',
  hint = '任意・最大10枚 / ドラッグ＆ドロップ可',
  error,
  disabled = false,
  max = 10,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const normalizePrimary = (images: EntityImageItem[]): EntityImageItem[] => {
    if (images.length === 0) return [];
    const hasPrimary = images.some(img => img.is_primary);
    if (hasPrimary) {
      let seen = false;
      return images.map(img => {
        if (img.is_primary && !seen) {
          seen = true;
          return { ...img, is_primary: true };
        }
        return { ...img, is_primary: false };
      });
    }
    return images.map((img, index) => ({
      ...img,
      is_primary: index === 0,
    }));
  };

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      const remaining = max - value.length;
      if (remaining <= 0) {
        setLocalError(`画像は最大${max}枚までです`);
        return;
      }

      const targets = list.slice(0, remaining);
      if (list.length > remaining) {
        setLocalError(`最大${max}枚までのため、先頭${remaining}枚のみ追加します`);
      } else {
        setLocalError(null);
      }

      try {
        setUploading(true);
        const uploaded: EntityImageItem[] = [];
        for (const file of targets) {
          if (!file.type.startsWith('image/')) {
            setLocalError('画像ファイルを選択してください');
            continue;
          }
          if (file.size > 5 * 1024 * 1024) {
            setLocalError('画像は5MB以下にしてください');
            continue;
          }
          const url = await onUpload(file);
          uploaded.push({
            url,
            is_primary: false,
          });
        }

        if (uploaded.length === 0) return;

        const next = normalizePrimary([...value, ...uploaded]);
        onChange(next);
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
    [max, onChange, onUpload, value]
  );

  const handlePick = () => {
    if (disabled || uploading || value.length >= max) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (files) await uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading || value.length >= max) return;
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
    if (disabled || uploading || value.length >= max) return;
    if (e.dataTransfer.files?.length) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (index: number) => {
    if (disabled || uploading) return;
    const next = normalizePrimary(value.filter((_, i) => i !== index));
    onChange(next);
    setLocalError(null);
  };

  const handleSetPrimary = (index: number) => {
    if (disabled || uploading) return;
    onChange(
      value.map((img, i) => ({
        ...img,
        is_primary: i === index,
      }))
    );
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
        multiple
        className='hidden'
        onChange={handleFileChange}
        disabled={disabled || uploading || value.length >= max}
      />

      {value.length > 0 && (
        <div className='flex flex-wrap gap-3 mb-3'>
          {value.map((image, index) => (
            <div key={`${image.url}-${index}`} className='relative'>
              <div
                className={`rounded-lg border-2 p-1 ${
                  image.is_primary
                    ? 'border-emerald-500'
                    : 'border-transparent'
                }`}
              >
                <img
                  src={image.url}
                  alt={`画像 ${index + 1}`}
                  className='h-24 w-24 rounded-lg object-cover border border-gray-200 bg-gray-50'
                />
              </div>
              <button
                type='button'
                onClick={() => handleRemove(index)}
                disabled={disabled || uploading}
                className='absolute -top-2 -right-2 min-h-[32px] min-w-[32px] rounded-full bg-white border border-gray-300 shadow flex items-center justify-center text-gray-600 hover:text-red-600'
                aria-label='画像を削除'
              >
                <XMarkIcon className='w-4 h-4' />
              </button>
              <button
                type='button'
                onClick={() => handleSetPrimary(index)}
                disabled={disabled || uploading}
                className='absolute -top-2 -left-2 min-h-[32px] min-w-[32px] rounded-full bg-white border border-gray-300 shadow flex items-center justify-center text-amber-500 hover:text-amber-600'
                aria-label={image.is_primary ? 'メイン画像' : 'メインに設定'}
                title={image.is_primary ? 'メイン画像' : 'メインに設定'}
              >
                {image.is_primary ? (
                  <StarSolidIcon className='w-4 h-4' />
                ) : (
                  <StarIcon className='w-4 h-4' />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <button
          type='button'
          onClick={handlePick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={disabled || uploading}
          className={`flex flex-col items-center justify-center w-full max-w-md min-h-[120px] rounded-lg border-2 border-dashed px-4 py-6 text-gray-600 disabled:opacity-50 ${dropClass}`}
        >
          <PhotoIcon className='w-8 h-8 mb-2 text-gray-400' />
          <span className='text-sm font-medium'>
            {uploading
              ? 'アップロード中...'
              : dragging
                ? 'ここにドロップ'
                : 'ドラッグ＆ドロップ、またはクリック（複数可）'}
          </span>
          <span className='text-xs text-gray-500 mt-1'>
            jpeg / png / webp・5MBまで・残り{max - value.length}枚
          </span>
        </button>
      )}

      {displayError && (
        <p className='text-sm text-red-600 mt-1'>{displayError}</p>
      )}
    </div>
  );
};

export default MultiImageUploadField;
