/**
 * 管理画面用 MUI Card 互換ラッパー（Phase 4）
 * title / subheader / actions / children でブロック・パネルを統一
 */
import React from 'react';
import {
  Card as MuiCard,
  CardHeader,
  CardContent,
  CardActions,
  CardProps as MuiCardProps,
} from '@mui/material';

export interface AppCardProps extends Omit<MuiCardProps, 'title'> {
  title?: React.ReactNode;
  subheader?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * 最小構成の MUI Card ラッパー（variant="outlined" を基本）
 */
const AppCard: React.FC<AppCardProps> = ({
  title,
  subheader,
  actions,
  children,
  variant = 'outlined',
  className,
  ...rest
}) => {
  return (
    <MuiCard variant={variant} className={className} {...rest}>
      {(title || subheader) && (
        <CardHeader title={title} subheader={subheader} titleTypographyProps={{ variant: 'h6' }} />
      )}
      {children != null && <CardContent sx={{ pt: title || subheader ? 0 : undefined }}>{children}</CardContent>}
      {actions && <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1 }}>{actions}</CardActions>}
    </MuiCard>
  );
};

export default AppCard;
