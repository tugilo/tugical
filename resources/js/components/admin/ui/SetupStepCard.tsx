/**
 * 設定ウィザード用ステップカード（番号バッジ + モダンカード）
 */
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { adminColors } from '../../../theme/adminTokens';
import AppCard from './AppCard';

export interface SetupStepCardProps {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SetupStepCard: React.FC<SetupStepCardProps> = ({ step, title, description, children }) => {
  return (
    <AppCard
      title={
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: adminColors.primary,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {step}
          </Box>
          <Typography component="span" variant="h6">
            {title}
          </Typography>
        </Stack>
      }
      subheader={description}
    >
      {children}
    </AppCard>
  );
};

export default SetupStepCard;
