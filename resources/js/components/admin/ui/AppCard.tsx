/**
 * 管理画面用 MUI Card（モダンシャドウ・ホバー）
 */
import React from 'react';
import {
  Card as MuiCard,
  CardHeader,
  CardContent,
  CardActions,
  CardProps as MuiCardProps,
} from '@mui/material';
import { adminShadows } from '../../../theme/adminTokens';

export interface AppCardProps extends Omit<MuiCardProps, 'title'> {
  title?: React.ReactNode;
  subheader?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  hoverable?: boolean;
}

const AppCard: React.FC<AppCardProps> = ({
  title,
  subheader,
  actions,
  children,
  hoverable = true,
  variant = 'outlined',
  className,
  sx,
  ...rest
}) => {
  return (
    <MuiCard
      variant={variant}
      className={className}
      sx={{
        ...(hoverable && {
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: adminShadows.cardHover,
          },
        }),
        ...sx,
      }}
      {...rest}
    >
      {(title || subheader) && (
        <CardHeader
          title={title}
          subheader={subheader}
          titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
          subheaderTypographyProps={{ sx: { mt: 0.25 } }}
        />
      )}
      {children != null && (
        <CardContent sx={{ pt: title || subheader ? 0 : undefined }}>{children}</CardContent>
      )}
      {actions && (
        <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5, pt: 0 }}>{actions}</CardActions>
      )}
    </MuiCard>
  );
};

export default AppCard;
