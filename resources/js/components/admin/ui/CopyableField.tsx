/**
 * 読み取り専用テキスト + ワンクリックコピー
 */
import React, { useState } from 'react';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

export interface CopyableFieldProps {
  label: string;
  value: string;
  helperText?: string;
}

const CopyableField: React.FC<CopyableFieldProps> = ({ label, value, helperText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 不可環境では無視
    }
  };

  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      helperText={helperText}
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <Tooltip title={copied ? 'コピーしました' : 'クリップボードにコピー'}>
              <span>
                <IconButton
                  onClick={handleCopy}
                  disabled={!value}
                  edge="end"
                  aria-label={`${label}をコピー`}
                  size="small"
                >
                  {copied ? <CheckIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default CopyableField;
