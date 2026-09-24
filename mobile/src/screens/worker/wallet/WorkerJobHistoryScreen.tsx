import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { TopBar } from '../../../components/common/TopBar';
import { Button } from '../../../components/common/Button';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { ApiService } from '../../../services/api';
import { JobRatingModal } from '../../../components/trust/JobRatingModal';

type FilterTab = 'all' | 'completed' | 'active';

export const WorkerJobHistoryScreen: React.FC = () => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [jobs, setJobs] = useState<any[]>([]);
  const [ratingJob, setRatingJob] = useState<any | null>(null);

  const loadJobs = useCallback(() => {
    const list = ApiService.getWorkerJobHistory('worker_adebayo');
    setJobs(list);
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'completed') return j.status === 'completed';
    if (filter === 'active') return j.status !== 'completed' && j.status !== 'cancelled';
    return true;
  });

  return (
    <View style={styles.screen}>
      <TopBar title="Work History" />

      {/* Filter Chips Bar */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            All Jobs ({jobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterChipText, filter === 'completed' && styles.filterChipTextActive]}>
            Completed ({jobs.filter((j) => j.status === 'completed').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterChipText, filter === 'active' && styles.filterChipTextActive]}>
            Active ({jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredJobs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Jobs Found</Text>
            <Text style={styles.emptySubtitle}>
              Jobs assigned to you will be recorded here with complete escrow and payment receipts.
            </Text>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const isCompleted = job.status === 'completed';
            const payKobo = job.workerPayKobo || 450000;

            return (
              <Card key={job.id} style={styles.jobCard}>
                {/* Header: Ref & Status */}
                <View style={styles.jobCardHeader}>
                  <View style={styles.refGroup}>
                    <Text style={styles.jobRef}>{job.publicJobId || 'MNL-2026-1042'}</Text>
                    <Text style={styles.jobDate}>{job.scheduledDate || 'Today'}</Text>
                  </View>
                  <Badge
                    label={job.status ? job.status.replace(/_/g, ' ').toUpperCase() : 'ACTIVE'}
                    type={isCompleted ? 'verified' : 'pending'}
                  />
                </View>

                {/* Job Title & Location */}
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.locationText}>📍 {job.locationText}</Text>

                {/* Employer & Earnings Row */}
                <View style={styles.detailsRow}>
                  <View style={styles.employerGroup}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarLetter}>
                        {(job.employerName || 'Employer').charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.employerName}>{job.employerName || 'Employer'}</Text>
                      <Text style={styles.employerSub}>Verified Client</Text>
                    </View>
                  </View>
                  <View style={styles.payGroup}>
                    <Text style={styles.payLabel}>Net Earnings</Text>
                    <Text style={styles.payValue}>+{formatKoboToNaira(payKobo)}</Text>
                  </View>
                </View>

                {/* Photo Evidence Tags (§45) */}
                {(job.checkinPhotoUrl || job.checkoutPhotoUrl) && (
                  <View style={styles.photoProofRow}>
                    {job.checkinPhotoUrl && (
                      <View style={styles.photoProofPill}>
                        <Text style={styles.photoProofText}>📸 Arrival Photo</Text>
                      </View>
                    )}
                    {job.checkoutPhotoUrl && (
                      <View style={styles.photoProofPill}>
                        <Text style={styles.photoProofText}>✓ Departure Photo</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Rating & Review Section (§46) */}
                {job.rating ? (
                  <View style={styles.ratingCard}>
                    <View style={styles.ratingStarsRow}>
                      <Text style={styles.ratingStarsText}>{'★'.repeat(job.rating)}</Text>
                      <Text style={styles.ratingScoreText}>{job.rating}.0 / 5.0 Rating</Text>
                    </View>
                    {job.reviewText && (
                      <Text style={styles.reviewCommentText}>"{job.reviewText}"</Text>
                    )}
                  </View>
                ) : isCompleted ? (
                  <Button
                    title="Rate Client & Service"
                    variant="outline"
                    onPress={() => setRatingJob(job)}
                    style={styles.rateBtn}
                  />
                ) : null}
              </Card>
            );
          })
        )}

        {/* Clean Standardized Screen Footer */}
        <ScreenFooter variant="compact" />
      </ScrollView>

      {/* Post-Job Rating Modal */}
      {ratingJob && (
        <JobRatingModal
          visible={!!ratingJob}
          onClose={() => setRatingJob(null)}
          jobId={ratingJob.id}
          publicJobId={ratingJob.publicJobId}
          jobTitle={ratingJob.title}
          counterpartyName={ratingJob.employerName || 'Employer'}
          counterpartyRole="Employer"
          onRatingSubmitted={() => loadJobs()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  jobCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  refGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  jobRef: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.primary,
    fontWeight: '700',
  },
  jobDate: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  jobTitle: {
    ...TYPOGRAPHY.scale.headlineSm,
    color: COLORS.textPrimary,
    fontSize: 16,
    marginBottom: 4,
  },
  locationText: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  employerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  avatarLetter: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.primary,
    fontWeight: '700',
  },
  employerName: {
    ...TYPOGRAPHY.scale.labelMd,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  employerSub: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  payGroup: {
    alignItems: 'flex-end',
  },
  payLabel: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  payValue: {
    ...TYPOGRAPHY.scale.labelLg,
    color: '#0369A1', // Verified Sky Blue
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  photoProofRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  photoProofPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  photoProofText: {
    ...TYPOGRAPHY.scale.bodySm,
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '600',
  },
  ratingCard: {
    backgroundColor: '#FEF3C7',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingStarsText: {
    color: '#D97706',
    fontSize: 16,
    letterSpacing: 2,
  },
  ratingScoreText: {
    ...TYPOGRAPHY.scale.labelSm,
    color: '#92400E',
    fontWeight: '700',
  },
  reviewCommentText: {
    ...TYPOGRAPHY.scale.bodySm,
    color: '#78350F',
    fontStyle: 'italic',
    marginTop: 2,
  },
  rateBtn: {
    height: 40,
    marginTop: SPACING.xs,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.scale.labelLg,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
