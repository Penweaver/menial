/**
 * Menial Mobile - Worker Reputation & Performance Overview Screen
 * 
 * Standardized reputation breakdown conforming to Section 46 (Mutual Rating Integrity)
 * and Section 28 (Fair Marketplace Algorithm Weighting).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radii } from '../../../constants/theme';
import { TopBar } from '../../../components/common/TopBar';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { ScreenFooter } from '../../../components/common/ScreenFooter';
import { ApiService, WorkerReputation } from '../../../services/api';
import { WorkerProfileStackParamList } from '../../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<WorkerProfileStackParamList, 'Reputation'>;
};

export const WorkerReputationScreen: React.FC<Props> = ({ navigation }) => {
  const [reputation, setReputation] = useState<WorkerReputation>(() =>
    ApiService.getWorkerReputation()
  );

  useEffect(() => {
    setReputation(ApiService.getWorkerReputation());
  }, []);

  const totalReviews =
    reputation.ratingsBreakdown.fiveStar +
    reputation.ratingsBreakdown.fourStar +
    reputation.ratingsBreakdown.threeStar +
    reputation.ratingsBreakdown.twoStar +
    reputation.ratingsBreakdown.oneStar;

  return (
    <View style={styles.container}>
      <TopBar title="Reputation & Ratings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rating Hero Score Card */}
        <Card style={styles.heroCard}>
          <Text style={styles.scoreNumber}>{reputation.ratingAvg.toFixed(1)}</Text>
          <Text style={styles.starsRow}>★★★★★</Text>
          <Text style={styles.scoreSub}>
            Based on {totalReviews} client reviews across {reputation.completedJobsCount} completed jobs
          </Text>
          <Badge label="TOP RATED PRO" type="verified" style={styles.topBadge} />
        </Card>

        {/* Reliability & Quality Metrics */}
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricEmoji}>⏱️</Text>
            <Text style={styles.metricValue}>{reputation.onTimeArrivalPercent}%</Text>
            <Text style={styles.metricLabel}>On-Time Arrival</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricEmoji}>🎯</Text>
            <Text style={styles.metricValue}>{reputation.reliabilityScore}%</Text>
            <Text style={styles.metricLabel}>Job Completion</Text>
          </Card>
        </View>

        {/* Rating Distribution Bar */}
        <Text style={styles.sectionHeader}>RATING BREAKDOWN</Text>
        <Card style={styles.breakdownCard}>
          {[
            { stars: '5 Stars', count: reputation.ratingsBreakdown.fiveStar },
            { stars: '4 Stars', count: reputation.ratingsBreakdown.fourStar },
            { stars: '3 Stars', count: reputation.ratingsBreakdown.threeStar },
            { stars: '2 Stars', count: reputation.ratingsBreakdown.twoStar },
            { stars: '1 Star', count: reputation.ratingsBreakdown.oneStar },
          ].map((item) => {
            const percent = totalReviews > 0 ? (item.count / totalReviews) * 100 : 0;
            return (
              <View key={item.stars} style={styles.barRow}>
                <Text style={styles.barLabel}>{item.stars}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.barCount}>{item.count}</Text>
              </View>
            );
          })}
        </Card>

        {/* Section 46 Policy Notice */}
        <View style={styles.policyCard}>
          <Text style={styles.policyIcon}>🛡️</Text>
          <View style={styles.policyTextGroup}>
            <Text style={styles.policyTitle}>Section 46 Mutual Rating Integrity</Text>
            <Text style={styles.policyDesc}>
              Ratings are blind and simultaneously published after both parties submit reviews. Neither side can alter scores once revealed.
            </Text>
          </View>
        </View>

        {/* Client Reviews Feed */}
        <Text style={styles.sectionHeader}>RECENT CLIENT FEEDBACK</Text>
        {reputation.reviews.map((rev) => (
          <Card key={rev.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View>
                <Text style={styles.reviewAuthor}>{rev.author}</Text>
                <Text style={styles.reviewDate}>{rev.date}</Text>
              </View>
              <Text style={styles.reviewStars}>
                {'★'.repeat(rev.rating)}
                {'☆'.repeat(5 - rev.rating)}
              </Text>
            </View>
            <Text style={styles.reviewComment}>"{rev.comment}"</Text>
          </Card>
        ))}

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
  heroCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 52,
  },
  starsRow: {
    fontSize: 20,
    color: Colors.tertiary,
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: 2,
  },
  scoreSub: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  topBadge: {
    marginTop: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  metricEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  metricValue: {
    ...Typography.scale.headlineSm,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  metricLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
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
  breakdownCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 11,
    width: 48,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.tertiary,
    borderRadius: Radii.full,
  },
  barCount: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 11,
    width: 20,
    textAlign: 'right',
  },
  policyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  policyIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  policyTextGroup: {
    flex: 1,
  },
  policyTitle: {
    ...Typography.scale.labelMd,
    color: Colors.secondaryText,
    fontWeight: '800',
    marginBottom: 2,
    fontSize: 12,
  },
  policyDesc: {
    ...Typography.scale.bodySm,
    color: Colors.secondaryText,
    fontSize: 11,
    lineHeight: 16,
  },
  reviewCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewAuthor: {
    ...Typography.scale.labelMd,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  reviewDate: {
    ...Typography.scale.bodySm,
    color: Colors.textMuted,
    fontSize: 10,
  },
  reviewStars: {
    fontSize: 12,
    color: Colors.tertiary,
    letterSpacing: 1,
  },
  reviewComment: {
    ...Typography.scale.bodySm,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
