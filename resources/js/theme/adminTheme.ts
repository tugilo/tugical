/**
 * tugical 管理画面用 MUI テーマ（落ち着いた SaaS スタイル）
 */
import { createTheme, alpha } from '@mui/material/styles';
import { adminColors, adminShadows } from './adminTokens';

const primaryMain = adminColors.primary;
const primaryDark = adminColors.primaryHover;

const adminTheme = createTheme({
  palette: {
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: adminColors.primaryLight,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#334155',
    },
    background: {
      default: adminColors.canvas,
      paper: adminColors.surface,
    },
    text: {
      primary: adminColors.ink,
      secondary: adminColors.inkMuted,
    },
    divider: adminColors.border,
    success: {
      main: primaryMain,
    },
  },
  typography: {
    fontFamily: [
      'Nunito',
      'Noto Sans JP',
      '-apple-system',
      'BlinkMacSystemFont',
      'sans-serif',
    ].join(','),
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          bgcolor: adminColors.canvas,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 42,
          borderRadius: 10,
          paddingLeft: 20,
          paddingRight: 20,
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        },
        containedPrimary: {
          bgcolor: primaryMain,
          boxShadow: adminShadows.button,
          '&:hover': {
            bgcolor: primaryDark,
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.1)',
          },
        },
        outlined: {
          borderWidth: 1,
          borderColor: adminColors.border,
          color: adminColors.ink,
          '&:hover': {
            borderWidth: 1,
            borderColor: alpha(primaryMain, 0.35),
            bgcolor: adminColors.primaryMuted,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            bgcolor: adminColors.surface,
            transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(primaryMain, 0.12)}`,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: adminShadows.card,
          border: `1px solid ${adminColors.borderSubtle}`,
          borderRadius: 14,
          bgcolor: adminColors.surface,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
        filledSuccess: {
          bgcolor: adminColors.primaryMuted,
          color: primaryDark,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        standardInfo: {
          bgcolor: alpha('#475569', 0.06),
          color: '#334155',
        },
        standardSuccess: {
          bgcolor: adminColors.primaryMuted,
          color: primaryDark,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        color: 'inherit',
        elevation: 0,
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: adminShadows.cardHover,
        },
      },
    },
  },
});

export default adminTheme;
