import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ApiService } from '../../services/api';

interface JobRatingModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  publicJobId: string;
  jobTitle: string;
  counterpartyName: string;
  counterpartyRole: 'Employer' | 'Worker';
  onRatingSubmitted?: (ratingResult: { stars: number; newAverageRating: number }) => void;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: '1.0 — Poor / Unacceptable',
  2: '2.0 — Needs Improvement',
  3: '3.0 — Satisfactory',
  4: '4.0 — Very Good',
  5: '5.0 — Exceptional & Highly Recommended',
};

export const JobRatingModal: React.FC<JobRatingModalProps> = ({
  visible,
  onClose,
  jobId,
  publicJobId,
  jobTitle,
  counterpartyName,
  counterpartyRole,
  onRatingSubmitted,
}) => {
  const [stars, setStars] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [updatedAverage, setUpdatedAverage] = useState<number>(5.0);

  const handleSubmitRating = async () => {
    if (stars < 1 || stars > 5) {
      Alert.alert('Invalid Rating', 'Please select between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiService.submitJobRating({
        jobId,
        stars,
        reviewText: reviewText.trim() ? reviewText.trim() : undefined,
      });

      setUpdatedAverage(res.newAverageRating);
      setSubmitted(true);
      if (onRatingSubmitted) {
        onRatingSubmitted({ stars: res.stars, newAverageRating: res.newAverageRating });
      }
    } catch (err) {
      Alert.alert('Rating Submission Error', (err as Error).message || 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setReviewText('');
    setStars(5);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Card style={styles.modalCard}>
          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successEmoji}>🌟</Text>
              </View>
              <Text style={styles.successTitle}>Rating Submitted!</Text>
              <Text style={styles.successSubtitle}>
                Thank you for reviewing {counterpartyName}. Your feedback helps build Nigerian marketplace trust.
              </Text>
              <View style={styles.newRatingPill}>
                <Text style={styles.newRatingText}>
                  ★ Updated Standing: {updatedAverage.toFixed(2)} / 5.0
                </Text>
              </View>
              <Button
                title="Done"
                variant="primary"
                onPress={handleClose}
                style={styles.actionBtn}
              />
            </View>
          ) : (
            <View>
              {/* Header */}
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.modalTitle}>Rate Your Experience</Text>
                  <Text style={styles.jobRefText}>{publicJobId} · {jobTitle}</Text>
                </View>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Counterpart Card */}
              <View style={styles.counterpartRow}>
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarInitial}>
                    {counterpartyName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.counterpartInfo}>
                  <Text style={styles.counterpartName}>{counterpartyName}</Text>
                  <Text style={styles.counterpartRoleText}>{counterpartyRole} on this job</Text>
                </View>
                <Badge label="COMPLETED" type="verified" />
              </View>

              <View style={styles.divider} />

              {/* 1-5 Star Selector */}
              <Text style={styles.sectionLabel}>HOW WOULD YOU RATE THE WORK?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((starNum) => (
                  <TouchableOpacity
                    key={starNum}
                    style={styles.starTouch}
                    onPress={() => setStars(starNum)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.starEmoji, starNum <= stars ? styles.starActive : styles.starInactive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingDescriptor}>
                {RATING_DESCRIPTIONS[stars] || 'Select stars'}
              </Text>

              {/* Written Review */}
              <Text style={styles.sectionLabel}>COMMENTS OR FEEDBACK (OPTIONAL)</Text>
              <TextInput
                style={styles.reviewInput}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Share details on punctuality, professionalism, or quality..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Trust Badge Banner */}
              <View style={styles.trustBanner}>
                <Text style={styles.trustShieldEmoji}>🛡️</Text>
                <Text style={styles.trustBannerText}>
                  Section 46: Verified mutual ratings update running averages and maintain marketplace accountability.
                </Text>
              </View>

              {/* Actions */}
              <Button
                title={submitting ? 'Submitting...' : 'Submit Rating & Review'}
                variant="primary"
                onPress={handleSubmitRating}
                loading={submitting}
                style={styles.actionBtn}
              />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.scale.headlineSm,
    color: COLORS.textPrimary,
  },
  jobRefText: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeIcon: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: SPACING.xs,
  },
  counterpartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarInitial: {
    ...TYPOGRAPHY.scale.labelLg,
    color: COLORS.primary,
    fontWeight: '700',
  },
  counterpartInfo: {
    flex: 1,
  },
  counterpartName: {
    ...TYPOGRAPHY.scale.labelMd,
    color: COLORS.textPrimary,
  },
  counterpartRoleText: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    ...TYPOGRAPHY.scale.labelSm,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  starTouch: {
    padding: SPACING.xs,
  },
  starEmoji: {
    fontSize: 38,
  },
  starActive: {
    color: '#F59E0B', // Warm Amber
  },
  starInactive: {
    color: '#CBD5E1', // Slate 300
  },
  ratingDescriptor: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  reviewInput: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.scale.bodyMd,
    color: COLORS.textPrimary,
    minHeight: 80,
    marginBottom: SPACING.md,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryContainer,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  trustShieldEmoji: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  trustBannerText: {
    ...TYPOGRAPHY.scale.bodySm,
    color: COLORS.primary,
    flex: 1,
    lineHeight: 18,
  },
  actionBtn: {
    height: 52,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    ...TYPOGRAPHY.scale.headlineSm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  successSubtitle: {
    ...TYPOGRAPHY.scale.bodyMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  newRatingPill: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xl,
  },
  newRatingText: {
    ...TYPOGRAPHY.scale.labelMd,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
