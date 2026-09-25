import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, formatKoboToNaira } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { TopBar } from '../../../components/common/TopBar';
import { EmergencySosModal } from '../../../components/safety/EmergencySosModal';
import { ActiveSosBanner } from '../../../components/safety/ActiveSosBanner';
import { JobRatingModal } from '../../../components/trust/JobRatingModal';
import { ApiService } from '../../../services/api';
import { JobChatModal } from '../../../components/chat/JobChatModal';
import { RealtimeSyncService } from '../../../services/supabase';

export const EmployerActiveJobScreen: React.FC = () => {
  const [job, setJob] = useState<any>(ApiService.getActiveJob());
  const [loading, setLoading] = useState<boolean>(false);
  const [sosModalVisible, setSosModalVisible] = useState<boolean>(false);
  const [ratingModalVisible, setRatingModalVisible] = useState<boolean>(false);
  const [chatModalVisible, setChatModalVisible] = useState<boolean>(false);
  const [workerLocation, setWorkerLocation] = useState<{
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);

  // Sync state with createdJobsStore and subscribe to Supabase Realtime
  useEffect(() => {
    const current = ApiService.getActiveJob();
    setJob(current);

    if (current?.id) {
      // 1. Subscribe to job status updates (§31, §32)
      const unsubStatus = RealtimeSyncService.subscribeToJobStatus(current.id, (updated) => {
        setJob((prev: any) => ({ ...prev, ...updated }));
      });

      // 2. Subscribe to worker transit location broadcast (§49, §50)
      const unsubLoc = RealtimeSyncService.subscribeToWorkerLocation(current.id, (loc) => {
        setWorkerLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
        });
      });

      return () => {
        unsubStatus();
        unsubLoc();
      };
    }
  }, []);

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirm Completion & Release Escrow',
      `Have you inspected the work and confirmed everything is complete? This will immediately release ${formatKoboToNaira(job.workerPayKobo || 450000)} from escrow to ${job.workerName || 'Adebayo O.'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Escrow',
          onPress: async () => {
            setLoading(true);
            try {
              await ApiService.confirmCompletion(job.id);
              setJob({ ...job, status: 'completed', isEscrowReleased: true });
              Alert.alert('Escrow Released!', 'Payment has been settled to the worker. Thank you for using Menial!');
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRaiseDispute = async () => {
    Alert.alert(
      'Open Dispute',
      'Are you unsatisfied with the work quality or has an issue occurred? A Menial Trust & Safety officer will review within 2 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Dispute',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await ApiService.raiseDispute(
                job.id,
                'incomplete_work',
                'Employer unsatisfied with cleaning completion.'
              );
              setJob({ ...job, status: 'disputed', disputeId: res.disputeId });
              Alert.alert('Dispute Logged', `Case Ref: ${res.disputeId}. Escrow remains securely frozen.`);
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!job) {
    return (
      <View style={styles.container}>
        <TopBar title="Active Job Tracker" />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No Active Jobs</Text>
          <Text style={styles.emptySubtitle}>
            When you hire a worker and fund escrow, you can track their real-time on-site progress here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar
        title="Live Job Tracking"
        rightAction={
          <TouchableOpacity
            style={styles.sosPillBtn}
            onPress={() => setSosModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Emergency SOS center"
          >
            <Text style={styles.sosPillText}>🚨 SOS</Text>
          </TouchableOpacity>
        }
      />

      {/* Persistent Section 49 Active Emergency SOS Banner */}
      {(() => {
        const activeSos = ApiService.getActiveSosForJob(job.id);
        if (activeSos && activeSos.status !== 'resolved') {
          return (
            <ActiveSosBanner
              dossierRef={activeSos.reportId}
              category={activeSos.category}
              onPress={() => setSosModalVisible(true)}
            />
          );
        }
        return null;
      })()}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Job Header & Status */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitles}>
              <Text style={styles.jobRef}>{job.publicJobId || 'MNL-2026-1042'}</Text>
              <Text style={styles.jobTitle}>{job.title}</Text>
            </View>
            <Badge
              label={job.status ? job.status.replace(/_/g, ' ').toUpperCase() : 'ACTIVE'}
              type={job.status === 'completed' ? 'verified' : 'pending'}
            />
          </View>

          <View style={styles.divider} />

          {/* Assigned Worker Info */}
          <View style={styles.workerRow}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarInitials}>
                {(job.workerName || 'Adebayo O.').split(' ').map((n: string) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{job.workerName || 'Adebayo O.'}</Text>
              <Text style={styles.workerRole}>Assigned Verified Artisan · ★ 4.9</Text>
            </View>
            <TouchableOpacity
              style={styles.chatActionPill}
              onPress={() => setChatModalVisible(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Chat with worker"
            >
              <Text style={styles.chatActionText}>💬 Chat</Text>
            </TouchableOpacity>
            <View style={styles.phonePill}>
              <Text style={styles.phoneText}>📞 Call Worker</Text>
            </View>
          </View>
        </Card>

        {/* Real-time Transit Location Radar Card (§49, §50) */}
        {job.status === 'worker_on_way' && workerLocation ? (
          <Card style={styles.transitRadarCard}>
            <View style={styles.transitRadarRow}>
              <Text style={styles.transitRadarEmoji}>📡</Text>
              <View style={styles.transitRadarInfo}>
                <Text style={styles.transitRadarTitle}>Live Worker Transit Radar (§49)</Text>
                <Text style={styles.transitRadarDesc}>
                  Live GPS beacon: {workerLocation.latitude.toFixed(4)}° N, {workerLocation.longitude.toFixed(4)}° E
                </Text>
              </View>
              <Badge label="IN TRANSIT" type="verified" />
            </View>
          </Card>
        ) : null}

        {/* Real-time Journey Timeline */}
        <Card style={styles.timelineCard}>
          <Text style={styles.timelineHeading}>Execution Timeline</Text>

          {/* Point 1: Escrow Secured */}
          <View style={styles.timelineStep}>
            <View style={[styles.timelineNode, styles.nodeActive]}>
              <Text style={styles.nodeCheck}>✓</Text>
            </View>
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineStepTitle}>Escrow Funded & Locked</Text>
              <Text style={styles.timelineStepDesc}>
                {formatKoboToNaira(job.totalAmountKobo || 495000)} secured with Paystack.
              </Text>
            </View>
          </View>

          {/* Point 2: Worker Journey */}
          <View style={styles.timelineStep}>
            <View
              style={[
                styles.timelineNode,
                (job.status === 'worker_on_way' ||
                  job.status === 'worker_arrived' ||
                  job.status === 'in_progress' ||
                  job.status === 'completed_by_worker' ||
                  job.status === 'completed') &&
                  styles.nodeActive,
              ]}
            >
              <Text style={styles.nodeCheck}>
                {job.status === 'payment_secured' ? '2' : '✓'}
              </Text>
            </View>
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineStepTitle}>Worker En Route</Text>
              <Text style={styles.timelineStepDesc}>
                {job.startedTravelAt ? 'Worker started journey towards location.' : 'Awaiting worker departure.'}
              </Text>
            </View>
          </View>

          {/* Point 3: Arrival & Check-In */}
          <View style={styles.timelineStep}>
            <View
              style={[
                styles.timelineNode,
                (job.status === 'worker_arrived' ||
                  job.status === 'in_progress' ||
                  job.status === 'completed_by_worker' ||
                  job.status === 'completed') &&
                  styles.nodeActive,
              ]}
            >
              <Text style={styles.nodeCheck}>
                {job.status === 'payment_secured' || job.status === 'worker_on_way' ? '3' : '✓'}
              </Text>
            </View>
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineStepTitle}>Arrival & Photo Check-In</Text>
              <Text style={styles.timelineStepDesc}>
                {job.arrivedAt ? 'Arrival verified with photo evidence (§49).' : 'Worker will verify on-site arrival.'}
              </Text>
              {job.checkinPhotoUrl ? (
                <View style={styles.photoEvidenceTag}>
                  <Text style={styles.photoEvidenceText}>📸 Arrival Photo Logged</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Point 4: In Progress */}
          <View style={styles.timelineStep}>
            <View
              style={[
                styles.timelineNode,
                (job.status === 'in_progress' ||
                  job.status === 'completed_by_worker' ||
                  job.status === 'completed') &&
                  styles.nodeActive,
              ]}
            >
              <Text style={styles.nodeCheck}>
                {job.status === 'completed_by_worker' || job.status === 'completed' ? '✓' : '4'}
              </Text>
            </View>
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineStepTitle}>Physical Work In Progress</Text>
              <Text style={styles.timelineStepDesc}>
                {job.status === 'in_progress' ? 'Artisan is currently performing tasks on site.' : 'Work execution phase.'}
              </Text>
            </View>
          </View>

          {/* Point 5: Completion & Review */}
          <View style={styles.timelineStep}>
            <View
              style={[
                styles.timelineNode,
                job.status === 'completed' && styles.nodeActive,
              ]}
            >
              <Text style={styles.nodeCheck}>
                {job.status === 'completed' ? '✓' : '5'}
              </Text>
            </View>
            <View style={styles.timelineTextGroup}>
              <Text style={styles.timelineStepTitle}>Inspection & Escrow Release</Text>
              <Text style={styles.timelineStepDesc}>
                {job.status === 'completed'
                  ? 'Completion confirmed. Escrow disbursed to worker.'
                  : 'Inspect work and confirm release.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Work Submitted Card (When worker completes) */}
        {job.status === 'completed_by_worker' && (
          <Card style={styles.approvalCard}>
            <View style={styles.inspectionBadge}>
              <Text style={styles.inspectionBadgeText}>ACTION REQUIRED: INSPECT WORK</Text>
            </View>
            <Text style={styles.approvalTitle}>Artisan Has Completed Work</Text>
            <Text style={styles.approvalDesc}>
              {job.workerName || 'Adebayo O.'} has submitted task evidence and requested inspection.
            </Text>

            {job.checkoutPhotoUrl && (
              <View style={styles.evidenceContainer}>
                <Text style={styles.evidenceLabel}>Departure Work Evidence Photo:</Text>
                <View style={styles.photoCard}>
                  <Text style={styles.evidenceEmoji}>📸</Text>
                  <Text style={styles.evidenceText}>Evidence Photo Logged & Time-Stamped</Text>
                </View>
              </View>
            )}

            {job.completionNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Worker Notes:</Text>
                <Text style={styles.notesText}>"{job.completionNotes}"</Text>
              </View>
            )}

            <Button
              title="✓ Confirm Completion & Release Escrow"
              variant="kinetic"
              onPress={handleConfirmCompletion}
              loading={loading}
              style={styles.confirmBtn}
            />

            <Button
              title="⚠️ Open Dispute / Report Issue"
              variant="outline"
              onPress={handleRaiseDispute}
              disabled={loading}
              style={styles.disputeBtn}
            />
          </Card>
        )}

        {/* Completed State */}
        {job.status === 'completed' && (
          <Card style={styles.completedCard}>
            <View style={styles.completedIconBox}>
              <Text style={styles.completedEmoji}>🎉</Text>
            </View>
            <Text style={styles.completedTitle}>Job Complete & Settled</Text>
            <Text style={styles.completedDesc}>
              You confirmed completion. {formatKoboToNaira(job.workerPayKobo || 450000)} has been released to the worker's wallet.
            </Text>
            {job.rating ? (
              <View style={styles.ratedPill}>
                <Text style={styles.ratedPillText}>★ Artisan Rated: {job.rating}.0 / 5.0</Text>
              </View>
            ) : (
              <Button
                title="Rate Artisan & Work Quality"
                variant="outline"
                onPress={() => setRatingModalVisible(true)}
                style={styles.rateBtn}
              />
            )}
          </Card>
        )}

        {/* Disputed State */}
        {job.status === 'disputed' && (
          <Card style={styles.disputedCard}>
            <Text style={styles.disputedTitle}>Dispute Under Investigation</Text>
            <Text style={styles.disputedDesc}>
              Your dispute has been logged with Menial Trust & Safety. Case reference: {job.disputeId || 'DISP-ACTIVE'}.
              Escrow funds remain securely frozen while our mediation team contacts both parties.
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Emergency SOS Modal */}
      <EmergencySosModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
        jobId={job.id}
        publicJobId={job.publicJobId || 'MNL-2026-1042'}
        jobTitle={job.title}
        locationText={job.locationText || 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos'}
        counterpartyName={job.workerName || 'Adebayo O.'}
        counterpartyRole="Worker"
      />

      {/* Post-Job Rating Modal (§46) */}
      <JobRatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        jobId={job.id}
        publicJobId={job.publicJobId || 'MNL-2026-1042'}
        jobTitle={job.title}
        counterpartyName={job.workerName || 'Adebayo O.'}
        counterpartyRole="Worker"
        onRatingSubmitted={({ stars }) => {
          setJob({ ...job, rating: stars });
        }}
      />

      {/* Section 48 Real-time Job Chat Modal */}
      <JobChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        jobId={job.id}
        publicJobId={job.publicJobId || 'MNL-2026-1042'}
        jobTitle={job.title}
        jobStatus={job.status}
        currentUserRole="employer"
        counterpartyName={job.workerName || 'Adebayo O.'}
      />
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
    paddingBottom: 40,
    gap: SPACING.md,
  },
  sosPillBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  sosPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerCard: {
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitles: {
    flex: 1,
  },
  jobRef: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  jobTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  workerRole: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  phonePill: {
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timelineCard: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  timelineHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  nodeActive: {
    backgroundColor: COLORS.primary,
  },
  nodeCheck: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timelineTextGroup: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timelineStepDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  photoEvidenceTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  photoEvidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  approvalCard: {
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  inspectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  inspectionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  approvalTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  approvalDesc: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  evidenceContainer: {
    gap: 4,
    marginTop: SPACING.xs,
  },
  evidenceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.canvas,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  evidenceEmoji: {
    fontSize: 18,
  },
  evidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  notesContainer: {
    backgroundColor: COLORS.canvas,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    gap: 2,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textPrimary,
  },
  confirmBtn: {
    height: 52,
    marginTop: SPACING.xs,
  },
  disputeBtn: {
    height: 44,
  },
  completedCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  completedIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  completedEmoji: {
    fontSize: 28,
  },
  completedTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: '#0369A1',
  },
  completedDesc: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: '#0284C7',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  disputedCard: {
    padding: SPACING.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  disputedTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '800',
    color: COLORS.danger,
  },
  disputedDesc: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: '#991B1B',
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: SPACING.xs,
  },
  rateBtn: {
    height: 44,
    marginTop: SPACING.sm,
  },
  ratedPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  ratedPillText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 13,
  },
  chatActionPill: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  chatActionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  transitRadarCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: SPACING.md,
  },
  transitRadarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transitRadarEmoji: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  transitRadarInfo: {
    flex: 1,
  },
  transitRadarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  transitRadarDesc: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
});
