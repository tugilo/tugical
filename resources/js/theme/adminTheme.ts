/**
 * tugical 管理画面用 MUI テーマ
 * 案B方針（管理画面＝MUI）に基づく。文字密度はやや compact、primary はアクション中心。
 */
import { createTheme } from '@mui/material/styles';

const adminTheme = createTheme({
  palette: {
    primary: {
      main: '#10B981', // emerald（設計書トークン）
    },
    secondary: {
      main: '#2563EB', // blue
    },
    background: {
      default: '#F8FAFC', // slate-50（業務UIの疲れにくさ）
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',   // slate-900（黒寄り、見出しに primary を多用しない）
      secondary: '#475569', // slate-600
    },
    divider: '#E2E8F0',    // slate-200
  },
  typography: {
    fontFamily: [
      'Nunito',
      'Noto Sans JP',
      '-apple-system',
      'BlinkMacSystemFont',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 40,
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default adminTheme;
