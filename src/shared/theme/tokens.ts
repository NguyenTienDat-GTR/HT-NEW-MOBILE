/**
 * Token giao diện. Giá trị bản sáng chép NGUYÊN VĂN từ FE/src/styles/tokens.css.
 * FE hiện chưa có dark mode, nên chưa có bản tối: khi thêm, khai báo `darkColors` và đăng ký trong `themes`,
 * mọi component dùng useTheme() nên không phải sửa. Bản tối phải đo lại độ tương phản (>= 4.5:1), không suy từ bản sáng.
 */

export type ThemeName = 'light';

export interface ColorTokens {
  background: string;
  foreground: string;
  card: string;
  surface1: string;
  surface2: string;
  muted: string;
  textSecondary: string;
  border: string;
  input: string;
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  primarySoft: string;
  primaryRing: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Nền nút nguy hiểm khi đang nhấn. */
  dangerPressed: string;
  onSolid: string;
  badge: {
    successBg: string;
    successFg: string;
    warningBg: string;
    warningFg: string;
    dangerBg: string;
    dangerFg: string;
    infoBg: string;
    infoFg: string;
    neutralBg: string;
    neutralFg: string;
  };
  status: { active: string; inactive: string; leave: string; suspended: string };
  level: {
    probationary: string;
    youthLeader: string;
    level1: string;
    level2: string;
    level3: string;
    trainer: string;
  };
  /** Bảng màu biểu đồ (--viz-1…8). */
  viz: readonly [string, string, string, string, string, string, string, string];
  vizSequential: readonly [string, string, string, string, string];
  vizInk: string;
  vizInk2: string;
  vizMuted: string;
  vizGrid: string;
  vizAxis: string;
  vizNeutral: string;
  vizGood: string;
  vizWarning: string;
  vizSerious: string;
  vizCritical: string;
  overlay: string;
}

export const lightColors: ColorTokens = {
  background: '#f8fafc',
  foreground: '#0f172a',
  card: '#ffffff',
  surface1: '#ffffff',
  surface2: '#f1f5f9',
  muted: '#64748b',
  textSecondary: '#475569',
  border: '#e2e8f0',
  input: '#cbd5e1',
  primary: '#1e40af',
  primaryForeground: '#ffffff',
  primaryHover: '#1e3a8a',
  primarySoft: '#eff6ff',
  primaryRing: 'rgba(56, 189, 248, 0.45)',
  accent: '#38bdf8',
  success: '#047857',
  warning: '#b45309',
  danger: '#b91c1c',
  info: '#2563eb',
  dangerPressed: '#991b1b',
  onSolid: '#ffffff',
  badge: {
    successBg: '#ecfdf5',
    successFg: '#047857',
    warningBg: '#fffbeb',
    warningFg: '#b45309',
    dangerBg: '#fef2f2',
    dangerFg: '#b91c1c',
    infoBg: '#eff6ff',
    infoFg: '#1d4ed8',
    neutralBg: '#f1f5f9',
    neutralFg: '#334155',
  },
  status: { active: '#059669', inactive: '#64748b', leave: '#d97706', suspended: '#ba1a1a' },
  level: {
    probationary: '#64748b',
    youthLeader: '#2563eb',
    level1: '#0ea5e9',
    level2: '#d97706',
    level3: '#b45309',
    trainer: '#7c3aed',
  },
  viz: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  vizSequential: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],
  vizInk: '#0b0b0b',
  vizInk2: '#52514e',
  vizMuted: '#6b6a65',
  vizGrid: '#e1e0d9',
  vizAxis: '#c3c2b7',
  vizNeutral: '#cfd0cb',
  vizGood: '#0ca30c',
  vizWarning: '#fab219',
  vizSerious: '#ec835a',
  vizCritical: '#d03b3b',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

/** Nhịp 4/8 (FE: --space-2xs … --space-xl). */
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/** FE: --radius-input/button 8, --radius-panel 12. */
export const radius = { input: 8, button: 8, panel: 12, pill: 999 } as const;

/**
 * Vùng chạm. Android khuyến nghị 48dp, iOS 44pt: dùng 48 cho cả hai để thỏa mãn cả hai.
 */
export const touch = { min: 48, input: 48, button: 52, buttonSm: 48, hitSlop: 8 } as const;

export const iconSize = { sm: 20, md: 24, lg: 32 } as const;

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export type TextVariant =
  'title' | 'heading' | 'body' | 'bodyStrong' | 'secondary' | 'label' | 'kpi';

export interface TextStyleToken {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
}

/** Cỡ chữ theo FE (tiêu đề trang 24/32, tiêu đề khối 16-18, nội dung 14-16). Nội dung 16 để ô nhập không bị iOS phóng to. */
export const typography: Record<TextVariant, TextStyleToken> = {
  title: { fontSize: 24, lineHeight: 32, fontFamily: fontFamily.bold },
  heading: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.semibold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.regular },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.semibold },
  secondary: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  label: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.semibold },
  kpi: { fontSize: 22, lineHeight: 28, fontFamily: fontFamily.bold },
};

export interface Theme {
  name: ThemeName;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  touch: typeof touch;
  iconSize: typeof iconSize;
  typography: typeof typography;
}

export const themes: Record<ThemeName, Theme> = {
  light: { name: 'light', colors: lightColors, spacing, radius, touch, iconSize, typography },
};
