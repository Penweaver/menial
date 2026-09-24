/**
 * Menial Mobile - Worker Account Deletion & NDPA Erasure Screen
 * 
 * Standardized complete account deletion and deactivation workflow.
 * Conforms to NDPA 2023 §80 (Right to Erasure) and CBN Financial Regulations (§41, §44, §85).
 * Enforces pre-flight checks: active job blocking, unwithdrawn wallet balance warnings,
 * reason capture, explicit confirmation verification, and session teardown.
 */

import React, { useState, useEffect } from 'react';
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
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { useAuth } from '../../../context/AuthContext';
import { ApiService, WorkerEarningsSummary } from '../../../services/api';
import { WorkerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'DeleteAccount'>;
};

const LEAVING_REASONS = [
  'Found permanent full-time employment',
  'Relocating from current coverage area',
  'App usability or technical issues',
  'Privacy or personal data concerns',
  'Taking a temporary break',
  'Other reasons',
];

export const WorkerDeleteAccountScreen: React.FC<Props> = ({ navigation }) => {
  const { session, deleteAccount } = useAuth();

  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [earnings, setEarnings] = useState<WorkerEarningsSummary>({
    availableBalanceKobo: 0,
    pendingEscrowKobo: 0,
    lifetimeEarningsKobo: 0,
    totalWithdrawnKobo: 0,
  });
  const [selectedReason, setSelectedReason] = useState<string>(LEAVING_REASONS[0]);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const job = ApiService.getActiveJob();
    const hasOngoingJob = job && !['completed', 'cancelled', 'expired'].includes(job.status);
    setActiveJob(hasOngoingJob ? job : null);

    const workerId = session?.userId || 'worker_adebayo';
    const summary = ApiService.getWorkerEarningsSummary(workerId);
    setEarnings(summary);
  }, [session]);

  const hasActiveJob = !!activeJob;
  const hasAvailableBalance = earnings.availableBalanceKobo > 0;
  const isConfirmValid = confirmInput.trim().toUpperCase() === 'DELETE';
  const canProceedWithDelete = !hasActiveJob && isConfirmValid && !isDeleting;

  const handleConfirmDelete = () => {
    if (hasActiveJob) {
      Alert.alert(
        'Active Job In Progress',
        'You have an ongoing job. You must complete or resolve this assignment before closing your account.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Permanent Account Deletion',
      'Are you completely certain? This action is permanent and irreversible. Your profile, ratings, and work history will be erased in accordance with NDPA 2023 regulations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: executeDeletion,
        },
      ]
    );
  };

  const executeDeletion = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const result = await deleteAccount(selectedReason);
      if (!result.success) {
        setError(result.error || 'Failed to delete account.');
        setIsDeleting(false);
        return;
      }

      // Successful deletion logs out and returns to root auth stack
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Delete Account" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={styles.warningCard}>
          <Text style={styles.warningEmoji}>⚠️</Text>
          <View style={styles.warningTextGroup}>
            <Text style={styles.warningTitle}>Permanent Action</Text>
            <Text style={styles.warningDesc}>
              Deleting your account will permanently remove your worker profile, verification status, and ratings from the marketplace.
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Pre-flight Check 1: Active Job Blocker */}
        {hasActiveJob && (
          <Card style={styles.blockerCard}>
            <View style={styles.blockerHeader}>
              <Text style={styles.blockerEmoji}>🚫</Text>
              <View style={styles.blockerTitleGroup}>
                <Text style={styles.blockerTitle}>Deletion Blocked: Active Job</Text>
                <Text style={styles.blockerSub}>Job: {activeJob.title} ({activeJob.publicJobId})</Text>
              </View>
            </View>
            <Text style={styles.blockerDesc}>
              Under Menial terms, you cannot delete your account while assigned to an active assignment. Please complete work or contact support to resolve.
            </Text>
          </Card>
        )}

        {/* Pre-flight Check 2: Unwithdrawn Balance Warning */}
        {hasAvailableBalance && (
          <Card style={styles.balanceWarningCard}>
            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.balanceLabel}>AVAILABLE WALLET BALANCE</Text>
                <Text style={styles.balanceAmount}>
                  {formatKoboToNaira(earnings.availableBalanceKobo)}
                </Text>
              </View>
              <Button
                title="Cash Out"
                variant="outline"
                onPress={() => navigation.navigate('PayoutSettings')}
                style={styles.cashOutBtn}
              />
            </View>
            <Text style={styles.balanceDesc}>
              You still have unwithdrawn funds in your wallet. We strongly recommend withdrawing your earnings via NIP transfer before proceeding.
            </Text>
          </Card>
        )}

        {/* Reason for Deletion */}
        <Text style={styles.sectionHeader}>PLEASE TELL US WHY YOU ARE LEAVING</Text>
        <Card style={styles.card}>
          {LEAVING_REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.7}
                onPress={() => setSelectedReason(reason)}
                style={styles.reasonRow}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* NDPA Regulatory Disclosure */}
        <Text style={styles.sectionHeader}>NDPA 2023 REGULATORY DISCLOSURE (§80)</Text>
        <Card style={styles.disclosureCard}>
          <Text style={styles.disclosureTitle}>What Happens to Your Data?</Text>
          <Text style={styles.disclosureItem}>
            ✓ <Text style={styles.boldText}>Erased immediately:</Text> Your profile, photo, bio, skills, location, search presence, and ratings.
          </Text>
          <Text style={styles.disclosureItem}>
            ✓ <Text style={styles.boldText}>Immutable financial records:</Text> Prior payment and payout ledger records are retained in compliance with CBN anti-money laundering and tax laws, with all personal identifiers irreversibly masked.
          </Text>
        </Card>

        {/* Confirmation Input Safeguard */}
        <Text style={styles.sectionHeader}>CONFIRM ACCOUNT CLOSURE</Text>
        <Card style={styles.card}>
          <Text style={styles.confirmPrompt}>
            Type <Text style={styles.confirmCode}>DELETE</Text> below to confirm:
          </Text>
          <Input
            value={confirmInput}
            onChangeText={setConfirmInput}
            placeholder="Type DELETE"
            autoCapitalize="characters"
          />
        </Card>

        {/* Action Buttons */}
        <Button
          title={isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
          variant="danger"
          onPress={handleConfirmDelete}
          loading={isDeleting}
          disabled={!canProceedWithDelete}
          style={styles.deleteBtn}
        />

        <Button
          title="Keep My Account"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
        />

        {/* Clean Standardized Screen Footer */}
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
  warningCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dangerContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
    marginBottom: Spacing.md,
  },
  warningEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  warningTextGroup: {
    flex: 1,
  },
  warningTitle: {
    ...Typography.scale.labelMd,
    color: Colors.dangerText,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 2,
  },
  warningDesc: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    fontSize: 11,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.scale.labelSm,
    color: Colors.dangerText,
    fontWeight: '700',
    fontSize: 12,
  },
  blockerCard: {
    backgroundColor: '#FEF2F2',
    borderColor: Colors.danger,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  blockerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  blockerEmoji: {
    fontSize: 20,
  },
  blockerTitleGroup: {
    flex: 1,
  },
  blockerTitle: {
    ...Typography.scale.labelMd,
    color: Colors.dangerText,
    fontWeight: '800',
    fontSize: 13,
  },
  blockerSub: {
    ...Typography.scale.bodySm,
    color: Colors.dangerText,
    fontSize: 11,
  },
  blockerDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  balanceWarningCard: {
    backgroundColor: Colors.secondaryContainer,
    borderColor: Colors.secondary,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceLabel: {
    ...Typography.scale.labelSm,
    fontSize: 10,
    color: Colors.secondaryText,
    fontWeight: '700',
  },
  balanceAmount: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  cashOutBtn: {
    height: 36,
    paddingHorizontal: Spacing.md,
  },
  balanceDesc: {
    ...Typography.scale.bodySm,
    color: Colors.secondaryText,
    fontSize: 11,
    lineHeight: 16,
  },
  sectionHeader: {
    ...Typography.scale.labelSm,
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  reasonText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  reasonTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  disclosureCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  disclosureTitle: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  disclosureItem: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  confirmPrompt: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  confirmCode: {
    fontWeight: '800',
    color: Colors.dangerText,
  },
  deleteBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cancelBtn: {
    marginBottom: Spacing.md,
  },
});
