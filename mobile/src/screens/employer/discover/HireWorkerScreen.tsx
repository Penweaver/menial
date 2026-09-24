import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EmployerDiscoverStackParamList } from '../../../navigation/types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { TopBar } from '../../../components/common/TopBar';
import { Input } from '../../../components/common/Input';
import { ApiService, SEED_CATEGORIES } from '../../../services/api';
import type { JobPricingBreakdown } from '@shared/services/job/JobService';

type RouteProps = RouteProp<EmployerDiscoverStackParamList, 'HireWorker'>;
type NavProp = NativeStackNavigationProp<EmployerDiscoverStackParamList, 'HireWorker'>;

export const HireWorkerScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { workerId } = route.params;

  const worker = ApiService.getWorkerById(workerId);

  const [jobTitle, setJobTitle] = useState<string>('Standard Service Shift');
  const [scheduledDate, setScheduledDate] = useState<string>('Today, 2:00 PM');
  const [workerPayNaira, setWorkerPayNaira] = useState<string>(
    String((worker?.indicativeRate ?? 350000) / 100)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(10);
  const [pricing, setPricing] = useState<JobPricingBreakdown | null>(null);

  useEffect(() => {
    ApiService.getPlatformFeePercentage().then((fee) => setPlatformFeePercent(fee));
  }, []);

  const workerPayKobo = (parseInt(workerPayNaira.replace(/[^0-9]/g, ''), 10) || 0) * 100;

  useEffect(() => {
    const calc = ApiService.calculateJobPricing(workerPayKobo, 1, platformFeePercent);
    setPricing(calc);
  }, [workerPayKobo, platformFeePercent]);

  if (!worker) {
    return (
      <View style={styles.container}>
        <TopBar title="Hire Worker" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Worker not found.</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const handleProceedToEscrow = async () => {
    if (workerPayKobo < 100000) {
      Alert.alert('Invalid Pay', 'Minimum pay is ₦1,000 (100,000 kobo).');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create direct job draft
      const primaryCategory = worker.categoryIds[0] || 'cat_cleaning';
      const created = await ApiService.createJob({
        categoryId: primaryCategory,
        title: jobTitle,
        description: `Direct booking with verified worker ${worker.fullName}`,
        locationText: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        durationMinutes: 240,
        numberOfWorkers: 1,
        workerPayKobo,
      });

      // 2. Hire worker for job (§35)
      await ApiService.hireWorker({
        jobId: created.jobId,
        workerId: worker.id,
        agreedAmountKobo: workerPayKobo,
      });

      // 3. Navigate to Escrow checkout screen
      navigation.navigate('EscrowPayment', {
        jobId: created.jobId,
        publicJobId: created.publicJobId,
        workerId: worker.id,
        workerName: worker.fullName,
        jobTitle,
        workerPayKobo,
        workerCount: 1,
        platformFeeKobo: pricing?.platformFeeKobo,
        totalEscrowKobo: pricing?.totalAmountKobo,
      });
    } catch (err) {
      Alert.alert('Booking Error', (err as Error).message || 'Failed to initialize booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Book & Hire Worker" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Worker Summary Card */}
        <Card style={styles.workerSummaryCard}>
          <View style={styles.workerRow}>
            <View style={styles.avatarMiniFallback}>
              <Text style={styles.avatarInitials}>
                {worker.fullName.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{worker.fullName}</Text>
              <Text style={styles.workerMeta}>★ {worker.ratingAvg.toFixed(1)} · {worker.locationName}</Text>
              <Text style={styles.verifiedTag}>✓ NIN Verified Artisan</Text>
            </View>
          </View>
        </Card>

        {/* Section 39 Escrow Notice */}
        <View style={styles.escrowNotice}>
          <Text style={styles.escrowIcon}>🔒</Text>
          <View style={styles.escrowNoticeContent}>
            <Text style={styles.escrowNoticeTitle}>Protected by Menial Escrow</Text>
            <Text style={styles.escrowNoticeDesc}>
              Funds are held securely and will only be disbursed to {worker.fullName} when you confirm completion.
            </Text>
          </View>
        </View>

        {/* Job Parameters */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Engagement Details</Text>

          <Input
            label="Job / Task Title"
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. Deep Home Cleaning"
          />

          <Input
            label="Schedule / Timing"
            value={scheduledDate}
            onChangeText={setScheduledDate}
            placeholder="Today, 2:00 PM"
          />

          <Input
            label="Agreed Pay to Worker (₦)"
            value={workerPayNaira}
            onChangeText={setWorkerPayNaira}
            keyboardType="numeric"
            placeholder="3500"
          />
          <Text style={styles.helperNotice}>
            Section 29: 100% of this amount goes directly to the worker.
          </Text>
        </Card>

        {/* Pricing Breakdown Card */}
        {pricing ? (
          <Card style={styles.pricingCard}>
            <Text style={styles.cardTitle}>Escrow Deposit Breakdown</Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Worker Pay (1 worker)</Text>
              <Text style={styles.priceValue}>{formatKoboToNaira(pricing.subtotalKobo)}</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform & Escrow Fee ({platformFeePercent}%)</Text>
              <Text style={styles.priceValue}>{formatKoboToNaira(pricing.platformFeeKobo)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Escrow Deposit</Text>
              <Text style={styles.totalValue}>{formatKoboToNaira(pricing.totalAmountKobo)}</Text>
            </View>
          </Card>
        ) : null}
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.bottomBar}>
        <Button
          title={submitting ? 'Preparing Escrow...' : `Proceed to Escrow (${formatKoboToNaira(pricing?.totalAmountKobo || 0)})`}
          variant="primary"
          onPress={handleProceedToEscrow}
          disabled={submitting}
          style={styles.ctaBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 110,
    gap: SPACING.md,
  },
  workerSummaryCard: {
    padding: SPACING.md,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarMiniFallback: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  workerMeta: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verifiedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    marginTop: 3,
  },
  escrowNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: SPACING.sm,
  },
  escrowIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  escrowNoticeContent: {
    flex: 1,
  },
  escrowNoticeTitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: '#065F46',
  },
  escrowNoticeDesc: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
    marginTop: 2,
  },
  card: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  pricingCard: {
    padding: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  priceLabel: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  ctaBtn: {
    height: 52,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
  helperNotice: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.xs,
  },
});
