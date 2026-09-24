import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
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

export const WorkerActiveJobScreen: React.FC = () => {
  const [job, setJob] = useState<any>(ApiService.getActiveJob());
  const [loading, setLoading] = useState<boolean>(false);
  const [sosModalVisible, setSosModalVisible] = useState<boolean>(false);
  const [ratingModalVisible, setRatingModalVisible] = useState<boolean>(false);
  const [arrivalPhoto, setArrivalPhoto] = useState<string | null>(null);
  const [checkoutPhoto, setCheckoutPhoto] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>('Deep scrub completed. Tiles restored and windows sanitized.');
  const [workSeconds, setWorkSeconds] = useState<number>(3640); // ~1h 00m

  // Active work stopwatch timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (job?.status === 'in_progress') {
      interval = setInterval(() => {
        setWorkSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [job?.status]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTravel = async () => {
    setLoading(true);
    try {
      await ApiService.startTravel(job.id);
      setJob({ ...job, status: 'worker_on_way' });
      Alert.alert('Journey Started', 'Employer has been notified that you are on your way!');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleArriveAtJob = async () => {
    setLoading(true);
    try {
      const mockPhoto = arrivalPhoto || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400';
      await ApiService.arriveAtJob(job.id, mockPhoto);
      setJob({
        ...job,
        status: 'worker_arrived',
        checkinPhotoUrl: mockPhoto,
      });
      Alert.alert('Arrival Confirmed', 'Check-in recorded with geo-verification and photo!');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async () => {
    setLoading(true);
    try {
      await ApiService.startWork(job.id);
      setJob({ ...job, status: 'in_progress' });
      Alert.alert('Work Started', 'The active job stopwatch is now ticking!');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWork = async () => {
    setLoading(true);
    try {
      const mockPhoto = checkoutPhoto || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400';
      await ApiService.completeWork(job.id, mockPhoto, completionNotes);
      setJob({
        ...job,
        status: 'completed_by_worker',
        checkoutPhotoUrl: mockPhoto,
        completionNotes,
      });
      Alert.alert('Job Submitted', 'Employer has been requested to inspect the work and release escrow funds!');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!job) {
    return (
      <View style={styles.container}>
        <TopBar title="Active Job" />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No Active Job Right Now</Text>
          <Text style={styles.emptySubtitle}>
            When an employer hires you and funds escrow, your live job checklist will appear here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header with Emergency SOS Action */}
      <TopBar
        title="Active Job Execution"
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
        {/* Job Status Banner */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Text style={styles.refText}>{job.publicJobId || 'MNL-2026-1042'}</Text>
              <Text style={styles.jobTitle}>{job.title}</Text>
            </View>
            <Badge
              label={job.status ? job.status.replace(/_/g, ' ').toUpperCase() : 'ACTIVE'}
              type={job.status === 'completed' ? 'verified' : 'pending'}
            />
          </View>

          <View style={styles.divider} />

          {/* Escrow Guarantee Tag */}
          <View style={styles.escrowLockedBox}>
            <Text style={styles.escrowLockedIcon}>🔒</Text>
            <View style={styles.escrowLockedInfo}>
              <Text style={styles.escrowLockedTitle}>
                {formatKoboToNaira(job.workerPayKobo || 450000)} Locked in Escrow
              </Text>
              <Text style={styles.escrowLockedDesc}>
                Guaranteed by Menial. Payout directly disbursed upon completion approval.
              </Text>
            </View>
          </View>
        </Card>

        {/* Employer & Location Details */}
        <Card style={styles.detailCard}>
          <Text style={styles.sectionHeading}>Employer & Job Site</Text>
          <View style={styles.employerRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(job.employerName || 'Chief Adeleke').split(' ').map((n: string) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.employerInfo}>
              <Text style={styles.employerName}>{job.employerName || 'Chief Adeleke'}</Text>
              <Text style={styles.employerPhone}>📞 {job.employerPhone || '+234 809 876 5432'}</Text>
            </View>
          </View>

          <View style={styles.locationItem}>
            <Text style={styles.locIcon}>📍</Text>
            <Text style={styles.locText}>{job.locationText || 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos'}</Text>
          </View>
        </Card>

        {/* Dynamic Execution Step Card */}
        {job.status === 'payment_secured' && (
          <Card style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1: COMMENCE JOURNEY</Text>
            </View>
            <Text style={styles.stepTitle}>Ready to Depart?</Text>
            <Text style={styles.stepDesc}>
              Tap the button below to alert the employer that you are en route to the location.
            </Text>
            <Button
              title="Start Journey / On My Way"
              variant="kinetic"
              onPress={handleStartTravel}
              loading={loading}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {job.status === 'worker_on_way' && (
          <Card style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 2: ARRIVAL PHOTO CHECK-IN (§49)</Text>
            </View>
            <Text style={styles.stepTitle}>Arrived at Job Location?</Text>
            <Text style={styles.stepDesc}>
              Per Section 49 trust guidelines, capture a quick photo of the entrance or work site to confirm arrival.
            </Text>

            <TouchableOpacity
              style={styles.photoCaptureBox}
              onPress={() => setArrivalPhoto('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400')}
              activeOpacity={0.8}
            >
              {arrivalPhoto ? (
                <View style={styles.photoAttached}>
                  <Text style={styles.photoAttachedText}>✓ Arrival Photo Attached</Text>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.cameraEmoji}>📸</Text>
                  <Text style={styles.photoPlaceholderText}>Tap to Capture Arrival Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Button
              title="I Have Arrived & Check-In"
              variant="primary"
              onPress={handleArriveAtJob}
              loading={loading}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {job.status === 'worker_arrived' && (
          <Card style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 3: START PHYSICAL WORK</Text>
            </View>
            <Text style={styles.stepTitle}>Check-In Verified</Text>
            <Text style={styles.stepDesc}>
              You have arrived at the job site. Once you meet the employer and are ready to commence, start the job timer.
            </Text>
            <Button
              title="Begin Work"
              variant="primary"
              onPress={handleStartWork}
              loading={loading}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {job.status === 'in_progress' && (
          <Card style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 4: PHYSICAL WORK IN PROGRESS</Text>
            </View>

            {/* Live Stopwatch Timer */}
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>ACTIVE WORK DURATION</Text>
              <Text style={styles.timerValue}>{formatTimer(workSeconds)}</Text>
              <View style={styles.pulsingRow}>
                <View style={styles.bluePulseDot} />
                <Text style={styles.pulsingText}>Timer Active · Escrow Protected</Text>
              </View>
            </View>

            {/* Task Checklist Items */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistHeading}>Task Requirements</Text>
              <Text style={styles.checkItem}>✓ Deep scrub floor & kitchen counters</Text>
              <Text style={styles.checkItem}>✓ Polish windows and mirrors</Text>
              <Text style={styles.checkItem}>✓ Sanitize bathroom tiles & surfaces</Text>
            </View>

            {/* Departure Photo Check-Out */}
            <Text style={styles.subHeading}>Departure Photo Check-Out (§49)</Text>
            <TouchableOpacity
              style={styles.photoCaptureBox}
              onPress={() => setCheckoutPhoto('https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400')}
              activeOpacity={0.8}
            >
              {checkoutPhoto ? (
                <View style={styles.photoAttached}>
                  <Text style={styles.photoAttachedText}>✓ Completion Photo Attached</Text>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.cameraEmoji}>📸</Text>
                  <Text style={styles.photoPlaceholderText}>Tap to Capture Work Evidence Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.notesInput}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              placeholder="Notes on completed tasks..."
              multiline
            />

            <Button
              title="Request Completion & Submit Work"
              variant="kinetic"
              onPress={handleCompleteWork}
              loading={loading}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {job.status === 'completed_by_worker' && (
          <Card style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 5: AWAITING EMPLOYER INSPECTION</Text>
            </View>
            <View style={styles.centerIconBox}>
              <Text style={styles.clockEmoji}>⏳</Text>
            </View>
            <Text style={styles.stepTitle}>Work Submitted for Inspection</Text>
            <Text style={styles.stepDesc}>
              The employer has received your completion photo and notes. Once they inspect and confirm, your wage of{' '}
              <Text style={styles.boldText}>{formatKoboToNaira(job.workerPayKobo || 450000)}</Text> will be released immediately to your wallet.
            </Text>
          </Card>
        )}

        {job.status === 'completed' && (
          <Card style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>JOB COMPLETED & SETTLED</Text>
            </View>
            <View style={styles.centerIconBox}>
              <Text style={styles.clockEmoji}>🎉</Text>
            </View>
            <Text style={styles.stepTitle}>Escrow Released!</Text>
            <Text style={styles.stepDesc}>
              The employer has confirmed completion. {formatKoboToNaira(job.workerPayKobo || 450000)} has been settled into your Menial Wallet ledger.
            </Text>
            {job.rating ? (
              <View style={styles.ratedPill}>
                <Text style={styles.ratedPillText}>★ Client Rated: {job.rating}.0 / 5.0</Text>
              </View>
            ) : (
              <Button
                title="Rate Client & Service Experience"
                variant="outline"
                onPress={() => setRatingModalVisible(true)}
                style={styles.actionBtn}
              />
            )}
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
        counterpartyName={job.employerName || 'Chief Adeleke'}
        counterpartyRole="Employer"
      />

      {/* Post-Job Rating Modal (§46) */}
      <JobRatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        jobId={job.id}
        publicJobId={job.publicJobId || 'MNL-2026-1042'}
        jobTitle={job.title}
        counterpartyName={job.employerName || 'Chief Adeleke'}
        counterpartyRole="Employer"
        onRatingSubmitted={({ stars }) => {
          setJob({ ...job, rating: stars });
        }}
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
  statusCard: {
    padding: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusLeft: {
    flex: 1,
  },
  refText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '700',
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
  escrowLockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: SPACING.sm,
  },
  escrowLockedIcon: {
    fontSize: 20,
  },
  escrowLockedInfo: {
    flex: 1,
  },
  escrowLockedTitle: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '800',
    color: '#0369A1',
  },
  escrowLockedDesc: {
    fontSize: 10,
    color: '#0284C7',
    marginTop: 1,
  },
  detailCard: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  employerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  avatarPlaceholder: {
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
  employerInfo: {
    flex: 1,
  },
  employerName: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  employerPhone: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.canvas,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locIcon: {
    fontSize: 14,
  },
  locText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    flex: 1,
  },
  stepCard: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.canvas,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stepDesc: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  photoCaptureBox: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xs,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  cameraEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  photoPlaceholderText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  photoAttached: {
    backgroundColor: '#E0F2FE',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  photoAttachedText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '700',
    color: '#0369A1',
  },
  timerBox: {
    backgroundColor: COLORS.canvas,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
    marginVertical: 4,
  },
  pulsingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bluePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  pulsingText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  checklistCard: {
    backgroundColor: COLORS.canvas,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  checklistHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  checkItem: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textSecondary,
  },
  subHeading: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  notesInput: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionBtn: {
    height: 52,
    marginTop: SPACING.xs,
  },
  centerIconBox: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  clockEmoji: {
    fontSize: 48,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.textPrimary,
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
});
