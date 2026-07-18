import React from 'react';
import MultiImageUploadField, {
  EntityImageItem,
} from '../ui/MultiImageUploadField';
import { menuApi } from '../../../services/api';

interface MenuImageFieldProps {
  value: EntityImageItem[];
  onChange: (images: EntityImageItem[]) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * メニュー画像（複数・1対多）— MultiImageUploadField + メニュー用 upload API
 */
const MenuImageField: React.FC<MenuImageFieldProps> = ({
  value,
  onChange,
  error,
  disabled,
}) => (
  <MultiImageUploadField
    value={value}
    onChange={onChange}
    onUpload={file => menuApi.uploadImage(file)}
    label='メニュー画像'
    hint='任意・最大10枚 / ドラッグ＆ドロップ可 / ★がLIFF表示'
    error={error}
    disabled={disabled}
    max={10}
  />
);

export default MenuImageField;
export type { EntityImageItem };
