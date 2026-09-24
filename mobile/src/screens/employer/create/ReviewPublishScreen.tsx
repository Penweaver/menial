import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radii, formatKoboToNaira } from '../../../constants/theme';
import { StepProgressHeader } from '../../../components/common/StepProgressHeader';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { useJobCreation } from '../../../context/JobCreationContext';

interface ReviewPublishScreenProps {
  onSuccess: (jobId: string, publicJobId: string) => void;
  onBack: () => void;
}

export const ReviewPublishScreen: React.FC<ReviewPublishScreenProps> = ({
  onSuccess,
  onBack,
}) => {
  const { draft, pricing, platformFeePercent, submitAndPublishJob, isLoading } = useJobCreation();
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    setError(null);
    const result = await submitAndPublishJob();
    if (result.success && result.jobId && result.publicJobId) {
      onSuccess(result.jobId, result.publicJobId);
    } else {
      setError(result.error || 'Failed to publish job.');
    }
  };

  return (
    <View style={styles.container}>
      <StepProgressHeader
        currentStep={5}
        totalSteps={5}
        stepTitle="Review & Publish"
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Job Listing</Text>
          <Text style={styles.subtitle}>
            Check all details before broadcasting your task to nearby verified workers.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. Job Scope Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryIconCircle}>
              <Text style={styles.categoryIcon}>{draft.categoryIcon}</Text>
            </View>
            <View style={styles.categoryTextGroup}>
              <Text style={styles.categorySub}>SERVICE CATEGORY</Text>
              <Text style={styles.categoryTitle}>{draft.categoryName}</Text>
            </View>
            <Badge label="OPEN DRAFT" type="neutral" />
          </View>

          <View style={styles.divider} />

          <Text style={styles.jobTitle}>{draft.title || `${draft.categoryName} Task`}</Text>
          <Text style={styles.jobDescription}>{draft.description}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>
                {draft.locationText}, {draft.lga}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {draft.scheduledDate} at {draft.startTime} ({draft.durationMinutes / 60} hrs)
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👥</Text>
              <Text style={styles.infoText}>
                {draft.numberOfWorkers} Worker{draft.numberOfWorkers > 1 ? 's' : ''} needed
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. Section 29 Financial & Escrow Summary */}
        <Card style={styles.escrowCard}>
          <View style={styles.escrowHeader}>
            <Text style={styles.escrowTitle}>Transparent Escrow Breakdown (§29)</Text>
            <Badge label="100% ESCROW PROTECTED" type="verified" />
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Rate per Worker:</Text>
            <Text style={styles.feeValue}>{formatKoboToNaira(pricing.workerPayKobo)}</Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Number of Workers:</Text>
            <Text style={styles.feeValue}>{pricing.numberOfWorkers}</Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Worker Wages Subtotal:</Text>
            <Text style={styles.feeValue}>{formatKoboToNaira(pricing.subtotalKobo)}</Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Menial Platform Fee ({platformFeePercent}%):</Text>
            <Text style={styles.feeValue}>{formatKoboToNaira(pricing.platformFeeKobo)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalPayableRow}>
            <View>
              <Text style={styles.totalPayableLabel}>Total Escrow Cost</Text>
              <Text style={styles.totalPayableSub}>Secured before worker arrival</Text>
            </View>
            <Text style={styles.totalPayableAmount}>
              {formatKoboToNaira(pricing.totalAmountKobo)}
            </Text>
          </View>
        </Card>

        {/* Escrow Guarantee Banner */}
        <View style={styles.escrowGuaranteeCard}>
          <Text style={styles.escrowShieldIcon}>🛡️</Text>
          <View style={styles.escrowGuaranteeTextGroup}>
            <Text style={styles.escrowGuaranteeTitle}>Menial Escrow Guarantee</Text>
            <Text style={styles.escrowGuaranteeBody}>
              Your money is never sent directly to workers until you verify their arrival and confirm the job is finished satisfactorily (§37, §45).
            </Text>
          </View>
        </View>

        <Button
          title="Publish Job & Proceed to Escrow"
          variant="kinetic"
          onPress={handlePublish}
          loading={isLoading}
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
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryTextGroup: {
    flex: 1,
  },
  categorySub: {
    ...Typography.scale.labelSm,
    color: Colors.secondaryText,
    fontSize: 10,
  },
  categoryTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  jobTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  jobDescription: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  infoGrid: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  infoText: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    flex: 1,
  },
  escrowCard: {
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  escrowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  escrowTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  feeLabel: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
  },
  feeValue: {
    ...Typography.scale.bodyMd,
    color: Colors.textPrimary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  totalPayableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalPayableLabel: {
    ...Typography.scale.headlineSm,
    color: Colors.primary,
  },
  totalPayableSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  totalPayableAmount: {
    ...Typography.scale.currencyDisplay,
    color: Colors.primary,
  },
  escrowGuaranteeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.secondaryContainer,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: Spacing.xl,
  },
  escrowShieldIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  escrowGuaranteeTextGroup: {
    flex: 1,
  },
  escrowGuaranteeTitle: {
    ...Typography.scale.labelMd,
    color: Colors.secondaryText,
    fontWeight: '700',
    marginBottom: 2,
  },
  escrowGuaranteeBody: {
    ...Typography.scale.bodySm,
    color: Colors.secondaryText,
    lineHeight: 18,
    fontSize: 12,
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
});
