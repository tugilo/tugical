import React from 'react';
import ImageUploadField from '../ui/ImageUploadField';
import { menuApi } from '../../../services/api';

interface MenuImageFieldProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * メニュー画像（1枚）— 共通 ImageUploadField + メニュー用 upload API
 */
const MenuImageField: React.FC<MenuImageFieldProps> = ({
  value,
  onChange,
  error,
  disabled,
}) => (
  <ImageUploadField
    value={value}
    onChange={onChange}
    onUpload={file => menuApi.uploadImage(file)}
    label='メニュー画像'
    hint='任意・1枚 / ドラッグ＆ドロップ可 / LIFFに表示'
    error={error}
    disabled={disabled}
  />
);

export default MenuImageField;
