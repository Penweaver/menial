/**
 * Menial Mobile - Employer Billing & Escrow Payment Methods Screen
 * 
 * Standardized billing, payment methods, and escrow funding management conforming to
 * Master Specification §38, §39, and CBN Mobile Payment Regulations.
 * Employers manage default escrow payment cards and dedicated virtual accounts for instant job funding.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii, formatKoboToNaira } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { useEmployer } from '../../../context/EmployerContext';
import { EmployerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerProfileStackParamList, 'BillingPayments'>;
};

export const EmployerBillingPaymentsScreen: React.FC<Props> = ({ navigation }) => {
  const { paymentMethods, hiringSummary } = useEmployer();
  const [methods, setMethods] = useState(paymentMethods);

  const handleSetDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    );
    Alert.alert('Default Payment Method Updated', 'New jobs will fund escrow from this source.');
  };

  const handleAddNewCard = () => {
    Alert.alert(
      'Add New Card',
      'Paystack Secure Checkout will initiate a ₦50 tokenization charge (refunded immediately) to verify your card details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Paystack',
          onPress: () => {
            Alert.alert('Card Added', 'Your new Mastercard ending in 8812 has been secured.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="Billing & Escrow Payments" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Escrow Guarantee Banner */}
        <Card style={styles.escrowBanner}>
          <View style={styles.escrowBannerHeader}>
            <Text style={styles.escrowBannerIcon}>🛡️</Text>
            <View style={styles.escrowBannerTextGroup}>
              <Text style={styles.escrowBannerTitle}>CBN-Licensed Escrow Protection</Text>
              <Text style={styles.escrowBannerDesc}>
                Section 38 &amp; 39 Guarantee: All hired job payments are securely held in escrow and are only released when you confirm satisfactory completion.
              </Text>
            </View>
          </View>
          <View style={styles.escrowMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Escrow Funded</Text>
              <Text style={styles.metricValue}>
                {formatKoboToNaira(hiringSummary.totalEscrowFundedKobo)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Jobs Protected</Text>
              <Text style={styles.metricValue}>{hiringSummary.totalJobsPosted}</Text>
            </View>
          </View>
        </Card>

        {/* 1. Payment Methods List */}
        <Text style={styles.sectionHeader}>SAVED FUNDING SOURCES</Text>
        {methods.map((method) => {
          const isCard = method.type === 'card';
          return (
            <Card key={method.id} style={styles.methodCard}>
              <View style={styles.methodRow}>
                <View style={styles.methodIconCircle}>
                  <Text style={styles.methodIconEmoji}>{isCard ? '💳' : '🏦'}</Text>
                </View>
                <View style={styles.methodDetails}>
                  <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>{method.label}</Text>
                    {method.isDefault && (
                      <Badge label="DEFAULT" type="verified" />
                    )}
                  </View>
                  <Text style={styles.methodSub}>{method.details}</Text>
                  {isCard && method.expiry && (
                    <Text style={styles.methodExpiry}>Expires {method.expiry} • 3D Secure Active</Text>
                  )}
                </View>
              </View>

              {!method.isDefault && (
                <TouchableOpacity
                  style={styles.makeDefaultBtn}
                  onPress={() => handleSetDefault(method.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.makeDefaultText}>Set as Default Funding Source</Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        <Button
          title="+ Add New Debit / Credit Card"
          variant="outline"
          onPress={handleAddNewCard}
          style={styles.addCardBtn}
        />

        {/* 2. Virtual Account for Direct Bank Transfers */}
        <Text style={styles.sectionHeader}>DEDICATED NIP ESCROW ACCOUNT</Text>
        <Card style={styles.virtualAccountCard}>
          <View style={styles.vaHeaderRow}>
            <Text style={styles.vaEmoji}>⚡</Text>
            <View style={styles.vaTextGroup}>
              <Text style={styles.vaTitle}>Wema Bank Virtual Account</Text>
              <Text style={styles.vaSub}>Instant automated funding via any Nigerian banking app</Text>
            </View>
          </View>

          <View style={styles.accountBox}>
            <View style={styles.accountBoxRow}>
              <Text style={styles.accountBoxLabel}>Account Number</Text>
              <Text style={styles.accountBoxValue}>9920194821</Text>
            </View>
            <View style={styles.accountBoxRow}>
              <Text style={styles.accountBoxLabel}>Bank Name</Text>
              <Text style={styles.accountBoxValue}>Wema Bank PLC</Text>
            </View>
            <View style={styles.accountBoxRow}>
              <Text style={styles.accountBoxLabel}>Beneficiary Name</Text>
              <Text style={styles.accountBoxValue}>Menial / Bakare Estates</Text>
            </View>
          </View>
          <Text style={styles.vaHelper}>
            Transfers to this dedicated NUBAN account automatically fund your pending job escrows in real-time.
          </Text>
        </Card>

        {/* Security & Regulatory Notes */}
        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔒 PCI-DSS Level 1 Certified. Card details are processed directly by CBN-regulated payment switches. Menial never stores raw PAN or CVV information.
          </Text>
        </View>

        <ScreenFooter variant="compact" />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  escrowBanner: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  escrowBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  escrowBannerIcon: {
    fontSize: 28,
  },
  escrowBannerTextGroup: {
    flex: 1,
  },
  escrowBannerTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  escrowBannerDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  escrowMetricsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  metricItem: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginHorizontal: Spacing.md,
  },
  metricLabel: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
  },
  metricValue: {
    ...Typography.scale.headlineSm,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    ...Typography.scale.labelSm,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
    marginLeft: 4,
    fontWeight: '600',
  },
  methodCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  methodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconEmoji: {
    fontSize: 22,
  },
  methodDetails: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  methodTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
  },
  methodSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  methodExpiry: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  makeDefaultBtn: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  makeDefaultText: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontWeight: '600',
  },
  addCardBtn: {
    marginBottom: Spacing.lg,
  },
  virtualAccountCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  vaHeaderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  vaEmoji: {
    fontSize: 24,
  },
  vaTextGroup: {
    flex: 1,
  },
  vaTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
  },
  vaSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  accountBox: {
    backgroundColor: Colors.canvas,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountBoxLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  accountBoxValue: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  vaHelper: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  securityNote: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  securityText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
