import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface FieldTipProps {
  /** TIPS 本文（効果・意味の説明） */
  tip: string;
  /** アクセシビリティ用ラベル */
  label?: string;
}

/**
 * フィールド横の ⓘ アイコン + TIPS（Tooltip）
 * どの画面でも同じ見た目・操作で説明を表示する
 */
const FieldTip: React.FC<FieldTipProps> = ({ tip, label = '説明' }) => {
  if (!tip) return null;

  return (
    <Tooltip
      title={tip}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={4000}
      describeChild
    >
      <IconButton
        type='button'
        size='small'
        aria-label={label}
        onClick={e => {
          // ラベル内クリックでフォーカス移動しない
          e.preventDefault();
          e.stopPropagation();
        }}
        sx={{
          p: 0.25,
          ml: 0.25,
          color: 'text.secondary',
          '&:hover': { color: 'primary.main' },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
};

export default FieldTip;
