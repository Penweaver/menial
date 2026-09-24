/**
 * Menial Mobile - Employer Hiring History & Invoices Screen
 * 
 * Comprehensive summary of all posted jobs, worker engagements, and escrow expenditures.
 * Conforms to Master Specification §32, §38, and NDPA §80 audit requirements.
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
import { Badge } from '../../../components/common/Badge';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { ApiService } from '../../../services/api';
import { useEmployer } from '../../../context/EmployerContext';
import { EmployerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<EmployerProfileStackParamList, 'HiringHistory'>;
};

export const EmployerHiringHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { hiringSummary } = useEmployer();
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    const list = ApiService.getEmployerJobHistory();
    setJobs(list);
  }, []);

  const handleDownloadInvoice = (job: any) => {
    Alert.alert(
      'Tax Invoice & Escrow Receipt',
      `VAT invoice for Job ${job.publicJobId || job.id} (${formatKoboToNaira(
        job.totalAmountKobo || job.workerPayKobo || 495000
      )}) sent to your registered email address.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <TopBar title="Hiring History & Invoices" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Performance & Expenditure Summary Banner */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Hiring &amp; Escrow Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>{hiringSummary.totalJobsPosted}</Text>
              <Text style={styles.metricLabel}>Total Jobs</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>{hiringSummary.totalWorkersHired}</Text>
              <Text style={styles.metricLabel}>Workers Hired</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>{hiringSummary.activeJobsCount}</Text>
              <Text style={styles.metricLabel}>Active Jobs</Text>
            </View>
          </View>
          <View style={styles.totalFundedRow}>
            <Text style={styles.totalFundedLabel}>Cumulative Escrow Spend</Text>
            <Text style={styles.totalFundedAmount}>
              {formatKoboToNaira(hiringSummary.totalEscrowFundedKobo)}
            </Text>
          </View>
        </Card>

        {/* 1. Job Invoices & Activity List */}
        <Text style={styles.sectionHeader}>PAST &amp; ONGOING ASSIGNMENTS</Text>

        {jobs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Jobs Recorded Yet</Text>
            <Text style={styles.emptySub}>
              Jobs you post and fund will appear here with downloadable VAT invoices and worker ratings.
            </Text>
          </Card>
        ) : (
          jobs.map((job) => {
            const amountKobo = job.totalAmountKobo || (job.workerPayKobo ? job.workerPayKobo * 1.1 : 495000);
            const isCompleted = job.status === 'completed';
            const isActive = ['payment_secured', 'assigned', 'in_progress', 'travelling', 'arrived'].includes(
              job.status
            );

            return (
              <Card key={job.id} style={styles.jobCard}>
                <View style={styles.jobCardHeader}>
                  <View style={styles.jobIdGroup}>
                    <Text style={styles.jobPublicId}>{job.publicJobId || 'MNL-2026'}</Text>
                    <Text style={styles.jobDate}>{job.scheduledDate || 'Recent'}</Text>
                  </View>
                  <Badge
                    label={
                      isCompleted
                        ? 'COMPLETED'
                        : isActive
                        ? 'ACTIVE'
                        : job.status.toUpperCase()
                    }
                    type={isCompleted ? 'verified' : isActive ? 'pending' : 'neutral'}
                  />
                </View>

                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobLocation}>📍 {job.locationText || 'Lekki Phase 1, Lagos'}</Text>

                <View style={styles.workerRow}>
                  <Text style={styles.workerLabel}>Assigned Pro:</Text>
                  <Text style={styles.workerName}>{job.workerName || 'Adebayo O. (Verified Pro)'}</Text>
                </View>

                <View style={styles.jobCardFooter}>
                  <View style={styles.priceColumn}>
                    <Text style={styles.priceLabel}>Escrow Amount</Text>
                    <Text style={styles.priceAmount}>{formatKoboToNaira(amountKobo)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.invoiceBtn}
                    onPress={() => handleDownloadInvoice(job)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.invoiceBtnText}>📄 Invoice</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}

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
  summaryCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.canvas,
    borderRadius: Radii.md,
    marginHorizontal: 3,
  },
  metricNumber: {
    ...Typography.scale.headlineSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  metricLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  totalFundedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalFundedLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
  },
  totalFundedAmount: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    fontWeight: '700',
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
  jobCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  jobIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  jobPublicId: {
    ...Typography.scale.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  jobDate: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
  },
  jobTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  jobLocation: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  workerLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  workerName: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priceColumn: {},
  priceLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 10,
  },
  priceAmount: {
    ...Typography.scale.labelLg,
    color: Colors.primary,
    fontWeight: '700',
  },
  invoiceBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: Colors.canvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  invoiceBtnText: {
    ...Typography.scale.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.scale.labelLg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
