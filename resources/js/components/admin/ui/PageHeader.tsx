/**
 * 管理画面ページヘッダー（白ベース + 左アクセント）
 */
import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { adminColors, adminShadows } from '../../../theme/adminTokens';

export interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  badge?: {
    label: string;
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  };
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ icon, title, description, badge, action }) => {
  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        bgcolor: adminColors.surface,
        border: '1px solid',
        borderColor: adminColors.borderSubtle,
        boxShadow: adminShadows.header,
        borderLeft: '4px solid',
        borderLeftColor: adminColors.primary,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: adminColors.primaryMuted,
                color: adminColors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                '& .MuiSvgIcon-root': { fontSize: 26 },
              }}
            >
              {icon}
            </Box>
          )}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography component="h1" variant="h5">
                {title}
              </Typography>
              {badge && (
                <Chip label={badge.label} color={badge.color ?? 'default'} size="small" variant="filled" />
              )}
            </Stack>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 640, lineHeight: 1.6 }}>
                {description}
              </Typography>
            )}
          </Box>
        </Stack>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
    </Box>
  );
};

export default PageHeader;
