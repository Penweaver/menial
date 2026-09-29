import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radii, formatKoboToNaira } from '../../../constants/theme';
import { StepProgressHeader } from '../../../components/common/StepProgressHeader';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { useJobCreation } from '../../../context/JobCreationContext';
import { ApiService } from '../../../services/api';

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

  const isCare = draft.categoryTier === 'care';
  const isTechnical =
    draft.categoryTier === 'technical_trade' || (draft.categoryTier as string) === 'technical';

  const safetyConfig = React.useMemo(() => {
    if (!draft.categoryTier || draft.categoryTier === 'standard') return null;
    return ApiService.getCategorySafetyConfig(
      draft.categoryName || 'General',
      draft.categoryTier
    );
  }, [draft.categoryName, draft.categoryTier]);

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

        {/* Category Safety Safeguards Card (§B.2, §B.3, §L) */}
        {safetyConfig && (
          <Card style={styles.safeguardCard}>
            <View style={styles.safeguardHeader}>
              <Text style={styles.safeguardIcon}>{isCare ? '🛡️' : '🔧'}</Text>
              <View style={styles.safeguardTitleGroup}>
                <Text style={styles.safeguardTitle}>
                  {isCare ? 'Care Safeguard Notice (§B.2)' : 'Technical Trade Safeguards (§B.3)'}
                </Text>
                <Text style={styles.safeguardSub}>
                  {isCare ? 'Vulnerable individual protection protocol' : 'Artisan liability & site isolation protocol'}
                </Text>
              </View>
            </View>

            {isCare && safetyConfig.requiresFirstBookingNotice && (
              <View style={styles.safeguardNoticeBox}>
                <Text style={styles.safeguardNoticeHeading}>Adult Presence Safeguard</Text>
                <Text style={styles.safeguardNoticeText}>
                  {safetyConfig.firstBookingNoticeText}
                </Text>
                <View style={styles.checkInRow}>
                  <Text style={styles.checkInIcon}>⏱️</Text>
                  <Text style={styles.checkInText}>
                    Active Monitoring: On-duty safety check-ins occur at {safetyConfig.elevatedCheckInThresholdHours}-hour intervals (§B.2).
                  </Text>
                </View>
              </View>
            )}

            {isTechnical && (
              <View style={styles.technicalSafetyBox}>
                {safetyConfig.disclaimer && (
                  <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerText}>{safetyConfig.disclaimer}</Text>
                  </View>
                )}

                {safetyConfig.preJobChecklist && safetyConfig.preJobChecklist.length > 0 && (
                  <View style={styles.checklistContainer}>
                    <Text style={styles.checklistHeading}>Mandatory Pre-Job Safety Checks:</Text>
                    {safetyConfig.preJobChecklist.map((item, index) => (
                      <View key={index} style={styles.checklistItemRow}>
                        <Text style={styles.checklistBullet}>✓</Text>
                        <Text style={styles.checklistItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Card>
        )}

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
  safeguardCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
  },
  safeguardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  safeguardIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  safeguardTitleGroup: {
    flex: 1,
  },
  safeguardTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  safeguardSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  safeguardNoticeBox: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  safeguardNoticeHeading: {
    ...Typography.scale.labelMd,
    color: Colors.secondaryText,
    fontWeight: '700',
    marginBottom: 4,
  },
  safeguardNoticeText: {
    ...Typography.scale.bodySm,
    color: Colors.secondaryText,
    lineHeight: 18,
    fontSize: 12,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(2, 132, 199, 0.2)',
  },
  checkInIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  checkInText: {
    ...Typography.scale.bodySm,
    color: Colors.secondaryText,
    fontWeight: '600',
    fontSize: 11,
  },
  technicalSafetyBox: {
    marginTop: Spacing.xs,
  },
  disclaimerBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.sm,
  },
  disclaimerText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
    fontSize: 11,
  },
  checklistContainer: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  checklistHeading: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  checklistBullet: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 6,
    marginTop: 1,
  },
  checklistItemText: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
