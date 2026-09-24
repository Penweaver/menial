import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EmployerDiscoverStackParamList } from '../../../navigation/types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { TopBar } from '../../../components/common/TopBar';
import { ApiService } from '../../../services/api';

type RouteProps = RouteProp<EmployerDiscoverStackParamList, 'EscrowPayment'>;
type NavProp = NativeStackNavigationProp<EmployerDiscoverStackParamList, 'EscrowPayment'>;

type PaymentMethod = 'transfer' | 'card' | 'wallet';

export const EscrowPaymentScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();

  const {
    jobId,
    publicJobId = 'MNL-2026-8921',
    workerId,
    workerName,
    jobTitle,
    workerPayKobo,
    workerCount = 1,
    platformFeeKobo = Math.round(workerPayKobo * workerCount * 0.1),
    totalEscrowKobo = (workerPayKobo * workerCount) + platformFeeKobo,
  } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('transfer');
  const [processing, setProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paymentReference, setPaymentReference] = useState<string>('');

  const handlePaystackPayment = async () => {
    setProcessing(true);
    try {
      // 1. Initialize escrow payment via backend PaymentService (§37, §39)
      const initResult = await ApiService.initializeEscrowPayment({
        jobId,
        publicJobId,
        amountKobo: totalEscrowKobo,
        employerEmail: 'employer@acme.ng',
        employerPhone: '+2348098765432',
      });

      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize escrow payment');
      }

      setPaymentReference(initResult.providerReference);

      // 2. Simulate Paystack checkout confirmation & Webhook verification (§39, §44)
      const confirmResult = await ApiService.confirmEscrowPayment(
        initResult.providerReference,
        totalEscrowKobo,
        jobId
      );

      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Payment verification failed');
      }

      setPaymentSuccess(true);
    } catch (err) {
      console.error('Payment Error:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar
        title="Pay & Security"
        onBack={() => navigation.goBack()}
        rightAction={<Text style={styles.stepIndicator}>Step 6 of 7</Text>}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Job Summary Snapshot Card per Stitch */}
        <Card style={styles.snapshotCard}>
          <View style={styles.snapshotTop}>
            <View style={styles.categoryIconBox}>
              <Text style={styles.categoryEmoji}>🚚</Text>
            </View>
            <View style={styles.snapshotTitles}>
              <Text style={styles.categoryLabel}>JOB SUMMARY</Text>
              <Text style={styles.snapshotJobTitle}>{jobTitle}</Text>
            </View>
            <View style={styles.urgentPill}>
              <Text style={styles.urgentText}>⚡ Protected</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.snapshotDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>Plot 14, Admiralty Way, Lekki Phase 1, Lagos</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>👤</Text>
              <Text style={styles.detailText}>Assigned Artisan: <Text style={styles.boldText}>{workerName}</Text></Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>👥</Text>
              <Text style={styles.detailText}>{workerCount} Worker needed · Job Ref: {publicJobId}</Text>
            </View>
          </View>
        </Card>

        {/* 2. Escrow Guarantee Callout per Stitch */}
        <View style={styles.escrowCallout}>
          <Text style={styles.escrowShield}>🛡️</Text>
          <View style={styles.escrowCalloutContent}>
            <Text style={styles.escrowCalloutTitle}>menial Escrow Protection</Text>
            <Text style={styles.escrowCalloutText}>
              Payment is held securely by menial. Your money is only released to {workerName} after you inspect and confirm the job is completed satisfactorily.
            </Text>
          </View>
        </View>

        {/* 3. Financial Fee Breakdown Card */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>FEE BREAKDOWN</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Worker Total ({workerCount} worker)</Text>
            <Text style={styles.breakdownValue}>
              {formatKoboToNaira(workerPayKobo * workerCount)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.platformFeeLabelRow}>
              <Text style={styles.breakdownLabel}>Menial Platform & Insurance Fee</Text>
              <View style={styles.trustShieldPill}>
                <Text style={styles.trustShieldText}>TrustShield</Text>
              </View>
            </View>
            <Text style={styles.breakdownValue}>
              {formatKoboToNaira(platformFeeKobo)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalAmount}>
              {formatKoboToNaira(totalEscrowKobo)}
            </Text>
          </View>
        </Card>

        {/* 4. Payment Method Selector per Stitch */}
        <Card style={styles.paymentMethodsCard}>
          <View style={styles.paymentMethodHeader}>
            <Text style={styles.sectionHeaderTitle}>Select Payment Method</Text>
            <Text style={styles.encryptedNotice}>🔒 256-bit Encrypted</Text>
          </View>

          {/* Option 1: Instant Bank Transfer */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'transfer' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('transfer')}
            activeOpacity={0.8}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <Text style={styles.methodIcon}>🏦</Text>
              </View>
              <View>
                <View style={styles.methodTitleRow}>
                  <Text style={styles.methodTitle}>Instant Bank Transfer</Text>
                  <View style={styles.fastestPill}>
                    <Text style={styles.fastestText}>Fastest</Text>
                  </View>
                </View>
                <Text style={styles.methodSubtitle}>Dedicated Dynamic Virtual Account</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedMethod === 'transfer' && styles.radioCircleSelected]}>
              {selectedMethod === 'transfer' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Option 2: Menial Wallet Balance */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'wallet' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <Text style={styles.methodIcon}>👛</Text>
              </View>
              <View>
                <Text style={styles.methodTitle}>menial Wallet Balance</Text>
                <Text style={styles.walletBalanceText}>₦34,500 available</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedMethod === 'wallet' && styles.radioCircleSelected]}>
              {selectedMethod === 'wallet' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Option 3: Debit Card */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'card' && styles.methodCardSelected,
            ]}
            onPress={() => setSelectedMethod('card')}
            activeOpacity={0.8}
          >
            <View style={styles.methodLeft}>
              <View style={styles.methodIconBox}>
                <Text style={styles.methodIcon}>💳</Text>
              </View>
              <View>
                <Text style={styles.methodTitle}>Debit Card</Text>
                <Text style={styles.methodSubtitle}>Mastercard, Visa, or Verve via Paystack</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedMethod === 'card' && styles.radioCircleSelected]}>
              {selectedMethod === 'card' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        </Card>

        {/* 5. Institutional Trust Badges */}
        <View style={styles.trustBadgesRow}>
          <View style={styles.trustBadgeCard}>
            <Text style={styles.trustBadgeIcon}>📜</Text>
            <Text style={styles.trustBadgeTitle}>NDPA Compliant</Text>
          </View>
          <View style={styles.trustBadgeCard}>
            <Text style={styles.trustBadgeIcon}>🔐</Text>
            <Text style={styles.trustBadgeTitle}>Bank Grade Security</Text>
          </View>
          <View style={styles.trustBadgeCard}>
            <Text style={styles.trustBadgeIcon}>🤝</Text>
            <Text style={styles.trustBadgeTitle}>100% Escrow Guarantee</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Shelf with 52px Primary CTA */}
      <View style={styles.bottomShelf}>
        <Button
          title={
            processing
              ? 'Securing Escrow with Paystack...'
              : `Authorize & Secure ${formatKoboToNaira(totalEscrowKobo)}`
          }
          variant="primary"
          onPress={handlePaystackPayment}
          disabled={processing}
          style={styles.payBtn}
        />
        <Text style={styles.cancelPolicyNotice}>
          ✓ Free cancellation until worker arrives at job location
        </Text>
      </View>

      {/* Payment Success Modal */}
      <Modal visible={paymentSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successEmoji}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Escrow Secured!</Text>
            <Text style={styles.successAmount}>{formatKoboToNaira(totalEscrowKobo)}</Text>
            <Text style={styles.successDesc}>
              Funds have been securely locked in escrow with Paystack.
              {'\n\n'}
              <Text style={styles.boldText}>{workerName}</Text> has been notified and scheduled for your job.
            </Text>

            <View style={styles.refBox}>
              <Text style={styles.refLabel}>ESCROW REFERENCE</Text>
              <Text style={styles.refValue}>{paymentReference || 'MOCK_REF_SECURED'}</Text>
            </View>

            <Button
              title="Return to Discovery Feed"
              variant="primary"
              onPress={() => {
                setPaymentSuccess(false);
                navigation.navigate('WorkerDiscovery');
              }}
              style={styles.modalBtn}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  stepIndicator: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 130,
    gap: SPACING.md,
  },
  snapshotCard: {
    padding: SPACING.md,
  },
  snapshotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  snapshotTitles: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  snapshotJobTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  urgentPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  snapshotDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailIcon: {
    fontSize: 14,
  },
  detailText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  escrowCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E0F2FE',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: SPACING.sm,
  },
  escrowShield: {
    fontSize: 24,
    marginTop: 2,
  },
  escrowCalloutContent: {
    flex: 1,
  },
  escrowCalloutTitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.primary,
  },
  escrowCalloutText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: '#0369A1',
    lineHeight: 18,
    marginTop: 2,
  },
  breakdownCard: {
    padding: SPACING.md,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  breakdownLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
  },
  platformFeeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustShieldPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  trustShieldText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369A1',
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalAmount: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  paymentMethodsCard: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionHeaderTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  encryptedNotice: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  methodIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIcon: {
    fontSize: 18,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodTitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fastestPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  fastestText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  methodSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  walletBalanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  trustBadgeCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  trustBadgeIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  trustBadgeTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  bottomShelf: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: SPACING.xs,
  },
  payBtn: {
    height: 52,
  },
  cancelPolicyNotice: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    padding: SPACING.xl,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
    marginVertical: SPACING.xs,
  },
  successDesc: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  refBox: {
    backgroundColor: COLORS.canvas,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
  },
  refLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  modalBtn: {
    width: '100%',
    height: 52,
  },
});
