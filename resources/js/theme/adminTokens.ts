/**
 * 管理画面 UI トークン（落ち着いた SaaS 配色）
 * グラデーションは最小限。背景はニュートラル、アクセントは点で使う。
 */
export const adminColors = {
  primary: '#047857',
  primaryHover: '#065F46',
  primaryLight: '#059669',
  primaryMuted: 'rgba(4, 120, 87, 0.08)',
  primaryBorder: 'rgba(4, 120, 87, 0.18)',
  canvas: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: 'rgba(226, 232, 240, 0.85)',
  ink: '#0F172A',
  inkMuted: '#64748B',
};

export const adminShadows = {
  card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.05)',
  cardHover: '0 4px 12px rgba(15, 23, 42, 0.06), 0 12px 28px rgba(15, 23, 42, 0.08)',
  header: '0 1px 2px rgba(15, 23, 42, 0.04)',
  sidebar: '1px 0 0 rgba(226, 232, 240, 0.9)',
  button: '0 1px 2px rgba(15, 23, 42, 0.06)',
};

/** tugical ロゴカード（白ベース + 左アクセント） */
export const brandCardSx = {
  bgcolor: adminColors.surface,
  border: '1px solid',
  borderColor: adminColors.borderSubtle,
  borderLeft: '3px solid',
  borderLeftColor: adminColors.primary,
  boxShadow: adminShadows.header,
};

/** @deprecated brandCardSx を使用 */
export const adminGradients = {
  brand: adminColors.primary,
  brandSoft: adminColors.surface,
  sidebarBrand: adminColors.surface,
  pageBackground: adminColors.canvas,
};

/** ダッシュボード等で使うカード共通 sx */
export const modernCardSx = {
  bgcolor: adminColors.surface,
  border: '1px solid',
  borderColor: adminColors.borderSubtle,
  boxShadow: adminShadows.card,
  borderRadius: 3,
  transition: 'box-shadow 0.2s ease',
  '&:hover': {
    boxShadow: adminShadows.cardHover,
  },
};
