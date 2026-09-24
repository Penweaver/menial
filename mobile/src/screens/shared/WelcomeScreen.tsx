import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { loginAsDemo } = useAuth();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.xl),
            paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.xl),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header with Official Logo Image & Trust Status */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.trustPillRow}>
            <Badge label="NIN / BVN VERIFIED" type="verified" icon="🇳🇬" />
            <Badge label="ESCROW PROTECTED" type="escrow" icon="🔒" />
          </View>
        </View>

        {/* Hero Headline */}
        <View style={styles.heroSection}>
          <Text style={styles.headline}>Dignified manual labour on demand.</Text>
          <Text style={styles.subheadline}>
            Connect instantly with verified nearby artisans, domestic workers, and physical laborers across Nigeria with guaranteed escrow payment protection.
          </Text>
        </View>

        {/* Popular Categories Preview */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionLabel}>POPULAR SERVICES</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {[
              { icon: '🧹', label: 'Cleaning' },
              { icon: '📦', label: 'Moving' },
              { icon: '🔨', label: 'Site Labour' },
              { icon: '🌱', label: 'Gardening' },
              { icon: '🧺', label: 'Laundry' },
              { icon: '⚡', label: 'Errands' },
            ].map((cat, idx) => (
              <View key={idx} style={styles.categoryChip}>
                <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                <Text style={styles.categoryChipLabel}>{cat.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Dual Role Pathway Cards */}
        <View style={styles.roleCardContainer}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Registration')}
            style={[styles.roleCard, styles.roleCardEmployer]}
          >
            <View style={styles.roleCardHeader}>
              <View style={styles.roleIconCircle}>
                <Text style={styles.roleEmoji}>🏢</Text>
              </View>
              <View style={styles.roleHeaderText}>
                <Text style={styles.roleCardTitle}>I Need to Hire</Text>
                <Text style={styles.roleCardSubtitle}>Employers &amp; Households</Text>
              </View>
            </View>
            <Text style={styles.roleCardDescription}>
              Post a job in minutes, discover verified nearby workers, and hold payments safely in escrow until you confirm completion.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('Registration')}
            style={[styles.roleCard, styles.roleCardWorker]}
          >
            <View style={styles.roleCardHeader}>
              <View style={[styles.roleIconCircle, styles.roleIconCircleWorker]}>
                <Text style={styles.roleEmoji}>👷</Text>
              </View>
              <View style={styles.roleHeaderText}>
                <Text style={styles.roleCardTitle}>I Want to Work</Text>
                <Text style={styles.roleCardSubtitle}>Artisans &amp; Laborers</Text>
              </View>
            </View>
            <Text style={styles.roleCardDescription}>
              Get NIN-verified, receive job offers nearby, set your transparent wage rates, and cash out instantly to your Nigerian bank.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Institutional Trust Guarantees */}
        <View style={styles.trustCard}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <View style={styles.trustTextGroup}>
              <Text style={styles.trustTitle}>Paystack Escrow Protection</Text>
              <Text style={styles.trustDesc}>
                Worker pay is locked securely in escrow before work begins and released upon confirmation.
              </Text>
            </View>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🛡️</Text>
            <View style={styles.trustTextGroup}>
              <Text style={styles.trustTitle}>100% NIN Verified Workforce</Text>
              <Text style={styles.trustDesc}>
                Government ID verification aligned with NDPA privacy masking standards (§80).
              </Text>
            </View>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>⚡</Text>
            <View style={styles.trustTextGroup}>
              <Text style={styles.trustTitle}>Instant NIP Bank Cashout</Text>
              <Text style={styles.trustDesc}>
                Direct disbursements to Access, GTBank, Zenith, First Bank, and all commercial CBN banks.
              </Text>
            </View>
          </View>
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            title="Create New Account"
            onPress={() => navigation.navigate('Registration')}
            style={styles.primaryButton}
          />
          <Button
            title="Log In with Phone Number"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            style={styles.secondaryButton}
          />

          {/* Quick Demo Shortcuts for Testing */}
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionTitle}>⚡ QUICK TEST DRIVE (DEMO)</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => loginAsDemo('employer')}
                style={styles.demoBtn}
              >
                <Text style={styles.demoBtnEmoji}>🏢</Text>
                <Text style={styles.demoBtnText}>Enter as Employer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => loginAsDemo('worker')}
                style={styles.demoBtn}
              >
                <Text style={styles.demoBtnEmoji}>👷</Text>
                <Text style={styles.demoBtnText}>Enter as Worker</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Comprehensive Institutional Trust & Regulatory Footer */}
        <View style={styles.footerSection}>
          <View style={styles.complianceCard}>
            <View style={styles.complianceRow}>
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceIcon}>🛡️</Text>
                <View>
                  <Text style={styles.complianceTitle}>NDPA 2023</Text>
                  <Text style={styles.complianceSub}>Data Protection</Text>
                </View>
              </View>
              <View style={styles.complianceDivider} />
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceIcon}>🏦</Text>
                <View>
                  <Text style={styles.complianceTitle}>CBN-Compliant</Text>
                  <Text style={styles.complianceSub}>Escrow Protected</Text>
                </View>
              </View>
              <View style={styles.complianceDivider} />
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceIcon}>🇳🇬</Text>
                <View>
                  <Text style={styles.complianceTitle}>NIMC &amp; BVN</Text>
                  <Text style={styles.complianceSub}>Identity Verified</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 24/7 Rapid Operations Support Helpline */}
          <View style={styles.supportRow}>
            <Text style={styles.supportIcon}>📞</Text>
            <Text style={styles.supportText}>
              24/7 Lagos Ops Support: <Text style={styles.supportHighlight}>0800-MENIAL-NG</Text>
            </Text>
          </View>

          {/* Quick Legal & Safety Links */}
          <View style={styles.legalLinksRow}>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalBullet}>•</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalBullet}>•</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.legalLink}>Safety Guidelines</Text>
            </TouchableOpacity>
            <Text style={styles.legalBullet}>•</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.legalLink}>Worker Charter</Text>
            </TouchableOpacity>
          </View>

          {/* Attribution, Version & Copyright */}
          <View style={styles.attributionBlock}>
            <Text style={styles.copyrightText}>
              © 2026 Menial Technologies Limited (RC 1948201)
            </Text>
            <Text style={styles.versionText}>
              Version 1.0.0 (Release 2026.1) • Made with pride in Lagos, Nigeria
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: 180,
    height: 52,
    marginBottom: Spacing.xs,
  },
  trustPillRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroSection: {
    marginBottom: Spacing.lg,
  },
  headline: {
    ...Typography.scale.headlineLgMobile,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontWeight: '800',
  },
  subheadline: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xs,
  },
  categorySection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  categoryScroll: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  categoryChipLabel: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  roleCardContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  roleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  roleCardEmployer: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  roleCardWorker: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  roleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  roleIconCircleWorker: {
    backgroundColor: Colors.secondaryContainer,
  },
  roleEmoji: {
    fontSize: 20,
  },
  roleHeaderText: {
    flex: 1,
  },
  roleCardTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  roleCardSubtitle: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
  },
  roleCardDescription: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  trustCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  trustIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  trustTextGroup: {
    flex: 1,
  },
  trustTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  trustDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  trustDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  actionContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  primaryButton: {
    marginBottom: Spacing.sm,
  },
  secondaryButton: {
    marginBottom: Spacing.md,
  },
  demoSection: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  demoSectionTitle: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xs,
    gap: 6,
  },
  demoBtnEmoji: {
    fontSize: 16,
  },
  demoBtnText: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  footerSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.md,
  },
  complianceCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    width: '100%',
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complianceBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  complianceIcon: {
    fontSize: 18,
  },
  complianceTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  complianceSub: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  complianceDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
  },
  supportIcon: {
    fontSize: 14,
  },
  supportText: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    fontSize: 11,
  },
  supportHighlight: {
    fontWeight: '800',
    color: Colors.primary,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  legalLink: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  legalBullet: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  attributionBlock: {
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  copyrightText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  versionText: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
});
