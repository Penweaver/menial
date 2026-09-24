/**
 * Menial Mobile - Design System Tokens
 * 
 * Strict alignment with DESIGN.md and Master Specification Section 7.
 * Brand Direction: Dignified Utility (Nigeria / Emerging Markets)
 */

export const Colors = {
  // Brand Palette
  primary: '#0B4F37',          // Deep Forest Emerald (Core brand, CTAs, headers)
  primaryOn: '#FFFFFF',        // Pure white on emerald
  primaryContainer: '#E8F5E9', // Soft emerald tint
  
  secondary: '#10B981',        // Mint / Jade (Verification shields, biometric checkmarks, active status)
  secondaryContainer: '#ECFDF5',
  secondaryText: '#065F46',

  tertiary: '#F59E0B',         // Amber Gold (Ratings, escrow warnings, priority)
  tertiaryContainer: '#FEF3C7',
  tertiaryText: '#92400E',

  // Semantic Escrow
  escrowContainer: '#F0F9FF',  // Sky 50 tint
  escrowText: '#0369A1',       // Sky 700

  // Semantic Alerts
  danger: '#EF4444',
  dangerContainer: '#FEF2F2',
  dangerText: '#B91C1C',

  // Neutrals & Surfaces
  canvas: '#F8FAFC',           // Slate-50 Warm Off-White (outdoor glare reduction)
  surface: '#FFFFFF',          // Card base surface
  surfaceSubtle: '#F1F5F9',    // Slate-100 Input background
  border: '#E2E8F0',           // 1px standard border
  borderActive: '#0B4F37',     // Active focus border

  // Text Hierarchy
  textPrimary: '#0F172A',      // Midnight Slate (100% contrast reading text)
  textSecondary: '#64748B',    // Slate-500 (Subtitles, categories, timestamps)
  textMuted: '#94A3B8',        // Inactive / placeholder text
  textInverse: '#FFFFFF',
} as const;

export const Typography = {
  fontFamily: 'Plus Jakarta Sans', // Fallbacks to system geometric sans
  scale: {
    headlineLgMobile: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '700' as const,
      letterSpacing: -0.2,
    },
    headlineMd: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700' as const,
      letterSpacing: 0,
    },
    headlineSm: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as const,
      letterSpacing: 0,
    },
    bodyLg: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500' as const,
    },
    bodyMd: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as const,
    },
    bodySm: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400' as const,
    },
    labelLg: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600' as const,
      letterSpacing: 0.2,
    },
    labelMd: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600' as const,
      letterSpacing: 0.2,
    },
    labelSm: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700' as const,
      letterSpacing: 0.5,
    },
    currencyDisplay: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800' as const,
      fontVariant: ['tabular-nums'] as ('tabular-nums')[],
    },
  },
};

export const Spacing = {
  xs: 4,     // space-xs (micro gaps, badge padding)
  sm: 8,     // space-sm (card item gap)
  md: 12,    // space-md (mobile grid gutter)
  lg: 16,    // space-lg (standard card padding, screen horizontal margin)
  xl: 24,    // space-xl (section margins)
  xxl: 32,   // space-2xl
} as const;

export const Radii = {
  sm: 4,     // Checkboxes, micro tags
  md: 8,     // Inputs, standard buttons
  lg: 16,    // Cards, bottom sheets
  xl: 20,    // Larger cards, modal corners
  xxl: 24,   // Bottom sheet tops
  full: 9999,// Status pills, verification chips
} as const;

export const Layout = {
  buttonHeight: 52,
  inputHeight: 52,
  minTouchTarget: 48,
  screenPadding: 16,
} as const;

export const Elevation = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/**
 * Formats integer kobo into localized Nigerian Naira (₦) display string with tabular figures.
 * Example: 250000 kobo -> "₦2,500"
 */
export function formatKoboToNaira(kobo: number): string {
  const naira = Math.floor(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

// Aliases for unified styling ergonomics across mobile screens
export const COLORS = {
  ...Colors,
  borderLight: Colors.border,
  error: Colors.danger,
};
export const SPACING = Spacing;
export const RADIUS = Radii;
export const TYPOGRAPHY = {
  h1: Typography.scale.headlineLgMobile,
  h2: Typography.scale.headlineMd,
  h3: Typography.scale.headlineSm,
  body: Typography.scale.bodyMd,
  caption: Typography.scale.bodySm,
  label: Typography.scale.labelSm,
  scale: Typography.scale,
};

