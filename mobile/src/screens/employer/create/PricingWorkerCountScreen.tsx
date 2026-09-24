import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radii, formatKoboToNaira } from '../../../constants/theme';
import { StepProgressHeader } from '../../../components/common/StepProgressHeader';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { useJobCreation } from '../../../context/JobCreationContext';

interface PricingWorkerCountScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const PricingWorkerCountScreen: React.FC<PricingWorkerCountScreenProps> = ({
  onNext,
  onBack,
}) => {
  const { draft, updateDraft, pricing, platformFeePercent } = useJobCreation();

  const [workerCount, setWorkerCount] = useState<number>(draft.numberOfWorkers || 1);
  const [rateNaira, setRateNaira] = useState<string>(
    draft.workerPayKobo ? String(Math.floor(draft.workerPayKobo / 100)) : '3500'
  );
  const [error, setError] = useState<string | null>(null);

  const incrementWorkers = () => {
    if (workerCount < 10) {
      const next = workerCount + 1;
      setWorkerCount(next);
      updateDraft({ numberOfWorkers: next });
    }
  };

  const decrementWorkers = () => {
    if (workerCount > 1) {
      const prev = workerCount - 1;
      setWorkerCount(prev);
      updateDraft({ numberOfWorkers: prev });
    }
  };

  const handleRateChange = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    setRateNaira(numeric);
    const parsed = parseInt(numeric || '0', 10);
    // update workerPayKobo immediately for live calculation
    updateDraft({ workerPayKobo: parsed * 100 });
  };

  const handleNext = () => {
    setError(null);
    const parsed = parseInt(rateNaira || '0', 10);
    if (isNaN(parsed) || parsed < 500) {
      setError('Please enter a valid pay per worker (minimum ₦500).');
      return;
    }

    updateDraft({
      numberOfWorkers: workerCount,
      workerPayKobo: parsed * 100,
    });

    onNext();
  };

  return (
    <View style={styles.container}>
      <StepProgressHeader
        currentStep={4}
        totalSteps={5}
        stepTitle="Workers & Escrow Pay"
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Workers & Proposed Pay</Text>
          <Text style={styles.subtitle}>
            Set the number of hands needed and the rate per worker.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. Worker Count Stepper */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Number of Workers Needed</Text>
            <Badge label={`${workerCount} WORKER${workerCount > 1 ? 'S' : ''}`} type="neutral" />
          </View>
          <Text style={styles.sectionHint}>
            How many laborers or artisans are required on site?
          </Text>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              onPress={decrementWorkers}
              disabled={workerCount <= 1}
              style={[styles.stepperButton, workerCount <= 1 && styles.stepperButtonDisabled]}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>

            <View style={styles.stepperValueContainer}>
              <Text style={styles.stepperValueText}>{workerCount}</Text>
              <Text style={styles.stepperValueSub}>
                {workerCount === 1 ? 'Worker' : 'Workers'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={incrementWorkers}
              disabled={workerCount >= 10}
              style={[styles.stepperButton, workerCount >= 10 && styles.stepperButtonDisabled]}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Section 29 Per-Worker Pay Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Proposed Pay Per Worker</Text>
            <Badge label="PER-WORKER RATE (§29)" type="verified" />
          </View>
          <Text style={styles.sectionHint}>
            This rate will be offered to each individual worker (not split between them).
          </Text>

          <Input
            placeholder="3500"
            value={rateNaira}
            onChangeText={handleRateChange}
            keyboardType="number-pad"
            style={styles.payInput}
          />

          <View style={styles.perWorkerReminder}>
            <Text style={styles.perWorkerReminderText}>
              Each of the <Text style={styles.boldText}>{workerCount}</Text> worker(s) will receive{' '}
              <Text style={styles.boldText}>
                ₦{parseInt(rateNaira || '0', 10).toLocaleString('en-NG')}
              </Text>.
            </Text>
          </View>
        </View>

        {/* 3. Section 29 Financial Breakdown Card */}
        <Card style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>Fee Breakdown & Escrow Total</Text>
            <Badge label={`${platformFeePercent}% FEE`} type="escrow" />
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>
              Worker Total ({workerCount} × {formatKoboToNaira(pricing.workerPayKobo)}):
            </Text>
            <Text style={styles.calcValue}>{formatKoboToNaira(pricing.subtotalKobo)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Menial Platform Fee ({platformFeePercent}%):</Text>
            <Text style={styles.calcValue}>{formatKoboToNaira(pricing.platformFeeKobo)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total Escrow Payable</Text>
              <Text style={styles.totalSub}>Held securely before worker dispatch</Text>
            </View>
            <Text style={styles.totalAmount}>
              {formatKoboToNaira(pricing.totalAmountKobo)}
            </Text>
          </View>
        </Card>

        {/* Section 29 Mandatory Transparency Banner */}
        <View style={styles.transparencyBanner}>
          <Text style={styles.transparencyIcon}>ℹ️</Text>
          <Text style={styles.transparencyText}>
            <Text style={styles.boldText}>Section 29 Rule:</Text> Proposed pay is an individual per-worker amount, not a lump sum to be shared. Total cost equals worker pay × count + platform fee.
          </Text>
        </View>

        <Button
          title="Next: Review & Publish"
          onPress={handleNext}
          style={styles.submitButton}
        />
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.scale.headlineLgMobile,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    fontWeight: '500',
  },
  section: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
  },
  sectionHint: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    fontSize: 24,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  stepperValueContainer: {
    alignItems: 'center',
  },
  stepperValueText: {
    ...Typography.scale.headlineMd,
    color: Colors.primary,
    fontWeight: '800',
  },
  stepperValueSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  payInput: {
    ...Typography.scale.headlineSm,
    fontWeight: '700',
  },
  perWorkerReminder: {
    backgroundColor: Colors.primaryContainer,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: -Spacing.xs,
  },
  perWorkerReminderText: {
    ...Typography.scale.bodySm,
    color: Colors.primary,
    fontSize: 12,
  },
  pricingCard: {
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pricingTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  calcLabel: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
  },
  calcValue: {
    ...Typography.scale.bodyMd,
    color: Colors.textPrimary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    ...Typography.scale.headlineSm,
    color: Colors.primary,
  },
  totalSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  totalAmount: {
    ...Typography.scale.currencyDisplay,
    color: Colors.primary,
  },
  transparencyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  transparencyIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  transparencyText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
    fontSize: 11,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
});
