/**
 * Menial Mobile - Employer Account Deletion & NDPA Erasure Screen
 * 
 * Standardized complete account deletion and deactivation workflow for employers.
 * Conforms to NDPA 2023 §80 (Right to Erasure) and CBN Financial Regulations (§38, §41, §85).
 * Enforces pre-flight checks: active funded job blocking, reason capture, explicit confirmation verification,
 * CBN financial retention disclosures, and session teardown.
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
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Card } from '../../../components/common/Card';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { useAuth } from '../../../context/AuthContext';
import { ApiService } from '../../../services/api';
import { EmployerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerProfileStackParamList, 'DeleteAccount'>;
};

const LEAVING_REASONS = [
  'No longer hiring temporary or domestic staff',
  'Moving out of service coverage area',
  'Using alternative recruitment channels',
  'Billing or pricing concerns',
  'Privacy or personal data concerns',
  'Taking a temporary hiatus',
  'Other reasons',
];

export const EmployerDeleteAccountScreen: React.FC<Props> = ({ navigation }) => {
  const { deleteAccount } = useAuth();

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>(LEAVING_REASONS[0]);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const jobs = ApiService.getEmployerJobHistory();
    const ongoing = jobs.filter((j) =>
      ['payment_secured', 'assigned', 'in_progress', 'travelling', 'arrived'].includes(j.status)
    );
    setActiveJobs(ongoing);
  }, []);

  const hasActiveJobs = activeJobs.length > 0;
  const isConfirmValid = confirmInput.trim().toUpperCase() === 'DELETE';
  const canProceedWithDelete = !hasActiveJobs && isConfirmValid && !isDeleting;

  const handleConfirmDelete = () => {
    if (hasActiveJobs) {
      Alert.alert(
        'Active Funded Jobs in Progress',
        `You have ${activeJobs.length} ongoing funded job(s). You must complete or cancel all active assignments before deleting your employer account.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Permanent Account Deletion',
      'Are you completely certain? This action is permanent and irreversible. Your organization profile, saved payment methods, and job listings will be purged under NDPA 2023 §80.',
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
      setError(err.message || 'An unexpected error occurred during account erasure.');
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Delete Employer Account" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <Card style={styles.dangerBanner}>
          <View style={styles.dangerHeader}>
            <Text style={styles.dangerEmoji}>⚠️</Text>
            <View style={styles.dangerTextGroup}>
              <Text style={styles.dangerTitle}>Permanent Account Deletion</Text>
              <Text style={styles.dangerSubtitle}>NDPA 2023 §80 Right to Erasure</Text>
            </View>
          </View>
          <Text style={styles.dangerBody}>
            Deleting your Menial Employer account permanently erases your entity profile, default site addresses, saved payment cards, and unfulfilled job postings.
          </Text>
        </Card>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 1. Pre-flight Check: Active Funded Jobs */}
        {hasActiveJobs && (
          <Card style={styles.blockerCard}>
            <View style={styles.blockerHeader}>
              <Text style={styles.blockerEmoji}>🚫</Text>
              <View style={styles.blockerTextGroup}>
                <Text style={styles.blockerTitle}>Deletion Blocked: Active Job in Progress</Text>
                <Text style={styles.blockerDesc}>
                  You have {activeJobs.length} active assignment with funds locked in escrow. Section 38 requires completing or mutually cancelling all ongoing jobs first.
                </Text>
              </View>
            </View>
            <View style={styles.activeJobPreview}>
              <Text style={styles.jobPreviewTitle}>{activeJobs[0].title}</Text>
              <Badge label="ESCROW SECURED" type="pending" />
            </View>
          </Card>
        )}

        {/* 2. Reason for Leaving Survey */}
        <Text style={styles.sectionHeader}>WHY ARE YOU CLOSING YOUR ACCOUNT?</Text>
        <Card style={styles.card}>
          {LEAVING_REASONS.map((reason, index) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonRow,
                  index < LEAVING_REASONS.length - 1 && styles.reasonRowBorder,
                ]}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
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

        {/* 3. Regulatory Disclosures & Impact */}
        <Text style={styles.sectionHeader}>WHAT HAPPENS WHEN YOU DELETE</Text>
        <Card style={styles.card}>
          <View style={styles.disclosureItem}>
            <Text style={styles.disclosureBullet}>•</Text>
            <Text style={styles.disclosureText}>
              <Text style={styles.boldText}>Entity Profile &amp; Job History:</Text> Your organization details and active listings will be immediately purged from public view.
            </Text>
          </View>

          <View style={styles.disclosureItem}>
            <Text style={styles.disclosureBullet}>•</Text>
            <Text style={styles.disclosureText}>
              <Text style={styles.boldText}>Payment Methods:</Text> All tokenized cards and dedicated virtual accounts are detached and destroyed.
            </Text>
          </View>

          <View style={styles.disclosureItem}>
            <Text style={styles.disclosureBullet}>•</Text>
            <Text style={styles.disclosureText}>
              <Text style={styles.boldText}>CBN Regulatory Retention:</Text> Financial escrow records, VAT invoices, and audit logs are retained for 7 years as required by CBN Anti-Money Laundering Regulations (§41, §85).
            </Text>
          </View>
        </Card>

        {/* 4. Verification Check */}
        <Text style={styles.sectionHeader}>CONFIRMATION REQUIRED</Text>
        <Card style={styles.card}>
          <Text style={styles.confirmInstruction}>
            To confirm permanent deletion, type <Text style={styles.deleteKeyword}>DELETE</Text> in the field below:
          </Text>
          <Input
            placeholder="Type DELETE to confirm"
            value={confirmInput}
            onChangeText={setConfirmInput}
            autoCapitalize="characters"
            containerStyle={styles.confirmInput}
          />
        </Card>

        {/* 5. Destructive Action Buttons */}
        <Button
          title={isDeleting ? 'Deleting Account...' : 'Permanently Delete Employer Account'}
          variant="danger"
          size="lg"
          onPress={handleConfirmDelete}
          disabled={!canProceedWithDelete}
          loading={isDeleting}
          style={styles.deleteBtn}
        />

        <Button
          title="Cancel & Keep My Account"
          variant="outline"
          size="lg"
          onPress={() => navigation.goBack()}
          disabled={isDeleting}
          style={styles.cancelBtn}
        />

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
  dangerBanner: {
    backgroundColor: Colors.dangerContainer,
    borderColor: Colors.danger,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dangerEmoji: {
    fontSize: 24,
  },
  dangerTextGroup: {
    flex: 1,
  },
  dangerTitle: {
    ...Typography.scale.labelLg,
    color: Colors.danger,
    fontWeight: '700',
  },
  dangerSubtitle: {
    ...Typography.scale.bodySm,
    color: Colors.danger,
    fontSize: 12,
  },
  dangerBody: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: Colors.dangerContainer,
    borderColor: Colors.danger,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.scale.bodySm,
    color: Colors.danger,
    fontWeight: '500',
    textAlign: 'center',
  },
  blockerCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.tertiary,
    borderWidth: 1.5,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  blockerHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  blockerEmoji: {
    fontSize: 24,
  },
  blockerTextGroup: {
    flex: 1,
  },
  blockerTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  blockerDesc: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  activeJobPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.canvas,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  jobPreviewTitle: {
    ...Typography.scale.labelSm,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
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
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  reasonRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.danger,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.danger,
  },
  reasonText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    flex: 1,
  },
  reasonTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  disclosureItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  disclosureBullet: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  disclosureText: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  boldText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  confirmInstruction: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  deleteKeyword: {
    color: Colors.danger,
    fontWeight: '700',
  },
  confirmInput: {
    marginBottom: 0,
  },
  deleteBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cancelBtn: {
    marginBottom: Spacing.lg,
  },
});
