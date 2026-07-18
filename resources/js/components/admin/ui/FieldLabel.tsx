import React from 'react';
import FieldTip from './FieldTip';

export interface FieldLabelProps {
  /** 表示ラベル */
  label: string;
  /** TIPS 本文 */
  tip?: string;
  /** label の htmlFor */
  htmlFor?: string;
  /** 必須マーク */
  required?: boolean;
  /** 追加クラス */
  className?: string;
  /** ラベル左側の装飾（アイコン等） */
  startAdornment?: React.ReactNode;
}

/**
 * 生 HTML フォーム向けラベル + ⓘ TIPS
 */
const FieldLabel: React.FC<FieldLabelProps> = ({
  label,
  tip,
  htmlFor,
  required = false,
  className = '',
  startAdornment,
}) => (
  <label
    htmlFor={htmlFor}
    className={`flex items-center text-sm font-medium text-gray-700 mb-1 ${className}`}
  >
    {startAdornment}
    <span>{label}</span>
    {required && <span className='text-red-500 ml-1'>*</span>}
    {tip && <FieldTip tip={tip} label={`${label}の説明`} />}
  </label>
);

export default FieldLabel;
