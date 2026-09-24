import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/theme';
import { TopBar } from '../../components/common/TopBar';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useWorker } from '../../context/WorkerContext';

interface VerificationStatusScreenProps {
  onStartVerification?: () => void;
  onExploreJobs?: () => void;
  onBack?: () => void;
}

export const VerificationStatusScreen: React.FC<VerificationStatusScreenProps> = ({
  onStartVerification,
  onExploreJobs,
  onBack,
}) => {
  const { verification, refreshStatus } = useWorker();
  const status = verification.status;

  return (
    <View style={styles.container}>
      <TopBar title="Verification Standing" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Hero Card */}
        <View style={styles.statusHeroCard}>
          {status === 'verified' && (
            <View style={styles.iconCircleVerified}>
              <Text style={styles.statusEmoji}>🛡️</Text>
            </View>
          )}
          {status === 'pending' && (
            <View style={styles.iconCirclePending}>
              <Text style={styles.statusEmoji}>⏳</Text>
            </View>
          )}
          {status === 'rejected' && (
            <View style={styles.iconCircleRejected}>
              <Text style={styles.statusEmoji}>❌</Text>
            </View>
          )}
          {status === 'unverified' && (
            <View style={styles.iconCircleUnverified}>
              <Text style={styles.statusEmoji}>📋</Text>
            </View>
          )}

          <Badge
            label={status === 'verified' ? 'VERIFIED PRO' : status.toUpperCase()}
            type={
              status === 'verified'
                ? 'verified'
                : status === 'pending'
                ? 'pending'
                : status === 'rejected'
                ? 'rejected'
                : 'neutral'
            }
            style={styles.heroBadge}
          />

          <Text style={styles.heroTitle}>
            {status === 'verified' && 'Identity Fully Verified'}
            {status === 'pending' && 'Verification Under Review'}
            {status === 'rejected' && 'Verification Needs Attention'}
            {status === 'unverified' && 'Verification Required'}
          </Text>

          <Text style={styles.heroDescription}>
            {status === 'verified' &&
              'Your government identity (NIN) has been confirmed against NIMC records. Your profile displays the verified badge to all employers.'}
            {status === 'pending' &&
              'Your submission is currently being reviewed by the Menial Trust & Safety operations team. Most reviews complete within 24 hours.'}
            {status === 'rejected' &&
              (verification.rejectionReason ||
                'Your document submission could not be verified. Please review the requirements and submit a clear photo.')}
            {status === 'unverified' &&
              'Submit your National Identity Number (NIN) to unlock nearby high-paying jobs and earn trust from verified employers.'}
          </Text>
        </View>

        {/* Verification Metadata Box */}
        {(status === 'pending' || status === 'verified') && (
          <Card style={styles.metaCard}>
            <Text style={styles.metaHeader}>Dossier Summary</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Document Type:</Text>
              <Text style={styles.metaValue}>
                {verification.documentType?.toUpperCase() || 'NIN'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Masked Number (§80):</Text>
              <Text style={styles.metaValue}>
                {verification.maskedIdNumber || '*******8901'}
              </Text>
            </View>
            {verification.submittedAt && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Submitted At:</Text>
                <Text style={styles.metaValue}>
                  {new Date(verification.submittedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Institutional Trust Explainer */}
        <View style={styles.trustExplainer}>
          <Text style={styles.trustTitle}>Why Identity Verification Matters</Text>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>💰</Text>
            <View style={styles.trustTextGroup}>
              <Text style={styles.trustItemTitle}>Higher Earnings</Text>
              <Text style={styles.trustItemDesc}>
                Verified workers get hired 4x faster and receive priority assignment on corporate and residential jobs.
              </Text>
            </View>
          </View>

          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <View style={styles.trustTextGroup}>
              <Text style={styles.trustItemTitle}>Guaranteed Escrow Payouts</Text>
              <Text style={styles.trustItemDesc}>
                All funds are secured in Menial escrow before you start work, with instant direct bank cashout.
              </Text>
            </View>
          </View>
        </View>

        {/* Action CTAs */}
        <View style={styles.actionContainer}>
          {status === 'unverified' && (
            <Button
              title="Start NIN Verification"
              onPress={onStartVerification || (() => {})}
              style={styles.actionButton}
            />
          )}

          {status === 'rejected' && (
            <Button
              title="Resubmit Verification"
              onPress={onStartVerification || (() => {})}
              style={styles.actionButton}
            />
          )}

          {status === 'pending' && (
            <Button
              title="Check Latest Status"
              variant="outline"
              onPress={refreshStatus}
              style={styles.actionButton}
            />
          )}

          {status === 'verified' && (
            <Button
              title="Browse Available Jobs"
              onPress={onExploreJobs || (() => {})}
              style={styles.actionButton}
            />
          )}
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
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  statusHeroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  iconCircleVerified: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconCirclePending: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    backgroundColor: Colors.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconCircleRejected: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    backgroundColor: Colors.dangerContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconCircleUnverified: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statusEmoji: {
    fontSize: 36,
  },
  heroBadge: {
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroDescription: {
    ...Typography.scale.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },
  metaCard: {
    marginBottom: Spacing.lg,
  },
  metaHeader: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metaLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  metaValue: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  trustExplainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  trustTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  trustIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  trustTextGroup: {
    flex: 1,
  },
  trustItemTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  trustItemDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: Spacing.sm,
  },
  actionButton: {
    marginBottom: Spacing.md,
  },
});
