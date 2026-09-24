/**
 * Menial Mobile - Standardized Screen Footer Component
 * 
 * Clean, minimalist, and unified footer layout for all present and future mobile screens.
 * Designed to prevent cluttered, desktop-style footer bloat on mobile viewports.
 * Conforms to Master Specification Section 7 (Dignified Utility) and NDPA 2023 guidelines.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';

export type ScreenFooterVariant = 'landing' | 'auth' | 'minimal' | 'compact' | 'spacer';

export interface DemoLinkItem {
  label: string;
  onPress: () => void;
  emoji?: string;
}

export interface ScreenFooterProps {
  /** Variant of the footer:
   * - 'landing': Sleek trust badges, clean legal links, minimal copyright (for Welcome/Landing)
   * - 'auth': Clean sign-in/sign-up toggle, optional terms prompt & demo shortcuts (for Auth screens)
   * - 'compact': Discreet branding mark and safe area pad (for Settings, Profiles, Hubs)
   * - 'minimal': Subtle copyright/version notice with standard safe spacing
   * - 'spacer': Invisible safe area spacing pad
   */
  variant?: ScreenFooterVariant;
  
  /** Auth variant: prompt text before the action link (e.g. "Don't have an account?") */
  authPrompt?: string;
  /** Auth variant: action link text (e.g. "Sign up") */
  authActionText?: string;
  /** Auth variant: callback when action link is tapped */
  onAuthAction?: () => void;
  /** Auth variant: optional terms text note */
  termsNotice?: string;
  /** Auth variant: optional discreet demo shortcuts */
  demoLinks?: DemoLinkItem[];
  
  /** Optional custom version or copyright text */
  customText?: string;
  /** Whether to show legal links row (Terms • Privacy • Support) */
  showLegalLinks?: boolean;
  /** Whether to show trust indicators (NDPA • CBN • NIMC) */
  showTrustMarks?: boolean;
  /** Additional bottom padding override */
  bottomPadding?: number;
  /** Optional container style override */
  style?: ViewStyle;
}

export const ScreenFooter: React.FC<ScreenFooterProps> = ({
  variant = 'compact',
  authPrompt,
  authActionText,
  onAuthAction,
  termsNotice,
  demoLinks,
  customText,
  showLegalLinks = true,
  showTrustMarks = true,
  bottomPadding,
  style,
}) => {
  const handleShowTerms = () => {
    Alert.alert(
      'Terms of Service',
      'Menial Platform Terms of Service (Release 2026.1):\n\n• Peer-to-peer dignified utility marketplace.\n• 100% upfront escrow protection before worker dispatch.\n• Neutral dispute arbitration via Section 47.\n• Governed under the Laws of the Federal Republic of Nigeria.',
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  const handleShowPrivacy = () => {
    Alert.alert(
      'Data Privacy (NDPA 2023)',
      'Nigeria Data Protection Act 2023 Compliance (§80):\n\n• National Identity Numbers (NIN) & BVN are tokenized with irreversible SHA-256 masking.\n• Never exposed to employers or external third parties.\n• Strict encryption for all communication and payment ledgers.',
      [{ text: 'Understood', style: 'default' }]
    );
  };

  const handleShowSupport = () => {
    Alert.alert(
      '24/7 Operations Support',
      'Menial Support & Safety Operations:\n\n📞 Lagos HQ Hotline: 0800-MENIAL-NG\n💬 WhatsApp Priority: +234 800 636 4256\n✉️ Email: support@menial.ng\n\nImmediate in-person SOS available on all active jobs.',
      [{ text: 'Got It', style: 'default' }]
    );
  };

  // Pure spacer variant
  if (variant === 'spacer') {
    return <View style={{ height: bottomPadding ?? Spacing.xxl }} />;
  }

  // Auth screen variant (Login, Register)
  if (variant === 'auth') {
    return (
      <View style={[styles.authContainer, bottomPadding !== undefined && { paddingBottom: bottomPadding }, style]}>
        {termsNotice ? (
          <Text style={styles.termsNote}>{termsNotice}</Text>
        ) : null}

        {authPrompt && authActionText && onAuthAction && (
          <View style={styles.authLinkRow}>
            <Text style={styles.authPromptText}>{authPrompt} </Text>
            <TouchableOpacity onPress={onAuthAction} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.authActionLink}>{authActionText}</Text>
            </TouchableOpacity>
          </View>
        )}

        {demoLinks && demoLinks.length > 0 && (
          <View style={styles.demoRow}>
            <Text style={styles.demoLabel}>Demo mode:</Text>
            {demoLinks.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <Text style={styles.demoBullet}>•</Text>}
                <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
                  <Text style={styles.demoLink}>
                    {item.emoji ? `${item.emoji} ` : ''}{item.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={styles.authTrustBadge}>
          <Text style={styles.authTrustText}>🛡️ Encrypted &amp; NDPA Protected</Text>
        </View>
      </View>
    );
  }

  // Landing / Welcome screen variant
  if (variant === 'landing') {
    return (
      <View style={[styles.landingContainer, bottomPadding !== undefined && { paddingBottom: bottomPadding }, style]}>
        {/* Subtle, Lightweight Trust Row */}
        {showTrustMarks && (
          <View style={styles.trustPillRow}>
            <View style={styles.trustPill}>
              <Text style={styles.trustPillIcon}>🛡️</Text>
              <Text style={styles.trustPillText}>NDPA 2023</Text>
            </View>
            <Text style={styles.trustPillDot}>•</Text>
            <View style={styles.trustPill}>
              <Text style={styles.trustPillIcon}>🏦</Text>
              <Text style={styles.trustPillText}>CBN Escrow</Text>
            </View>
            <Text style={styles.trustPillDot}>•</Text>
            <View style={styles.trustPill}>
              <Text style={styles.trustPillIcon}>🇳🇬</Text>
              <Text style={styles.trustPillText}>NIMC Verified</Text>
            </View>
          </View>
        )}

        {/* Minimal Legal Links */}
        {showLegalLinks && (
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={handleShowTerms} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.legalBullet}>•</Text>
            <TouchableOpacity onPress={handleShowPrivacy} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.legalBullet}>•</Text>
            <TouchableOpacity onPress={handleShowSupport} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Support</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Attribution & Copyright */}
        <Text style={styles.copyrightText}>
          {customText || '© 2026 Menial Technologies Limited • Lagos, Nigeria'}
        </Text>
      </View>
    );
  }

  // Minimal variant (simple text line + safe space)
  if (variant === 'minimal') {
    return (
      <View style={[styles.minimalContainer, bottomPadding !== undefined && { paddingBottom: bottomPadding }, style]}>
        <Text style={styles.minimalText}>
          {customText || '© 2026 Menial • Dignified Utility'}
        </Text>
      </View>
    );
  }

  // Default 'compact' variant for dashboards, settings, and standard screens
  return (
    <View style={[styles.compactContainer, bottomPadding !== undefined && { paddingBottom: bottomPadding }, style]}>
      <View style={styles.compactDivider} />
      <View style={styles.compactContentRow}>
        <Text style={styles.compactBranding}>MENIAL</Text>
        <Text style={styles.compactBullet}>•</Text>
        <Text style={styles.compactSubtitle}>Escrow &amp; NDPA Protected</Text>
      </View>
      <Text style={styles.compactVersion}>v1.0.0 • Lagos, NG</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Landing Variant Styles
  landingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  trustPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustPillIcon: {
    fontSize: 12,
  },
  trustPillText: {
    ...Typography.scale.labelSm,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  trustPillDot: {
    color: Colors.textMuted,
    fontSize: 10,
    marginHorizontal: 2,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: Spacing.sm,
  },
  legalLink: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  legalBullet: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  copyrightText: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },

  // Auth Variant Styles
  authContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  termsNote: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
  authLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authPromptText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  authActionLink: {
    ...Typography.scale.labelMd,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.xs,
  },
  demoLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
  },
  demoLink: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  demoBullet: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  authTrustBadge: {
    marginTop: Spacing.xs,
  },
  authTrustText: {
    ...Typography.scale.labelSm,
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Compact Variant Styles
  compactContainer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: 4,
  },
  compactDivider: {
    width: 48,
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  compactContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactBranding: {
    ...Typography.scale.labelSm,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  compactBullet: {
    color: Colors.textMuted,
    fontSize: 8,
  },
  compactSubtitle: {
    ...Typography.scale.bodySm,
    fontSize: 11,
    color: Colors.textMuted,
  },
  compactVersion: {
    ...Typography.scale.bodySm,
    fontSize: 10,
    color: Colors.textMuted,
  },

  // Minimal Variant Styles
  minimalContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  minimalText: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
  },
});
